from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.person import Person
from app.models.family import Family
from app.models.user import User
from app.auth.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    person_count = (await db.execute(select(func.count()).select_from(Person))).scalar()
    family_count = (await db.execute(select(func.count()).select_from(Family))).scalar()
    persons_with_photo = (
        await db.execute(
            select(func.count()).select_from(Person).where(Person.profile_pic_url.isnot(None))
        )
    ).scalar()

    return {
        "person_count": person_count,
        "family_count": family_count,
        "persons_with_photo": persons_with_photo,
        "persons_without_photo": (person_count or 0) - (persons_with_photo or 0),
    }
