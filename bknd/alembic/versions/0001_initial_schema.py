from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "conversations" not in existing:
        op.create_table(
            "conversations",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(255), nullable=False),
            sa.Column("title", sa.String(500)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_conversations_user_updated", "conversations", ["user_id", "updated_at"])

    if "messages" not in existing:
        op.create_table(
            "messages",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("conversation_id", sa.String(36), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_messages_conversation_created", "messages", ["conversation_id", "created_at"])

    if "documents" not in existing:
        op.create_table(
            "documents",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(255), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("type", sa.String(255), nullable=False),
            sa.Column("size", sa.BigInteger(), nullable=False),
            sa.Column("file_path", sa.Text(), nullable=False),
            sa.Column("extracted_text", sa.Text(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_documents_user_created", "documents", ["user_id", "created_at"])

    if "message_documents" not in existing:
        op.create_table(
            "message_documents",
            sa.Column("message_id", sa.String(36), sa.ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("user_id", sa.String(255), nullable=False),
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "message_documents" in tables:
        op.drop_table("message_documents")
    for table, index in (
        ("documents", "ix_documents_user_created"),
        ("messages", "ix_messages_conversation_created"),
        ("conversations", "ix_conversations_user_updated"),
    ):
        if table not in tables:
            continue
        indexes = {item["name"] for item in sa.inspect(bind).get_indexes(table)}
        if index in indexes:
            op.drop_index(index, table_name=table)
        op.drop_table(table)