from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from file_utils import save_badge_image, delete_badge_image
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
    }


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
    image = request.files.get("image")

    if not title or value is None or not image:
        return jsonify({"error": "Missing fields (title, value, image required)"}), 400

    image_url = save_badge_image(image)
    if not image_url:
        return jsonify({"error": "Invalid image file"}), 400

    with db_session() as session:
        repo = BadgeRepository(session)
        badge = repo.create(
            title=title,
            description=description,
            value=int(value),
            image_url=image_url,
            actor_user_id=current_user.id,
        )
        return jsonify(_badge_to_dict(badge)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:badge_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_badge(badge_id: int):
    title = request.form.get("title")
    value = request.form.get("value")
    description = request.form.get("description")
    image = request.files.get("image")

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

        delete_badge_image(badge.image_url)

        repo.delete(badge_id)
        return jsonify({"deleted": True}), 200