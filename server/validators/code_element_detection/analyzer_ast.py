import __main__
import ast
import json
import logging
import os
import io
import tokenize
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../configs/validators/code_element_detection/code_analyzer_config.json",
)


def load_config(config_path=None):
    config_path = config_path or DEFAULT_CONFIG_PATH
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    logger.warning("Code analyzer config not found: %s", config_path)
    return {}

class CodeAnalyzerVisitor(ast.NodeVisitor):
    def __init__(self, code_lines, config):
        self.code_lines = code_lines
        self.config = config
        
        self.custom_functions = set(config.get("custom_functions", []))
        self.builtin_functions = set(config.get("builtin_functions", []))
        self.custom_variable_inits = set(config.get("custom_variable_init", []))
        self.custom_variable_uses = set(config.get("custom_variable_use", []))
        self.custom_lists = set(config.get("custom_list", []))
        self.custom_tuples = set(config.get("custom_tuple", []))
        
        self.code_elements = []
        
        self.counts = {
            "comment_count": 0,
            "variable_init_count": 0,
            "variable_use_count": 0,
            "builtin_call_count": 0,
            "user_function_call_count": 0,
            "branching_count": 0,
            "if_count": 0,
            "elif_count": 0,
            "else_count": 0,
            "loop_count": 0,
            "for_count": 0,
            "while_count": 0,
            "list_count": 0,
            "tuple_count": 0,
            "function_def_count": 0
        }
        
        self.custom_counts = {}
        self.defined_vars = set()   # All variables known to exist (including args/loop counters)
        self.init_vars = set()      # Variables that actually had an 'init' element emitted
        self.used_vars = set()      # Variables that actually had a 'use' element emitted
        for cat, items in config.items():
            if isinstance(items, list):
                for item in items:
                    suffix = ""
                    if cat == "custom_functions": suffix = "_call"
                    elif cat == "custom_variable_init": suffix = "_variable_init"
                    elif cat == "custom_variable_use": suffix = "_variable_use"
                    elif cat == "custom_list": suffix = "_list"
                    elif cat == "custom_tuple": suffix = "_tuple"
                    self.custom_counts[f"{item}{suffix}_count"] = 0
                    
        self.defined_vars = set()   # All variables known to exist (including args/loop counters)
        self.init_vars = set()      # Variables that actually had an 'init' element emitted
        self.used_vars = set()      # Variables that actually had a 'use' element emitted
        
    def add_element(self, node, type_name):
        lines = []
        if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
            # AST lineno is 1-indexed
            lines = self.code_lines[node.lineno - 1 : node.end_lineno]
        elif hasattr(node, 'lineno'):
            lines = [self.code_lines[node.lineno - 1]]
            
        line_excerpt = "\n".join(lines).strip()
        self.code_elements.append({
            "type": type_name, 
            "line": line_excerpt, 
            "lineno": getattr(node, 'lineno', -1),
            "end_lineno": getattr(node, 'end_lineno', getattr(node, 'lineno', -1)),
            "col_offset": getattr(node, 'col_offset', None),
            "end_col_offset": getattr(node, 'end_col_offset', None)
        })
        
    def count_and_add_custom(self, base_type, name, type_suffix, dict_names, count_suffix):
        if name in dict_names:
            t_name = f"{name}{type_suffix}"
            self.add_element(self._current_node, t_name)
            stat_name = f"{name}{count_suffix}_count"
            self.custom_counts[stat_name] = self.custom_counts.get(stat_name, 0) + 1

    def visit_Assign(self, node):
        self._current_node = node
        for target in node.targets:
            self._handle_assign_target(target)
        self.generic_visit(node)
            
    def visit_AnnAssign(self, node):
        self._current_node = node
        self._handle_assign_target(node.target)
        self.generic_visit(node)
        
    def visit_AugAssign(self, node):
        """Augmented assignment (e.g. found+=1) — this is a variable USE, not init."""
        self._current_node = node
        if isinstance(node.target, ast.Name):
            var_name = node.target.id
            self.used_vars.add(var_name)
            self.add_element(node, "variable_use")
        self.generic_visit(node)


    def visit_Name(self, node):
        self._current_node = node
        if isinstance(node.ctx, ast.Load):
            var_name = node.id
            if var_name in self.defined_vars:
                self.used_vars.add(var_name)
                self.add_element(node, "variable_use")
                if var_name in self.custom_variable_uses:
                    t_name = f"{var_name}_variable_use"
                    # Prevent duplicate logging of the same node
                    if not any(e["type"] == t_name and e["lineno"] == node.lineno for e in self.code_elements):
                        self.add_element(node, t_name)
                        self.custom_counts[f"{t_name}_count"] += 1
                        
            # List usage fallback
            if var_name in self.custom_lists:
                t_name = f"{var_name}_list"
                if not any(e["type"] == t_name and e["lineno"] == node.lineno for e in self.code_elements):
                    self.add_element(node, t_name)
                    self.custom_counts[f"{t_name}_count"] += 1
                    
            if var_name in self.custom_tuples:
                t_name = f"{var_name}_tuple"
                if not any(e["type"] == t_name and e["lineno"] == node.lineno for e in self.code_elements):
                    self.add_element(node, t_name)
                    self.custom_counts[f"{t_name}_count"] += 1

        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        self._current_node = node
        self.add_element(node, "function_def")
        self.counts["function_def_count"] += 1
        # generic_visit will handle visiting args and body
        self.generic_visit(node)

    def visit_arg(self, node):
        """Function parameters: track in defined_vars but do NOT emit variable_init."""
        self.defined_vars.add(node.arg)

    def _register_definition(self, var_name, node):
        """Emit variable_init and track in defined_vars. Always emits for explicit assignments."""
        self.defined_vars.add(var_name)
        self.init_vars.add(var_name)
        self.add_element(node, "variable_init")
        if var_name in self.custom_variable_inits:
            t_name = f"{var_name}_variable_init"
            self.add_element(node, t_name)
            self.custom_counts[f"{t_name}_count"] = self.custom_counts.get(f"{t_name}_count", 0) + 1
        if var_name in self.custom_lists:
            t_name = f"{var_name}_list"
            self.add_element(node, t_name)
            self.custom_counts[f"{t_name}_count"] = self.custom_counts.get(f"{t_name}_count", 0) + 1
        if var_name in self.custom_tuples:
            t_name = f"{var_name}_tuple"
            self.add_element(node, t_name)
            self.custom_counts[f"{t_name}_count"] = self.custom_counts.get(f"{t_name}_count", 0) + 1

    def _handle_assign_target(self, target):
        """Called for plain Assign and AnnAssign — always emits variable_init."""
        if isinstance(target, ast.Name):
            self._register_definition(target.id, self._current_node)
        elif isinstance(target, (ast.Tuple, ast.List)):
            for elt in target.elts:
                self._handle_assign_target(elt)

    def visit_Call(self, node):
        self._current_node = node
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name == "list":
                self.add_element(node, "list")
                self.counts["list_count"] += 1
            elif func_name == "tuple":
                self.add_element(node, "tuple")
                self.counts["tuple_count"] += 1
            elif func_name in self.builtin_functions:
                # Built-in environment function (forward, turn_left, etc.)
                self.add_element(node, "builtin_call")
                self.counts["builtin_call_count"] += 1
                # Also emit specific custom tag if configured (e.g. detect_object_call)
                if func_name in self.custom_functions:
                    t_name = f"{func_name}_call"
                    self.add_element(node, t_name)
                    self.custom_counts[f"{t_name}_count"] += 1
            else:
                # User-defined function call
                self.add_element(node, "user_function_call")
                self.counts["user_function_call_count"] += 1
        
        # Manually visit arguments and keywords to avoid counting function name as variable use
        for arg in node.args:
            self.visit(arg)
        for kw in node.keywords:
            self.visit(kw)

    def visit_If(self, node):
        self._current_node = node
        
        # Add the entire block
        self.add_element(node, "branching")
        
        # traverse the if-elif-else chain properly without double counting blocks
        curr = node
        self.counts["branching_count"] += 1
        self.counts["if_count"] += 1
        
        while True:
            # IMPORTANT: Visit the test expression!
            self.visit(curr.test)
            
            # Visit body of current if/elif
            for child in curr.body:
                self.visit(child)
                
            if curr.orelse:
                if len(curr.orelse) == 1 and isinstance(curr.orelse[0], ast.If):
                    # This is an elif
                    curr = curr.orelse[0]
                    self.counts["branching_count"] += 1
                    self.counts["elif_count"] += 1
                else:
                    # This is an else block
                    self.counts["branching_count"] += 1
                    self.counts["else_count"] += 1
                    for child in curr.orelse:
                        self.visit(child)
                    break
            else:
                break

    def visit_For(self, node):
        self._current_node = node
        self.add_element(node, "loop")
        self.counts["loop_count"] += 1
        self.counts["for_count"] += 1
        # Do NOT register loop counter as variable_init — it is part of the loop construct
        self.generic_visit(node)

    def visit_While(self, node):
        self._current_node = node
        self.add_element(node, "loop")
        self.counts["loop_count"] += 1
        self.counts["while_count"] += 1
        self.generic_visit(node)

    def visit_List(self, node):
        self._current_node = node
        self.add_element(node, "list")
        self.counts["list_count"] += 1
        self.generic_visit(node)

    def visit_Tuple(self, node):
        self._current_node = node
        self.add_element(node, "tuple")
        self.counts["tuple_count"] += 1
        self.generic_visit(node)

