from typing import Iterable

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
