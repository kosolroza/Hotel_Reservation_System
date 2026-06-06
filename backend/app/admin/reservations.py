from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.payment import Payment, PaymentStatus
from app.models.room import Room
from app.models.user import User
from app.schemas.reservation import ReservationResponse, ReservationUpdate
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_admin
from app.utils.pagination import paginate, get_offset
from pydantic import BaseModel

router = APIRouter(prefix="/admin/bookings", tags=["Admin - Bookings"])


class StatusUpdate(BaseModel):
    status: ReservationStatus
    cancel_reason: Optional[str] = None


def _base_query(
    status: Optional[ReservationStatus] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
):
    """Build filter conditions shared by count and data queries."""
    filters = []
    if status:
        filters.append(Reservation.status == status)
    if search:
        term = f"%{search}%"
        filters.append(or_(
            Reservation.reference.ilike(term),
            User.first_name.ilike(term),
            User.last_name.ilike(term),
            Room.room_number.ilike(term),
        ))
    return filters


@router.get("", response_model=PaginatedResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[ReservationStatus] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    filters = _base_query(status, payment_status, search)

    # Base stmt always joins User and Room so search works
    stmt = (
        select(Reservation)
        .join(User, Reservation.guest_id == User.id)
        .join(Room, Reservation.room_id == Room.id)
    )
    count_stmt = (
        select(func.count(Reservation.id))
        .join(User, Reservation.guest_id == User.id)
        .join(Room, Reservation.room_id == Room.id)
    )

    # Payment status filter requires joining Payment
    if payment_status:
        stmt = stmt.outerjoin(Payment, Payment.reservation_id == Reservation.id)
        count_stmt = count_stmt.outerjoin(Payment, Payment.reservation_id == Reservation.id)
        filters.append(Payment.status == payment_status)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        stmt
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
        .order_by(Reservation.created_at.desc())
        .offset(get_offset(page, per_page))
        .limit(per_page)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return paginate(
        [ReservationResponse.model_validate(r).model_dump() for r in rows],
        total, page, per_page,
    )


@router.get("/{booking_id}", response_model=ReservationResponse)
async def get_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    r = (await db.execute(
        select(Reservation)
        .where(Reservation.id == booking_id)
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
    )).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")
    return ReservationResponse.model_validate(r)


@router.patch("/{booking_id}/status", response_model=ReservationResponse)
async def update_booking_status(
    booking_id: int,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    r = (await db.execute(
        select(Reservation)
        .where(Reservation.id == booking_id)
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
    )).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")

    r.status = data.status

    # When checking in, record actual check-in time if model supports it
    # When checking out, record actual check-out time if model supports it
    if data.status == ReservationStatus.checked_in:
        if hasattr(r, 'check_in_actual'):
            r.check_in_actual = datetime.now(timezone.utc)
    elif data.status == ReservationStatus.checked_out:
        if hasattr(r, 'check_out_actual'):
            r.check_out_actual = datetime.now(timezone.utc)

    await db.flush()

    # Re-select to get fresh values after flush
    fresh = (await db.execute(
        select(Reservation)
        .where(Reservation.id == booking_id)
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
    )).scalar_one()
    return ReservationResponse.model_validate(fresh)


@router.put("/{booking_id}", response_model=ReservationResponse)
async def update_booking(
    booking_id: int,
    data: ReservationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    r = (await db.execute(select(Reservation).where(Reservation.id == booking_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")
    for f, v in data.model_dump(exclude_none=True).items():
        setattr(r, f, v)
    await db.flush()
    fresh = (await db.execute(
        select(Reservation)
        .where(Reservation.id == booking_id)
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
    )).scalar_one()
    return ReservationResponse.model_validate(fresh)
