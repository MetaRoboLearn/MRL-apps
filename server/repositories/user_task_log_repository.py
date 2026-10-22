from typing import Optional

from sqlalchemy.orm import Session

from models import UserStartedTask
from models.user_task_log import UserTaskLog
from utils import utc_now


class UserTaskLogRepository:
    def __init__(self, session: Session):
        self.session = session

    # ---------- CREATE ----------
    def create(
            self,
            *,
            user_started_task_id: int,
            event_type_id: Optional[int] = None,
            code_snapshot: Optional[str] = None,
    ) -> Optional[UserTaskLog]:

        # Check if logging is enabled for this activity task
        ust = self.session.query(UserStartedTask).filter(
            UserStartedTask.id == user_started_task_id
        ).first()

        if not ust or not ust.activity_task or not ust.activity_task.is_logged:
            return None

        log = UserTaskLog(
            user_started_task_id=user_started_task_id,
            event_type_id=event_type_id,
            created_at=utc_now(),
            code_snapshot=code_snapshot,
        )

        self.session.add(log)
        return log

    # ---------- DELETE ----------
    def delete(self, log_id: int) -> bool:
        log = self.get_by_id(log_id)
        if not log:
            return False

        self.session.delete(log)
        self.session.commit()
        return True