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

def _assignment_state_dict(user_badge):
    """Shared assignment shape reused by Assign, Update, and student portfolios."""
    badge = user_badge.badge
    return {
        "assigned": True,
        "user_badge_id": user_badge.id,
        "badge_id": badge.id,
        "title": badge.title,
        "description": badge.description,
        "image_url": badge.image_url,
        "comment": user_badge.comment,
        "created_at": _to_utc_iso(user_badge.created_at),
        "created_by": user_badge.created_by,
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
        user_badge = repo.get_with_badge(user_badge.id)
        return jsonify(_assignment_state_dict(user_badge)), 201


# ---------- UPDATE BADGE COMMENT ----------
@bp.route("/<int:user_badge_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_badge_comment(user_badge_id: int):
    data = request.get_json(silent=True) or {}
    with db_session() as session:
        repo = UserBadgeRepository(session)
        user_badge = repo.update(
            user_badge_id,
            comment=data.get("comment"),
            actor_user_id=current_user.id,
        )
        if not user_badge:
            return jsonify({"error": "User badge not found"}), 404
        return jsonify(_assignment_state_dict(user_badge)), 200


# ---------- REMOVE BADGE ----------
@bp.route("/<int:user_badge_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def remove_badge(user_badge_id: int):
    with db_session() as session:
        repo = UserBadgeRepository(session)
        existing = repo.get_by_id(user_badge_id)
        badge_id = existing.badge_id if existing else None
        ok = repo.delete(user_badge_id)
        if not ok:
            return jsonify({"error": "User badge not found"}), 404
        return jsonify({"assigned": False, "user_badge_id": user_badge_id, "badge_id": badge_id}), 200


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