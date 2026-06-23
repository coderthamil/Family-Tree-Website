"""
Relationship Engine — derives extended family relationships from parent-child links.
All logic is pure async SQL — no recursive loops.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.person import Person
from app.models.family import Family
from app.models.child import Child
from app.schemas.person import PersonSummary


async def _get_person(person_id: str, db: AsyncSession) -> Person | None:
    return await db.get(Person, person_id)


async def _children_of(parent_id: str, db: AsyncSession) -> list[Person]:
    result = await db.execute(
        select(Person).where(
            or_(Person.father_id == parent_id, Person.mother_id == parent_id)
        )
    )
    return result.scalars().all()


async def _parents_of(person: Person, db: AsyncSession) -> list[Person]:
    parents = []
    if person.father_id:
        p = await db.get(Person, person.father_id)
        if p:
            parents.append(p)
    if person.mother_id:
        p = await db.get(Person, person.mother_id)
        if p:
            parents.append(p)
    return parents


async def get_relatives(person_id: str, db: AsyncSession) -> dict:
    person = await _get_person(person_id, db)
    if not person:
        return {}

    # ── Spouse(s) ──────────────────────────────────────────────────────────
    spouses_result = await db.execute(
        select(Family).where(
            or_(Family.husband_id == person_id, Family.wife_id == person_id)
        )
    )
    family_rows = spouses_result.scalars().all()
    spouse_ids = set()
    for fam in family_rows:
        if fam.husband_id and fam.husband_id != person_id:
            spouse_ids.add(fam.husband_id)
        if fam.wife_id and fam.wife_id != person_id:
            spouse_ids.add(fam.wife_id)

    spouses = []
    for sid in spouse_ids:
        s = await db.get(Person, sid)
        if s:
            spouses.append(PersonSummary.model_validate(s))

    # ── Parents ────────────────────────────────────────────────────────────
    parents = await _parents_of(person, db)

    # ── Siblings (full & half) ─────────────────────────────────────────────
    sibling_ids: set[str] = set()
    for parent in parents:
        children = await _children_of(parent.id, db)
        sibling_ids.update(c.id for c in children if c.id != person_id)
    siblings = []
    for sid in sibling_ids:
        s = await db.get(Person, sid)
        if s:
            siblings.append(PersonSummary.model_validate(s))

    # ── Children ───────────────────────────────────────────────────────────
    children_rows = await _children_of(person_id, db)
    children = [PersonSummary.model_validate(c) for c in children_rows]

    # ── Grandparents ───────────────────────────────────────────────────────
    grandparent_ids: set[str] = set()
    for parent in parents:
        gps = await _parents_of(parent, db)
        grandparent_ids.update(g.id for g in gps)
    grandparents = []
    for gid in grandparent_ids:
        g = await db.get(Person, gid)
        if g:
            grandparents.append(PersonSummary.model_validate(g))

    # ── Aunts / Uncles (siblings of parents) ──────────────────────────────
    aunt_uncle_ids: set[str] = set()
    for parent in parents:
        parent_siblings = await _get_siblings_of(parent.id, db)
        aunt_uncle_ids.update(s.id for s in parent_siblings)
    aunts_uncles = []
    for auid in aunt_uncle_ids:
        a = await db.get(Person, auid)
        if a:
            aunts_uncles.append(PersonSummary.model_validate(a))

    # ── Cousins (children of aunts/uncles) ────────────────────────────────
    cousin_ids: set[str] = set()
    for auid in aunt_uncle_ids:
        cousins_of_au = await _children_of(auid, db)
        cousin_ids.update(c.id for c in cousins_of_au)
    cousins = []
    for cid in cousin_ids:
        c = await db.get(Person, cid)
        if c:
            cousins.append(PersonSummary.model_validate(c))

    # ── Nieces / Nephews (children of siblings) ───────────────────────────
    niece_nephew_ids: set[str] = set()
    for sib in siblings:
        nn = await _children_of(sib.id, db)
        niece_nephew_ids.update(n.id for n in nn)
    nieces_nephews = []
    for nnid in niece_nephew_ids:
        nn_person = await db.get(Person, nnid)
        if nn_person:
            nieces_nephews.append(PersonSummary.model_validate(nn_person))

    return {
        "person_id": person_id,
        "spouses": spouses,
        "parents": [PersonSummary.model_validate(p) for p in parents],
        "siblings": siblings,
        "children": children,
        "grandparents": grandparents,
        "aunts_uncles": aunts_uncles,
        "cousins": cousins,
        "nieces_nephews": nieces_nephews,
    }


async def _get_siblings_of(person_id: str, db: AsyncSession) -> list[Person]:
    person = await db.get(Person, person_id)
    if not person:
        return []
    sibling_ids: set[str] = set()
    for pid in [person.father_id, person.mother_id]:
        if pid:
            children = await _children_of(pid, db)
            sibling_ids.update(c.id for c in children if c.id != person_id)
    result = []
    for sid in sibling_ids:
        s = await db.get(Person, sid)
        if s:
            result.append(s)
    return result
