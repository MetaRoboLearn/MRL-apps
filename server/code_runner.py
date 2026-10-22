"""
code_runner.py

Standalone module for student code validation and sandboxed execution.
Designed to be usable both from the Flask routes and from offline log analysis.
No Flask dependency.
"""

from __future__ import annotations

import contextlib
import io
import json
import math
import threading
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional

from sandbox.sim_state import SimState

EXEC_TIMEOUT = 2       # seconds before execution is killed
MAX_OUTPUT_LEN = 1024  # bytes of stdout kept


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class CodeErrorType(Enum):
    SYNTAX_ERROR   = "syntax_error"
    SECURITY_ERROR = "security_error"


@dataclass
class CodeValidationError:
    """Structured error returned by validate_code().

    Attributes:
        error_type: broad category of the error (CodeErrorType).
        message:    human-readable description.
        line:       1-based line number where the error was found, if known.
        offset:     1-based column offset within that line, if known.
        text:       the raw source line that triggered the error, if known.
    """
    error_type: CodeErrorType
    message:    str
    line:       Optional[int] = None
    offset:     Optional[int] = None
    text:       Optional[str] = None


def validate_code(code: str) -> Optional[CodeValidationError]:
    """Check student code for security issues and syntax errors.

    Args:
        code: raw Python source string to validate.

    Returns:
        A CodeValidationError if the code is invalid, or None if it is clean.
    """
    # Security: forbid any import statement before attempting to parse.
    if "import" in code:
        return CodeValidationError(
            error_type=CodeErrorType.SECURITY_ERROR,
            message="Import statements are not allowed.",
        )

    # Syntax: compile without executing to surface parse errors.
    try:
        compile(code, "<student_code>", "exec")
    except SyntaxError as e:
        return CodeValidationError(
            error_type=CodeErrorType.SYNTAX_ERROR,
            message=e.msg,
            line=e.lineno,
            offset=e.offset,
            text=e.text,
        )

    return None


# ---------------------------------------------------------------------------
# Sandboxed execution
# ---------------------------------------------------------------------------

@dataclass
class CodeRunResult:
    """Result returned by run_code_on_map().

    Attributes:
        steps:     ordered list of robot-action dicts (move, rotate, detect, …).
        output:    captured stdout (truncated to MAX_OUTPUT_LEN if needed).
        error:     captured stderr or runtime exception message (empty if clean).
        finished:  True when the robot reached the goal tile by the end of execution.
        timed_out: True when the thread exceeded EXEC_TIMEOUT and was abandoned.
    """
    steps:     list  = field(default_factory=list)
    output:    str   = ""
    error:     str   = ""
    finished:  bool  = False
    timed_out: bool  = False


def _make_builtins(steps: list, sim: SimState) -> dict:
    """Build the safe global namespace injected into exec()."""

    def _print(a=''):
        steps.append({"type": "print", "value": str(a)})

    def forward(a=0, b=0):
        success = sim.move_forward()
        steps.append({"type": "move", "direction": "forward", "blocked": not success})

    def back(a=0, b=0):
        success = sim.move_backward()
        steps.append({"type": "move", "direction": "backward", "blocked": not success})

    def turn_left(a=0, b=0):
        sim.rotate_left()
        steps.append({"type": "rotate", "direction": "left"})

    def turn_right(a=0, b=0):
        sim.rotate_right()
        steps.append({"type": "rotate", "direction": "right"})

    def display_char(a=''):
        steps.append({"type": "display", "value": str(a)[0]})

    def display_text(a=''):
        steps.append({"type": "display", "value": str(a)})

    def display_clear():
        steps.append({"type": "display_clear"})

    def display_green():
        steps.append({"type": "display", "value": "GREEN 🟢"})

    def display_red():
        steps.append({"type": "display", "value": "RED 🔴"})

    def sleep(a=0):
        steps.append({"type": "sleep", "value": a})

    def detect_object():
        tile = sim.get_tile_ahead()
        steps.append({"type": "detect", "result": tile})
        return tile

    return {
        "print":         _print,
        "forward":       forward,
        "back":          back,
        "turn_left":     turn_left,
        "turn_right":    turn_right,
        "display_char":  display_char,
        "display_text":  display_text,
        "display_clear": display_clear,
        "display_green": display_green,
        "display_red":   display_red,
        "sleep":         sleep,
        "detect_object": detect_object,
        "abs":           abs,
        "bool":          bool,
        "dict":          dict,
        "enumerate":     enumerate,
        "float":         float,
        "int":           int,
        "len":           len,
        "list":          list,
        "max":           max,
        "min":           min,
        "range":         range,
        "set":           set,
        "str":           str,
        "sum":           sum,
        "zip":           zip,
        "math":          math,
    }


