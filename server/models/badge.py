from sqlalchemy.orm import relationship

from models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint


class Badge(Base):
  __tablename__ = 'badges'

  id = Column(Integer, primary_key=True)
  title = Column(String, nullable=False)
  description = Column(String)
  value = Column(Integer, nullable=False)
  image_url = Column(String, nullable=False)

  created_at = Column(DateTime(timezone=True), nullable=False)
  updated_at = Column(DateTime(timezone=True))

  created_by = Column(Integer, ForeignKey('users.id'))
  updated_by = Column(Integer, ForeignKey('users.id'))

  relevant_activity_task_id = Column(Integer, ForeignKey('activity_tasks.id'), nullable=False) 

  creator = relationship('User', foreign_keys="Badge.created_by")
  updater = relationship('User', foreign_keys="Badge.updated_by")
  badge_activity_task = relationship('ActivityTask', foreign_keys="Badge.relevant_activity_task_id") # one-to-one relationship with a task from ActivityTask

  __table_args__ = (
    UniqueConstraint('relevant_activity_task_id', name='uq_badges_relevant_activity_task_id'),
    )