from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from app.database import Base


class Child(Base):
    __tablename__ = "children"

    id = Column(String(40), primary_key=True)          # family_id + "_" + child_id
    family_id = Column(String(20), ForeignKey("families.id"), nullable=False)
    child_id = Column(String(20), ForeignKey("persons.id"), nullable=False)

    __table_args__ = (UniqueConstraint("family_id", "child_id", name="uq_family_child"),)
