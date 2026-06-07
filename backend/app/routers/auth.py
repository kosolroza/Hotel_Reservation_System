from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, UserUpdate, ChangePassword
from app.schemas.common import MessageResponse
from app.services.auth_service import register_user, login_user
from app.dependencies import get_current_user
from app.models.user import User
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=Token, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await register_user(data, db)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await login_user(data, db)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    valid_fields = {
        'first_name', 'last_name', 'phone', 'address',
        'nationality', 'gender', 'passport_number', 'date_of_birth', 'avatar'
    }
    for field, value in data.model_dump(exclude_none=True).items():
        if field in valid_fields:
            setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(data: ChangePassword, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    await db.flush()
    return MessageResponse(message="Password changed successfully")
