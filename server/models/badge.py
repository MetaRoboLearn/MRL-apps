from sqlalchemy.orm import relationship

from models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey


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

  creator = relationship('User', foreign_keys="Badge.created_by")
  updater = relationship('User', foreign_keys="Badge.updated_by")