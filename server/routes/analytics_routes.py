from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_login import login_required

from analytics.analytics_orchestrator import generate_group_analytics, generate_student_portfolio
from analytics.dataset_creator import DatasetFilters
from auth import role_required
from database import db_session

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


@bp.route("/groups", methods=["GET"])
@role_required("admin", "teacher")
def get_group_analytics():
    try:
        filters = _filters_from_query()
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    with db_session() as session:
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
        result = generate_student_portfolio(session, student_id, filters)
    return jsonify(result), 200
