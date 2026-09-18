from datetime import date

from sqlalchemy import and_, exists, or_
from sqlalchemy.orm import Session, joinedload

from models import ActivityTask, User, UserStartedTask, UserTaskLog
from models.activity import Activity
from models.user_groups import UserGroups


class AnalyticsRepository:
    """Read-only, role-aware source data for dataset creation."""

    def __init__(self, session: Session):
        self.session = session

    def list_log_rows(
        self,
        actor_user_id: int,
        actor_role: str,
        filters,
    ) -> list[UserTaskLog]:
        query = (
            self.session.query(UserTaskLog)
            .join(UserStartedTask, UserStartedTask.id == UserTaskLog.user_started_task_id)
            .join(User, User.id == UserStartedTask.started_by)
            .join(ActivityTask, ActivityTask.id == UserStartedTask.activity_task_id)
            .join(Activity, Activity.id == ActivityTask.activity_id)
            .options(
                joinedload(UserTaskLog.event_type),
                joinedload(UserTaskLog.user_started_task)
                .joinedload(UserStartedTask.starter)
                .joinedload(User.role),
                joinedload(UserTaskLog.user_started_task)
                .joinedload(UserStartedTask.activity_task)
                .joinedload(ActivityTask.activity),
                joinedload(UserTaskLog.user_started_task)
                .joinedload(UserStartedTask.activity_task)
                .joinedload(ActivityTask.task),
                joinedload(UserTaskLog.user_started_task)
                .joinedload(UserStartedTask.activity_task)
                .joinedload(ActivityTask.type),
            )
        )

        query = self._apply_access_scope(query, actor_user_id, actor_role)
        query = self._apply_filters(query, filters)
        return query.order_by(UserTaskLog.user_started_task_id, UserTaskLog.created_at).all()

    def _apply_access_scope(self, query, actor_user_id: int, actor_role: str):
        if actor_role == "student":
            return query.filter(UserStartedTask.started_by == actor_user_id)
        if actor_role == "admin":
            return query
        if actor_role != "teacher":
            return query.filter(False)

        owned_group_ids = self.session.query(UserGroups.group_id).join(
            UserGroups.groups
        ).filter(UserGroups.groups.property.mapper.class_.created_by == actor_user_id)
        return query.filter(
            or_(
                Activity.created_by == actor_user_id,
                ActivityTask.created_by == actor_user_id,
                exists().where(
                    and_(
                        UserGroups.user_id == UserStartedTask.started_by,
                        UserGroups.group_id.in_(owned_group_ids),
                    )
                ),
            )
        )

    def _apply_filters(self, query, filters):
        if filters.activity_ids:
            query = query.filter(ActivityTask.activity_id.in_(filters.activity_ids))
        if filters.activity_task_ids:
            operator = ActivityTask.id.not_in if filters.ignore_activity_task_ids else ActivityTask.id.in_
            query = query.filter(operator(filters.activity_task_ids))
        if filters.task_ids:
            operator = ActivityTask.task_id.not_in if filters.ignore_task_ids else ActivityTask.task_id.in_
            query = query.filter(operator(filters.task_ids))
        if filters.user_ids:
            query = query.filter(UserStartedTask.started_by.in_(filters.user_ids))
        if filters.group_ids:
            query = query.filter(
                exists().where(
                    and_(
                        UserGroups.user_id == UserStartedTask.started_by,
                        UserGroups.group_id.in_(filters.group_ids),
                    )
                )
            )
        if filters.date_filter:
            query = query.filter(UserStartedTask.started_at.cast(date) == filters.date_filter)
        if filters.excluded_usernames:
            query = query.filter(User.username.not_in(filters.excluded_usernames))
        if filters.excluded_task_previews:
            query = query.filter(
                or_(
                    ActivityTask.preview.is_(None),
                    ActivityTask.preview.not_in(filters.excluded_task_previews),
                )
            )
        return query