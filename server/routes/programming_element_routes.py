from flask import Blueprint, jsonify
from flask_login import login_required

from auth import role_required
from database import db_session
from repositories.programming_element_repository import ProgrammingElementRepository

bp = Blueprint('programming_elements', __name__, url_prefix='/api/programming-elements')


@bp.before_request
@login_required
def require_login():
    pass


@bp.route('/', methods=['GET'])
@role_required('admin', 'teacher')
def list_programming_elements():
    with db_session() as session:
        elements = ProgrammingElementRepository(session).list_all()
        return jsonify([
            {
                'id': element.id,
                'name': element.name,
                'description': element.description,
                'element_type_id': element.element_type_id,
            }
            for element in elements
        ]), 200