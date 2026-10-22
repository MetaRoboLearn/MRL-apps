from flask import Blueprint, jsonify, request
from flask_login import login_required

from database import db_session
from repositories.user_task_log_repository import UserTaskLogRepository
from utils import parse_boolean_param

bp = Blueprint("user_task_logs", __name__, url_prefix="/api/user-task-logs")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist


# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
def create_log():
    data = request.get_json(silent=True) or {}

    required = ("user_started_task_id", "event_type_id")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    with db_session() as session:
        log_repo = UserTaskLogRepository(session)
        log = log_repo.create(
            user_started_task_id=data["user_started_task_id"],
            event_type_id=data["event_type_id"],
            code_snapshot=data.get("code_snapshot"),
        )
        session.commit()

        if not log:
            return jsonify({"skipped": True}), 200
        return jsonify({"id": log.id}), 201

# ---------- DELETE ----------
@bp.route("/<int:log_id>", methods=["DELETE"])
def delete_user_task_log(log_id: int):
    with db_session() as session:
        repo = UserTaskLogRepository(session)
        ok = repo.delete(log_id)
        if not ok:
            return jsonify({"error": "UserTaskLog not found"}), 404
        return jsonify({"deleted": True}), 200