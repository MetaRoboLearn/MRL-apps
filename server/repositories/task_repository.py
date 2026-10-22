from typing import Optional
from sqlalchemy.orm import Session, aliased
from sqlalchemy import or_

from models import Task, User
from repositories.base_repository import BaseRepository
from utils import utc_now


class TaskRepository(BaseRepository[Task]):
    def __init__(self, session: Session):
        super().__init__(session, Task)

    # ---------- READ ONE ----------
    # def get_by_id(self, task_id: int) -> Optional[Task]:
    #     return self.session.query(Task).filter(Task.id == task_id).first()

    # ---------- LIST PREVIEW ----------
    def list_preview(
            self,
            *,
            skip: int = 0,
            limit: int = 50,
            active_only: Optional[bool] = None,
            search: Optional[str] = None,
            order_by_title: bool = True,
    ):
        creator = aliased(User)

        q = self.session.query(
            Task.id,
            Task.title,
            Task.description,
            Task.size_x,
            Task.size_z,
            Task.created_at,
            Task.created_by,
            Task.active,
            creator.username,
            creator.first_name,
            creator.last_name
        ).outerjoin(creator, Task.created_by == creator.id)

        if active_only:
            q = q.filter(Task.active.is_(True))

        if search:
            like = f"%{search}%"
            q = q.filter(
                or_(
                    Task.title.ilike(like),
                    Task.description.ilike(like),
                )
            )

        if order_by_title:
            q = q.order_by(Task.title.asc())

        return q.offset(skip).limit(limit).all()

    # ---------- CREATE ----------
    def create(
        self,
        *,
        title: str,
        description: Optional[str] = None,
        size_x: int,
        size_z: int,
        start: Optional[int] = None,
        rotation: Optional[float],
        finish: Optional[int] = None,
        barriers: Optional[dict] = None,
        stickers: Optional[dict] = None,
        code: Optional[str] = None,
        blocks: Optional[str] = None,
        floor_color: Optional[str] = None,
        model_path: Optional[str] = None,
        active: bool,
        actor_user_id: Optional[int] = None,
    ) -> Task:
        now = utc_now()
        task = Task(
            title=title,
            description=description,
            size_x=size_x,
            size_z=size_z,
            start=start,
            rotation=rotation,
            finish=finish,
            barriers=barriers,
            stickers=stickers,
            code=code,
            blocks=blocks,
            floor_color=floor_color,
            model_path=model_path,
            created_at=now,
            updated_at=now,
            created_by=actor_user_id,
            updated_by=actor_user_id,
            active=active,
        )

        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task

    # ---------- UPDATE (PATCH) ----------
    def update(
        self,
        task_id: int,
        *,
        title: Optional[str] = None,
        description: Optional[str] = None,
        size_x: Optional[int] = None,
        size_z: Optional[int] = None,
        start: Optional[int] = None,
        rotation: Optional[float] = None,
        finish: Optional[int] = None,
        barriers=None,
        stickers=None,
        code: Optional[str] = None,
        blocks: Optional[str] = None,
        floor_color: Optional[str] = None,
        model_path: Optional[str] = None,
        active: Optional[bool] = None,
        actor_user_id: Optional[int] = None,
    ) -> Optional[Task]:
        task = self.get_by_id(task_id)
        if not task:
            return None

        task.title = title
        task.description = description
        task.size_x = size_x
        task.size_z = size_z
        task.start = start
        task.rotation = rotation
        task.finish = finish
        task.barriers = barriers
        task.stickers = stickers
        task.code = code
        task.blocks = blocks
        task.floor_color = floor_color
        task.model_path = model_path
        task.active = active

        task.updated_at = utc_now()
        task.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(task)
        return task