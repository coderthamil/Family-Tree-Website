from sqlalchemy import Column, String, Date, ForeignKey
from app.database import Base


class Family(Base):
    __tablename__ = "families"

    id = Column(String(20), primary_key=True)           # e.g. F20 or auto-generated
    husband_id = Column(String(20), ForeignKey("persons.id"), nullable=True)
    wife_id = Column(String(20), ForeignKey("persons.id"), nullable=True)
    marriage_date = Column(Date, nullable=True)
    divorce_date = Column(Date, nullable=True)
    marriage_place = Column(String(200), nullable=True)
