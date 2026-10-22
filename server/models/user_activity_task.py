from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base
from utils import utc_now

class UserActivityTask(Base):
    __tablename__ = 'user_activity_tasks'

    id = Column(Integer, primary_key=True)
    activity_task_id = Column(Integer, ForeignKey('activity_tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    activity_task = relationship('ActivityTask')
    user = relationship('User')

    __table_args__ = (
        UniqueConstraint('activity_task_id', 'user_id', name='uq_user_activity_task'),
    )