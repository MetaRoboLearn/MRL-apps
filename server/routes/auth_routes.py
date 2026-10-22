import bcrypt
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy.orm import joinedload

from database import db_session
from models import User
from utils import utc_now

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def _user_response(user):
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.name,
    }

@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    with db_session() as session:
        user = (
            session.query(User)
            .options(joinedload(User.role))
            .filter_by(username=username)
            .first()
        )

        if not user or not user.active:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
            return jsonify({"error": "Invalid credentials"}), 401

        user.last_login = utc_now()
        session.commit()

        login_user(user, remember=True)

        return jsonify(_user_response(user)), 200


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"}), 200


@bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify(_user_response(current_user)), 200