from datetime import date
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.person import PersonSummary


class FamilyBase(BaseModel):
    husband_id: Optional[str] = None
    wife_id: Optional[str] = None
    marriage_date: Optional[date] = None
    divorce_date: Optional[date] = None
    marriage_place: Optional[str] = None


class FamilyCreate(FamilyBase):
    id: Optional[str] = None   # If None, auto-generate F###


class FamilyUpdate(FamilyBase):
    pass


class FamilyRead(FamilyBase):
    id: str
    husband: Optional[PersonSummary] = None
    wife: Optional[PersonSummary] = None
    children: List[PersonSummary] = []

    class Config:
        from_attributes = True


class FamilySummary(BaseModel):
    id: str
    husband_id: Optional[str] = None
    wife_id: Optional[str] = None
    member_count: int = 0

    class Config:
        from_attributes = True
