import bcrypt
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from auth import role_required
from database import db_session
from repositories.user_repository import UserRepository
from utils import parse_boolean_param, _to_utc_iso

bp = Blueprint("users", __name__, url_prefix="/api/users")

@bp.before_request
@login_required
def require_login():
    pass  # login_required handles the check, this just needs to exist

def _user_to_dict(user):
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role_id": user.role_id,
        "role_name": user.role.name if user.role else None,
        "active": getattr(user, "active", None),
        "last_login": _to_utc_iso(user.last_login) if user.last_login else None,
        "created_at": _to_utc_iso(user.created_at),
        "updated_at": _to_utc_iso(user.updated_at),
        "created_by": user.created_by,
        "updated_by": user.updated_by,
    }

# ---------- LIST ALL ROLES ----------
@bp.route("/roles", methods=["GET"])
@role_required('admin', 'teacher')
def list_roles():
    with db_session() as session:
        repo = UserRepository(session)
        roles = repo.list_all_roles()
        return jsonify([
            {"id": r.id, "name": r.name}
            for r in roles
        ]), 200

# ---------- READ ONE ----------
@bp.route("/<int:user_id>", methods=["GET"])
@role_required('admin', 'teacher')
def get_user(user_id: int):
    with db_session() as session:
        repo = UserRepository(session)
        user = repo.get_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(_user_to_dict(user)), 200


# ---------- LIST ----------
@bp.route("/", methods=["GET"])
@role_required('admin', 'teacher')
def list_users():
    # query params: ?skip=0&limit=50&role_id=2&active_only=true&search=marta&order_by_username=true
    skip = int(request.args.get("skip", 0))
    limit = int(request.args.get("limit", 50))

    role_id_raw = request.args.get("role_id")
    role_id = int(role_id_raw) if role_id_raw is not None else None

    try:
        active_only = parse_boolean_param(request.args.get("active_only"))
        order_by_username = parse_boolean_param(request.args.get("order_by_username", "false"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    search = request.args.get("search")

    with db_session() as session:
        repo = UserRepository(session)
        users = repo.list(
            skip=skip,
            limit=limit,
            role_id=role_id,
            active_only=active_only,
            search=search,
            order_by_username=order_by_username,
        )
        return jsonify([_user_to_dict(u) for u in users]), 200


# ---------- CREATE ----------
@bp.route("/", methods=["POST"])
@role_required('admin', 'teacher')
def create_user():
    data = request.get_json(silent=True) or {}
    required = ("username", "password_hash", "first_name", "last_name", "role_id")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": "Missing fields", "missing": missing}), 400

    with db_session() as session:
        repo = UserRepository(session)

        if repo.exists_username(data["username"]):
            return jsonify({"error": "Username already exists"}), 409

        user = repo.create(
            username=data["username"],
            password_hash=bcrypt.hashpw(
                data["password_hash"].encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8"),
            first_name=data["first_name"],
            last_name=data["last_name"],
            role_id=int(data["role_id"]),
            actor_user_id=current_user.id,
        )
        return jsonify(_user_to_dict(user)), 201


# ---------- UPDATE (PATCH) ----------
@bp.route("/<int:user_id>", methods=["PATCH"])
@role_required('admin', 'teacher')
def update_user(user_id: int):
    data = request.get_json(silent=True) or {}

    # allow only these fields to be updated through this endpoint
    allowed = {"username", "first_name", "last_name", "role_id", "password_hash"}
    unknown = [k for k in data.keys() if k not in allowed]
    if unknown:
        return jsonify({"error": "Unknown fields", "unknown": unknown}), 400

    with db_session() as session:
        repo = UserRepository(session)

        # if username change requested, check availability
        if "username" in data:
            existing = repo.get_by_username(data["username"])
            if existing and existing.id != user_id:
                return jsonify({"error": "Username already exists"}), 409

        user = repo.update(
            user_id,
            username=data.get("username"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            role_id=int(data["role_id"]) if "role_id" in data else None,
            password_hash=bcrypt.hashpw(
                data["password_hash"].encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8") if "password_hash" in data else None,
            actor_user_id=current_user.id,
        )
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify(_user_to_dict(user)), 200


# ---------- DEACTIVATE ----------
@bp.route("/<int:user_id>/deactivate", methods=["POST"])
@role_required('admin', 'teacher')
def deactivate_user(user_id: int):
    with db_session() as session:
        repo = UserRepository(session)
        user = repo.deactivate(user_id, actor_user_id=current_user.id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(_user_to_dict(user)), 200


# ---------- ACTIVATE ----------
@bp.route("/<int:user_id>/activate", methods=["POST"])
@role_required('admin', 'teacher')
def activate_user(user_id: int):
    with db_session() as session:
        repo = UserRepository(session)
        user = repo.activate(user_id, actor_user_id=current_user.id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(_user_to_dict(user)), 200


# ---------- DELETE ----------
@bp.route("/<int:user_id>", methods=["DELETE"])
@role_required('admin', 'teacher')
def delete_user(user_id: int):
    with db_session() as session:
        repo = UserRepository(session)
        ok = repo.delete(user_id)
        if not ok:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"deleted": True}), 200


# ---------- EXISTS USERNAME ----------
@bp.route("/exists/<string:username>", methods=["GET"])
@role_required('admin', 'teacher')
def username_exists(username: str):
    with db_session() as session:
        repo = UserRepository(session)
        return jsonify({"username": username, "exists": repo.exists_username(username)}), 200

# ---------- USER BADGES ----------
@bp.route("/<int:user_id>/badges", methods=["GET"])
@role_required('admin', 'teacher')
def get_user_badges(user_id: int):
    with db_session() as session:
        from repositories.user_badge_repository import UserBadgeRepository
        repo = UserBadgeRepository(session)
        user_badges = repo.list_by_user(user_id)
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
                "created_by": ub.created_by,
            }
            for ub in user_badges
        ]), 200

# ---------- GET USERS BY ID ----------
@bp.route("/by-ids", methods=["POST"])
@role_required('admin', 'teacher')
def get_users_by_ids():
    data = request.get_json(silent=True) or {}
    ids = data.get("ids", [])
    if not ids:
        return jsonify([]), 200

    with db_session() as session:
        repo = UserRepository(session)
        users = repo.get_by_ids(ids)
        return jsonify([
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "username": u.username,
            }
            for u in users
        ]), 200