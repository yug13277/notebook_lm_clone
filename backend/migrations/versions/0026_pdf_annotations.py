"""Personal PDF highlights and notes.

Revision ID: 0026
Revises: 0025
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0026"
down_revision: str | None = "0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pdf_annotations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("page", sa.Integer(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("rectangles", postgresql.JSONB(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_pdf_annotations_org_id", "pdf_annotations", ["org_id"])
    op.create_index("ix_pdf_annotations_document_id", "pdf_annotations", ["document_id"])
    op.execute("ALTER TABLE pdf_annotations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE pdf_annotations FORCE ROW LEVEL SECURITY")
    op.execute("""CREATE POLICY tenant_isolation ON pdf_annotations
        USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
        WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)""")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON pdf_annotations TO app_user")


def downgrade() -> None:
    op.execute("REVOKE ALL ON pdf_annotations FROM app_user")
    op.execute("DROP POLICY tenant_isolation ON pdf_annotations")
    op.drop_table("pdf_annotations")
