from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from access_policies import owns_activity
from auth import role_required
from database import db_session
from models.user import User
from repositories.activity_task_repository import ActivityTaskRepository
from repositories.user_activity_task_repository import UserActivityTaskRepository
from repositories.user_repository import UserRepository

bp = Blueprint("user_activity_tasks", __name__, url_prefix="/api/activity-tasks")


@bp.before_request
@login_required
def require_login():
    pass


def _activity_task_access_error(activity_task):
    if current_user.role.name == "admin":
        return None
    if activity_task.activity and owns_activity(current_user, activity_task.activity):
        return None
    return jsonify({"error": "Nemate pristup ovom zadatku aktivnosti."}), 403


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
            return jsonify({"error": "Zadatak aktivnosti nije pronađen."}), 404
        access_error = _activity_task_access_error(at)
        if access_error:
            return access_error

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
        return jsonify({"error": "student_mode mora biti 'all', 'include' ili 'exclude'."}), 400

    user_ids = data.get("user_ids", [])
    if not isinstance(user_ids, list) or any(
        not isinstance(user_id, int) or isinstance(user_id, bool)
        for user_id in user_ids
    ):
        return jsonify({"error": "user_ids mora biti popis cijelih ID-jeva korisnika."}), 400
    if len(user_ids) != len(set(user_ids)):
        return jsonify({"error": "user_ids ne smije sadržavati duplikate."}), 400

    with db_session() as session:
        at_repo = ActivityTaskRepository(session)
        at = at_repo.get_by_id(activity_task_id)
        if not at:
            return jsonify({"error": "Zadatak aktivnosti nije pronađen."}), 404
        access_error = _activity_task_access_error(at)
        if access_error:
            return access_error

        if student_mode != "all" and user_ids:
            assignable_users = (
                session.query(User.id)
                .filter(User.id.in_(user_ids), User.role.has(name="student"))
                .all()
            )
            assignable_ids = {row[0] for row in assignable_users}
            invalid_ids = sorted(set(user_ids) - assignable_ids)
            if invalid_ids:
                return jsonify({
                    "error": "Jedan ili više korisnika nisu učenici kojima je moguće dodijeliti zadatak.",
                    "user_ids": invalid_ids,
                }), 400

        at.student_mode = student_mode

        uat_repo = UserActivityTaskRepository(session)
        if student_mode == "all":
            uat_repo.set_students(activity_task_id, [])
            user_ids = []
        else:
            uat_repo.set_students(activity_task_id, user_ids)

        session.commit()

        return jsonify({
            "student_mode": student_mode,
            "user_ids": user_ids,
        }), 200