from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator
from app.models.person import GenderEnum


class PersonBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    dod: Optional[date] = None
    gender: GenderEnum = GenderEnum.unknown
    father_id: Optional[str] = None
    mother_id: Optional[str] = None
    notes: Optional[str] = None
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    occupation: Optional[str] = None


class PersonCreate(PersonBase):
    id: Optional[str] = None   # If None, auto-generate I###


class PersonUpdate(PersonBase):
    pass


class PersonRead(PersonBase):
    id: str
    profile_pic_url: Optional[str] = None

    class Config:
        from_attributes = True


class PersonSummary(BaseModel):
    """Lightweight version for tree nodes."""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    dod: Optional[date] = None
    gender: GenderEnum = GenderEnum.unknown
    profile_pic_url: Optional[str] = None

    class Config:
        from_attributes = True
