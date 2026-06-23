from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.timeline import Timeline
from app.models.user import User
from app.schemas.timeline import TimelineCreate, TimelineUpdate, TimelineRead
from app.auth.dependencies import require_contributor, require_viewer

router = APIRouter(prefix="/persons", tags=["Timeline"])


@router.get("/{person_id}/timeline", response_model=list[TimelineRead])
async def get_timeline(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    result = await db.execute(
        select(Timeline)
        .where(Timeline.person_id == person_id)
        .order_by(Timeline.start_date.asc().nullsfirst())
    )
    return result.scalars().all()


@router.post("/{person_id}/timeline", response_model=TimelineRead, status_code=status.HTTP_201_CREATED)
async def add_event(
    person_id: str,
    payload: TimelineCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    event = Timeline(**payload.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


@router.patch("/{person_id}/timeline/{event_id}", response_model=TimelineRead)
async def update_event(
    person_id: str,
    event_id: int,
    payload: TimelineUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    event = await db.get(Timeline, event_id)
    if not event or event.person_id != person_id:
        raise HTTPException(status_code=404, detail="Event not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, val)
    await db.flush()
    await db.refresh(event)
    return event


@router.delete("/{person_id}/timeline/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    person_id: str,
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    event = await db.get(Timeline, event_id)
    if not event or event.person_id != person_id:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)
