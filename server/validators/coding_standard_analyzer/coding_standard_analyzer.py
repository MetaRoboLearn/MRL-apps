import ast
import json
import os
import re
from typing import Optional


DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../configs/validators/code_element_detection/code_analyzer_config.json",
)


def load_config(config_path=None):
    config_path = config_path or DEFAULT_CONFIG_PATH
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

class CodingStandardVisitor(ast.NodeVisitor):
    def __init__(self, code_lines, config=None):
        self.code_lines = code_lines
        self.config = config or {}
        self.builtin_functions = set(self.config.get("builtin_functions", []))
        self.custom_functions = set(self.config.get("custom_functions", []))
        self.ignored_for_segments = self.builtin_functions.union(self.custom_functions)

        self.report = {
            "organization": {
                "top_level_sequence": [],
                "late_definitions": [],
                "late_imports": [],
                "has_main_block": False
            },
            "naming": {
                "variables": [],
                "functions": [],
                "style_violations": []
            },
            "logic": {
                "max_nesting_depth": 0,
                "repetitions": [],
                "magic_values": [],
                "redundant_calls": [],
                "potential_functions": []
            },
            "housekeeping": {
                "unused_functions": [],
                "empty_blocks": []
            }
        }
        self.current_depth = 0
        self.defined_functions = {}
        self.called_functions = set()
        self.execution_started = False
        
        # For repetition detection
        self.last_call_signature = None
        self.call_repeat_count = 0
        
        # For magic values detection
        self.constant_tracker = {} 
        
        # For redundant call detection
        self.current_scope_calls = {} 
        
        # For segment repetition detection
        self.segment_tracker = {} 

    def _is_snake_case(self, name):
        return bool(re.match(r'^[a-z_][a-z0-9_]*$', name))

    def visit_Module(self, node):
        self.current_scope_calls = {}
        self._analyze_segments(node.body)
        
        for child in node.body:
            node_type = type(child).__name__
            is_import = isinstance(child, (ast.Import, ast.ImportFrom))
            is_definition = isinstance(child, (ast.FunctionDef, ast.ClassDef))
            
            self.report["organization"]["top_level_sequence"].append({
                "type": node_type,
                "lineno": getattr(child, 'lineno', 0)
            })

            if not is_import and not is_definition:
                self.execution_started = True
            
            if self.execution_started:
                if is_definition:
                    self.report["organization"]["late_definitions"].append({
                        "name": getattr(child, 'name', 'unknown'),
                        "lineno": child.lineno
                    })
                if is_import:
                    self.report["organization"]["late_imports"].append({
                        "type": node_type,
                        "lineno": child.lineno
                    })
            
            if isinstance(child, ast.If):
                if isinstance(child.test, ast.Compare):
                    if isinstance(child.test.left, ast.Name) and child.test.left.id == "__name__":
                        self.report["organization"]["has_main_block"] = True

            self.visit(child)
        
        self._check_redundant_calls_in_scope()

    def visit_FunctionDef(self, node):
        old_scope = self.current_scope_calls
        self.current_scope_calls = {}
        
        self.defined_functions[node.name] = node.lineno
        
        if not self._is_snake_case(node.name):
            self.report["naming"]["style_violations"].append({
                "name": node.name, "type": "function", "lineno": node.lineno,
                "rule": "Use snake_case for function names"
            })

        self.report["naming"]["functions"].append({
            "name": node.name, "lineno": node.lineno,
            "args": [arg.arg for arg in node.args.args]
        })
        
        if len(node.body) == 1 and isinstance(node.body[0], (ast.Pass, ast.Constant)):
             self.report["housekeeping"]["empty_blocks"].append({
                 "type": "function", "name": node.name, "lineno": node.lineno
             })
        
        self._analyze_segments(node.body)
        self.generic_visit(node)
        
        self._check_redundant_calls_in_scope()
        self.current_scope_calls = old_scope

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Store):
            if not self._is_snake_case(node.id):
                self.report["naming"]["style_violations"].append({
                    "name": node.id, "type": "variable", "lineno": node.lineno,
                    "rule": "Use snake_case for variable names"
                })

            if not any(v['name'] == node.id for v in self.report["naming"]["variables"]):
                whitelist = {'i', 'j', 'x', 'y', 'r', 'g', 'b'}
                self.report["naming"]["variables"].append({
                    "name": node.id, "lineno": node.lineno,
                    "is_short": len(node.id) < 3 and node.id not in whitelist
                })
        self.generic_visit(node)

    def visit_Constant(self, node):
        val = node.value
        if isinstance(val, (int, float, str)) and not isinstance(val, bool) and val not in (0, 1, -1, ""):
            if val not in self.constant_tracker:
                self.constant_tracker[val] = []
            self.constant_tracker[val].append(node.lineno)
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            self.called_functions.add(func_name)
            
            current_sig = (func_name, len(node.args))
            if self.last_call_signature == current_sig:
                self.call_repeat_count += 1
            else:
                if self.call_repeat_count >= 2:
                    self.report["logic"]["repetitions"].append({
                        "func": self.last_call_signature[0],
                        "count": self.call_repeat_count + 1,
                        "lineno": node.lineno - self.call_repeat_count
                    })
                self.last_call_signature = current_sig
                self.call_repeat_count = 0
            
            call_key = f"{func_name}({len(node.args)})"
            if call_key not in self.current_scope_calls:
                self.current_scope_calls[call_key] = []
            self.current_scope_calls[call_key].append(node.lineno)
        
        self.generic_visit(node)

    def _check_redundant_calls_in_scope(self):
        important_sensors = {"detect_object", "detect_object_conf", "get_detect_confidence", "get_distance"}
        for sig, linenos in self.current_scope_calls.items():
            if len(linenos) >= 2:
                fname = sig.split("(")[0]
                if fname in important_sensors:
                     self.report["logic"]["redundant_calls"].append({
                        "call": sig, "count": len(linenos), "linenos": sorted(list(set(linenos)))
                    })

    def _visit_block_with_scope(self, nodes):
        if not nodes: return
        old_scope = self.current_scope_calls
        self.current_scope_calls = {}
        self._analyze_segments(nodes)
        for n in nodes:
            self.visit(n)
        self._check_redundant_calls_in_scope()
        self.current_scope_calls = old_scope

    def visit_If(self, node):
        self.current_depth += 1
        self.report["logic"]["max_nesting_depth"] = max(self.report["logic"]["max_nesting_depth"], self.current_depth)
        
        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            self.report["housekeeping"]["empty_blocks"].append({
                "type": "If", "lineno": node.lineno
            })

        # Test is in parent scope
        self.visit(node.test)
        
        # Body and orelse are in sub-scopes
        self._visit_block_with_scope(node.body)
        self._visit_block_with_scope(node.orelse)
        
        self.current_depth -= 1

    def visit_For(self, node):
        self.current_depth += 1
        self.report["logic"]["max_nesting_depth"] = max(self.report["logic"]["max_nesting_depth"], self.current_depth)
        
        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            self.report["housekeeping"]["empty_blocks"].append({
                "type": "For", "lineno": node.lineno
            })

        # Iter is in parent scope
        self.visit(node.iter)
        self.visit(node.target)
        
        # Body and orelse are in sub-scopes
        self._visit_block_with_scope(node.body)
        self._visit_block_with_scope(node.orelse)
        
        self.current_depth -= 1

    def visit_While(self, node):
        self.current_depth += 1
        self.report["logic"]["max_nesting_depth"] = max(self.report["logic"]["max_nesting_depth"], self.current_depth)
        
        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            self.report["housekeeping"]["empty_blocks"].append({
                "type": "While", "lineno": node.lineno
            })

        # Test is in parent scope
        self.visit(node.test)
        
        self._visit_block_with_scope(node.body)
        self._visit_block_with_scope(node.orelse)
        
        self.current_depth -= 1

    def _get_stmt_sig(self, node):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            if isinstance(call.func, ast.Name):
                return f"call:{call.func.id}"
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            return "assign"
        elif isinstance(node, ast.If): return "if"
        elif isinstance(node, ast.For): return "for"
        return type(node).__name__

    def _analyze_segments(self, nodes):
        if not nodes or len(nodes) < 3: return
        
        sigs = []
        for n in nodes:
            sig = self._get_stmt_sig(n)
            if sig.startswith("call:"):
                fname = sig.split(":")[1]
                if fname in self.ignored_for_segments:
                    sigs.append(None) 
                    continue
            sigs.append(sig)
            
        window_size = 3
        for i in range(len(sigs) - window_size + 1):
            window = tuple(sigs[i : i + window_size])
            if None in window: continue
            
            if window not in self.segment_tracker:
                self.segment_tracker[window] = []
            self.segment_tracker[window].append(getattr(nodes[i], 'lineno', 0))

