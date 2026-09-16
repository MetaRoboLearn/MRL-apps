from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, exists, or_

from models import ActivityTask, Badge
from models.user_activity_task import UserActivityTask
from models.user_badge import UserBadge
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

    def get_by_activity_task_id(self, activity_task_id: int) -> Optional[Badge]:
        return (
            self.session.query(Badge)
            .filter(Badge.relevant_activity_task_id == activity_task_id)
            .first()
        )

    def list_for_student(self, *, user_id: int, status: str = "all"):
        """Return badges for activity tasks visible to a student."""
        assigned_task = exists().where(
            and_(
                UserActivityTask.activity_task_id == ActivityTask.id,
                UserActivityTask.user_id == user_id,
            )
        )
        visible_task = or_(
            ActivityTask.student_mode == "all",
            and_(ActivityTask.student_mode == "include", assigned_task),
            and_(ActivityTask.student_mode == "exclude", ~assigned_task),
        )

        query = (
            self.session.query(Badge, UserBadge)
            .join(ActivityTask, ActivityTask.id == Badge.relevant_activity_task_id)
            .outerjoin(
                UserBadge,
                and_(UserBadge.badge_id == Badge.id, UserBadge.user_id == user_id),
            )
            .filter(visible_task)
        )

        if status == "assigned":
            query = query.filter(UserBadge.id.isnot(None))
        elif status == "unassigned":
            query = query.filter(UserBadge.id.is_(None))

        return query.order_by(Badge.id.asc()).all()

    # ---------- CREATE ----------
    def create(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        value: int,
        image_url: str,
        relevant_activity_task_id: int,
        actor_user_id: Optional[int] = None,
    ) -> Badge:
        now = utc_now()
        badge = Badge(
            title=title,
            description=description,
            value=value,
            image_url=image_url,
            relevant_activity_task_id=relevant_activity_task_id,
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