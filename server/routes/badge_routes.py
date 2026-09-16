from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from auth import role_required
from database import db_session
from file_utils import save_badge_image, delete_badge_image
from repositories.activity_task_repository import ActivityTaskRepository
from repositories.badge_repository import BadgeRepository
from utils import _to_utc_iso

bp = Blueprint("badges", __name__, url_prefix="/api/badges")

@bp.before_request
@login_required
def require_login():
    pass

def _badge_to_dict(badge):
    return {
        "id": badge.id,
        "title": badge.title,
        "description": badge.description,
        "value": badge.value,
        "image_url": badge.image_url,
        "created_at": _to_utc_iso(badge.created_at),
        "updated_at": _to_utc_iso(badge.updated_at),
        "created_by": badge.created_by,
        "updated_by": badge.updated_by,
        "relevant_activity_task_id": badge.relevant_activity_task_id,
    }


def _can_manage_badge(badge):
    return current_user.role.name == "admin" or badge.created_by == current_user.id


# ---------- READ ONE ----------
@bp.route("/<int:badge_id>", methods=["GET"])
@role_required('admin', 'teacher')
def get_badge(badge_id: int):
    with db_session() as session:
        repo = BadgeRepository(session)
        badge = repo.get_by_id(badge_id)
        if not badge:
            return jsonify({"error": "Badge not found"}), 404
        return jsonify(_badge_to_dict(badge)), 200


# ---------- LIST ----------
@bp.route("/", methods=["GET"])
@role_required('admin', 'teacher')
def list_badges():
    search = request.args.get("search")

    with db_session() as session:
        repo = BadgeRepository(session)
        badges = repo.list(search=search)
        return jsonify([_badge_to_dict(b) for b in badges]), 200


# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def create_badge():
    title = request.form.get("title")
    value = request.form.get("value")
    description = request.form.get("description")
    activity_task_id = request.form.get("activity_task_id")
    image = request.files.get("image")

    if not title or value is None or not image or activity_task_id is None:
        return jsonify({"error": "Missing fields (title, value, activity_task_id, image required)"}), 400

    try:
        activity_task_id = int(activity_task_id)
        value = int(value)
    except (TypeError, ValueError):
        return jsonify({"error": "value and task_id must be integers"}), 400

    image_url = save_badge_image(image)
    if not image_url:
        return jsonify({"error": "Invalid image file"}), 400

    with db_session() as session:
        if current_user.role.name != "admin" and activity_task.created_by != current_user.id:
            return jsonify({"error": "You can only create badges for your own activity tasks"}), 403
        activity_task = ActivityTaskRepository(session).get_by_id(activity_task_id)
        if not activity_task:
            return jsonify({"error": "Activity task not found"}), 404
        

        repo = BadgeRepository(session)
        if repo.get_by_activity_task_id(activity_task_id):
            return jsonify({"error": "A badge already exists for this activity task"}), 409
        try:
            badge = repo.create(
                title=title,
                description=description,
                value=value,
                image_url=image_url,
                relevant_activity_task_id=activity_task_id,
                actor_user_id=current_user.id,
            )
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "A badge already exists for this activity task"}), 409
        return jsonify(_badge_to_dict(badge)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:badge_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_badge(badge_id: int):
    title = request.form.get("title")
    value = request.form.get("value")
    description = request.form.get("description")
    image = request.files.get("image")

    with db_session() as session:
        existing_badge = BadgeRepository(session).get_by_id(badge_id)
        if not existing_badge:
            return jsonify({"error": "Badge not found"}), 404
        if not _can_manage_badge(existing_badge):
            return jsonify({"error": "You can only edit your own badges"}), 403

    image_url = None
    if image:
        image_url = save_badge_image(image)
        if not image_url:
            return jsonify({"error": "Invalid image file"}), 400

        # delete old image
        with db_session() as session:
            repo = BadgeRepository(session)
            old_badge = repo.get_by_id(badge_id)
            if old_badge:
                delete_badge_image(old_badge.image_url)

    with db_session() as session:
        repo = BadgeRepository(session)
        badge = repo.update(
            badge_id,
            title=title,
            description=description,
            value=int(value) if value is not None else None,
            image_url=image_url,
            actor_user_id=current_user.id,
        )
        if not badge:
            return jsonify({"error": "Badge not found"}), 404

        return jsonify(_badge_to_dict(badge)), 200


# ---------- DELETE ----------
@bp.route("/<int:badge_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_badge(badge_id: int):
    with db_session() as session:
        repo = BadgeRepository(session)
        badge = repo.get_by_id(badge_id)
        if not badge:
            return jsonify({"error": "Badge not found"}), 404
        if not _can_manage_badge(badge):
            return jsonify({"error": "You can only delete your own badges"}), 403

        delete_badge_image(badge.image_url)

        repo.delete(badge_id)
        return jsonify({"deleted": True}), 200