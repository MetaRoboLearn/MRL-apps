from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from repositories.activity_task_repository import ActivityTaskRepository
from utils import parse_boolean_param, _to_utc_iso

bp = Blueprint("activity_tasks", __name__, url_prefix="/api/activity-tasks")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist

def _activity_task_to_dict(at):
    return {
        "id": at.id,
        "preview": at.preview,
        "instructions": at.instructions,
        "activity_id": at.activity_id,
        "task_id": at.task_id,
        "type_id": at.type_id,
        "order": at.order,
        "created_at": _to_utc_iso(at.created_at),
        "updated_at": _to_utc_iso(at.updated_at),
        "created_by": at.created_by,
        "updated_by": at.updated_by,
    }


# ---------- READ ONE ----------
@bp.route("/<int:activity_task_id>", methods=["GET"])
@role_required('admin', 'teacher')
def get_activity_task(activity_task_id: int):
    with db_session() as session:
        repo = ActivityTaskRepository(session)
        at = repo.get_by_id(activity_task_id)
        if not at:
            return jsonify({"error": "Activity task not found"}), 404
        return jsonify({
            "activity_task_id": at.id,
            "activity_id": at.activity_id,
            "task_id": at.task_id,
            "task_title": at.task.title if at.task else None,
            "preview": at.preview,
            "instructions": at.instructions,
            "order": at.order,
            "type_id": at.type_id,
            "task_type": at.type.name if at.type else None,
            "is_logged": at.is_logged,
            "allows_robot": at.allows_robot,
            "difficulty": at.difficulty,
        }), 200


# ---------- LIST TASKS OF ACTIVITY ----------
@bp.route("/", methods=["GET"])
@role_required('admin', 'teacher')
def list_activity_tasks():
    activity_id_raw = request.args.get("activity_id")
    if not activity_id_raw:
        return jsonify({"error": "activity_id is required"}), 400

    activity_id = int(activity_id_raw)

    with db_session() as session:
        repo = ActivityTaskRepository(session)
        tasks = repo.list_by_activity_id(activity_id=activity_id)
        return jsonify([
            {
                "activity_task_id": at.id,
                "task_id": at.task_id,
                "task_title": at.task.title if at.task else None,
                "preview": at.preview,
                "instructions": at.instructions,
                "order": at.order,
                "task_type": at.type.name if at.type else None,
                "is_logged": at.is_logged,
                "allows_robot": at.allows_robot,
                "student_mode": at.student_mode,
                "creator": {
                    "username": at.creator.username,
                    "first_name": at.creator.first_name,
                    "last_name": at.creator.last_name,
                } if at.creator else None,
                "updater": {
                    "username": at.updater.username,
                    "first_name": at.updater.first_name,
                    "last_name": at.updater.last_name,
                } if at.updater else None,
            }
            for at in tasks
        ]), 200


# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def create_activity_task():
    data = request.get_json(silent=True) or {}
    required = ("activity_id", "task_id", "type_id", "order")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    with db_session() as session:
        repo = ActivityTaskRepository(session)
        at = repo.create(
            activity_id=int(data["activity_id"]),
            task_id=int(data["task_id"]),
            type_id=int(data["type_id"]),
            order=int(data["order"]),
            is_logged=parse_boolean_param(data["is_logged"]),
            allows_robot=parse_boolean_param(data["allows_robot"]),
            preview=data.get("preview"),
            instructions=data.get("instructions"),
            difficulty=data.get("difficulty"),
            actor_user_id=current_user.id,
        )
        return jsonify(_activity_task_to_dict(at)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:activity_task_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_activity_task(activity_task_id: int):
    data = request.get_json(silent=True) or {}

    # allow only these fields to be updated through this endpoint
    allowed = {"preview", "instructions", "activity_id", "task_id", "type_id", "order", "is_logged", "allows_robot", "difficulty"}
    unknown = [k for k in data.keys() if k not in allowed]
    if unknown:
        return jsonify({"error": "Unknown fields", "unknown": unknown}), 400

    with db_session() as session:
        repo = ActivityTaskRepository(session)
        at = repo.update(
            activity_task_id,
            preview=data.get("preview") if "preview" in data else None,
            instructions=data.get("instructions") if "instructions" in data else None,
            activity_id=int(data["activity_id"]) if "activity_id" in data else None,
            task_id=int(data["task_id"]) if "task_id" in data else None,
            type_id=int(data["type_id"]) if "type_id" in data else None,
            order=int(data["order"]) if "order" in data else None,
            is_logged=parse_boolean_param(data["is_logged"]) if "is_logged" in data else None,
            allows_robot=parse_boolean_param(data["allows_robot"]) if "allows_robot" in data else None,
            difficulty=int(data["difficulty"]) if "difficulty" in data and data["difficulty"] is not None else None,
            actor_user_id=current_user.id,
        )
        if not at:
            return jsonify({"error": "ActivityTask not found"}), 404

        return jsonify(_activity_task_to_dict(at)), 200


# ---------- DELETE ----------
@bp.route("/<int:activity_task_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_activity_task(activity_task_id: int):
    with db_session() as session:
        repo = ActivityTaskRepository(session)

        # get activity_id before deleting
        task = repo.get_by_id(activity_task_id)
        if not task:
            return jsonify({"error": "ActivityTask not found"}), 404

        activity_id = task.activity_id
        repo.delete(activity_task_id)
        repo.reorder_after_delete(activity_id)

        return jsonify({"deleted": True}), 200

# ---------- SWAP TASK ORDER ----------
@bp.route("/<int:activity_task_id>/move-up", methods=["PATCH"])
@role_required('admin', 'teacher')
def move_task_up(activity_task_id: int):
    activity_id_raw = request.args.get("activity_id")
    if not activity_id_raw:
        return jsonify({"error": "activity_id is required"}), 400

    with db_session() as session:
        repo = ActivityTaskRepository(session)
        result = repo.swap_order(int(activity_id_raw), activity_task_id, 'up')
        if not result:
            return jsonify({"error": "Cannot move up"}), 400
        return jsonify({"status": "ok"}), 200


@bp.route("/<int:activity_task_id>/move-down", methods=["PATCH"])
@role_required('admin', 'teacher')
def move_task_down(activity_task_id: int):
    activity_id_raw = request.args.get("activity_id")
    if not activity_id_raw:
        return jsonify({"error": "activity_id is required"}), 400

    with db_session() as session:
        repo = ActivityTaskRepository(session)
        result = repo.swap_order(int(activity_id_raw), activity_task_id, 'down')
        if not result:
            return jsonify({"error": "Cannot move down"}), 400
        return jsonify({"status": "ok"}), 200