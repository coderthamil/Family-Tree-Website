from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.person import Person
from app.models.user import User
from app.schemas.person import PersonCreate, PersonUpdate, PersonRead
from app.auth.dependencies import require_contributor, require_admin, require_viewer
from app.services.id_generator import next_person_id
from app.services.storage import save_profile_picture, delete_profile_picture

router = APIRouter(prefix="/persons", tags=["Persons"])


@router.get("/", response_model=list[PersonRead])
async def list_persons(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    q = select(Person).offset(skip).limit(limit)
    if search:
        q = q.where(
            (Person.first_name.ilike(f"%{search}%")) |
            (Person.last_name.ilike(f"%{search}%"))
        )
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{person_id}", response_model=PersonRead)
async def get_person(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("/", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
async def create_person(
    payload: PersonCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    pid = payload.id or await next_person_id(db)
    if await db.get(Person, pid):
        raise HTTPException(status_code=409, detail=f"Person with id {pid} already exists")

    person = Person(
        id=pid,
        **{k: v for k, v in payload.model_dump(exclude={"id"}).items()},
    )
    db.add(person)
    await db.flush()
    await db.refresh(person)
    return person


@router.patch("/{person_id}", response_model=PersonRead)
async def update_person(
    person_id: str,
    payload: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(person, key, val)
    await db.flush()
    await db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    if person.profile_pic_url:
        delete_profile_picture(person.profile_pic_url)
    await db.delete(person)


@router.post("/{person_id}/photo", response_model=PersonRead)
async def upload_photo(
    person_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, or WebP images are accepted")

    person = await db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    if person.profile_pic_url:
        delete_profile_picture(person.profile_pic_url)

    url = await save_profile_picture(person_id, data, file.content_type)
    person.profile_pic_url = url
    await db.flush()
    await db.refresh(person)
    return person
