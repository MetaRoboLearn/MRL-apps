import threading
import io
import contextlib
from flask import jsonify

from sandbox.sim_state import SimState
from sandbox.ast_validator import validate_code, CodeValidationError

EXEC_TIMEOUT = 2
MAX_OUTPUT_LEN = 1024


def _make_sdk_funcs(steps: list, sim: SimState = None):
    def _print(a=''):
        steps.append({"type": "print", "value": str(a)})

    def forward(a=0, b=0):
        if sim:
            success = sim.move_forward()
            steps.append({"type": "move", "direction": "forward", "blocked": not success})
        else:
            steps.append({"type": "move", "direction": "forward"})

    def back(a=0, b=0):
        if sim:
            success = sim.move_backward()
            steps.append({"type": "move", "direction": "backward", "blocked": not success})
        else:
            steps.append({"type": "move", "direction": "backward"})

    def turn_left(a=0, b=0):
        if sim:
            sim.rotate_left()
        steps.append({"type": "rotate", "direction": "left"})

    def turn_right(a=0, b=0):
        if sim:
            sim.rotate_right()
        steps.append({"type": "rotate", "direction": "right"})

    def display_char(a=''):
        steps.append({"type": "display", "value": str(a)[0]})

    def display_text(a=''):
        steps.append({"type": "display", "value": str(a)})

    def display_clear():
        steps.append({"type": "display_clear"})

    def display_green():
        steps.append({"type": "display", "value": 'GREEN 🟢'})

    def display_red():
        steps.append({"type": "display", "value": 'RED 🔴'})

    def sleep(a=0):
        steps.append({"type": "sleep", "value": a})

    def detect_object():
        if sim:
            tile = sim.get_tile_ahead()
            steps.append({"type": "detect", "result": tile})
            return tile
        return None

    def detect_object_conf(min_confidence=0.2):
        if sim:
            tile = sim.get_tile_ahead()
            steps.append({"type": "detect", "result": (tile, float(1))})
            return tile, float(1) 
        return None


    return {
        "print": _print,
        "forward": forward,
        "back": back,
        "turn_left": turn_left,
        "turn_right": turn_right,
        "display_char": display_char,
        "display_text": display_text,
        "display_clear": display_clear,
        "display_green": display_green,
        "display_red": display_red,
        "sleep": sleep,
        "detect_object": detect_object,
        "detect_object_conf": detect_object_conf,
    }


def run_user_code(code: str, output: io.StringIO, error: io.StringIO, sdk_funcs: dict):
    try:
        namespace = {**sdk_funcs}
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(error):
            exec(code, namespace)
    except Exception as e:
        error.write(f"{type(e).__name__}: {str(e)}\n")


def sb_run_python(code, grid_state=None):
    try:
        validate_code(code)
    except CodeValidationError as e:
        return jsonify({"error": str(e)}), 400

    steps = []
    sim = SimState(grid_state) if grid_state else None
    sdk_funcs = _make_sdk_funcs(steps, sim)
    stdout = io.StringIO()
    stderr = io.StringIO()

    thread = threading.Thread(target=run_user_code, args=(code, stdout, stderr, sdk_funcs))
    thread.start()
    thread.join(EXEC_TIMEOUT)

    if thread.is_alive():
        return jsonify({
            "steps": steps,
            "finished": sim.is_finished() if sim else False,
            "output": stdout.getvalue()[:MAX_OUTPUT_LEN],
            "error": f"Execution timed out after {EXEC_TIMEOUT} seconds."
        }), 408

    output = stdout.getvalue()
    error = stderr.getvalue()

    if len(output) > MAX_OUTPUT_LEN:
        output = output[:MAX_OUTPUT_LEN] + "\n...[output truncated]"

    return jsonify({
        "steps": steps,
        "finished": sim.is_finished() if sim else False,
        "output": output,
        "error": error
    })