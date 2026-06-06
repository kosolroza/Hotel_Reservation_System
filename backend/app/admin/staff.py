from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.staff import Staff
from app.models.user import User, UserRole
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_admin, get_current_superadmin
from app.utils.pagination import paginate, get_offset

router = APIRouter(prefix="/admin/staff", tags=["Admin - Staff"])


@router.get("", response_model=PaginatedResponse)
async def list_staff(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    total = (await db.execute(select(func.count(Staff.id)))).scalar() or 0
    rows = (await db.execute(select(Staff).order_by(Staff.created_at.desc()).offset(get_offset(page, per_page)).limit(per_page))).scalars().all()
    return paginate([StaffResponse.model_validate(s).model_dump() for s in rows], total, page, per_page)


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff(data: StaffCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_superadmin)):
    user = (await db.execute(select(User).where(User.id == data.user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if (await db.execute(select(Staff).where(Staff.user_id == data.user_id))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already has a staff profile")
    s = Staff(**data.model_dump())
    db.add(s)
    user.role = UserRole.staff
    await db.flush()
    await db.refresh(s)
    return s


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(staff_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    s = (await db.execute(select(Staff).where(Staff.id == staff_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    return s


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: int, data: StaffUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_superadmin)):
    s = (await db.execute(select(Staff).where(Staff.id == staff_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    for f, v in data.model_dump(exclude_none=True).items():
        setattr(s, f, v)
    await db.flush()
    await db.refresh(s)
    return s


@router.delete("/{staff_id}")
async def delete_staff(staff_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_superadmin)):
    s = (await db.execute(select(Staff).where(Staff.id == staff_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
    if user:
        user.role = UserRole.guest
    await db.delete(s)
    return {"message": "Staff deleted"}
