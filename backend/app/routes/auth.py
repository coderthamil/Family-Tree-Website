from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, TokenResponse, LoginRequest
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(select(User).where(User.username == payload.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        print(f"[DEBUG-LOGIN] Received login request for username: '{payload.username}'")
        
        result = await db.execute(select(User).where(User.username == payload.username))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"[DEBUG-LOGIN] User '{payload.username}' not found.")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            
        is_valid = verify_password(payload.password, user.hashed_password)
        print(f"[DEBUG-LOGIN] User found. Hashed password: {user.hashed_password}. Match: {is_valid}")
        
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token({"sub": str(user.id)})
        
        try:
            user_data = UserRead.model_validate(user)
        except Exception as val_err:
            print(f"[DEBUG-LOGIN] Serialization validation failed: {val_err}")
            raise HTTPException(status_code=500, detail=f"Pydantic Validation Error: {str(val_err)}")
            
        return TokenResponse(access_token=token, user=user_data)
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[DEBUG-LOGIN] Login failed with exception:\n{tb}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}\n{tb}")


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
