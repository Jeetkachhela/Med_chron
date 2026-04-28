"""remove_stale_columns_from_cases

Revision ID: a1b2c3d4e5f6
Revises: da693d01b5d8
Create Date: 2026-04-28 15:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'da693d01b5d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove columns that were dropped from the SQLAlchemy models.
    
    These columns were added by earlier migrations but the corresponding
    model fields were removed (executive summary, past treatments features).
    Using batch_alter_table for SQLite compatibility during local dev.
    """
    # Drop past_treatments_json (added in da693d01b5d8, model field removed)
    with op.batch_alter_table('cases', schema=None) as batch_op:
        batch_op.drop_column('past_treatments_json')
    
    # Drop medical_summary and past_history (in initial migration, model fields removed)
    with op.batch_alter_table('cases', schema=None) as batch_op:
        batch_op.drop_column('medical_summary')
        batch_op.drop_column('past_history')


def downgrade() -> None:
    """Re-add the removed columns."""
    with op.batch_alter_table('cases', schema=None) as batch_op:
        batch_op.add_column(sa.Column('past_history', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('medical_summary', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('past_treatments_json', sa.Text(), nullable=True))
