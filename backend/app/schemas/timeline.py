from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.models.timeline import EventType


class TimelineBase(BaseModel):
    event_type: EventType = EventType.custom
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    location: Optional[str] = None


class TimelineCreate(TimelineBase):
    person_id: str


class TimelineUpdate(TimelineBase):
    pass


class TimelineRead(TimelineBase):
    id: int
    person_id: str

    class Config:
        from_attributes = True
