import enum
from sqlalchemy import Column, Integer, String, Date, Text, Enum as SAEnum, ForeignKey
from app.database import Base


class EventType(str, enum.Enum):
    birth = "birth"
    death = "death"
    marriage = "marriage"
    divorce = "divorce"
    education = "education"
    occupation = "occupation"
    migration = "migration"
    custom = "custom"


class Timeline(Base):
    __tablename__ = "timelines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(String(20), ForeignKey("persons.id"), nullable=False)
    event_type = Column(SAEnum(EventType), default=EventType.custom)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
