from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from analytics.analytics_orchestrator import generate_group_analytics, generate_llm_feedback, generate_student_portfolio
from analytics.dataset_creator import DatasetFilters
from auth import role_required
from database import db_session
from models import User
from repositories.activity_repository import ActivityRepository
from repositories.analytics_repository import AnalyticsRepository
from repositories.group_repository import GroupRepository

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@bp.before_request
@login_required
def require_login():
    pass


def _query_ids(name: str) -> tuple[int, ...]:
    values = request.args.getlist(name)
    ids = []
    for value in values:
        for item in value.split(","):
            item = item.strip()
            if not item:
                continue
            try:
                ids.append(int(item))
            except ValueError:
                raise ValueError(f"{name} must contain integer IDs")
    return tuple(dict.fromkeys(ids))


def _filters_from_query() -> DatasetFilters:
    return DatasetFilters(
        group_ids=_query_ids("group_ids"),
        activity_ids=_query_ids("activity_ids"),
    )


def _reject_inaccessible_selection(session, filters: DatasetFilters):
    """Return an error (response, status) tuple, or None if the selection is authorized."""
    inaccessible_groups = GroupRepository(session).find_inaccessible_ids(current_user, filters.group_ids)
    inaccessible_activities = ActivityRepository(session).find_inaccessible_ids(current_user, filters.activity_ids)
    if inaccessible_groups or inaccessible_activities:
        return jsonify({
            "error": "You do not have access to one or more selected groups/activities",
            "group_ids": inaccessible_groups,
            "activity_ids": inaccessible_activities,
        }), 403
    return None


@bp.route("/groups", methods=["GET"])
@role_required("admin", "teacher")
def get_group_analytics():
    try:
        filters = _filters_from_query()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    with db_session() as session:
        rejection = _reject_inaccessible_selection(session, filters)
        if rejection:
            return rejection
        result = generate_group_analytics(session, filters)
    return jsonify(result), 200


@bp.route("/student/<int:student_id>", methods=["GET"])
@role_required("admin", "teacher")
def get_student_portfolio(student_id: int):
    try:
        filters = _filters_from_query()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    with db_session() as session:
        rejection = _reject_inaccessible_selection(session, filters)
        if rejection:
            return rejection

        student = session.query(User).filter(User.id == student_id).first()
        if not student or not student.role or student.role.name != "student":
            return jsonify({"error": "Student not found"}), 404
        if not AnalyticsRepository(session).is_student_accessible(current_user.id, current_user.role.name, student_id):
            return jsonify({"error": "You do not have access to this student"}), 403

        result = generate_student_portfolio(session, student_id, filters)
    return jsonify(result), 200


@bp.route("/llm_feedback", methods=["POST"])
@role_required("admin", "teacher")
def post_llm_feedback():
    data = request.get_json(silent=True) or {}
    code = data.get("code")
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "code is required"}), 400

    result = generate_llm_feedback(code, data.get("analysis"))
    if "error" in result:
        return jsonify(result), 502
    return jsonify(result), 200