def _exec_in_thread(code: str, stdout: io.StringIO, stderr: io.StringIO, builtins: dict) -> None:
    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(code, {"__builtins__": {}}, builtins)  # noqa: S102
    except Exception as e:
        stderr.write(f"{type(e).__name__}: {str(e)}\n")


def run_code_on_map(code: str, grid_state: dict) -> CodeRunResult:
    """Execute student code inside a sandboxed environment on the given map.

    The code is run in a separate thread and killed (abandoned) after
    EXEC_TIMEOUT seconds. stdout is captured and truncated if necessary.

    Args:
        code:       raw Python source string.
        grid_state: dict describing the map (size_x, size_z, start, barriers,
                    stickers, finish, …) — same schema used by SimState.

    Returns:
        A CodeRunResult with steps, output, error, finished, and timed_out.
    """
    steps  = []
    sim    = SimState(grid_state)
    builtins = _make_builtins(steps, sim)
    stdout = io.StringIO()
    stderr = io.StringIO()

    thread = threading.Thread(
        target=_exec_in_thread,
        args=(code, stdout, stderr, builtins),
        daemon=True,
    )
    thread.start()
    thread.join(EXEC_TIMEOUT)

    timed_out = thread.is_alive()
    output    = stdout.getvalue()
    error     = stderr.getvalue() if not timed_out else f"Execution timed out after {EXEC_TIMEOUT} seconds."

    if len(output) > MAX_OUTPUT_LEN:
        output = output[:MAX_OUTPUT_LEN] + "\n...[output truncated]"

    return CodeRunResult(
        steps=steps,
        output=output,
        error=error,
        finished=sim.is_finished(),
        timed_out=timed_out,
    )


# ---------------------------------------------------------------------------
# Database loading  (for offline log analysis against a live DB or restored dump)
# ---------------------------------------------------------------------------

_LOG_QUERY = """
    SELECT
        utl.id              AS log_id,
        utl.created_at,
        utl.event_type_id,
        et.name             AS event_type_name,
        utl.code_snapshot,
        u.id                AS user_id,
        u.username,
        u.first_name,
        u.last_name,
        t.id                AS task_id,
        t.title             AS task_title,
        t.size_x,
        t.size_z,
        t.start             AS start_tile,
        t.rotation          AS start_rotation,
        t.finish,
        t.barriers,
        t.stickers
    FROM user_task_logs         utl
    JOIN user_started_tasks     ust ON utl.user_started_task_id = ust.id
    JOIN users                  u   ON ust.started_by           = u.id
    JOIN activity_tasks         act ON ust.activity_task_id     = act.id
    JOIN tasks                  t   ON act.task_id              = t.id
    JOIN event_types            et  ON utl.event_type_id        = et.id
    {where}
    ORDER BY utl.created_at
    {limit}
"""


