from typing import Optional
from sqlalchemy.orm import Session

from models.user_task_log import EventTypes
from repositories.user_task_log_repository import UserTaskLogRepository
from sandbox.sb import sb_run_python


class SandboxRepository:
    def __init__(self, session: Session):
        self.session = session

    def run_python(
            self,
            code: str,
            user_started_task_id: Optional[int] = None,
            code_snapshot: Optional[str] = None,
            grid_state: Optional[dict] = None,
    ):
        if user_started_task_id:
            log_repo = UserTaskLogRepository(self.session)
            log_repo.create(
                user_started_task_id=user_started_task_id,
                event_type_id=EventTypes.SIM_RUN,
                code_snapshot=code_snapshot or code,
            )
            self.session.commit()

        result = sb_run_python(code, grid_state=grid_state)

        if user_started_task_id:
            response_data = result[0].get_json() if isinstance(result, tuple) else result.get_json()
            if response_data.get("error"):
                log_repo = UserTaskLogRepository(self.session)
                log_repo.create(
                    user_started_task_id=user_started_task_id,
                    event_type_id=EventTypes.SIM_CODE_ERR,
                    code_snapshot=code_snapshot or code,
                )
                self.session.commit()

        return result