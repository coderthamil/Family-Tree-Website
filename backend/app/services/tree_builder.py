"""
Tree Builder — constructs a nested JSON tree suitable for D3.js hierarchy.

The tree is built from a root person downward (through children),
with spouse information attached to each node.
"""
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.person import Person
from app.models.family import Family


MAX_DEPTH = 10  # prevent runaway recursion on circular data


async def build_tree(root_id: str, db: AsyncSession, depth: int = 0) -> dict[str, Any] | None:
    if depth > MAX_DEPTH:
        return None

    person = await db.get(Person, root_id)
    if not person:
        return None

    # Build node
    node: dict[str, Any] = {
        "id": person.id,
        "name": f"{person.first_name or ''} {person.last_name or ''}".strip() or "Unknown",
        "first_name": person.first_name,
        "last_name": person.last_name,
        "gender": person.gender.value if person.gender else "unknown",
        "dob": person.dob.isoformat() if person.dob else None,
        "dod": person.dod.isoformat() if person.dod else None,
        "profile_pic_url": person.profile_pic_url,
        "birth_place": person.birth_place,
        "occupation": person.occupation,
        "spouses": [],
        "children": [],
    }

    # Attach spouses
    fam_result = await db.execute(
        select(Family).where(
            or_(Family.husband_id == root_id, Family.wife_id == root_id)
        )
    )
    for fam in fam_result.scalars().all():
        spouse_id = fam.wife_id if fam.husband_id == root_id else fam.husband_id
        if spouse_id:
            spouse = await db.get(Person, spouse_id)
            if spouse:
                node["spouses"].append({
                    "id": spouse.id,
                    "name": f"{spouse.first_name or ''} {spouse.last_name or ''}".strip(),
                    "gender": spouse.gender.value if spouse.gender else "unknown",
                    "profile_pic_url": spouse.profile_pic_url,
                    "marriage_date": fam.marriage_date.isoformat() if fam.marriage_date else None,
                    "dob": spouse.dob.isoformat() if spouse.dob else None,
                    "dod": spouse.dod.isoformat() if spouse.dod else None,
                    "birth_place": spouse.birth_place,
                    "occupation": spouse.occupation,
                })

    # Recurse into children
    children_result = await db.execute(
        select(Person).where(
            or_(Person.father_id == root_id, Person.mother_id == root_id)
        )
    )
    children = children_result.scalars().all()
    seen = set()
    for child in children:
        if child.id in seen:
            continue
        seen.add(child.id)
        child_node = await build_tree(child.id, db, depth + 1)
        if child_node:
            node["children"].append(child_node)

    return node


async def get_all_roots(db: AsyncSession) -> list[Person]:
    """Return persons with no recorded parents — they are tree roots."""
    result = await db.execute(
        select(Person).where(
            Person.father_id.is_(None),
            Person.mother_id.is_(None),
        )
    )
    return result.scalars().all()