@dataclass
class LogEntry:
    """One row from the joined log query, ready for analysis.

    Attributes:
        log_id:          Primary key of the user_task_logs row.
        created_at:      Timestamp of the event.
        event_type_id:   Numeric event type (see EventTypes constants).
        event_type_name: Human-readable event type name.
        code_snapshot:   The Python/Blockly source captured at the time of the event.
        user_id:         ID of the student who triggered the event.
        username:        Login name of the student.
        first_name:      Student first name.
        last_name:       Student last name.
        task_id:         ID of the task the student was working on.
        task_title:      Human-readable task title.
        grid_state:      Dict ready to be passed directly to run_code_on_map() or
                         SimState(); contains size_x, size_z, start, start_rotation,
                         finish, barriers, stickers.
    """
    log_id:          int
    created_at:      datetime
    event_type_id:   int
    event_type_name: str
    code_snapshot:   Optional[str]
    user_id:         int
    username:        str
    first_name:      str
    last_name:       str
    task_id:         int
    task_title:      str
    grid_state:      dict


def _parse_json_column(value) -> object:
    """SQLAlchemy returns JSON columns as Python objects; raw psycopg2 rows may
    return them as strings.  Handle both gracefully."""
    if value is None:
        return None
    if isinstance(value, str):
        return json.loads(value)
    return value


def _row_to_grid_state(row) -> dict:
    """Convert a DB result row into the grid_state dict expected by SimState."""
    return {
        "size_x":         row.size_x,
        "size_z":         row.size_z,
        "start":          row.start_tile,
        "start_rotation": row.start_rotation or 0,
        "finish":         row.finish,
        "barriers":       _parse_json_column(row.barriers) or [],
        "stickers":       _parse_json_column(row.stickers) or [],
    }


def load_logs_from_db(
    database_url: str,
    *,
    event_type_ids: Optional[List[int]] = None,
    user_ids:       Optional[List[int]] = None,
    task_ids:       Optional[List[int]] = None,
    limit:          Optional[int] = None,
) -> List[LogEntry]:
    """Query log rows from a PostgreSQL database (live or restored from a .sql dump)
    and return them as LogEntry objects, each already carrying the task's grid_state.

    Args:
        database_url:   SQLAlchemy-compatible connection string, e.g.
                        ``postgresql+psycopg2://user:pass@localhost:5432/mrl``.
                        Can also be supplied via the ``DATABASE_URL`` environment
                        variable — pass ``os.environ["DATABASE_URL"]`` at call site.
        event_type_ids: Optional whitelist of event_type_id values to include.
                        E.g. ``[EventTypes.SIM_RUN, EventTypes.SIM_CODE_ERR]``.
        user_ids:       Optional whitelist of user IDs to include.
        task_ids:       Optional whitelist of task IDs to include.
        limit:          Cap the number of rows returned (applied after ORDER BY).

    Returns:
        List of LogEntry, ordered by created_at ascending.

    Raises:
        ImportError:  if SQLAlchemy is not installed.
        sqlalchemy.exc.OperationalError: if the database is unreachable.
    """
    try:
        from sqlalchemy import create_engine, text  # lazy import — not needed for validation/execution paths
    except ImportError as exc:
        raise ImportError(
            "SQLAlchemy is required for load_logs_from_db(). "
            "Install it with: pip install sqlalchemy"
        ) from exc

    conditions: List[str] = []
    params: dict = {}

    if event_type_ids:
        conditions.append("utl.event_type_id = ANY(:event_type_ids)")
        params["event_type_ids"] = list(event_type_ids)
    if user_ids:
        conditions.append("u.id = ANY(:user_ids)")
        params["user_ids"] = list(user_ids)
    if task_ids:
        conditions.append("t.id = ANY(:task_ids)")
        params["task_ids"] = list(task_ids)

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    limit_clause = f"LIMIT {int(limit)}" if limit is not None else ""

    sql = text(_LOG_QUERY.format(where=where_clause, limit=limit_clause))

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, params).mappings().all()
    finally:
        engine.dispose()

    return [
        LogEntry(
            log_id=row["log_id"],
            created_at=row["created_at"],
            event_type_id=row["event_type_id"],
            event_type_name=row["event_type_name"],
            code_snapshot=row["code_snapshot"],
            user_id=row["user_id"],
            username=row["username"],
            first_name=row["first_name"],
            last_name=row["last_name"],
            task_id=row["task_id"],
            task_title=row["task_title"],
            grid_state=_row_to_grid_state(row),
        )
        for row in rows
    ]