def extract_comments(code):
    comments = []
    try:
        tokens = tokenize.generate_tokens(io.StringIO(code).readline)
        for tok in tokens:
            if tok.type == tokenize.COMMENT:
                comments.append({
                    "start_line": tok.start[0],
                    "end_line": tok.end[0],
                    "text": tok.string
                })
    except tokenize.TokenError:
        logger.debug("Could not tokenize incomplete code while extracting comments")
    return comments

def analyze_code(code: str, config_path: Optional[str] = None) -> dict:
    logger.debug("Starting AST code analysis: characters=%d", len(code or ""))
    config = load_config(config_path)
    code_lines = code.split('\n')
    
    code_elements = []
    
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        logger.warning("AST code analysis found syntax error at line %s", e.lineno)
        return {"error": str(e), "code_elements": [], "stats": {}}
        
    visitor = CodeAnalyzerVisitor(code_lines, config)
    # Pass 1: Pre-scan for all variable definitions to handle globals used in functions
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                if isinstance(target, ast.Name):
                    visitor.defined_vars.add(target.id)
        elif isinstance(node, ast.arg):
            visitor.defined_vars.add(node.arg)

    # Pass 2: Full analysis
    visitor.visit(tree)
    
    # Process Comments using tokenize
    comments = extract_comments(code)
    visitor.counts["comment_count"] = len(comments)
    
    # Calculate aggregate custom count
    visitor.counts["custom_objects_count"] = sum(visitor.custom_counts.values())
    
    for c in comments:
        lines = code_lines[c["start_line"] - 1 : c["end_line"]]
        code_elements.append({
            "type": "comment",
            "line": "\n".join(lines).strip(),
            "lineno": c["start_line"],
            "end_lineno": c["end_line"]
        })
        
    visitor.counts["variable_init_count"] = len(visitor.init_vars)
    visitor.counts["variable_use_count"] = len(visitor.used_vars)
        
    # Merge code elements and deduplicate within the same line
    seen = set()
    for el in visitor.code_elements:
        # Deduplication key: (type, line_content, approx_lineno)
        # We use lineno to allow same line content at different parts of code
        key = (el["type"], el["line"], el.get("lineno"))
        if key not in seen:
            code_elements.append(el)
            seen.add(key)
        
    # Sort elements by line number for clean JSON output
    code_elements.sort(key=lambda x: x.get("lineno", 0))

    # Construct stats
    stats = {}
    for key, c in visitor.counts.items():
        base_name = key.replace("_count", "")
        stats[base_name] = (c > 0)
        stats[key] = c
        
    for key, c in visitor.custom_counts.items():
        base_name = key.replace("_count", "")
        stats[base_name] = (c > 0)
        stats[key] = c

    result = {
        "code_elements": code_elements,
        "stats": stats
    }
    logger.debug("AST code analysis completed: elements=%d", len(code_elements))
    return result


