from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from models import UserStartedTask
from models.user_activity_task import UserActivityTask
from repositories.activity_repository import ActivityRepository
from repositories.activity_task_repository import ActivityTaskRepository
from utils import parse_boolean_param, parse_datetime, _to_utc_iso

bp = Blueprint("activities", __name__, url_prefix="/api/activities")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist

def _activity_to_dict(a):
    return {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "time_from": _to_utc_iso(a.time_from),
        "time_to": _to_utc_iso(a.time_to),
        "active": getattr(a, "active", None),
        "created_at": _to_utc_iso(a.created_at),
        "updated_at": _to_utc_iso(a.updated_at),
        "created_by": a.created_by,
        "updated_by": a.updated_by,
    }


#---------- GET ACTIVITY DETAILS ----------
@bp.route("/<int:activity_id>", methods=["GET"])
@role_required('admin', 'teacher')
def get_activity(activity_id: int):
    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.get_with_details(activity_id)
        if not activity:
            return jsonify({"error": "Activity not found"}), 404

        return jsonify({
            **_activity_to_dict(activity),
            "creator": {
                "username": activity.creator.username,
                "first_name": activity.creator.first_name,
                "last_name": activity.creator.last_name,
            } if activity.creator else None,
            "updater": {
                "username": activity.updater.username,
                "first_name": activity.updater.first_name,
                "last_name": activity.updater.last_name,
            } if activity.updater else None,
        }), 200

