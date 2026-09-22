from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from access_policies import owns_group
from auth import role_required
from database import db_session
from models import User
from repositories.group_repository import GroupRepository
from repositories.user_groups_repository import UserGroupsRepository


bp = Blueprint("user_groups", __name__, url_prefix="/api/user-groups")


@bp.before_request
@login_required
def require_login():
    pass


def _get_authorized_group(session, group_id):
    group = GroupRepository(session).get_by_id(group_id)
    if not group:
        return None, (jsonify({"error": "Group not found"}), 404)
    if not owns_group(current_user, group):
        return None, (jsonify({"error": "You do not have access to this group"}), 403)
    return group, None


@bp.route("/<int:group_id>", methods=["GET"])
@role_required("admin", "teacher")
def get_group_members(group_id: int):
    with db_session() as session:
        _, error = _get_authorized_group(session, group_id)
        if error:
            return error
        memberships = UserGroupsRepository(session).list_by_group(group_id)
        return jsonify([
            {
                "user_id": membership.user.id,
                "username": membership.user.username,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "full_name": f"{membership.user.first_name} {membership.user.last_name}",
                "role": membership.user.role.name if membership.user.role else None,
            }
            for membership in memberships
        ]), 200


@bp.route("/<int:group_id>", methods=["PUT"])
@role_required("admin", "teacher")
def replace_group_members(group_id: int):
    data = request.get_json(silent=True) or {}
    user_ids = data.get("user_ids")
    if not isinstance(user_ids, list) or any(not isinstance(user_id, int) for user_id in user_ids):
        return jsonify({"error": "user_ids must be a list of integer user IDs"}), 400
    if len(user_ids) != len(set(user_ids)):
        return jsonify({"error": "user_ids must not contain duplicates"}), 400

    with db_session() as session:
        group, error = _get_authorized_group(session, group_id)
        if error:
            return error

        users = session.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
        found_ids = {user.id for user in users}
        missing_ids = sorted(set(user_ids) - found_ids)
        if missing_ids:
            return jsonify({"error": "One or more users were not found", "user_ids": missing_ids}), 404

        user_groups_repo = UserGroupsRepository(session)
        orphaned_students = user_groups_repo.students_orphaned_by_replacement(
            group_id,
            set(user_ids),
        )
        if orphaned_students:
            return jsonify({
                "error": "Cannot remove students from their last group",
                "usernames": orphaned_students,
            }), 409

        try:
            user_groups_repo.replace_members(
                group_id,
                user_ids,
                actor_user_id=current_user.id,
            )
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Could not update group membership"}), 409

        return jsonify({"success": True, "user_ids": user_ids}), 200