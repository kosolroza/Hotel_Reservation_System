from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.payment import Payment, PaymentStatus
from app.models.room import Room
from app.models.room_type import RoomType
from app.models.user import User, UserRole
from app.dependencies import get_current_admin

router = APIRouter(prefix="/admin/reports", tags=["Admin - Reports"])


@router.get("")
async def get_report(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Comprehensive report for the given date range."""
    now = datetime.now(timezone.utc)
    # Parse date range
    if from_date:
        start = datetime.fromisoformat(from_date).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    else:
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    if to_date:
        end = datetime.fromisoformat(to_date).replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
    else:
        end = now

    # 1. Total revenue & bookings in range
    rev_row = (await db.execute(
        select(func.sum(Payment.amount), func.count(Payment.id))
        .where(and_(
            Payment.status == PaymentStatus.completed,
            Payment.paid_at >= start,
            Payment.paid_at <= end,
        ))
    )).first()
    total_revenue = float(rev_row[0] or 0)
    total_payments = int(rev_row[1] or 0)

    booking_count = (await db.execute(
        select(func.count(Reservation.id))
        .where(and_(
            Reservation.status != ReservationStatus.cancelled,
            Reservation.created_at >= start,
            Reservation.created_at <= end,
        ))
    )).scalar() or 0

    # 2. Revenue by day
    rev_by_day_rows = (await db.execute(
        select(
            func.date(Payment.paid_at).label("date"),
            func.sum(Payment.amount).label("revenue"),
        )
        .where(and_(
            Payment.status == PaymentStatus.completed,
            Payment.paid_at >= start,
            Payment.paid_at <= end,
        ))
        .group_by(func.date(Payment.paid_at))
        .order_by(func.date(Payment.paid_at))
    )).fetchall()
    revenue_by_day = [{"date": str(r.date), "revenue": float(r.revenue)} for r in rev_by_day_rows]

    # 3. Revenue by room type
    rev_by_type_rows = (await db.execute(
        select(
            RoomType.name.label("room_type"),
            func.sum(Payment.amount).label("revenue"),
        )
        .join(Reservation, Payment.reservation_id == Reservation.id)
        .join(Room, Reservation.room_id == Room.id)
        .join(RoomType, Room.room_type_id == RoomType.id)
        .where(and_(
            Payment.status == PaymentStatus.completed,
            Payment.paid_at >= start,
            Payment.paid_at <= end,
        ))
        .group_by(RoomType.id, RoomType.name)
        .order_by(func.sum(Payment.amount).desc())
    )).fetchall()
    revenue_by_type = [{"room_type": r.room_type, "revenue": float(r.revenue)} for r in rev_by_type_rows]

    # 4. Occupancy by room type (checked_in or checked_out reservations as a % of total rooms)
    type_rows = (await db.execute(
        select(RoomType.id, RoomType.name)
    )).fetchall()
    occupancy_by_type = []
    for rt in type_rows:
        total_rt = (await db.execute(select(func.count(Room.id)).where(Room.room_type_id == rt.id))).scalar() or 0
        if total_rt == 0:
            continue
        occupied_rt = (await db.execute(
            select(func.count(Reservation.id))
            .join(Room, Reservation.room_id == Room.id)
            .where(and_(
                Room.room_type_id == rt.id,
                Reservation.status.in_([ReservationStatus.checked_in, ReservationStatus.checked_out]),
                Reservation.created_at >= start,
                Reservation.created_at <= end,
            ))
        )).scalar() or 0
        rate = round((occupied_rt / (total_rt or 1)) * 100, 1)
        occupancy_by_type.append({"room_type": rt.name, "rate": min(rate, 100)})

    # 5. Most booked rooms
    most_booked_rows = (await db.execute(
        select(
            Room.room_number.label("room_number"),
            RoomType.name.label("room_type"),
            func.count(Reservation.id).label("bookings"),
        )
        .join(Reservation, Reservation.room_id == Room.id)
        .join(RoomType, Room.room_type_id == RoomType.id)
        .where(and_(
            Reservation.status != ReservationStatus.cancelled,
            Reservation.created_at >= start,
            Reservation.created_at <= end,
        ))
        .group_by(Room.id, Room.room_number, RoomType.name)
        .order_by(func.count(Reservation.id).desc())
        .limit(10)
    )).fetchall()
    most_booked_rooms = [
        {"room_number": r.room_number, "room_type": r.room_type, "bookings": r.bookings}
        for r in most_booked_rows
    ]

    # 6. Promo usage
    promo_rows = (await db.execute(
        select(
            Reservation.promo_code.label("promo_code"),
            func.count(Reservation.id).label("times_used"),
            func.sum(Reservation.discount_amount).label("discount_total"),
        )
        .where(and_(
            Reservation.promo_code.isnot(None),
            Reservation.status != ReservationStatus.cancelled,
            Reservation.created_at >= start,
            Reservation.created_at <= end,
        ))
        .group_by(Reservation.promo_code)
        .order_by(func.count(Reservation.id).desc())
    )).fetchall()
    promo_usage = [
        {
            "promo_code": r.promo_code,
            "times_used": r.times_used,
            "discount_total": float(r.discount_total or 0),
        }
        for r in promo_rows
    ]

    return {
        "total_revenue": total_revenue,
        "total_bookings": booking_count,
        "average_booking_value": round(total_revenue / booking_count, 2) if booking_count else 0,
        "revenue_by_day": revenue_by_day,
        "revenue_by_type": revenue_by_type,
        "occupancy_by_type": occupancy_by_type,
        "most_booked_rooms": most_booked_rooms,
        "promo_usage": promo_usage,
    }


@router.get("/revenue")
async def revenue_report(
    start_date: Optional[datetime] = None, end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin),
):
    if not start_date:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    if not end_date:
        end_date = datetime.now(timezone.utc)
    row = (await db.execute(
        select(func.sum(Payment.amount), func.count(Payment.id))
        .where(and_(Payment.status == PaymentStatus.completed, Payment.created_at >= start_date, Payment.created_at <= end_date))
    )).first()
    total_revenue = float(row[0] or 0)
    total_payments = int(row[1] or 0)
    return {"start_date": start_date.isoformat(), "end_date": end_date.isoformat(),
            "total_revenue": total_revenue, "total_payments": total_payments,
            "avg_payment": round(total_revenue / total_payments, 2) if total_payments else 0}


@router.get("/occupancy")
async def occupancy_report(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    total_rooms = (await db.execute(select(func.count(Room.id)))).scalar() or 0
    occupied = (await db.execute(select(func.count(Reservation.id)).where(Reservation.status == ReservationStatus.checked_in))).scalar() or 0
    confirmed = (await db.execute(select(func.count(Reservation.id)).where(Reservation.status == ReservationStatus.confirmed))).scalar() or 0
    return {"total_rooms": total_rooms, "occupied": occupied, "confirmed": confirmed,
            "available": total_rooms - occupied,
            "occupancy_rate": round((occupied / total_rooms * 100) if total_rooms else 0, 1)}


@router.get("/guests")
async def guests_report(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    total = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.guest))).scalar() or 0
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = (await db.execute(
        select(func.count(User.id)).where(and_(User.role == UserRole.guest, User.created_at >= start_of_month))
    )).scalar() or 0
    return {"total_guests": total, "new_this_month": new_this_month}
