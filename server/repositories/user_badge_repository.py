from typing import Optional
from sqlalchemy.orm import Session, joinedload

from models.user_badge import UserBadge
from repositories.base_repository import BaseRepository
from utils import utc_now


class UserBadgeRepository(BaseRepository[UserBadge]):
    def __init__(self, session: Session):
        super().__init__(session, UserBadge)

    # ---------- CREATE ----------
    def create(
        self,
        *,
        user_id: int,
        badge_id: int,
        comment: Optional[str] = None,
        actor_user_id: Optional[int] = None,
    ) -> UserBadge:
        now = utc_now()
        user_badge = UserBadge(
            user_id=user_id,
            badge_id=badge_id,
            comment=comment,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )

        self.session.add(user_badge)
        self.session.commit()
        self.session.refresh(user_badge)
        return user_badge

    def list_by_user(self, user_id: int):
        return (
            self.session.query(UserBadge)
            .options(joinedload(UserBadge.badge))
            .filter(UserBadge.user_id == user_id)
            .all()
        )

    def get_with_badge(self, user_badge_id: int) -> Optional[UserBadge]:
        return (
            self.session.query(UserBadge)
            .options(joinedload(UserBadge.badge))
            .filter(UserBadge.id == user_badge_id)
            .first()
        )

    def update(
        self,
        user_badge_id: int,
        *,
        comment: Optional[str],
        actor_user_id: Optional[int] = None,
    ) -> Optional[UserBadge]:
        user_badge = self.get_with_badge(user_badge_id)
        if not user_badge:
            return None
        user_badge.comment = comment
        user_badge.updated_at = utc_now()
        user_badge.updated_by = actor_user_id
        self.session.commit()
        self.session.refresh(user_badge)
        return user_badge