from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_admin
from app.schemas.reservation import ReservationResponse
from app.services.report_service import (
    get_dashboard_stats,
    get_revenue_chart,
    get_bookings_by_type,
    get_recent_bookings,
)
from typing import List

router = APIRouter(prefix="/admin/dashboard", tags=["Admin - Dashboard"])


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    return await get_dashboard_stats(db)


@router.get("/revenue-chart")
async def revenue_chart(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await get_revenue_chart(db, days)


@router.get("/bookings-by-type")
async def bookings_by_type(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    return await get_bookings_by_type(db)


@router.get("/recent-bookings", response_model=List[ReservationResponse])
async def recent_bookings(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    rows = await get_recent_bookings(db, limit)
    return [ReservationResponse.model_validate(r) for r in rows]
