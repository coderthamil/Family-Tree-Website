from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.auth.dependencies import require_contributor
from app.auth.jwt import create_share_token, decode_token
from app.services.tree_builder import build_tree

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/share")
async def create_share_link(
    root_id: str,
    expire_hours: int = 168,
    _: User = Depends(require_contributor),
):
    """Generate a shareable read-only link token for a tree rooted at root_id."""
    token = create_share_token(root_id, expire_hours)
    return {
        "token": token,
        "url": f"/share/{token}",
        "expires_in_hours": expire_hours,
        "root_id": root_id,
    }


@router.get("/share/{token}")
async def get_shared_tree(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — validate share token and return tree JSON."""
    payload = decode_token(token)
    if not payload or payload.get("scope") != "read_only":
        raise HTTPException(status_code=401, detail="Invalid or expired share link")

    sub = payload.get("sub", "")
    root_id = sub.replace("share:", "")
    tree = await build_tree(root_id, db)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree
