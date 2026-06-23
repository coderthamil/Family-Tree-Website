"""
GenoPro HTM/XML Parser

GenoPro exports family data in an .htm file containing embedded XML within
<script> tags or a dedicated data block. This parser extracts all
<Individual> and <Family> elements and returns structured dicts.
"""
import re
import xml.etree.ElementTree as ET
from typing import Any
from bs4 import BeautifulSoup


def _parse_date(raw: str | None) -> str | None:
    """Normalize GenoPro date strings to ISO format YYYY-MM-DD."""
    if not raw:
        return None
    raw = raw.strip()
    # Handle formats like "1 JAN 1970", "JAN 1970", "1970"
    months = {
        "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
        "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
        "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
    }
    parts = raw.upper().split()
    try:
        if len(parts) == 3:
            day, mon, year = parts
            return f"{year}-{months.get(mon, '01')}-{int(day):02d}"
        elif len(parts) == 2:
            mon, year = parts
            return f"{year}-{months.get(mon, '01')}-01"
        elif len(parts) == 1 and parts[0].isdigit():
            return f"{parts[0]}-01-01"
    except Exception:
        pass
    return None


def _extract_xml_from_htm(content: bytes) -> str | None:
    """
    Extract embedded XML from a GenoPro .htm file.
    GenoPro embeds data in several known ways:
    1. A <div id='gp-data'> or similar hidden element
    2. Inside a <script> tag as a string assignment
    3. As raw XML if the file is actually .xml
    """
    text = content.decode("utf-8", errors="replace")

    # Try: is it raw XML?
    stripped = text.strip()
    if stripped.startswith("<?xml") or stripped.startswith("<GenoPro"):
        return stripped

    soup = BeautifulSoup(text, "lxml")

    # Strategy 1: look for a script tag containing GenoPro XML
    for script in soup.find_all("script"):
        src = script.string or ""
        # GenoPro often embeds data as: var gp = "<GenoPro>...</GenoPro>"
        match = re.search(r'<GenoPro[\s\S]+?</GenoPro>', src)
        if match:
            return match.group(0)

    # Strategy 2: look for a hidden div or pre containing XML
    for tag in soup.find_all(["div", "pre", "textarea"]):
        inner = tag.get_text()
        if "<Individual" in inner or "<GenoPro" in inner:
            match = re.search(r'<GenoPro[\s\S]+?</GenoPro>', inner)
            if match:
                return match.group(0)
            # Try direct XML block
            if inner.strip().startswith("<"):
                return inner.strip()

    # Strategy 3: search the raw text directly
    match = re.search(r'<GenoPro[\s\S]+?</GenoPro>', text)
    if match:
        return match.group(0)

    # Strategy 4: look for individual XML-like structures
    match = re.search(r'<People[\s\S]+?</People>', text)
    if match:
        return f"<GenoPro>{match.group(0)}</GenoPro>"

    return None


