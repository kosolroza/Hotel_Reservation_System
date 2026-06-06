from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_admin
from app.utils.pagination import paginate, get_offset

router = APIRouter(prefix="/admin/guests", tags=["Admin - Guests"])


class GuestUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None  # mapped to User.phone
    address: Optional[str] = None       # not in model, silently ignored
    nationality: Optional[str] = None   # not in model, silently ignored
    passport_number: Optional[str] = None  # not in model, silently ignored


@router.get("", response_model=PaginatedResponse)
async def list_guests(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin),
):
    stmt = select(User).where(User.role == UserRole.guest)
    count_stmt = select(func.count(User.id)).where(User.role == UserRole.guest)
    if search:
        f = User.first_name.ilike(f"%{search}%") | User.last_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)
    total = (await db.execute(count_stmt)).scalar() or 0
    rows = (await db.execute(stmt.order_by(User.created_at.desc()).offset(get_offset(page, per_page)).limit(per_page))).scalars().all()
    return paginate([UserResponse.model_validate(g).model_dump() for g in rows], total, page, per_page)


@router.get("/{guest_id}", response_model=UserResponse)
async def get_guest(guest_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    g = (await db.execute(select(User).where(User.id == guest_id, User.role == UserRole.guest))).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Guest not found")
    return UserResponse.model_validate(g)


@router.put("/{guest_id}", response_model=UserResponse)
async def update_guest(
    guest_id: int,
    data: GuestUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    g = (await db.execute(select(User).where(User.id == guest_id))).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Guest not found")
    if data.first_name is not None:
        g.first_name = data.first_name
    if data.last_name is not None:
        g.last_name = data.last_name
    if data.phone_number is not None:
        g.phone = data.phone_number
    await db.flush()
    return UserResponse.model_validate(g)


@router.patch("/{guest_id}/toggle-active")
async def toggle_active(guest_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    g = (await db.execute(select(User).where(User.id == guest_id))).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Guest not found")
    g.is_active = not g.is_active
    await db.flush()
    return {"id": g.id, "is_active": g.is_active}
