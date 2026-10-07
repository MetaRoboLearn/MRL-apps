from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from .base import Base
from utils import utc_now


class ProgrammingElement(Base):
    __tablename__ = 'programming_element'

    id = Column(String(64), primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    feedback_region_description = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    element_type_id = Column(String(120), ForeignKey('element_type.id'), nullable=False)

    element_type = relationship('ElementType', back_populates='programming_elements')
    activity_task_links = relationship('ActivityTaskProgrammingElement', back_populates='programming_element')