def parse_genopro_file(content: bytes) -> dict[str, Any]:
    """
    Parse a GenoPro HTM or XML file.

    Returns:
        {
          "persons": [ {id, first_name, last_name, gender, dob, dod, father_id, mother_id, ...} ],
          "families": [ {id, husband_id, wife_id, marriage_date, children: [...]} ],
        }
    """
    xml_str = _extract_xml_from_htm(content)
    if not xml_str:
        raise ValueError("Could not locate GenoPro XML data in the uploaded file.")

    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError as e:
        raise ValueError(f"XML parse error: {e}")

    persons = []
    families = []

    # ── Persons ────────────────────────────────────────────────────────────────
    # GenoPro uses <Individual Id="I1"> or inside a <People> block
    individual_tags = root.iter("Individual")
    for ind in individual_tags:
        pid = ind.get("ID") or ind.get("Id") or ind.get("id")
        if not pid:
            continue

        # Name: <Name><First>...</First><Last>...</Last></Name>
        name_el = ind.find("Name")
        first = (name_el.findtext("First") or "").strip() if name_el is not None else ""
        last = (name_el.findtext("Last") or "").strip() if name_el is not None else ""

        # Gender
        gender_raw = ind.findtext("Gender") or ind.get("Gender") or ""
        gender = "male" if gender_raw.lower() in ("m", "male") else \
                 "female" if gender_raw.lower() in ("f", "female") else "unknown"

        # Birth / Death
        birth_el = ind.find("Birth")
        death_el = ind.find("Death")
        dob = _parse_date(birth_el.findtext("Date") if birth_el is not None else None)
        dod = _parse_date(death_el.findtext("Date") if death_el is not None else None)
        birth_place = (birth_el.findtext("Place") or "").strip() if birth_el is not None else ""
        death_place = (death_el.findtext("Place") or "").strip() if death_el is not None else ""

        # Parents (GenoPro sets these on the Individual)
        father_id = ind.get("FatherId") or ind.get("FatherID") or ind.findtext("FatherId") or ind.findtext("FatherID") or None
        mother_id = ind.get("MotherId") or ind.get("MotherID") or ind.findtext("MotherId") or ind.findtext("MotherID") or None

        notes_el = ind.find("Note") or ind.find("Notes")
        notes = (notes_el.text or "").strip() if notes_el is not None else ""

        persons.append({
            "id": pid,
            "first_name": first or None,
            "last_name": last or None,
            "gender": gender,
            "dob": dob,
            "dod": dod,
            "birth_place": birth_place or None,
            "death_place": death_place or None,
            "father_id": father_id,
            "mother_id": mother_id,
            "notes": notes or None,
        })

    # ── Families ───────────────────────────────────────────────────────────────
    # Pre-parse PedigreeLinks for relationships
    family_links = {}
    for link in root.iter("PedigreeLink"):
        fam_id = link.get("Family") or link.get("family") or link.get("FAMILY")
        ind_id = link.get("Individual") or link.get("individual") or link.get("INDIVIDUAL")
        role = link.get("PedigreeLink") or link.get("pedigreelink") or link.get("PEDIGREELINK")
        if not fam_id or not ind_id:
            continue
        if fam_id not in family_links:
            family_links[fam_id] = {"parents": [], "children": []}
        if role == "Parent":
            family_links[fam_id]["parents"].append(ind_id)
        elif role in ("Biological", "Adopted", "Child"):
            family_links[fam_id]["children"].append(ind_id)

    person_genders = {p["id"]: p["gender"] for p in persons}

    family_tags = root.iter("Family")
    for fam in family_tags:
        fid = fam.get("ID") or fam.get("Id") or fam.get("id")
        if not fid:
            continue

        husband_id = None
        wife_id = None

        links = family_links.get(fid)
        if links:
            for parent_id in links["parents"]:
                gender = person_genders.get(parent_id, "unknown")
                if gender == "male":
                    husband_id = parent_id
                elif gender == "female":
                    wife_id = parent_id
                else:
                    if not husband_id:
                        husband_id = parent_id
                    elif not wife_id:
                        wife_id = parent_id

        # Fallback to direct attributes/tags if husband_id or wife_id are not set from pedigree links
        if not husband_id:
            husband_id = fam.get("HusbandId") or fam.get("HusbandID") or fam.get("Husband") or fam.findtext("HusbandId") or fam.findtext("HusbandID") or None
        if not wife_id:
            wife_id = fam.get("WifeId") or fam.get("WifeID") or fam.get("Wife") or fam.findtext("WifeId") or fam.findtext("WifeID") or None

        marriage_el = fam.find("Marriage")
        marriage_date = _parse_date(
            marriage_el.findtext("Date") if marriage_el is not None else None
        )

        # Children from PedigreeLink
        children = list(links["children"]) if links else []

        # Merge with children from children_el (fallback/mock support)
        children_el = fam.find("Children")
        if children_el is not None:
            for child_el in children_el.iter("Child"):
                cid = child_el.get("ID") or child_el.get("Id") or child_el.get("id")
                if cid and cid not in children:
                    children.append(cid)

        families.append({
            "id": fid,
            "husband_id": husband_id,
            "wife_id": wife_id,
            "marriage_date": marriage_date,
            "children": children,
        })

    return {"persons": persons, "families": families}
