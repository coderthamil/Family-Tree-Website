import enum
from sqlalchemy import Column, String, Date, Text, Enum as SAEnum, ForeignKey
from app.database import Base


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    unknown = "unknown"


class Person(Base):
    __tablename__ = "persons"

    id = Column(String(20), primary_key=True)          # e.g. I136 or auto-generated
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    dob = Column(Date, nullable=True)                  # date of birth
    dod = Column(Date, nullable=True)                  # date of death
    gender = Column(SAEnum(GenderEnum), default=GenderEnum.unknown)
    father_id = Column(String(20), ForeignKey("persons.id"), nullable=True)
    mother_id = Column(String(20), ForeignKey("persons.id"), nullable=True)
    notes = Column(Text, nullable=True)
    profile_pic_url = Column(String(500), nullable=True)
    birth_place = Column(String(200), nullable=True)
    death_place = Column(String(200), nullable=True)
    occupation = Column(String(200), nullable=True)
