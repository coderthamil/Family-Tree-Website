"""Initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-19

"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "persons",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("dob", sa.Date, nullable=True),
        sa.Column("dod", sa.Date, nullable=True),
        sa.Column("gender", sa.Enum("male", "female", "unknown", name="genderenum"), nullable=True),
        sa.Column("father_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("mother_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("profile_pic_url", sa.String(500), nullable=True),
        sa.Column("birth_place", sa.String(200), nullable=True),
        sa.Column("death_place", sa.String(200), nullable=True),
        sa.Column("occupation", sa.String(200), nullable=True),
    )

    op.create_table(
        "families",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("husband_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("wife_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=True),
        sa.Column("marriage_date", sa.Date, nullable=True),
        sa.Column("divorce_date", sa.Date, nullable=True),
        sa.Column("marriage_place", sa.String(200), nullable=True),
    )

    op.create_table(
        "children",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("family_id", sa.String(20), sa.ForeignKey("families.id"), nullable=False),
        sa.Column("child_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=False),
        sa.UniqueConstraint("family_id", "child_id", name="uq_family_child"),
    )

    op.create_table(
        "timelines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("person_id", sa.String(20), sa.ForeignKey("persons.id"), nullable=False),
        sa.Column("event_type", sa.Enum(
            "birth", "death", "marriage", "divorce", "education",
            "occupation", "migration", "custom", name="eventtype"
        ), nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("location", sa.String(200), nullable=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "contributor", "viewer", name="userrole"), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("is_active", sa.String(10), nullable=True, server_default="true"),
    )


def downgrade() -> None:
    op.drop_table("users")
    op.drop_table("timelines")
    op.drop_table("children")
    op.drop_table("families")
    op.drop_table("persons")
    op.execute("DROP TYPE IF EXISTS genderenum")
    op.execute("DROP TYPE IF EXISTS eventtype")
    op.execute("DROP TYPE IF EXISTS userrole")
