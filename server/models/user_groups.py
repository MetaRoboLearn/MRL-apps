from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base
from utils import utc_now

class UserGroups(Base):
    __tablename__ = 'user_groups'

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey('groups.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    created_by = Column(Integer, ForeignKey('users.id'))
    updated_by = Column(Integer, ForeignKey('users.id'))

    creator = relationship('User', foreign_keys="UserGroups.created_by")
    updater = relationship('User', foreign_keys="UserGroups.updated_by")
    contains_user=relationship('User', foreign_keys="UserGroups.user_id")

    groups = relationship('Group')
    user = relationship('User', foreign_keys="UserGroups.user_id")

    __table_args__ = (
        UniqueConstraint('group_id', 'user_id', name='uq_user_groups'),
    )