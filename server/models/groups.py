from sqlalchemy.orm import relationship

from models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey


class Group(Base):
  __tablename__ = 'groups'

  id = Column(Integer, primary_key=True)
  group_name = Column(String, nullable=False)


  created_at = Column(DateTime(timezone=True), nullable=False)
  updated_at = Column(DateTime(timezone=True))

  created_by = Column(Integer, ForeignKey('users.id'))
  updated_by = Column(Integer, ForeignKey('users.id'))

  creator = relationship('User', foreign_keys="Group.created_by")
  updater = relationship('User', foreign_keys="Group.updated_by")