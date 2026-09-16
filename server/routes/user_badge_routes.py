# routes/user_badge_routes.py
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from auth import role_required
from database import db_session
from repositories.user_badge_repository import UserBadgeRepository
from repositories.badge_repository import BadgeRepository
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
        try:
            user_badge = repo.create(
                user_id=data["user_id"],
                badge_id=data["badge_id"],
                comment=data.get("comment"),
                actor_user_id=current_user.id,
            )
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "This badge is already assigned to the user"}), 409
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
    status = request.args.get("filter", "all").lower()
    if status not in {"all", "assigned", "unassigned"}:
        return jsonify({"error": "filter must be one of: all, assigned, unassigned"}), 400

    with db_session() as session:

        repo = BadgeRepository(session)
        catalog = repo.list_for_student(user_id=current_user.id, status=status)
        return jsonify([
            {
                "id": ub.id if ub else None,
                "badge_id": badge.id,
                "title": badge.title,
                "description": badge.description,
                "value": badge.value,
                "image_url": badge.image_url,
                "relevant_activity_task_id": badge.relevant_activity_task_id,
                "activity_id": badge.badge_activity_task.activity_id,
                "activity_title": badge.badge_activity_task.activity.title,
                "assigned": ub is not None,
                "catalog_state": "assigned" if ub else "unassigned",
                "unassigned_message": (
                    None
                    if ub
                    else f"Solve a task from activity {badge.badge_activity_task.activity.title} to get this badge"
                ),
                "comment": ub.comment if ub else None,
                "created_at": _to_utc_iso(ub.created_at) if ub else None,
            }
            for badge, ub in catalog
        ]), 200