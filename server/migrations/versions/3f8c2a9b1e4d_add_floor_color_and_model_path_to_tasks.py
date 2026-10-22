"""add floor_color and model_path to tasks

Revision ID: 3f8c2a9b1e4d
Revises: 9850910e331e
Create Date: 2026-04-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3f8c2a9b1e4d'
down_revision = '0b7a29bd5b5e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('floor_color', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('model_path', sa.String(), nullable=True))


def downgrade():
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('model_path')
        batch_op.drop_column('floor_color')
