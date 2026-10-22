import os
import json
import requests
import websocket
from flask import Blueprint, jsonify, request
from flask_login import login_required
from flask_sock import Sock
from functools import wraps
import threading

from database import db_session
from models.user_task_log import EventTypes
from repositories.user_task_log_repository import UserTaskLogRepository
from broker_token_manager import get_token_manager

bp = Blueprint("broker", __name__, url_prefix="/api/broker")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist

sock = Sock()

BROKER_URL = os.environ.get("BROKER_API_URL", "http://localhost:8000")
BROKER_WS_URL = os.environ.get("BROKER_WS_URL", "ws://localhost:8000")
BROKER_CLIENT_NAME = os.environ.get("BROKER_CLIENT_NAME", "mrl-app-server")
BROKER_API_KEY = os.environ.get("BROKER_API_KEY", "")
VIDEO_WS_URL = os.environ.get("VIDEO_WS_URL", "ws://localhost:8001")

# Get shared token manager
token_manager = get_token_manager()

# Local state as fallback if Redis is unavailable
_local_broker_state = {
    "client_id": None,
    "token": None,
}


def _get_broker_state():
    """Get broker state from Redis or local fallback."""
    if token_manager.is_available():
        data = token_manager.get_token()
        if data:
            return data
    return _local_broker_state


def _save_broker_state(client_id: str, token: str):
    """Save broker state to Redis and local fallback."""
    _local_broker_state["client_id"] = client_id
    _local_broker_state["token"] = token

    if token_manager.is_available():
        token_manager.save_token(client_id, token)


def _clear_broker_state():
    """Clear broker state from Redis and local fallback."""
    _local_broker_state["client_id"] = None
    _local_broker_state["token"] = None

    if token_manager.is_available():
        token_manager.clear_token()


def _ensure_logged_in(force=False):
    state = _get_broker_state()
    if state.get("token") and not force:
        return

    res = requests.post(f"{BROKER_URL}/client/login", headers={
        "Content-Type": "application/json",
        "client-name": BROKER_CLIENT_NAME,
        "api-key": BROKER_API_KEY,
    })
    res.raise_for_status()
    data = res.json()
    _save_broker_state(data["ClientId"], data["Token"])


def broker_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        for attempt in range(2):
            try:
                _ensure_logged_in(force=(attempt > 0))
            except Exception as e:
                return jsonify({"error": f"Broker login failed: {str(e)}"}), 502
            try:
                return f(*args, **kwargs)
            except requests.HTTPError as e:
                if e.response is not None and e.response.status_code in (401, 403) and attempt == 0:
                    _clear_broker_state()
                    continue
                return jsonify({"error": f"Broker request failed: {str(e)}"}), 502
            except Exception as e:
                return jsonify({"error": f"Broker request failed: {str(e)}"}), 502
    return decorated


def _broker_headers():
    state = _get_broker_state()
    return {
        "Content-Type": "application/json",
        "client-id": state.get("client_id"),
        "token": state.get("token"),
    }


