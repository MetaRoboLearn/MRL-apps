# pylint: disable=invalid-name

"""
ast_validator.py — AST-based safety checker for student code.

Walks the AST before execution and raises CodeValidationError if any
disallowed construct is found. The whitelist approach means only
explicitly permitted names and builtins are allowed.
"""

import ast
from typing import Set


class CodeValidationError(Exception):
    """Raised when student code contains disallowed constructs."""


# ---------------------------------------------------------------------------
# Whitelists
# ---------------------------------------------------------------------------

# Functions students may call (all come from robot_sdk)
ALLOWED_SDK_CALLS: Set[str] = {
    "forward",
    "back",
    "turn_left",
    "turn_right",
    "raw_forward",
    "raw_back",
    "raw_turn_left",
    "raw_turn_right",
    "sleep",
    "print",
    "detect_object",
    "detect_object_conf",
    "display_text",
    "display_char",
    "display_red",
    "display_green",
    "display_rotate",
    "display_clear",
}

# Safe built-in names students may reference
ALLOWED_BUILTINS: Set[str] = {
    # Types / constructors
    "int",
    "float",
    "str",
    "bool",
    "list",
    "dict",
    "tuple",
    "set",
    "bytes",
    "bytearray",
    # Iteration / functional
    "range",
    "enumerate",
    "zip",
    "map",
    "filter",
    "reversed",
    "sorted",
    "len",
    "sum",
    "min",
    "max",
    "abs",
    "round",
    # I/O (print is routed through SDK)
    "print",
    # Conversion
    "repr",
    "chr",
    "ord",
    "hex",
    "bin",
    "oct",
    # Logic
    "all",
    "any",
    "isinstance",
    "issubclass",
    "callable",
    # Type inspection (safe subset)
    "type",
    # Constants
    "True",
    "False",
    "None",
    # Exceptions students may use in try/except
    "Exception",
    "ValueError",
    "TypeError",
    "RuntimeError",
    "KeyError",
    "IndexError",
    "AttributeError",
    "StopIteration",
    "ZeroDivisionError",
    "OverflowError",
    # Iteration protocol
    "iter",
    "next",
}

# Allowed import targets (only robot_sdk)
ALLOWED_IMPORTS: Set[str] = {"robot_sdk", "numbers"}

# Disallowed attribute access patterns (dunder and private access)
BLOCKED_ATTR_PREFIXES = ("__", "_")

# AST node types that are outright forbidden
FORBIDDEN_NODE_TYPES = (
    ast.AsyncFunctionDef,  # async def — no async code
    ast.AsyncFor,
    ast.AsyncWith,
    ast.Global,  # global — could escape sandbox
    ast.Nonlocal,  # nonlocal — same concern
)

# Allow SDK names, builtins, and anything that looks like a user variable
# We can't easily distinguish user-defined vars from builtins at AST level,
# so we only block names that are known-dangerous builtins/globals.
EXPLICITLY_BLOCKED_NAMES: Set[str] = {
    "exec",
    "eval",
    "compile",
    "__import__",
    "open",
    "input",
    "breakpoint",
    "globals",
    "locals",
    "vars",
    "dir",
    "getattr",
    "setattr",
    "delattr",
    "hasattr",
    "object",
    "super",
    "staticmethod",
    "classmethod",
    "property",
    "memoryview",
    "slice",
    "__builtins__",
    "__build_class__",
}

# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------


