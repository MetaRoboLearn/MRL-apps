from typing import Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.user import User
from models.user_groups import UserGroups
from repositories.base_repository import BaseRepository
from utils import utc_now


class UserGroupsRepository(BaseRepository[UserGroups]):
    def __init__(self, session: Session):
        super().__init__(session, UserGroups)

    def list_by_group(self, group_id: int):
        return (
            self.session.query(UserGroups)
            .options(joinedload(UserGroups.user).joinedload(User.role))
            .filter(UserGroups.group_id == group_id)
            .join(User, User.id == UserGroups.user_id)
            .order_by(User.last_name.asc(), User.first_name.asc(), User.id.asc())
            .all()
        )

    def replace_members(
        self,
        group_id: int,
        user_ids: Iterable[int],
        *,
        actor_user_id: int,
    ) -> None:
        requested_ids = set(user_ids)
        current_rows = (
            self.session.query(UserGroups)
            .filter(UserGroups.group_id == group_id)
            .all()
        )
        current_ids = {row.user_id for row in current_rows}

        for row in current_rows:
            if row.user_id not in requested_ids:
                self.session.delete(row)

        now = utc_now()
        for user_id in requested_ids - current_ids:
            self.session.add(UserGroups(
                group_id=group_id,
                user_id=user_id,
                created_at=now,
                created_by=actor_user_id,
                updated_by=actor_user_id,
            ))
        self.session.commit()

    def add_member(
        self,
        group_id: int,
        user_id: int,
        *,
        actor_user_id: int,
        commit: bool = True,
    ) -> UserGroups:
        membership = UserGroups(
            group_id=group_id,
            user_id=user_id,
            created_at=utc_now(),
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )
        self.session.add(membership)
        self.session.flush()
        if commit:
            self.session.commit()
        return membership

    def list_students_with_only_membership(self, user_ids: set[int]) -> list[int]:
        """Return candidate students whose total group count is exactly one."""
        if not user_ids:
            return []

        membership_counts = (
            self.session.query(
                UserGroups.user_id.label("user_id"),
                func.count(UserGroups.id).label("membership_count"),
            )
            .filter(UserGroups.user_id.in_(user_ids))
            .group_by(UserGroups.user_id)
            .subquery()
        )
        return [
            user_id
            for user_id, in (
                self.session.query(User.id)
                .join(membership_counts, membership_counts.c.user_id == User.id)
                .filter(
                    User.id.in_(user_ids),
                    User.role.has(name="student"),
                    membership_counts.c.membership_count == 1,
                )
                .all()
            )
        ]

    def students_orphaned_by_replacement(
        self,
        group_id: int,
        requested_ids: set[int],
    ) -> list[int]:
        current_ids = {
            user_id
            for (user_id,) in self.session.query(UserGroups.user_id)
            .filter(UserGroups.group_id == group_id)
            .all()
        }
        removed_ids = current_ids - requested_ids
        return self.list_students_with_only_membership(removed_ids)
