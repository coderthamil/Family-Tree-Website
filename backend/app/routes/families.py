from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.family import Family
from app.models.child import Child
from app.models.person import Person
from app.models.user import User
from app.schemas.family import FamilyCreate, FamilyUpdate, FamilyRead, FamilySummary
from app.auth.dependencies import require_contributor, require_admin, require_viewer
from app.services.id_generator import next_family_id

router = APIRouter(prefix="/families", tags=["Families"])


async def _build_family_read(fam: Family, db: AsyncSession) -> FamilyRead:
    from app.schemas.person import PersonSummary
    husband = await db.get(Person, fam.husband_id) if fam.husband_id else None
    wife = await db.get(Person, fam.wife_id) if fam.wife_id else None

    children_result = await db.execute(
        select(Child).where(Child.family_id == fam.id)
    )
    child_persons = []
    for c in children_result.scalars().all():
        cp = await db.get(Person, c.child_id)
        if cp:
            child_persons.append(PersonSummary.model_validate(cp))

    return FamilyRead(
        id=fam.id,
        husband_id=fam.husband_id,
        wife_id=fam.wife_id,
        marriage_date=fam.marriage_date,
        divorce_date=fam.divorce_date,
        marriage_place=fam.marriage_place,
        husband=PersonSummary.model_validate(husband) if husband else None,
        wife=PersonSummary.model_validate(wife) if wife else None,
        children=child_persons,
    )


@router.get("/", response_model=list[FamilySummary])
async def list_families(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    result = await db.execute(select(Family).offset(skip).limit(limit))
    families = result.scalars().all()
    summaries = []
    for fam in families:
        count_result = await db.execute(
            select(func.count()).where(Child.family_id == fam.id)
        )
        member_count = (count_result.scalar() or 0) + (1 if fam.husband_id else 0) + (1 if fam.wife_id else 0)
        summaries.append(FamilySummary(id=fam.id, husband_id=fam.husband_id, wife_id=fam.wife_id, member_count=member_count))
    return summaries


@router.get("/{family_id}", response_model=FamilyRead)
async def get_family(
    family_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    fam = await db.get(Family, family_id)
    if not fam:
        raise HTTPException(status_code=404, detail="Family not found")
    return await _build_family_read(fam, db)


@router.post("/", response_model=FamilyRead, status_code=status.HTTP_201_CREATED)
async def create_family(
    payload: FamilyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    fid = payload.id or await next_family_id(db)
    if await db.get(Family, fid):
        raise HTTPException(status_code=409, detail=f"Family {fid} already exists")
    fam = Family(id=fid, **{k: v for k, v in payload.model_dump(exclude={"id"}).items()})
    db.add(fam)
    await db.flush()
    await db.refresh(fam)
    return await _build_family_read(fam, db)


@router.patch("/{family_id}", response_model=FamilyRead)
async def update_family(
    family_id: str,
    payload: FamilyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    fam = await db.get(Family, family_id)
    if not fam:
        raise HTTPException(status_code=404, detail="Family not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(fam, key, val)
    await db.flush()
    await db.refresh(fam)
    return await _build_family_read(fam, db)


@router.delete("/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family(
    family_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    fam = await db.get(Family, family_id)
    if not fam:
        raise HTTPException(status_code=404, detail="Family not found")
    # Remove children links first
    children = await db.execute(select(Child).where(Child.family_id == family_id))
    for c in children.scalars().all():
        await db.delete(c)
    await db.delete(fam)


@router.post("/{family_id}/children/{child_id}", status_code=status.HTTP_201_CREATED)
async def add_child(
    family_id: str,
    child_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    if not await db.get(Family, family_id):
        raise HTTPException(status_code=404, detail="Family not found")
    if not await db.get(Person, child_id):
        raise HTTPException(status_code=404, detail="Person not found")
    composite_id = f"{family_id}_{child_id}"
    if await db.get(Child, composite_id):
        raise HTTPException(status_code=409, detail="Child already in this family")
    db.add(Child(id=composite_id, family_id=family_id, child_id=child_id))
    return {"detail": "Child added"}


@router.delete("/{family_id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_child(
    family_id: str,
    child_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_contributor),
):
    composite_id = f"{family_id}_{child_id}"
    child = await db.get(Child, composite_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found in family")
    await db.delete(child)
