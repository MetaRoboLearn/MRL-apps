from typing import Optional

from sqlalchemy.orm import Session, joinedload

from models import ActivityTask
from models.user_started_task import UserStartedTask
from models.user_task_log import EventTypes
from repositories.user_task_log_repository import UserTaskLogRepository
from utils import utc_now


class UserStartedTaskRepository:
    def __init__(self, session: Session):
        self.session = session

    # ---------- READ INFO FOR USER AND ACTIVITY TASK ----------
    def get_by_user_activity_task(self, activity_task_id: int, user_id: int) -> Optional[UserStartedTask]:
        return (
            self.session.query(UserStartedTask)
            .options(
                joinedload(UserStartedTask.activity_task).joinedload(ActivityTask.task),
                joinedload(UserStartedTask.activity_task).joinedload(ActivityTask.type),
                joinedload(UserStartedTask.activity_task).joinedload(ActivityTask.activity),
            )
            .filter(UserStartedTask.activity_task_id == activity_task_id, UserStartedTask.started_by == user_id)
            .first()
        )

    # ---------- READ ONE ----------
    def get_by_id(self, user_started_task_id: int) -> Optional[UserStartedTask]:
        return (
            self.session.query(UserStartedTask)
            .options(
                joinedload(UserStartedTask.activity_task).joinedload(ActivityTask.task),
                joinedload(UserStartedTask.activity_task).joinedload(ActivityTask.type),
            )
            .filter(UserStartedTask.id == user_started_task_id)
            .first()
        )

    # ---------- LIST ----------
    def list(self, *, started_by: Optional[int] = None):
        q = self.session.query(UserStartedTask)

        if started_by is not None:
            q = q.filter(UserStartedTask.started_by == started_by)

        return q.all()

    # ---------- CREATE ----------
    def create(self, *, activity_task_id: int, actor_user_id: Optional[int] = None) -> UserStartedTask:
        now = utc_now()

        activity_task = (
            self.session.query(ActivityTask)
            .options(joinedload(ActivityTask.task), joinedload(ActivityTask.type))
            .filter(ActivityTask.id == activity_task_id)
            .first()
        )

        if not activity_task:
            raise ValueError("ActivityTask not found")

        task_type = activity_task.type.name.lower() if activity_task.type else "python"

        if task_type == "blockly":
            current_value = activity_task.task.blocks if activity_task.task else None
        else:
            current_value = activity_task.task.code if activity_task.task else None

        ust = UserStartedTask(
            started_by=actor_user_id,
            activity_task_id=activity_task_id,
            current_value=current_value,
            started_at=now,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )

        self.session.add(ust)
        self.session.flush()  # generates ust.id without committing

        log_repo = UserTaskLogRepository(self.session)
        log_repo.create(
            user_started_task_id=ust.id,
            event_type_id=EventTypes.TASK_START,
            code_snapshot=current_value,
        )

        self.session.commit()
        self.session.refresh(ust)
        return ust

    # ---------- UPDATE (PATCH) ----------
    def update(
            self,
            user_started_task_id: int,
            *,
            current_value: Optional[str] = None,
            actor_user_id: Optional[int] = None,
    ):
        ust = self.session.query(UserStartedTask).filter(
            UserStartedTask.id == user_started_task_id
        ).first()
        if not ust:
            return None

        if current_value is not None:
            ust.current_value = current_value

        ust.updated_at = utc_now()
        ust.updated_by = actor_user_id

        log_repo = UserTaskLogRepository(self.session)
        log_repo.create(
            user_started_task_id=user_started_task_id,
            event_type_id=EventTypes.CODE_EDIT,
            code_snapshot=current_value,
        )

        self.session.commit()
        return ust

    # ---------- DELETE ----------
    def delete(self, user_started_task_id: int) -> bool:
        ust = self.get_by_id(user_started_task_id)
        if not ust:
            return False

        self.session.delete(ust)
        self.session.commit()
        return True

    # ---------- FINISH SOLVING ----------
    def finish(self, user_started_task_id: int, *, actor_user_id: Optional[int] = None):
        ust = self.session.query(UserStartedTask).filter(
            UserStartedTask.id == user_started_task_id
        ).first()
        if not ust:
            return None

        ust.is_finished = True
        ust.updated_at = utc_now()
        ust.updated_by = actor_user_id

        log_repo = UserTaskLogRepository(self.session)
        log_repo.create(
            user_started_task_id=user_started_task_id,
            event_type_id=EventTypes.TASK_FINISH,
            code_snapshot=ust.current_value,
        )

        self.session.commit()
        return ust