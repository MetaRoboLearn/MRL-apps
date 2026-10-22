from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String)

    size_x = Column(Integer, nullable=False)
    size_z = Column(Integer, nullable=False)
    start = Column(Integer)
    rotation = Column(Float, default=0)
    finish = Column(Integer)

    barriers = Column(JSON)
    stickers = Column(JSON)

    code = Column(Text)
    blocks = Column(Text)

    floor_color = Column(String, nullable=True)
    model_path = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True))

    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

    active = Column(Boolean, nullable=False, default=True)

    creator = relationship('User', back_populates='created_tasks', foreign_keys="Task.created_by")
    updater = relationship('User', foreign_keys="Task.updated_by")