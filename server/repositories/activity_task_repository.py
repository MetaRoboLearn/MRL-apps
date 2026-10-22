from typing import Optional
from sqlalchemy.orm import Session, joinedload
from models.activity_task import ActivityTask
from utils import utc_now


class ActivityTaskRepository:
    def __init__(self, session: Session):
        self.session = session

    # ---------- READ ONE ----------
    def get_by_id(self, activity_task_id: int):
        return (
            self.session.query(ActivityTask)
            .options(
                joinedload(ActivityTask.task),
                joinedload(ActivityTask.type),
            )
            .filter(ActivityTask.id == activity_task_id)
            .first()
        )

    # ---------- LIST TASKS OF ACTIVITY ----------
    def list_by_activity_id(self, *, activity_id: int):
        return (
            self.session.query(ActivityTask)
            .options(
                joinedload(ActivityTask.task),
                joinedload(ActivityTask.type),
                joinedload(ActivityTask.creator),
                joinedload(ActivityTask.updater),
            )
            .filter(ActivityTask.activity_id == activity_id)
            .order_by(ActivityTask.order.asc())
            .all()
        )

    # ---------- CREATE ----------
    def create(
        self,
        *,
        activity_id: int,
        task_id: int,
        type_id: int,
        order: int,
        is_logged: bool,
        allows_robot: bool,
        instructions: Optional[str] = None,
        preview: Optional[str] = None,
        difficulty: Optional[int] = None,
        actor_user_id: Optional[int] = None,
    ) -> ActivityTask:
        now = utc_now()
        activity_task = ActivityTask(
            activity_id=activity_id,
            task_id=task_id,
            type_id=type_id,
            order=order,
            is_logged=is_logged,
            allows_robot=allows_robot,
            instructions=instructions,
            preview=preview,
            difficulty=difficulty,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
        )

        self.session.add(activity_task)
        self.session.commit()
        self.session.refresh(activity_task)
        return activity_task

    # ---------- UPDATE (PATCH) ----------
    def update(
        self,
        activity_task_id: int,
        *,
        instructions: Optional[str] = None,
        preview: Optional[str] = None,
        activity_id: Optional[int] = None,
        task_id: Optional[int] = None,
        type_id: Optional[int] = None,
        order: Optional[int] = None,
        is_logged: Optional[bool] = None,
        allows_robot: Optional[bool] = None,
        difficulty: Optional[int] = None,
        actor_user_id: Optional[int] = None,
    ) -> Optional[ActivityTask]:
        activity_task = self.get_by_id(activity_task_id)
        if not activity_task:
            return None

        if instructions is not None:
            activity_task.instructions = instructions
        if preview is not None:
            activity_task.preview = preview
        if activity_id is not None:
            activity_task.activity_id = activity_id
        if task_id is not None:
            activity_task.task_id = task_id
        if type_id is not None:
            activity_task.type_id = type_id
        if order is not None:
            activity_task.order = order
        if is_logged is not None:
            activity_task.is_logged = is_logged
        if allows_robot is not None:
            activity_task.allows_robot = allows_robot
        if difficulty is not None:
            activity_task.difficulty = difficulty

        activity_task.updated_at = utc_now()
        activity_task.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(activity_task)
        return activity_task

    # ---------- DELETE ----------
    def delete(self, activity_task_id: int) -> bool:
        activity_task = self.get_by_id(activity_task_id)
        if not activity_task:
            return False

        self.session.delete(activity_task)
        self.session.commit()
        return True

    # ---------- SWAP TASK ORDER ----------
    def swap_order(self, activity_id: int, activity_task_id: int, direction: str):
        task = self.session.query(ActivityTask).filter(
            ActivityTask.id == activity_task_id,
            ActivityTask.activity_id == activity_id,
        ).first()

        if not task:
            return None

        if direction == 'up':
            neighbor = (
                self.session.query(ActivityTask)
                .filter(
                    ActivityTask.activity_id == activity_id,
                    ActivityTask.order < task.order,
                )
                .order_by(ActivityTask.order.desc())
                .first()
            )
        else:
            neighbor = (
                self.session.query(ActivityTask)
                .filter(
                    ActivityTask.activity_id == activity_id,
                    ActivityTask.order > task.order,
                )
                .order_by(ActivityTask.order.asc())
                .first()
            )

        if not neighbor:
            return None

        # Use a temporary value to avoid unique constraint violation
        original_task_order = task.order
        original_neighbor_order = neighbor.order

        task.order = -1
        self.session.flush()

        neighbor.order = original_task_order
        self.session.flush()

        task.order = original_neighbor_order
        self.session.flush()

        return task

    # ---------- REORDER TASKSA AFTER DELETE ----------
    def reorder_after_delete(self, activity_id: int):
        tasks = (
            self.session.query(ActivityTask)
            .filter(ActivityTask.activity_id == activity_id)
            .order_by(ActivityTask.order.asc())
            .all()
        )
        for i, task in enumerate(tasks, start=1):
            task.order = i
        self.session.flush()