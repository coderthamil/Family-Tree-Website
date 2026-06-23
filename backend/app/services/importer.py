"""
Importer — upserts parsed GenoPro data into the database.
"""
from datetime import date
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.person import Person, GenderEnum
from app.models.family import Family
from app.models.child import Child
from app.models.timeline import Timeline, EventType


def _to_date(val: str | None) -> date | None:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        return None


async def import_parsed_data(parsed: dict[str, Any], db: AsyncSession) -> dict:
    """
    Upserts persons and families from a parsed GenoPro file.
    Returns counts: {persons_added, persons_updated, families_added, families_updated}
    """
    stats = {"persons_added": 0, "persons_updated": 0,
             "families_added": 0, "families_updated": 0, "children_linked": 0}

    # ── Persons ─────────────────────────────────────────────────────────────
    for p in parsed.get("persons", []):
        existing = await db.get(Person, p["id"])
        if existing:
            existing.first_name = p.get("first_name") or existing.first_name
            existing.last_name = p.get("last_name") or existing.last_name
            existing.gender = GenderEnum(p.get("gender", "unknown"))
            existing.dob = _to_date(p.get("dob")) or existing.dob
            existing.dod = _to_date(p.get("dod")) or existing.dod
            existing.birth_place = p.get("birth_place") or existing.birth_place
            existing.death_place = p.get("death_place") or existing.death_place
            existing.father_id = p.get("father_id") or existing.father_id
            existing.mother_id = p.get("mother_id") or existing.mother_id
            existing.notes = p.get("notes") or existing.notes
            stats["persons_updated"] += 1
        else:
            person = Person(
                id=p["id"],
                first_name=p.get("first_name"),
                last_name=p.get("last_name"),
                gender=GenderEnum(p.get("gender", "unknown")),
                dob=_to_date(p.get("dob")),
                dod=_to_date(p.get("dod")),
                birth_place=p.get("birth_place"),
                death_place=p.get("death_place"),
                father_id=p.get("father_id"),
                mother_id=p.get("mother_id"),
                notes=p.get("notes"),
            )
            db.add(person)
            stats["persons_added"] += 1

            # Auto-generate timeline events from birth/death
            if p.get("dob"):
                db.add(Timeline(
                    person_id=p["id"],
                    event_type=EventType.birth,
                    start_date=_to_date(p["dob"]),
                    description=f"Born{' in ' + p['birth_place'] if p.get('birth_place') else ''}",
                    location=p.get("birth_place"),
                ))
            if p.get("dod"):
                db.add(Timeline(
                    person_id=p["id"],
                    event_type=EventType.death,
                    start_date=_to_date(p["dod"]),
                    description=f"Died{' in ' + p['death_place'] if p.get('death_place') else ''}",
                    location=p.get("death_place"),
                ))

    await db.flush()

    # ── Families ─────────────────────────────────────────────────────────────
    for f in parsed.get("families", []):
        existing = await db.get(Family, f["id"])
        if existing:
            existing.husband_id = f.get("husband_id") or existing.husband_id
            existing.wife_id = f.get("wife_id") or existing.wife_id
            existing.marriage_date = _to_date(f.get("marriage_date")) or existing.marriage_date
            stats["families_updated"] += 1
        else:
            family = Family(
                id=f["id"],
                husband_id=f.get("husband_id"),
                wife_id=f.get("wife_id"),
                marriage_date=_to_date(f.get("marriage_date")),
            )
            db.add(family)
            stats["families_added"] += 1

        await db.flush()

        # ── Children links ─────────────────────────────────────────────────
        for child_id in f.get("children", []):
            composite_id = f"{f['id']}_{child_id}"
            existing_child = await db.get(Child, composite_id)
            if not existing_child:
                db.add(Child(id=composite_id, family_id=f["id"], child_id=child_id))
                stats["children_linked"] += 1

                # Also set father_id / mother_id on Person
                child_person = await db.get(Person, child_id)
                if child_person:
                    if f.get("husband_id") and not child_person.father_id:
                        child_person.father_id = f["husband_id"]
                    if f.get("wife_id") and not child_person.mother_id:
                        child_person.mother_id = f["wife_id"]

        # Marriage timeline event
        if f.get("marriage_date") and f.get("husband_id"):
            # Only add if not already there
            result = await db.execute(
                select(Timeline).where(
                    Timeline.person_id == f["husband_id"],
                    Timeline.event_type == EventType.marriage,
                    Timeline.start_date == _to_date(f["marriage_date"]),
                )
            )
            if not result.scalar_one_or_none():
                db.add(Timeline(
                    person_id=f["husband_id"],
                    event_type=EventType.marriage,
                    start_date=_to_date(f["marriage_date"]),
                    description="Married",
                ))

    await db.flush()
    return stats
