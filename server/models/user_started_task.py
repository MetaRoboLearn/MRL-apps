from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from .base import Base
from utils import utc_now

class UserStartedTask(Base):
    __tablename__ = 'user_started_tasks'
    __table_args__ = (
        UniqueConstraint('started_by', 'activity_task_id'),
    )

    id = Column(Integer, primary_key=True)

    started_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)
    started_by = Column(Integer, ForeignKey('users.id'))
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    current_value = Column(String)
    is_finished = Column(Boolean, default=False)

    activity_task_id = Column(Integer, ForeignKey('activity_tasks.id'))

    starter = relationship('User', back_populates='started_tasks', foreign_keys="UserStartedTask.started_by")
    creator = relationship('User', foreign_keys="UserStartedTask.created_by")
    updater = relationship('User', foreign_keys="UserStartedTask.updated_by")

    activity_task = relationship('ActivityTask')

    logs = relationship('UserTaskLog', back_populates='user_started_task')