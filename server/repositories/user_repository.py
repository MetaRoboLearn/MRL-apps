from typing import Optional, Any, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import case, exists, or_

from models.user import User, Role
from models.user_groups import UserGroups
from repositories.base_repository import BaseRepository
from utils import utc_now


class UserRepository(BaseRepository[User]):
    def __init__(self, session: Session):
        super().__init__(session, User)

    # ---------- READ ONE ----------
    # def get_by_id(self, user_id: int) -> Optional[User]:
    #     return self.session.query(User).filter(User.id == user_id).first()

    def list_all_roles(self):
        return self.session.query(Role).all()

    def get_by_username(self, username: str) -> Optional[User]:
        return self.session.query(User).filter(User.username == username).first()

    # ---------- LIST ----------
    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        role_id: Optional[int] = None,
        active_only: Optional[bool] = None,
        search: Optional[str] = None,
        order_by_username: bool = False,
        group_assignment: Optional[str] = None,
    ) -> list[User]:
        return self._list_query(
            skip=skip,
            limit=limit,
            role_id=role_id,
            active_only=active_only,
            search=search,
            order_by_username=order_by_username,
            group_assignment=group_assignment,
        ).all()

    def list_with_assignment_status(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        role_id: Optional[int] = None,
        active_only: Optional[bool] = None,
        search: Optional[str] = None,
        order_by_username: bool = False,
        group_assignment: Optional[str] = None,
    ) -> List[tuple[User, bool]]:
        query = self._list_query(
            skip=skip,
            limit=limit,
            role_id=role_id,
            active_only=active_only,
            search=search,
            order_by_username=order_by_username,
            group_assignment=group_assignment,
        )
        has_group = exists().where(UserGroups.user_id == User.id)
        is_unassigned = case(
            (User.role.has(name="student"), ~has_group),
            else_=False,
        ).label("is_unassigned")
        return query.add_columns(is_unassigned).all()

    def _list_query(
        self,
        *,
        skip: int,
        limit: int,
        role_id: Optional[int],
        active_only: Optional[bool],
        search: Optional[str],
        order_by_username: bool,
        group_assignment: Optional[str],
    ):
        q = self.session.query(User).options(joinedload(User.role))

        if role_id is not None:
            q = q.filter(User.role_id == role_id)

        if active_only:
            q = q.filter(User.active.is_(True))

        has_group = exists().where(UserGroups.user_id == User.id)
        if group_assignment == "unassigned":
            q = q.filter(User.role.has(name="student"), ~has_group)
        elif group_assignment == "assigned":
            q = q.filter(User.role.has(name="student"), has_group)

        if search:
            like = f"%{search}%"
            q = q.filter(
                or_(
                    User.username.ilike(like),
                    User.first_name.ilike(like),
                    User.last_name.ilike(like),
                )
            )

        if order_by_username:
            q = q.order_by(User.username.asc())
        else:
            q = q.order_by(User.id.asc())

        return q.offset(skip).limit(limit)

    # ---------- CREATE ----------
    def create(
        self,
        *,
        username: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        role_id: int,
        actor_user_id: Optional[int] = None,  # who creates this user
        commit: bool = True,
    ) -> User:
        now = utc_now()
        user = User(
            username=username,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            role_id=role_id,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )

        self.session.add(user)
        self.session.flush()
        if commit:
            self.session.commit()
        self.session.refresh(user)
        return user

    # ---------- UPDATE (PATCH) ----------
    def update(
        self,
        user_id: int,
        *,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        role_id: Optional[int] = None,
        password_hash: Optional[str] = None,
        actor_user_id: Optional[int] = None,  # who updates this user
    ) -> Optional[User]:
        user = self.get_by_id(user_id)
        if not user:
            return None

        if username is not None:
            user.username = username
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if role_id is not None:
            user.role_id = role_id
        if password_hash is not None:
            user.password_hash = password_hash

        user.updated_at = utc_now()
        user.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(user)
        return user

    # ---------- EXISTS USERNAME ----------
    def exists_username(self, username: str) -> bool:
        return self.session.query(User.id).filter(User.username == username).first() is not None

    # ---------- GET USERS BY ID ----------

    def get_by_ids(self, ids: List[int]):
        if not ids:
            return []
        return self.session.query(User).filter(User.id.in_(ids)).all()