# ---------- LIST ----------
@bp.route("/", methods=["GET"])
@role_required('admin', 'teacher')
def list_activities():
    # query params: ?skip=0&limit=50&active_only=true&search=yoga&order_by_time_from=true
    skip = int(request.args.get("skip", 0))
    limit = int(request.args.get("limit", 50))

    try:
        active_only = parse_boolean_param(request.args.get("active_only"))
        order_by_time_from = parse_boolean_param(request.args.get("order_by_time_from", "true"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    search = request.args.get("search")

    with db_session() as session:
        repo = ActivityRepository(session)
        activities = repo.list(
            skip=skip,
            limit=limit,
            active_only=active_only,
            search=search,
            order_by_time_from=order_by_time_from,
        )
        return jsonify([_activity_to_dict(a) for a in activities]), 200


# ---------- READ ALL ACTIVITIES WITH TASK INFO ----------
@bp.route("/overview", methods=["GET"])
@role_required('admin', 'teacher')
def list_activities_with_tasks():
    # query params: ?skip=0&limit=50&active_only=true&search=yoga&order_by_time_from=true
    skip = int(request.args.get("skip", 0))
    limit = int(request.args.get("limit", 50))

    try:
        active_only = parse_boolean_param(request.args.get("active_only"))
        order_by_time_from = parse_boolean_param(request.args.get("order_by_time_from", "true"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    search = request.args.get("search")

    with db_session() as session:
        repo = ActivityRepository(session)
        activities = repo.list_activities_with_tasks(
            skip=skip,
            limit=limit,
            active_only=active_only,
            search=search,
            order_by_time_from=order_by_time_from,
        )
        return jsonify([
            {
                **_activity_to_dict(a),
                "activity_tasks": [
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
                    }
                    for at in a.activity_tasks
                ],
                "creator": {
                    "username": a.creator.username,
                    "first_name": a.creator.first_name,
                    "last_name": a.creator.last_name,
                } if a.creator else None,
            }
            for a in activities
        ]), 200

# ---------- READ ALL ACTIVITIES AVAILABLE TO STUDENTS ----------
@bp.route("/available", methods=["GET"])
def list_student_available_activities():
    user_id = current_user.id

    with db_session() as session:
        repo = ActivityRepository(session)
        activities = repo.list_student_available_activities()

        # Get all user started tasks for this user in one query
        started = {
            ust.activity_task_id: ust
            for ust in session.query(UserStartedTask)
            .filter(UserStartedTask.started_by == user_id)
            .all()
        }

        # Get all activity task IDs this student is linked to
        assigned_task_ids = set(
            row[0]
            for row in session.query(UserActivityTask.activity_task_id)
            .filter(UserActivityTask.user_id == user_id)
            .all()
        )

        def is_task_visible(at):
            if at.student_mode == 'all':
                return True
            if at.student_mode == 'include':
                return at.id in assigned_task_ids
            if at.student_mode == 'exclude':
                return at.id not in assigned_task_ids
            return True

        result = [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "time_from": _to_utc_iso(a.time_from),
                "time_to": _to_utc_iso(a.time_to),
                "activity_tasks": [
                    {
                        "activity_task_id": at.id,
                        "task_id": at.task_id,
                        "task_title": at.task.title if at.task else None,
                        "task_description": at.task.description if at.task else None,
                        "preview": at.preview,
                        "order": at.order,
                        "task_type": at.type.name if at.type else None,
                        "is_logged": at.is_logged,
                        "allows_robot": at.allows_robot,
                        "started": at.id in started,
                        "user_started_task_id": started[at.id].id if at.id in started else None,
                        "is_finished": started[at.id].is_finished if at.id in started else False,
                        "difficulty": at.difficulty,
                    }
                    for at in sorted(a.activity_tasks, key=lambda at: at.order)
                    if is_task_visible(at)
                ],
            }
            for a in activities
        ]

        return jsonify([a for a in result if a["activity_tasks"]]), 200

# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def create_activity():
    data = request.get_json(silent=True) or {}
    required = ("title", "time_from", "time_to")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    try:
        time_from = parse_datetime(data["time_from"])
        time_to = parse_datetime(data["time_to"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.create(
            title=data["title"],
            description=data.get("description"),
            time_from=time_from,
            time_to=time_to,
            actor_user_id=current_user.id,
        )
        return jsonify(_activity_to_dict(activity)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:activity_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_activity(activity_id: int):
    data = request.get_json(silent=True) or {}

    # allow only these fields to be updated through this endpoint
    allowed = {"title", "description", "time_from", "time_to", "active"}
    unknown = [k for k in data.keys() if k not in allowed]
    if unknown:
        return jsonify({"error": "Unknown fields", "unknown": unknown}), 400

    # parse datetimes if provided
    try:
        time_from = parse_datetime(data["time_from"]) if "time_from" in data else None
        time_to = parse_datetime(data["time_to"]) if "time_to" in data else None
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.update(
            activity_id,
            title=data.get("title"),
            description=data.get("description"),
            time_from=time_from,
            time_to=time_to,
            active=data.get("active"),
            actor_user_id=current_user.id,
        )
        if not activity:
            return jsonify({"error": "Activity not found"}), 404

        return jsonify(_activity_to_dict(activity)), 200


# ---------- DEACTIVATE ----------
@bp.route("/<int:activity_id>/deactivate", methods=["POST"])
@role_required('admin', 'teacher')
def deactivate_activity(activity_id: int):
    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.deactivate(activity_id, actor_user_id=current_user.id)
        if not activity:
            return jsonify({"error": "Activity not found"}), 404
        return jsonify(_activity_to_dict(activity)), 200


# ---------- ACTIVATE ----------
@bp.route("/<int:activity_id>/activate", methods=["POST"])
@role_required('admin', 'teacher')
def activate_activity(activity_id: int):
    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.activate(activity_id, actor_user_id=current_user.id)
        if not activity:
            return jsonify({"error": "Activity not found"}), 404
        return jsonify(_activity_to_dict(activity)), 200


# ---------- DELETE ----------
@bp.route("/<int:activity_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_activity(activity_id: int):
    with db_session() as session:
        at_repo = ActivityTaskRepository(session)
        tasks = at_repo.list_by_activity_id(activity_id=activity_id)
        if tasks:
            return jsonify({"error": "Cannot delete activity with assigned tasks. Remove all tasks first."}), 400

        repo = ActivityRepository(session)
        ok = repo.delete(activity_id)
        if not ok:
            return jsonify({"error": "Activity not found"}), 404
        return jsonify({"deleted": True}), 200