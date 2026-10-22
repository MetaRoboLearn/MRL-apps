from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from .base import Base


class ActivityTaskProgrammingElement(Base):
    __tablename__ = 'activity_task_programming_element'

    activity_task_id = Column(
        Integer,
        ForeignKey('activity_tasks.id', ondelete='CASCADE'),
        primary_key=True,
    )
    programming_element_id = Column(
        String(64),
        ForeignKey('programming_element.id', ondelete='CASCADE'),
        primary_key=True,
    )
    position = Column(Integer, nullable=False)

    activity_task = relationship('ActivityTask', back_populates='programming_elements')
    programming_element = relationship('ProgrammingElement', back_populates='activity_task_links')

    __table_args__ = (
        CheckConstraint('position > 0', name='ck_activity_task_programming_element_position'),
        UniqueConstraint(
            'activity_task_id', 'position',
            name='uq_activity_task_programming_element_position',
        ),
    )