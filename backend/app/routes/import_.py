from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.auth.dependencies import require_admin
from app.services.parser import parse_genopro_file
from app.services.importer import import_parsed_data

router = APIRouter(prefix="/import", tags=["Import"])


@router.post("/upload")
async def upload_genopro_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Upload a GenoPro .htm or .xml file.
    Parses it, extracts persons and families, and upserts into the database.
    """
    if file.content_type not in ("text/html", "text/xml", "application/xml", "application/octet-stream"):
        # Be lenient — some OS report wrong MIME for .htm
        pass

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        parsed = parse_genopro_file(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    stats = await import_parsed_data(parsed, db)

    return {
        "status": "success",
        "filename": file.filename,
        "stats": stats,
    }
