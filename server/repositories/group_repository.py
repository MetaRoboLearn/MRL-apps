from typing import Optional

from sqlalchemy.orm import Session, joinedload

from access_policies import owns_group
from models.groups import Group
from models.user import User
from models.user_groups import UserGroups
from repositories.base_repository import BaseRepository
from repositories.user_groups_repository import UserGroupsRepository
from utils import utc_now


class GroupRepository(BaseRepository[Group]):
    def __init__(self, session: Session):
        super().__init__(session, Group)

    def list_visible(self, *, actor_user_id: int, actor_role: str):
        query = self.session.query(Group).order_by(Group.id.asc())
        if actor_role != "admin":
            query = query.filter(Group.created_by == actor_user_id)
        return query.all()

    def find_inaccessible_ids(self, user, group_ids) -> list[int]:
        """Return requested group ids the user does not own (missing ids included)."""
        if not group_ids:
            return []
        requested = set(group_ids)
        fetched = self.session.query(Group).filter(Group.id.in_(requested)).all()
        inaccessible = {group.id for group in fetched if not owns_group(user, group)}
        inaccessible |= requested - {group.id for group in fetched}
        return sorted(inaccessible)

    def get_by_id(self, entity_id: int) -> Optional[Group]:
        return (
            self.session.query(Group)
            .options(joinedload(Group.creator), joinedload(Group.updater))
            .filter(Group.id == entity_id)
            .first()
        )

    def create(self, *, group_name: str, actor_user_id: int) -> Group:
        now = utc_now()
        group = Group(
            group_name=group_name,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )
        self.session.add(group)
        self.session.flush()
        self.session.commit()
        self.session.refresh(group)
        return group

    def update_name(self, group_id: int, *, group_name: str, actor_user_id: int) -> Optional[Group]:
        group = super().get_by_id(group_id)
        if not group:
            return None
        group.group_name = group_name
        group.updated_at = utc_now()
        group.updated_by = actor_user_id
        self.session.flush()
        self.session.commit()
        self.session.refresh(group)
        return group

    def delete_group(self, group_id: int) -> list[int] | None:
        """Delete a group and memberships unless students would be orphaned."""
        group = self.get_by_id(group_id)
        if not group:
            return None

        candidate_students = {
            user_id
            for user_id, in (
                self.session.query(UserGroups.user_id)
                .join(User, User.id == UserGroups.user_id)
                .filter(
                    UserGroups.group_id == group_id,
                    User.role.has(name="student"),
                )
                .all()
            )
        }
        orphaned_students = UserGroupsRepository(
            self.session
        ).list_students_with_only_membership(candidate_students)
        if orphaned_students:
            return orphaned_students

        self.session.query(UserGroups).filter(UserGroups.group_id == group_id).delete(
            synchronize_session=False
        )
        self.session.delete(group)
        self.session.commit()
        return []