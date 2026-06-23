"""
ID Generator — auto-increments I### and F### IDs.
"""
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.person import Person
from app.models.family import Family


def _extract_num(id_str: str, prefix: str) -> int:
    match = re.match(rf"^{prefix}(\d+)$", id_str, re.IGNORECASE)
    return int(match.group(1)) if match else 0


async def next_person_id(db: AsyncSession) -> str:
    result = await db.execute(
        select(Person.id).where(Person.id.like("I%"))
    )
    ids = result.scalars().all()
    max_num = max((_extract_num(i, "I") for i in ids), default=0)
    return f"I{max_num + 1}"


async def next_family_id(db: AsyncSession) -> str:
    result = await db.execute(
        select(Family.id).where(Family.id.like("F%"))
    )
    ids = result.scalars().all()
    max_num = max((_extract_num(i, "F") for i in ids), default=0)
    return f"F{max_num + 1}"