def analyze_coding_standard(code: str, config_path: Optional[str] = None) -> dict:
    if not code or not code.strip():
        return {"error": "Empty code"}

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax error at line {e.lineno}: {e.msg}"}

    config = load_config(config_path)
    code_lines = code.splitlines()
    visitor = CodingStandardVisitor(code_lines, config)
    visitor.visit(tree)
    
    if visitor.last_call_signature and visitor.call_repeat_count >= 2:
        visitor.report["logic"]["repetitions"].append({
            "func": visitor.last_call_signature[0],
            "count": visitor.call_repeat_count + 1,
            "lineno": len(code_lines) - visitor.call_repeat_count
        })

    for func_name, line in visitor.defined_functions.items():
        if func_name not in visitor.called_functions and not func_name.startswith('_'):
            visitor.report["housekeeping"]["unused_functions"].append({
                "name": func_name, "lineno": line
            })

    for val, linenos in visitor.constant_tracker.items():
        if len(linenos) >= 3:
            visitor.report["logic"]["magic_values"].append({
                "value": val, "count": len(linenos), "linenos": sorted(list(set(linenos)))
            })

    for seg, linenos in visitor.segment_tracker.items():
        if len(linenos) >= 2:
            visitor.report["logic"]["potential_functions"].append({
                "sequence": list(seg), "count": len(linenos), "linenos": sorted(list(set(linenos)))
            })

    return visitor.report


