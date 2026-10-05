from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from .base import Base


class ElementType(Base):
    __tablename__ = 'element_type'

    id = Column(String(120), primary_key=True)
    user_readable_name = Column(String(120), nullable=False)

    programming_elements = relationship('ProgrammingElement', back_populates='element_type')