class _Validator(ast.NodeVisitor):
    def __init__(self, user_defined_functions: Set[str]):
        """
        Initialize the validator with user-defined functions.

        Args:
            user_defined_functions (Set[str]): A set of user-defined function names.
        """
        self.errors: list[str] = []
        self._user_defined_functions = user_defined_functions

    def _err(self, node: ast.AST, msg: str):
        """
        Record an error message for a specific AST node.

        Args:
            node (ast.AST): The AST node where the error occurred.
            msg (str): The error message to record.
        """
        lineno = getattr(node, "lineno", "?")
        self.errors.append(f"Line {lineno}: {msg}")

    # --- Imports -----------------------------------------------------------

    def visit_Import(self, node: ast.Import):
        """
        Validate import statements to ensure only allowed modules are imported.

        Args:
            node (ast.Import): The AST node representing an import statement.
        """
        for alias in node.names:
            root = alias.name.split(".")[0]
            if root not in ALLOWED_IMPORTS:
                self._err(
                    node,
                    f"Import of '{alias.name}' is not allowed. "
                    f"Only 'robot_sdk' may be imported.",
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        """
        Validate `from ... import ...` statements to ensure only allowed modules are imported.

        Args:
            node (ast.ImportFrom): The AST node representing a `from ... import ...` statement.
        """
        root = (node.module or "").split(".")[0]
        if root not in ALLOWED_IMPORTS:
            self._err(
                node,
                f"Import from '{node.module}' is not allowed. "
                f"Only 'robot_sdk' may be imported.",
            )
        self.generic_visit(node)

    # --- Calls -------------------------------------------------------------

    def visit_Call(self, node: ast.Call):
        """
        Validate function calls to ensure only allowed functions are called.

        Args:
            node (ast.Call): The AST node representing a function call.
        """
        func = node.func

        if isinstance(func, ast.Name):
            name = func.id
            if (
                name not in ALLOWED_SDK_CALLS
                and name not in ALLOWED_BUILTINS
                and name not in self._user_defined_functions
            ):
                self._err(node, f"Call to '{name}' is not allowed.")

        elif isinstance(func, ast.Attribute):
            # e.g. something.method() — only allow on robot_sdk module reference
            # and only SDK methods; block everything else
            if isinstance(func.value, ast.Name) and func.value.id == "robot_sdk":
                if func.attr not in ALLOWED_SDK_CALLS:
                    self._err(
                        node, f"robot_sdk.{func.attr} is not an allowed SDK method."
                    )
            else:
                # Attribute calls on arbitrary objects (obj.method()) are blocked
                # to prevent e.g. list.sort bypass or __class__.__subclasses__() chains
                self._err(
                    node,
                    f"Method call '.{func.attr}()' on arbitrary objects is not allowed.",
                )

        self.generic_visit(node)

    def visit_Expr(self, node: ast.Expr):
        """
        Validate expression statements to catch likely missed function calls.

        Args:
            node (ast.Expr): The AST node representing an expression statement.
        """
        # Catch common student mistake:
        #   forward
        # instead of:
        #   forward()
        if isinstance(node.value, ast.Name):
            if node.value.id in ALLOWED_SDK_CALLS:
                self._err(
                    node,
                    (
                        f"'{node.value.id}' is a function name, but it is not being called. "
                        f"Use '{node.value.id}()' to run it (add parenthesis ())."
                    ),
                )

        # Also catch module-style usage:
        #   robot_sdk.forward
        # instead of:
        #   robot_sdk.forward()
        elif (
            isinstance(node.value, ast.Attribute)
            and isinstance(node.value.value, ast.Name)
            and node.value.value.id == "robot_sdk"
            and node.value.attr in ALLOWED_SDK_CALLS
        ):
            self._err(
                node,
                (
                    f"'robot_sdk.{node.value.attr}' is a function name, but it is not "
                    f"being called. Use 'robot_sdk.{node.value.attr}()' to run it "
                    "(add parenthesis ())."
                ),
            )

        self.generic_visit(node)

    # --- Attribute access --------------------------------------------------

    def visit_Attribute(self, node: ast.Attribute):
        """
        Validate attribute access to ensure private and dunder attributes are not accessed.

        Args:
            node (ast.Attribute): The AST node representing an attribute access.
        """
        if node.attr.startswith("__") or (
            node.attr.startswith("_") and not node.attr.startswith("__")
        ):
            self._err(
                node,
                f"Access to private/dunder attribute '{node.attr}' is not allowed.",
            )
        self.generic_visit(node)

    # --- Name access -------------------------------------------------------

    def visit_Name(self, node: ast.Name):
        """
        Validate name access to ensure only allowed names are used.

        Args:
            node (ast.Name): The AST node representing a name access.
        """
        if isinstance(node.ctx, ast.Load):
            name = node.id
            if name in EXPLICITLY_BLOCKED_NAMES:
                self._err(node, f"Use of '{name}' is not allowed.")
        self.generic_visit(node)

    # --- Forbidden node types ----------------------------------------------

    def visit_AsyncFunctionDef(self, node):
        """
        Validate async function definitions to ensure they are not used.

        Args:
            node (ast.AsyncFunctionDef): The AST node representing an async function definition.
        """
        self._err(node, "Async functions (async def) are not allowed.")
        self.generic_visit(node)

    def visit_AsyncFor(self, node):
        """
        Validate async for loops to ensure they are not used.

        Args:
            node (ast.AsyncFor): The AST node representing an async for loop.
        """
        self._err(node, "Async for loops are not allowed.")
        self.generic_visit(node)

    def visit_AsyncWith(self, node):
        """
        Validate async with statements to ensure they are not used.

        Args:
            node (ast.AsyncWith): The AST node representing an async with statement.
        """
        self._err(node, "Async with statements are not allowed.")
        self.generic_visit(node)

    def visit_Global(self, node):
        """
        Validate global statements to ensure they are not used.

        Args:
            node (ast.Global): The AST node representing a global statement.
        """
        self._err(node, "The 'global' statement is not allowed.")
        self.generic_visit(node)

    def visit_Nonlocal(self, node):
        """
        Validate nonlocal statements to ensure they are not used.

        Args:
            node (ast.Nonlocal): The AST node representing a nonlocal statement.
        """
        self._err(node, "The 'nonlocal' statement is not allowed.")
        self.generic_visit(node)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def validate_code(source: str) -> None:
    """
    Parse and validate `source` against the whitelist.

    Raises CodeValidationError with a descriptive message if any
    disallowed construct is found. Raises SyntaxError if the code
    doesn't parse.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        raise CodeValidationError(f"Syntax error in student code: {e}") from e

    user_defined_functions: Set[str] = {
        node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)
    }

    validator = _Validator(user_defined_functions)
    validator.visit(tree)

    if validator.errors:
        msg = "\n".join(validator.errors)
        raise CodeValidationError(msg)
