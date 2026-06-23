from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.auth.dependencies import require_viewer
from app.services.tree_builder import build_tree, get_all_roots
from app.schemas.person import PersonSummary

router = APIRouter(prefix="/tree", tags=["Tree"])


@router.get("/roots", response_model=list[PersonSummary])
async def list_roots(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    """Return all persons with no recorded parents (potential tree roots)."""
    roots = await get_all_roots(db)
    return [PersonSummary.model_validate(r) for r in roots]


@router.get("/{root_id}")
async def get_tree(
    root_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),
):
    """Return full nested tree JSON rooted at person {root_id}."""
    tree = await build_tree(root_id, db)
    if not tree:
        raise HTTPException(status_code=404, detail="Root person not found")
    return tree
