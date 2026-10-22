from sqlalchemy.orm import Session
from models.user_activity_task import UserActivityTask


class UserActivityTaskRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_by_activity_task(self, activity_task_id: int):
        return (
            self.session.query(UserActivityTask)
            .filter(UserActivityTask.activity_task_id == activity_task_id)
            .all()
        )

    def set_students(self, activity_task_id: int, user_ids: list[int]):
        """Replace all student assignments for a task in one go."""
        self.session.query(UserActivityTask).filter(
            UserActivityTask.activity_task_id == activity_task_id,
        ).delete()

        for user_id in user_ids:
            self.session.add(UserActivityTask(
                activity_task_id=activity_task_id,
                user_id=user_id,
            ))

        self.session.flush()

    def get_user_ids(self, activity_task_id: int):
        rows = (
            self.session.query(UserActivityTask.user_id)
            .filter(UserActivityTask.activity_task_id == activity_task_id)
            .all()
        )
        return [r[0] for r in rows]