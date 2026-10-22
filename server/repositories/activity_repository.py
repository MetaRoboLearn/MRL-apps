import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import or_, exists

from access_policies import owns_activity
from models import ActivityTask, User
from models.activity import Activity
from models.user_activity_task import UserActivityTask
from repositories.base_repository import BaseRepository
from utils import utc_now

class ActivityRepository(BaseRepository[Activity]):
    def __init__(self, session: Session):
        super().__init__(session, Activity)

    # ---------- GET ACTIVITY DETAILS ----------
    def get_with_details(self, activity_id: int):
        return (
            self.session.query(Activity)
            .options(
                joinedload(Activity.creator),
                joinedload(Activity.updater),
            )
            .filter(Activity.id == activity_id)
            .first()
        )

    def find_inaccessible_ids(self, user, activity_ids) -> list[int]:
        """Return requested activity ids the user cannot read (missing ids included)."""
        if not activity_ids:
            return []
        requested = set(activity_ids)
        fetched = (
            self.session.query(Activity)
            .options(joinedload(Activity.activity_tasks))
            .filter(Activity.id.in_(requested))
            .all()
        )
        inaccessible = {
            activity.id
            for activity in fetched
            if not owns_activity(user, activity)
        }
        inaccessible |= requested - {activity.id for activity in fetched}
        return sorted(inaccessible)

    # ---------- LIST ----------
    def list(self, *, skip: int = 0, limit: int = 50, active_only: Optional[bool] = None, search: Optional[str] = None, order_by_time_from: bool = True) -> list[Activity]:
        q = self.session.query(Activity)

        if active_only:
            q = q.filter(Activity.active.is_(True))

        if search:
            like = f"%{search}%"
            q = q.filter(
                or_(
                    Activity.title.ilike(like),
                    Activity.description.ilike(like),
                )
            )

        if order_by_time_from:
            q = q.order_by(Activity.time_from.asc().nullslast(), Activity.id.asc())

        return q.offset(skip).limit(limit).all()

    # ---------- READ ALL ACTIVITY TASKS ----------
    def get_activity_tasks(self, entity_id: int) -> Optional[ActivityTask]:
        return self.session.query(Activity.activity_tasks).filter(Activity.id == entity_id).first()

    # ---------- READ ALL ACTIVITIES WITH TASK INFO ----------
    def list_activities_with_tasks(self, *, skip=0, limit=50, active_only=None, search=None, order_by_time_from=True):
        q = (
            self.session.query(Activity)
            .options(
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.task),
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.type),
                joinedload(Activity.creator),
            )
        )

        if active_only:
            q = q.filter(Activity.active.is_(True))

        if search:
            like = f"%{search}%"
            q = q.filter(or_(Activity.title.ilike(like), Activity.description.ilike(like)))

        if order_by_time_from:
            q = q.order_by(Activity.time_from.asc().nullslast(), Activity.id.asc())

        return q.offset(skip).limit(limit).all()

    def list_owned_activities_with_tasks(self, *, user_id: int, is_admin: bool, active_only: bool = True):
        """Return activities allowed in teacher-owned analytics/form selectors."""
        q = (
            self.session.query(Activity)
            .options(
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.task),
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.type),
                joinedload(Activity.creator),
            )
        )
        if active_only:
            q = q.filter(Activity.active.is_(True))
        if not is_admin:
            q = q.filter(Activity.created_by == user_id)
        return q.order_by(Activity.time_from.asc().nullslast(), Activity.id.asc()).all()

    # ---------- READ ALL ACTIVITIES AVAILABLE TO STUDENTS ----------
    @staticmethod
    def _student_task_is_available(activity_task, assigned_task_ids, now):
        activity = activity_task.activity
        if (
            not activity
            or not activity.active
            or activity.time_from is None
            or activity.time_to is None
            or activity.time_from > now
            or activity.time_to < now
        ):
            return False

        if activity_task.student_mode == 'include':
            return activity_task.id in assigned_task_ids
        if activity_task.student_mode == 'exclude':
            return activity_task.id not in assigned_task_ids
        return True

    def list_student_available_activities(self, user_id: int):
        now = utc_now()
        q = (
            self.session.query(Activity)
            .options(
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.task),
                joinedload(Activity.activity_tasks).joinedload(ActivityTask.type),
            )
            .filter(Activity.active.is_(True))
            .filter(
                exists().where(ActivityTask.activity_id == Activity.id)
            )
            .filter(Activity.time_from <= now)
            .filter(Activity.time_to >= now)
        )

        activities = q.all()
        assigned_task_ids = {
            row[0]
            for row in self.session.query(UserActivityTask.activity_task_id)
            .filter(UserActivityTask.user_id == user_id)
            .all()
        }

        available_activities = []
        for activity in activities:
            available_tasks = [
                activity_task
                for activity_task in sorted(activity.activity_tasks, key=lambda item: item.order)
                if self._student_task_is_available(activity_task, assigned_task_ids, now)
            ]
            if available_tasks:
                available_activities.append((activity, available_tasks))

        return available_activities

    def is_student_task_available(self, activity_task_id: int, user_id: int) -> bool:
        now = utc_now()
        activity_task = self.session.get(ActivityTask, activity_task_id)
        if not activity_task:
            return False

        assigned_task_ids = {
            row[0]
            for row in self.session.query(UserActivityTask.activity_task_id)
            .filter(UserActivityTask.user_id == user_id)
            .all()
        }
        return self._student_task_is_available(activity_task, assigned_task_ids, now)

    # ---------- CREATE ----------
    def create(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        time_from: datetime,
        time_to: datetime,
        actor_user_id: Optional[int] = None,
    ) -> Activity:
        now = utc_now()
        activity = Activity(
            title=title,
            description=description,
            time_from=time_from,
            time_to=time_to,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
            active=True,
        )

        self.session.add(activity)
        self.session.commit()
        self.session.refresh(activity)
        return activity

    # ---------- UPDATE (PATCH) ----------
    def update(
        self,
        activity_id: int,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        time_from: Optional[datetime] = None,
        time_to: Optional[datetime] =None,
        active: Optional[bool] = None,
        actor_user_id: Optional[int] = None,
    ) -> Optional[Activity]:
        activity = self.get_by_id(activity_id)
        if not activity:
            return None

        if title is not None:
            activity.title = title
        if description is not None:
            activity.description = description

        if time_from is not None:
            activity.time_from = time_from
        if time_to is not None:
            activity.time_to = time_to

        if active is not None:
            activity.active = active

        activity.updated_at = utc_now()
        activity.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(activity)
        return activity