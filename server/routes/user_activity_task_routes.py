from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from repositories.activity_task_repository import ActivityTaskRepository
from repositories.user_activity_task_repository import UserActivityTaskRepository
from repositories.user_repository import UserRepository

bp = Blueprint("user_activity_tasks", __name__, url_prefix="/api/activity-tasks")


@bp.before_request
@login_required
def require_login():
    pass


# ---------- GET STUDENTS + SELECTION STATE ----------
@bp.route("/<int:activity_task_id>/students", methods=["GET"])
@role_required('admin', 'teacher')
def get_students(activity_task_id: int):
    skip = int(request.args.get("skip", 0))
    limit = int(request.args.get("limit", 20))
    search = request.args.get("search")

    with db_session() as session:
        at_repo = ActivityTaskRepository(session)
        at = at_repo.get_by_id(activity_task_id)
        if not at:
            return jsonify({"error": "ActivityTask not found"}), 404

        uat_repo = UserActivityTaskRepository(session)
        selected_ids = set(uat_repo.get_user_ids(activity_task_id))

        user_repo = UserRepository(session)
        users = user_repo.list(
            skip=skip,
            limit=limit,
            role_id=3,
            active_only=True,
            search=search,
        )

        return jsonify({
            "student_mode": at.student_mode,
            "selected_ids": list(selected_ids),
            "students": [
                {
                    "id": u.id,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "username": u.username,
                }
                for u in users
            ],
        }), 200


# ---------- SET STUDENT ASSIGNMENTS ----------
@bp.route("/<int:activity_task_id>/students", methods=["PUT"])
@role_required('admin', 'teacher')
def set_students(activity_task_id: int):
    data = request.get_json(silent=True) or {}

    student_mode = data.get("student_mode")
    if student_mode not in ("all", "include", "exclude"):
        return jsonify({"error": "student_mode must be 'all', 'include', or 'exclude'"}), 400

    user_ids = data.get("user_ids", [])
    if not isinstance(user_ids, list):
        return jsonify({"error": "user_ids must be a list"}), 400

    with db_session() as session:
        at_repo = ActivityTaskRepository(session)
        at = at_repo.get_by_id(activity_task_id)
        if not at:
            return jsonify({"error": "ActivityTask not found"}), 404

        at.student_mode = student_mode

        uat_repo = UserActivityTaskRepository(session)
        if student_mode == "all":
            uat_repo.set_students(activity_task_id, [])
        else:
            uat_repo.set_students(activity_task_id, user_ids)

        session.commit()

        return jsonify({
            "student_mode": student_mode,
            "user_ids": user_ids,
        }), 200