from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from access_policies import owns_group
from auth import role_required
from database import db_session
from repositories.group_repository import GroupRepository
from repositories.user_groups_repository import UserGroupsRepository
from utils import _to_utc_iso


bp = Blueprint("groups", __name__, url_prefix="/api/groups")


@bp.before_request
@login_required
def require_login():
    pass


def _group_to_dict(group):
    return {
        "group_id": group.id,
        "group_name": group.group_name,
        "created_by": group.created_by,
        "updated_by": group.updated_by,
        "created_at": _to_utc_iso(group.created_at),
        "updated_at": _to_utc_iso(group.updated_at),
    }


@bp.route("/", methods=["GET"])
@role_required("admin", "teacher")
def list_groups():
    with db_session() as session:
        groups = GroupRepository(session).list_visible(
            actor_user_id=current_user.id,
            actor_role=current_user.role.name,
        )
        return jsonify([_group_to_dict(group) for group in groups]), 200


@bp.route("/", methods=["POST"])
@role_required("admin", "teacher")
def create_group():
    data = request.get_json(silent=True) or {}
    group_name = data.get("group_name")
    if not isinstance(group_name, str) or not group_name.strip():
        return jsonify({"error": "group_name is required"}), 400

    with db_session() as session:
        group = GroupRepository(session).create(
            group_name=group_name.strip(),
            actor_user_id=current_user.id,
        )
        return jsonify({"success": True, "group_id": group.id}), 201


@bp.route("/<int:group_id>", methods=["GET"])
@role_required("admin", "teacher")
def get_group(group_id: int):
    with db_session() as session:
        group = GroupRepository(session).get_by_id(group_id)
        if not group:
            return jsonify({"error": "Group not found"}), 404
        if not owns_group(current_user, group):
            return jsonify({"error": "You do not have access to this group"}), 403

        memberships = UserGroupsRepository(session).list_by_group(group_id)
        return jsonify({
            **_group_to_dict(group),
            "members": [
                {
                    "user_id": membership.user.id,
                    "username": membership.user.username,
                    "first_name": membership.user.first_name,
                    "last_name": membership.user.last_name,
                    "full_name": f"{membership.user.first_name} {membership.user.last_name}",
                    "role": membership.user.role.name if membership.user.role else None,
                }
                for membership in memberships
            ],
        }), 200


@bp.route("/<int:group_id>", methods=["PATCH"])
@role_required("admin", "teacher")
def update_group(group_id: int):
    data = request.get_json(silent=True) or {}
    group_name = data.get("group_name")
    if not isinstance(group_name, str) or not group_name.strip():
        return jsonify({"error": "group_name is required"}), 400

    with db_session() as session:
        repo = GroupRepository(session)
        group = repo.get_by_id(group_id)
        if not group:
            return jsonify({"error": "Group not found"}), 404
        if not owns_group(current_user, group):
            return jsonify({"error": "You do not have access to this group"}), 403
        group = repo.update_name(
            group_id,
            group_name=group_name.strip(),
            actor_user_id=current_user.id,
        )
        return jsonify(_group_to_dict(group)), 200


@bp.route("/<int:group_id>", methods=["DELETE"])
@role_required("admin", "teacher")
def delete_group(group_id: int):
    with db_session() as session:
        group_repo = GroupRepository(session)
        group = group_repo.get_by_id(group_id)
        if not group:
            return jsonify({"error": "Group not found"}), 404
        if not owns_group(current_user, group):
            return jsonify({"error": "You do not have access to this group"}), 403

        orphaned_students = group_repo.delete_group(group_id)
        if orphaned_students:
            return jsonify({
                "error": "Cannot delete group because it would leave students without a group",
                "usernames": orphaned_students,
            }), 409

        return jsonify({"success": True}), 200