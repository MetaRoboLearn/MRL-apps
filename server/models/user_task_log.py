from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class EventType(Base):
    __tablename__ = 'event_types'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

class EventTypes:
    """Constants matching event_types seed data."""
    CODE_EDIT = 1 # ok
    SIM_RUN = 2 # ok
    SIM_CODE_ERR = 3 # ok
    SIM_END_SUCC = 4 # ok
    SIM_END_FAIL = 5 # ok
    ROBOT_RUN = 6 # ok
    ROBOT_CODE_ERR = 7
    ROBOT_END_SUCC = 8 # ok
    ROBOT_END_FAIL = 9 # ok
    TASK_START = 10 # ok
    TASK_CONTINUE = 11
    TASK_FINISH = 12 # ok

class UserTaskLog(Base):
    __tablename__ = 'user_task_logs'

    id = Column(Integer, primary_key=True)

    user_started_task_id = Column(
        Integer,
        ForeignKey('user_started_tasks.id'),
        nullable=False
    )

    event_type_id = Column(Integer, ForeignKey("event_types.id"))

    created_at = Column(DateTime(timezone=True), nullable=False)
    code_snapshot = Column(Text) # cijeli kod u tom trenutku

    user_started_task = relationship('UserStartedTask', back_populates='logs')
    event_type = relationship('EventType')