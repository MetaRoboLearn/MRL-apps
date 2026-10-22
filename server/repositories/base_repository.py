from typing import Generic, Optional, TypeVar
from sqlalchemy.orm import Session

from utils import utc_now

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, session: Session, model: type[T]):
        self.session = session
        self.model = model

    # ---------- READ ONE ----------
    def get_by_id(self, entity_id: int) -> Optional[T]:
        return self.session.query(self.model).filter(self.model.id == entity_id).first()

    # ---------- DELETE ----------
    def delete(self, entity_id: int) -> bool:
        entity = self.get_by_id(entity_id)
        if not entity:
            return False

        self.session.delete(entity)
        self.session.commit()
        return True

    # ---------- ACTIVE FLAG ----------
    def set_active(self, entity_id: int, *, active: bool, actor_user_id: int | None = None) -> Optional[T]:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None

        # assumes the model has these fields
        entity.active = active
        entity.updated_at = utc_now()
        entity.updated_by = actor_user_id

        self.session.commit()
        self.session.refresh(entity)
        return entity

    def deactivate(self, entity_id: int, actor_user_id: int | None = None) -> Optional[T]:
        return self.set_active(entity_id, active=False, actor_user_id=actor_user_id)

    def activate(self, entity_id: int, actor_user_id: int | None = None) -> Optional[T]:
        return self.set_active(entity_id, active=True, actor_user_id=actor_user_id)