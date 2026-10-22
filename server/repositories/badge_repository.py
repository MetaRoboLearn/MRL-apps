from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import Badge
from repositories.base_repository import BaseRepository
from utils import utc_now


class BadgeRepository(BaseRepository[Badge]):
    def __init__(self, session: Session):
        super().__init__(session, Badge)

    # ---------- LIST ----------
    def list(
        self,
        *,
        search: Optional[str] = None,
    ):
        q = self.session.query(Badge)

        if search:
            like = f"%{search}%"
            q = q.filter(
                or_(
                    Badge.title.ilike(like),
                    Badge.description.ilike(like),
                )
            )

        return q.all()

    # ---------- CREATE ----------
    def create(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        value: int,
        image_url: str,
        actor_user_id: Optional[int] = None,
    ) -> Badge:
        now = utc_now()
        badge = Badge(
            title=title,
            description=description,
            value=value,
            image_url=image_url,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )

        self.session.add(badge)
        self.session.commit()
        self.session.refresh(badge)
        return badge

    # ---------- UPDATE (PATCH) ----------
    def update(
        self,
        badge_id: int,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        value: Optional[int] = None,
        image_url: Optional[str] = None,
        actor_user_id: Optional[int] = None,
    ) -> Optional[Badge]:
        badge = self.get_by_id(badge_id)
        if not badge:
            return None

        if title is not None:
            badge.title = title
        if description is not None:
            badge.description = description
        if value is not None:
            badge.value = value
        if image_url is not None:
            badge.image_url = image_url

        badge.updated_at = utc_now()
        badge.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(badge)
        return badge