from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from repositories.task_repository import TaskRepository
from utils import parse_boolean_param, _to_utc_iso

bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist

def _task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "size_x": task.size_x,
        "size_z": task.size_z,
        "start": task.start,
        "rotation": task.rotation,
        "finish": task.finish,
        "barriers": task.barriers,
        "stickers": task.stickers,
        "code": task.code,
        "blocks": task.blocks,
        "floor_color": task.floor_color,
        "model_path": task.model_path,
        "active": getattr(task, "active", None),
        "created_at": _to_utc_iso(task.created_at),
        "updated_at": _to_utc_iso(task.updated_at),
        "created_by": task.created_by,
        "updated_by": task.updated_by,
    }


# ---------- READ ONE ----------
@bp.route("/<int:task_id>", methods=["GET"])
@role_required('admin', 'teacher')
def get_task(task_id: int):
    with db_session() as session:
        repo = TaskRepository(session)
        task = repo.get_by_id(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(_task_to_dict(task)), 200


# ---------- LIST ----------
@bp.route("/", methods=["GET"])
@role_required('admin', 'teacher')
def list_tasks():
    # query params: ?skip=0&limit=50&active_only=true&search=loop&order_by_title=true
    skip = int(request.args.get("skip", 0))
    limit = int(request.args.get("limit", 50))

    search = request.args.get("search")

    try:
        active_only = parse_boolean_param(request.args.get("active_only"))
        order_by_title = parse_boolean_param(request.args.get("order_by_title", "true"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    with db_session() as session:
        repo = TaskRepository(session)
        tasks = repo.list_preview(
            skip=skip,
            limit=limit,
            active_only=active_only,
            search=search,
            order_by_title=order_by_title,
        )
        return [
            {
                "id": row.id,
                "title": row.title,
                "description": row.description,
                "size_x": row.size_x,
                "size_z": row.size_z,
                "created_at": _to_utc_iso(row.created_at),
                "created_by": row.created_by,
                "active": row.active,
                "creator": {
                    "username": row.username,
                    "first_name": row.first_name,
                    "last_name": row.last_name
                } if row.username else None
            }
            for row in tasks
        ], 200


# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def create_task():
    data = request.get_json(silent=True) or {}

    required = ("title",)
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    with db_session() as session:
        repo = TaskRepository(session)
        task = repo.create(
            title=data["title"],
            description=data.get("description"),
            size_x=data.get("size_x"),
            size_z=data.get("size_z"),
            start=data.get("start"),
            rotation=data.get("rotation"),
            finish=data.get("finish"),
            barriers=data.get("barriers"),
            stickers=data.get("stickers"),
            code=data.get("code"),
            blocks=data.get("blocks"),
            floor_color=data.get("floor_color"),
            model_path=data.get("model_path"),
            active=data.get("active"),
            actor_user_id=current_user.id,
        )
        return jsonify(_task_to_dict(task)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:task_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_task(task_id: int):
    data = request.get_json(silent=True) or {}

    allowed = {
        "title",
        "description",
        "size_x",
        "size_z",
        "start",
        "rotation",
        "finish",
        "barriers",
        "stickers",
        "code",
        "blocks",
        "floor_color",
        "model_path",
        "active",
    }
    unknown = [k for k in data.keys() if k not in allowed]
    if unknown:
        return jsonify({"error": "Unknown fields", "unknown": unknown}), 400

    # validate boolean
    if "active" in data:
        if isinstance(data["active"], bool):
            active_val = data["active"]
        elif data["active"] is None:
            active_val = None
        elif isinstance(data["active"], str):
            try:
                active_val = parse_boolean_param(data["active"])
            except ValueError as e:
                return jsonify({"error": str(e)}), 400
        else:
            return jsonify({"error": "Invalid value for active"}), 400
    else:
        active_val = None

    with db_session() as session:
        repo = TaskRepository(session)
        task = repo.update(
            task_id,
            title=data.get("title"),
            description=data.get("description"),
            size_x=data.get("size_x"),
            size_z=data.get("size_z"),
            start=data.get("start"),
            rotation=data.get("rotation"),
            finish=data.get("finish"),
            barriers=data.get("barriers"),
            stickers=data.get("stickers"),
            code=data.get("code"),
            blocks=data.get("blocks"),
            floor_color=data.get("floor_color"),
            model_path=data.get("model_path"),
            active=active_val,
            actor_user_id=current_user.id,
        )
        if not task:
            return jsonify({"error": "Task not found"}), 404

        return jsonify(_task_to_dict(task)), 200


# ---------- DEACTIVATE ----------
@bp.route("/<int:task_id>/deactivate", methods=["POST"])
@role_required('admin', 'teacher')
def deactivate_task(task_id: int):
    with db_session() as session:
        repo = TaskRepository(session)
        task = repo.deactivate(task_id, actor_user_id=current_user.id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(_task_to_dict(task)), 200


# ---------- ACTIVATE ----------
@bp.route("/<int:task_id>/activate", methods=["POST"])
@role_required('admin', 'teacher')
def activate_task(task_id: int):
    with db_session() as session:
        repo = TaskRepository(session)
        task = repo.activate(task_id, actor_user_id=current_user.id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(_task_to_dict(task)), 200


# ---------- DELETE ----------
@bp.route("/<int:task_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_task(task_id: int):
    with db_session() as session:
        repo = TaskRepository(session)
        ok = repo.delete(task_id)
        if not ok:
            return jsonify({"error": "Task not found"}), 404
        return jsonify({"deleted": True}), 200