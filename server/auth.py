from functools import wraps
from flask import jsonify
from flask_login import LoginManager, current_user, login_required
from sqlalchemy.orm import joinedload

from database import db_session
from models import User

login_manager = LoginManager()


def init_auth(app):
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        with db_session() as session:
            user = (
                session.query(User)
                .options(joinedload(User.role))  # eager-load role
                .get(int(user_id))
            )
            if user:
                session.expunge(user)  # detach cleanly with data loaded
            return user

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required"}), 401


def role_required(*role_names):
    """
    Decorator to restrict access by role name.

    Usage:
        @role_required("admin")
        @role_required("admin", "teacher")
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role.name not in role_names:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator