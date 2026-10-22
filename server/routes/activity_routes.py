from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from models import UserStartedTask
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
            return jsonify({"error": "Aktivnost nije pronađena."}), 404

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


# ---------- TEACHER-OWNED OPTIONS ----------
@bp.route("/owned-overview", methods=["GET"])
@role_required('admin', 'teacher')
def list_owned_activities_with_tasks():
    """Return role-scoped activity options used by analytics and badge forms."""
    with db_session() as session:
        activities = ActivityRepository(session).list_owned_activities_with_tasks(
            user_id=current_user.id,
            is_admin=current_user.role.name == 'admin',
            active_only=True,
        )
        return jsonify([
            {
                **_activity_to_dict(activity),
                "activity_tasks": [
                    {
                        "activity_task_id": task.id,
                        "task_id": task.task_id,
                        "task_title": task.task.title if task.task else None,
                        "preview": task.preview,
                        "difficulty": task.difficulty,
                        "order": task.order,
                        "task_type": task.type.name if task.type else None,
                    }
                    for task in sorted(activity.activity_tasks, key=lambda item: item.order or 0)
                ],
            }
            for activity in activities
        ]), 200

# ---------- READ ALL ACTIVITIES AVAILABLE TO STUDENTS ----------
@bp.route("/available", methods=["GET"])
def list_student_available_activities():
    user_id = current_user.id

    with db_session() as session:
        repo = ActivityRepository(session)
        activities = repo.list_student_available_activities(user_id)

        # Get all user started tasks for this user in one query
        started = {
            ust.activity_task_id: ust
            for ust in session.query(UserStartedTask)
            .filter(UserStartedTask.started_by == user_id)
            .all()
        }

        result = [
            {
                "id": activity.id,
                "title": activity.title,
                "description": activity.description,
                "time_from": _to_utc_iso(activity.time_from),
                "time_to": _to_utc_iso(activity.time_to),
                "activity_tasks": [
                    {
                        "activity_task_id": activity_task.id,
                        "task_id": activity_task.task_id,
                        "task_title": activity_task.task.title if activity_task.task else None,
                        "task_description": activity_task.task.description if activity_task.task else None,
                        "preview": activity_task.preview,
                        "order": activity_task.order,
                        "task_type": activity_task.type.name if activity_task.type else None,
                        "is_logged": activity_task.is_logged,
                        "allows_robot": activity_task.allows_robot,
                        "started": activity_task.id in started,
                        "user_started_task_id": started[activity_task.id].id if activity_task.id in started else None,
                        "is_finished": started[activity_task.id].is_finished if activity_task.id in started else False,
                        "difficulty": activity_task.difficulty,
                    }
                    for activity_task in available_tasks
                ],
            }
            for activity, available_tasks in activities
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
        return jsonify({"error": "Nedostaju obavezna polja.", "missing": missing}), 400

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
        return jsonify({"error": "Nepoznata polja.", "unknown": unknown}), 400

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
            return jsonify({"error": "Aktivnost nije pronađena."}), 404

        return jsonify(_activity_to_dict(activity)), 200


# ---------- DEACTIVATE ----------
@bp.route("/<int:activity_id>/deactivate", methods=["POST"])
@role_required('admin', 'teacher')
def deactivate_activity(activity_id: int):
    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.deactivate(activity_id, actor_user_id=current_user.id)
        if not activity:
            return jsonify({"error": "Aktivnost nije pronađena."}), 404
        return jsonify(_activity_to_dict(activity)), 200


# ---------- ACTIVATE ----------
@bp.route("/<int:activity_id>/activate", methods=["POST"])
@role_required('admin', 'teacher')
def activate_activity(activity_id: int):
    with db_session() as session:
        repo = ActivityRepository(session)
        activity = repo.activate(activity_id, actor_user_id=current_user.id)
        if not activity:
            return jsonify({"error": "Aktivnost nije pronađena."}), 404
        return jsonify(_activity_to_dict(activity)), 200


# ---------- DELETE ----------
@bp.route("/<int:activity_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_activity(activity_id: int):
    with db_session() as session:
        at_repo = ActivityTaskRepository(session)
        tasks = at_repo.list_by_activity_id(activity_id=activity_id)
        if tasks:
            return jsonify({"error": "Aktivnost s dodijeljenim zadacima nije moguće obrisati. Najprije uklonite sve zadatke."}), 400

        repo = ActivityRepository(session)
        ok = repo.delete(activity_id)
        if not ok:
            return jsonify({"error": "Aktivnost nije pronađena."}), 404
        return jsonify({"deleted": True}), 200