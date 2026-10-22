import json
import logging
import re
import os
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
    logger.warning("Regex code analyzer config not found: %s", config_path)
    return {}

def remove_strings(line):
    # naive way to patch out strings to not confuse regex with #, =, etc.
    line = re.sub(r'""".*?"""', '""', line)
    line = re.sub(r"'''.*?'''", "''", line)
    line = re.sub(r'".*?"', '""', line)
    line = re.sub(r"'.*?'", "''", line)
    return line

def analyze_code(code: str, config_path: Optional[str] = None) -> dict:
    logger.debug("Starting regex code analysis: characters=%d", len(code or ""))
    config = load_config(config_path)
    
    custom_functions = config.get("custom_functions", [])
    builtin_functions = set(config.get("builtin_functions", []))
    custom_variable_inits = config.get("custom_variable_init", [])
    custom_variable_uses = config.get("custom_variable_use", [])
    custom_lists = config.get("custom_list", [])
    custom_tuples = config.get("custom_tuple", [])
    
    code_elements = []
    
    counts = {
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
    
    # Pre-populate custom counts
    custom_counts = {}
    for cat, items in config.items():
        if isinstance(items, list):
            for item in items:
                suffix = ""
                if cat == "custom_functions": suffix = "_call"
                elif cat == "custom_variable_init": suffix = "_variable_init"
                elif cat == "custom_variable_use": suffix = "_variable_use"
                elif cat == "custom_list": suffix = "_list"
                elif cat == "custom_tuple": suffix = "_tuple"
                custom_counts[f"{item}{suffix}_count"] = 0
                
    defined_vars = set()   # All variables known to exist (including args/loop counters)
    init_vars = set()      # Variables that actually had an 'init' element emitted
    used_vars_emitted = set() # Variables that actually had a 'use' element emitted
    
    lines = code.split('\n')
    
    # Pass 1: Pre-scan for all variable definitions
    for line in lines:
        c_line = line.split('#')[0].strip()
        # Simple assignment
        m = re.match(r'^([a-zA-Z_]\w*)\s*(\+|-|\*|/|%|//|\*\*|&|\||\^|>>|<<)?=\s*(.*)', c_line)
        if m and not m.group(1).endswith(('=', '<', '>', '!')):
            op = m.group(2)
            if not op: # Only plain assignments are 'definitions'
                defined_vars.add(m.group(1))
        # Function args
        m_func = re.match(r'^def\s+([a-zA-Z_]\w*)\s*\((.*)\)', c_line)
        if m_func:
            args = m_func.group(2)
            for arg_m in re.finditer(r'\b([a-zA-Z_]\w*)\b', args):
                defined_vars.add(arg_m.group(1))

    # Pass 2: Full analysis
    for idx, line in enumerate(lines, start=1):
        stripped_line = line.strip()
        if not stripped_line:
            continue
            
        clean_line = remove_strings(stripped_line)
        
        # 1. Comments
        comment_match = re.search(r'#.*', clean_line)
        if comment_match:
            code_elements.append({"type": "comment", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": comment_match.start(), "end_col_offset": comment_match.end()})
            counts["comment_count"] += 1
            # remove comment part for further processing
            clean_line = clean_line[:comment_match.start()].strip()
            
        if not clean_line:
            continue
            
        # 2. Variable Init / Aug-Assign
        var_init_match = re.match(r'^([a-zA-Z_]\w*)\s*(\+|-|\*|/|%|//|\*\*|&|\||\^|>>|<<)?=\s*(.*)', clean_line)
        is_aug_assign = False
        if var_init_match:
            var_name = var_init_match.group(1)
            op = var_init_match.group(2)  # None for plain '=', operator char(s) for aug-assign
            # Skip comparison operators (==, <=, >=, !=)
            if not clean_line.split('=')[0].endswith(('=', '<', '>', '!')):
                if op:  # Augmented assignment (+=, -=, etc.) — treat as variable_use
                    is_aug_assign = True
                    used_vars_emitted.add(var_name)
                    code_elements.append({"type": "variable_use", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": var_init_match.start(1), "end_col_offset": var_init_match.end(1)})
                else:   # Plain assignment — always emit variable_init
                    defined_vars.add(var_name)
                    init_vars.add(var_name)
                    code_elements.append({"type": "variable_init", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": var_init_match.start(1), "end_col_offset": var_init_match.end(1)})
                    if var_name in custom_variable_inits:
                        t_name = f"{var_name}_variable_init"
                        code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": var_init_match.start(1), "end_col_offset": var_init_match.end(1)})
                        custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1
                    if var_name in custom_lists:
                        t_name = f"{var_name}_list"
                        code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": var_init_match.start(1), "end_col_offset": var_init_match.end(1)})
                        custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1
                    if var_name in custom_tuples:
                        t_name = f"{var_name}_tuple"
                        code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": var_init_match.start(1), "end_col_offset": var_init_match.end(1)})
                        custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1

        # 3. Branching
        branch_match = re.search(r'\b(if|elif|else)\b', clean_line)
        if branch_match:
            kword = branch_match.group(1)
            code_elements.append({"type": "branching", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": branch_match.start(1), "end_col_offset": branch_match.end(1)})
            counts["branching_count"] += 1
            counts[kword + "_count"] += 1

        # 4. Loop
        loop_match = re.search(r'\b(for|while)\b', clean_line)
        if loop_match:
            kword = loop_match.group(1)
            code_elements.append({"type": "loop", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": loop_match.start(1), "end_col_offset": loop_match.end(1)})
            counts["loop_count"] += 1
            counts[kword + "_count"] += 1
            
            # If it's a for loop, extract the variable(s) being defined
            if kword == "for":
                for_var_match = re.search(r'^for\s+(.*?)\s+in', clean_line)
                if for_var_match:
                    vars_str = for_var_match.group(1)
                    # Do NOT register loop counter as variable_init — it is part of the loop construct
                    for var_match in re.finditer(r'\b([a-zA-Z_]\w*)\b', vars_str):
                        v_name = var_match.group(1)
                        if v_name not in defined_vars:
                            defined_vars.add(v_name)  # track so it doesn't show as variable_use

        # 5. Function Def
        func_def_match = re.search(r'\bdef\s+([a-zA-Z_]\w*)\s*\((.*)\)', clean_line)
        if func_def_match:
            code_elements.append({"type": "function_def", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": func_def_match.start(1), "end_col_offset": func_def_match.end(1)})
            counts["function_def_count"] += 1
            # Extract arguments: track in defined_vars but do NOT emit variable_init
            args_content = func_def_match.group(2)
            for arg_match in re.finditer(r'\b([a-zA-Z_]\w*)\b', args_content):
                arg_name = arg_match.group(1)
                defined_vars.add(arg_name)  # track so they don't show as variable_use

        # 6. Function Call
        for match in re.finditer(r'\b([a-zA-Z_]\w*)\s*\(', clean_line):
            func_name = match.group(1)
            # exclude reserved words and built-in Python constructs
            if func_name not in ['if', 'elif', 'while', 'for', 'def', 'class', 'return', 'and', 'or', 'not', 'in', 'is', 'list', 'tuple']:
                if func_name in builtin_functions:
                    # Environment built-in function
                    code_elements.append({"type": "builtin_call", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": match.start(1), "end_col_offset": match.end(1)})
                    counts["builtin_call_count"] += 1
                    # Emit specific custom tag if configured (e.g. detect_object_call)
                    if func_name in custom_functions:
                        t_name = f"{func_name}_call"
                        code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": match.start(1), "end_col_offset": match.end(1)})
                        custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1
                else:
                    # User-defined function call
                    code_elements.append({"type": "user_function_call", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": match.start(1), "end_col_offset": match.end(1)})
                    counts["user_function_call_count"] += 1

        # 7. Variable Use (naive, find isolated word matching any defined variable)
        # We process right hand side of assign or the whole line if not assign
        rhs = clean_line
        if var_init_match:
            rhs = var_init_match.group(3) # Everything after '='
        
        for d_var in defined_vars:
            # Use finditer to get all occurrences with positions
            # Negative lookahead (?!\\s*\\() ensures we don't count function calls as variable use
            for use_match in re.finditer(r'\b' + d_var + r'\b(?!\s*\()', rhs):
                used_vars_emitted.add(d_var)
                code_elements.append({"type": "variable_use", "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": use_match.start(), "end_col_offset": use_match.end()})
                if d_var in custom_variable_uses:
                    t_name = f"{d_var}_variable_use"
                    code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx, "col_offset": use_match.start(), "end_col_offset": use_match.end()})
                    custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1

        # 8. List
        if '[' in clean_line and ']' in clean_line:
            code_elements.append({"type": "list", "line": stripped_line, "lineno": idx, "end_lineno": idx})
            counts["list_count"] += 1
        else:
            list_func_match = re.search(r'\blist\s*\(', clean_line)
            if list_func_match:
                code_elements.append({"type": "list", "line": stripped_line, "lineno": idx, "end_lineno": idx})
                counts["list_count"] += 1
                
        # custom lists tracking
        for c_list in custom_lists:
            if re.search(r'\b' + c_list + r'\b', clean_line):
                t_name = f"{c_list}_list"
                code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx})
                custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1

        # 9. Tuple
        # Naive: count elements separated by comma in parens but that's very brittle (function args).
        # We will just look for `tuple(` or literal `,` in parens not following a function name
        # Also just custom tuples
        if re.search(r'\btuple\s*\(', clean_line):
            code_elements.append({"type": "tuple", "line": stripped_line, "lineno": idx, "end_lineno": idx})
            counts["tuple_count"] += 1
        elif re.search(r'(?<![a-zA-Z_0-9])\([^()]*?,\s*[^()]*?\)', clean_line):
            # Matches (...) containing a comma, where ( is not immediately following a word (naive function call rejection)
            code_elements.append({"type": "tuple", "line": stripped_line, "lineno": idx, "end_lineno": idx})
            counts["tuple_count"] += 1
            
        for c_tuple in custom_tuples:
            if re.search(r'\b' + c_tuple + r'\b', clean_line):
                t_name = f"{c_tuple}_tuple"
                code_elements.append({"type": t_name, "line": stripped_line, "lineno": idx, "end_lineno": idx})
                custom_counts[f"{t_name}_count"] = custom_counts.get(f"{t_name}_count", 0) + 1

    counts["variable_init_count"] = len(init_vars)
    counts["variable_use_count"] = len(used_vars_emitted)
    
    # Calculate aggregate custom count
    counts["custom_objects_count"] = sum(custom_counts.values())
    
    # Deduplicate code_elements for the same line and type
    final_elements = []
    seen = set()
    for el in code_elements:
        key = (el["type"], el["line"], el.get("lineno"))
        if key not in seen:
            final_elements.append(el)
            seen.add(key)
            
    # Sort elements by line number
    final_elements.sort(key=lambda x: x.get("lineno", 0))
    
    stats = {}
    # Base types
    for key, c in counts.items():
        base_name = key.replace("_count", "")
        stats[base_name] = (c > 0)
        stats[key] = c
        
    # Custom types
    for key, c in custom_counts.items():
        base_name = key.replace("_count", "")
        stats[base_name] = (c > 0)
        stats[key] = c

    result = {
        "code_elements": final_elements,
        "stats": stats
    }
    logger.debug("Regex code analysis completed: elements=%d", len(final_elements))
    return result
