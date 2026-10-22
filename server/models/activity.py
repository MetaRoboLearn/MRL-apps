from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Activity(Base):
    __tablename__ = 'activities'
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String)

    time_from = Column(DateTime(timezone=True))
    time_to = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True))

    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

    active = Column(Boolean, nullable=False, default=True)

    activity_tasks = relationship('ActivityTask', back_populates='activity')
    creator = relationship('User', back_populates='created_activities', foreign_keys="Activity.created_by")
    updater = relationship('User', foreign_keys="Activity.updated_by")