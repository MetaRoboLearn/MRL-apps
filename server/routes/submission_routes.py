from __future__ import annotations

from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from analytics.analytics_orchestrator import generate_reduced_submissions
from auth import role_required
from database import db_session

bp = Blueprint("submissions", __name__, url_prefix="/api/submissions")


@bp.before_request
@login_required
def require_login():
    pass


@bp.route("/", methods=["GET"])
@role_required("student")
def get_my_submissions():
    with db_session() as session:
        result = generate_reduced_submissions(session, current_user.id)
    return jsonify(result), 200
