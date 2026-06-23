from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.auth.dependencies import require_viewer
from app.services.relationship import get_relatives

router = APIRouter(prefix="/persons", tags=["Relationships"])


@router.get("/{person_id}/relatives")
async def get_person_relatives(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    """Return all derived relationships for a person."""
    result = await get_relatives(person_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")
    return result
