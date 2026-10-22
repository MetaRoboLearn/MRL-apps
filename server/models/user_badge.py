from sqlalchemy.orm import relationship

from models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint

class UserBadge(Base):
  __tablename__ = 'user_badges'

  id = Column(Integer, primary_key=True)
  user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
  badge_id = Column(Integer, ForeignKey('badges.id'), nullable=False)
  comment = Column(String)

  created_at = Column(DateTime(timezone=True), nullable=False)
  updated_at = Column(DateTime(timezone=True))

  created_by = Column(Integer, ForeignKey('users.id'))
  updated_by = Column(Integer, ForeignKey('users.id'))

  user = relationship('User', foreign_keys="UserBadge.user_id")
  badge = relationship('Badge', foreign_keys="UserBadge.badge_id")
  creator = relationship('User', foreign_keys="UserBadge.created_by")
  updater = relationship('User', foreign_keys="UserBadge.updated_by")

  #if a user has already been awarded a badge, they cannot be awarded the same badge again
  __table_args__ = (
    UniqueConstraint('user_id', 'badge_id', name='uq_user_badges'),
    )