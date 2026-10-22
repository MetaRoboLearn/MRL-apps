from flask import Blueprint, jsonify
from flask_login import login_required

from auth import role_required
from database import db_session

from repositories.type_repository import TypeRepository

bp = Blueprint("types", __name__, url_prefix="/api/types")

@bp.before_request
@login_required
@role_required('admin', 'teacher')
def require_login():
    pass  # login_required handles the check, this just needs to exist

@bp.route("/", methods=["GET"])
def list_types():
    with db_session() as session:
        repo = TypeRepository(session)
        types = repo.list_all()
        return jsonify([
            {"id": t.id, "name": t.name}
            for t in types
        ]), 200