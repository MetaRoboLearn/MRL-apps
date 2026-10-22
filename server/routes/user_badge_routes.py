# routes/user_badge_routes.py
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from repositories.user_badge_repository import UserBadgeRepository
from utils import _to_utc_iso

bp = Blueprint("user_badges", __name__, url_prefix="/api/user-badges")

@bp.before_request
@login_required
def require_login():
    pass

def _user_badge_to_dict(ub):
    return {
        "id": ub.id,
        "user_id": ub.user_id,
        "badge_id": ub.badge_id,
        "comment": ub.comment,
        "created_at": _to_utc_iso(ub.created_at),
        "created_by": ub.created_by,
    }


# ---------- ASSIGN BADGE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def assign_badge():
    data = request.get_json(silent=True) or {}

    required = ("user_id", "badge_id")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    with db_session() as session:
        repo = UserBadgeRepository(session)
        user_badge = repo.create(
            user_id=data["user_id"],
            badge_id=data["badge_id"],
            comment=data.get("comment"),
            actor_user_id=current_user.id,
        )
        return jsonify(_user_badge_to_dict(user_badge)), 201


# ---------- REMOVE BADGE ----------
@bp.route("/<int:user_badge_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def remove_badge(user_badge_id: int):
    with db_session() as session:
        repo = UserBadgeRepository(session)
        ok = repo.delete(user_badge_id)
        if not ok:
            return jsonify({"error": "User badge not found"}), 404
        return jsonify({"deleted": True}), 200


# ---------- GET BADGES FOR CURRENT USER ----------
@bp.route("/my", methods=["GET"])
def get_my_badges():
    with db_session() as session:
        repo = UserBadgeRepository(session)
        user_badges = repo.list_by_user(current_user.id)
        return jsonify([
            {
                "id": ub.id,
                "badge_id": ub.badge.id,
                "title": ub.badge.title,
                "description": ub.badge.description,
                "value": ub.badge.value,
                "image_url": ub.badge.image_url,
                "comment": ub.comment,
                "created_at": _to_utc_iso(ub.created_at),
            }
            for ub in user_badges
        ]), 200