# ---------- TEST CONNECTION ----------
@bp.route("/test", methods=["GET"])
def test_connection():
    try:
        _ensure_logged_in(force=True)
        state = _get_broker_state()
        return jsonify({
            "status": "ok",
            "client_id": state.get("client_id"),
            "redis_available": token_manager.is_available(),
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 502


# ---------- LIST ROBOTS ----------
@bp.route("/robots", methods=["GET"])
@broker_auth
def list_robots():
    res = requests.get(f"{BROKER_URL}/client/robot/info", headers=_broker_headers())
    res.raise_for_status()
    return jsonify(res.json()), 200


# ---------- SEND COMMAND ----------
# TODO - ovo treba bit dostupno samo kad ima aktivnost koja trenutno traje ili ako si teacher/admin
@bp.route("/robots/<robot_id>/command", methods=["POST"])
@broker_auth
def send_command(robot_id: str):
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    user_started_task_id = data.get("user_started_task_id")

    if not code:
        return jsonify({"error": "code is required"}), 400

    res = requests.post(
        f"{BROKER_URL}/robot/{robot_id}/command",
        headers=_broker_headers(),
        json={
            "CommandType": "CODE",
            "CodeText": code,
        },
    )
    res.raise_for_status()

    if user_started_task_id:
        with db_session() as session:
            log_repo = UserTaskLogRepository(session)
            log_repo.create(
                user_started_task_id=user_started_task_id,
                event_type_id=EventTypes.ROBOT_RUN,
                code_snapshot=code,
            )
            session.commit()

    return jsonify(res.json()), 200

# ---------- ABORT COMMAND ----------
# TODO - ovo treba bit dostupno samo kad ima aktivnost koja trenutno traje ili ako si teacher/admin
@bp.route("/robots/<robot_id>/abort", methods=["POST"])
@broker_auth
def abort_command(robot_id: str):
    res = requests.post(
        f"{BROKER_URL}/robot/{robot_id}/command",
        headers=_broker_headers(),
        json={
            "CommandType": "ABORT",
        },
    )
    res.raise_for_status()

    # mozda napravit i log za abort

    return jsonify(res.json()), 200

# ---------- GET ROBOT STATUS ----------
# TODO - ovo treba bit dostupno samo kad ima aktivnost koja trenutno traje ili ako si teacher/admin
@bp.route("/robots/<robot_id>/shutdown", methods=["POST"])
@broker_auth
def shutdown_robot(robot_id: str):
    res = requests.post(
        f"{BROKER_URL}/robot/{robot_id}/command",
        headers=_broker_headers(),
        json={
            "CommandType": "SHUTDOWN",
        },
    )
    res.raise_for_status()
    return jsonify(res.json()), 200


# ---------- WEBSOCKET PROXY ----------
def init_broker_websocket(app):
    sock.init_app(app)

    @sock.route("/api/broker/robots/<robot_id>/logs")
    def robot_logs_proxy(ws, robot_id):
        print(f"[WS] Connection attempt for robot {robot_id}")
        try:
            _ensure_logged_in()
        except Exception as e:
            ws.send(json.dumps({"LogLevel": "ERROR", "Message": f"Broker login failed: {str(e)}"}))
            ws.close()
            return

        state = _get_broker_state()
        broker_ws = None
        closed = threading.Event()

        def on_broker_message(_, message):
            if not closed.is_set():
                try:
                    ws.send(message)
                except Exception:
                    closed.set()

        def on_broker_error(_, error):
            if not closed.is_set():
                try:
                    ws.send(json.dumps({"LogLevel": "ERROR", "Message": str(error)}))
                except Exception:
                    pass
            closed.set()

        def on_broker_close(_, close_status_code, close_msg):
            closed.set()

        broker_ws = websocket.WebSocketApp(
            f"{BROKER_WS_URL}/client/robot-log/{robot_id}",
            header={
                "client-id": str(state.get("client_id")),
                "token": str(state.get("token")),
            },
            on_message=on_broker_message,
            on_error=on_broker_error,
            on_close=on_broker_close,
        )

        broker_thread = threading.Thread(target=broker_ws.run_forever, daemon=True)
        broker_thread.start()

        try:
            while not closed.is_set():
                try:
                    ws.receive(timeout=1)
                except Exception:
                    break
        finally:
            closed.set()
            if broker_ws:
                broker_ws.close()

    @sock.route("/api/broker/robots/<robot_id>/stdout")
    def robot_stdout_proxy(ws, robot_id):
        print(f"[WS] stdout connection attempt for robot {robot_id}")
        try:
            _ensure_logged_in()
        except Exception as e:
            ws.send(json.dumps({"error": f"Broker login failed: {str(e)}"}))
            ws.close()
            return

        state = _get_broker_state()
        broker_ws = None
        closed = threading.Event()

        def on_broker_message(_, message):
            if not closed.is_set():
                try:
                    ws.send(message)
                except Exception:
                    closed.set()

        def on_broker_error(_, error):
            if not closed.is_set():
                try:
                    ws.send(json.dumps({"error": str(error)}))
                except Exception:
                    pass
            closed.set()

        def on_broker_close(_, close_status_code, close_msg):
            closed.set()

        broker_ws = websocket.WebSocketApp(
            f"{BROKER_WS_URL}/client/robot-print/{robot_id}",
            header={
                "client-id": str(state.get("client_id")),
                "token": str(state.get("token")),
            },
            on_message=on_broker_message,
            on_error=on_broker_error,
            on_close=on_broker_close,
        )

        broker_thread = threading.Thread(target=broker_ws.run_forever, daemon=True)
        broker_thread.start()

        try:
            while not closed.is_set():
                try:
                    ws.receive(timeout=1)
                except Exception:
                    break
        finally:
            closed.set()
            if broker_ws:
                broker_ws.close()

    @sock.route("/api/broker/robots/<robot_id>/camera")
    def robot_camera_proxy(ws, robot_id):
        import time
        print(f"[WS] camera connection attempt for robot {robot_id}")
        try:
            _ensure_logged_in()
        except Exception as e:
            ws.send(json.dumps({"error": f"Broker login failed: {str(e)}"}))
            ws.close()
            return

        state = _get_broker_state()
        closed = threading.Event()
        RETRY_DELAY = 2        # seconds between reconnect attempts
        IDLE_TIMEOUT = 8       # seconds without a frame before we force-reconnect upstream
                               # (video servers often only push to connections made *after*
                               # the robot starts streaming; an idle reconnect re-subscribes)

        frame_count = [0]

        def run_upstream():
            """Synchronous loop: connect to the video broker, recv frames,
            forward them to the browser WS.  Retries on any failure until
            the browser disconnected (closed is set)."""
            attempt = 0
            while not closed.is_set():
                upstream = None
                attempt += 1
                try:
                    print(f"[WS] camera: connecting upstream attempt #{attempt} for robot {robot_id}")
                    upstream = websocket.create_connection(
                        f"{VIDEO_WS_URL}/robot/{robot_id}/get-video-stream",
                        header={
                            "client-id": str(state.get("client_id")),
                            "client_id": str(state.get("client_id")),
                            "token": str(state.get("token")),
                        },
                        timeout=5,
                    )
                    print(f"[WS] camera: upstream connected (attempt #{attempt}) for robot {robot_id}, status={upstream.status}, headers={dict(upstream.getheaders())}")
                    upstream.settimeout(1.0)
                    last_frame_time = time.monotonic()
                    while not closed.is_set():
                        try:
                            opcode, data = upstream.recv_data()
                            if data:
                                print(f"[WS] camera: frame #{frame_count[0]+1} opcode={opcode} size={len(data)} robot={robot_id}")
                                try:
                                    ws.send(data)
                                    frame_count[0] += 1
                                    last_frame_time = time.monotonic()
                                except Exception as send_exc:
                                    print(f"[WS] camera: ws.send failed (browser closed?): {send_exc}")
                                    closed.set()
                                    return
                            else:
                                print(f"[WS] camera: recv_data returned opcode={opcode} with empty data for robot {robot_id}")
                        except websocket.WebSocketTimeoutException:
                            elapsed = time.monotonic() - last_frame_time
                            if elapsed > IDLE_TIMEOUT:
                                print(f"[WS] camera: no frames for {elapsed:.1f}s on attempt #{attempt}, reconnecting upstream for robot {robot_id}")
                                break
                            continue
                        except Exception as recv_exc:
                            print(f"[WS] camera: recv_data error on attempt #{attempt} for robot {robot_id}: {type(recv_exc).__name__}: {recv_exc}")
                            break
                except Exception as exc:
                    print(f"[WS] camera: upstream connection failed (attempt #{attempt}) for robot {robot_id}: {type(exc).__name__}: {exc}")
                finally:
                    if upstream:
                        try:
                            upstream.close()
                        except Exception:
                            pass
                if not closed.is_set():
                    print(f"[WS] camera: retrying for robot {robot_id} in {RETRY_DELAY}s")
                    time.sleep(RETRY_DELAY)

        upstream_thread = threading.Thread(target=run_upstream, daemon=True)
        upstream_thread.start()

        try:
            # The camera socket is server→client only; the browser never sends
            # messages. We must distinguish between:
            #   - Timeout (no message in N seconds) → browser still alive, keep waiting
            #   - ConnectionClosed              → browser truly disconnected, stop
            # simple_websocket raises ConnectionError on timeout and
            # ConnectionClosed on an actual close handshake or network drop.
            import simple_websocket
            while not closed.is_set():
                try:
                    ws.receive(timeout=10)
                except simple_websocket.ConnectionClosed:
                    # Browser closed the WebSocket — stop the upstream thread.
                    closed.set()
                    break
                except Exception:
                    # Timeout or other transient error; camera is server→client
                    # only so a timeout just means no client message, which is normal.
                    continue
        finally:
            closed.set()