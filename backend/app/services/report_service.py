from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.models.reservation import Reservation, ReservationStatus
from app.models.payment import Payment, PaymentStatus
from app.models.room import Room, RoomStatus
from app.models.room_type import RoomType
from app.models.user import User, UserRole
from app.models.feedback import Feedback


async def get_dashboard_stats(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Bookings created today (any status except cancelled)
    bookings_today = (await db.execute(
        select(func.count(Reservation.id)).where(
            and_(
                Reservation.created_at >= today_start,
                Reservation.status != ReservationStatus.cancelled,
            )
        )
    )).scalar() or 0

    # Revenue from completed payments this month
    revenue_this_month = float((await db.execute(
        select(func.sum(Payment.amount)).where(
            and_(
                Payment.status == PaymentStatus.completed,
                Payment.paid_at >= month_start,
            )
        )
    )).scalar() or 0)

    # Total rooms & available rooms
    total_rooms = (await db.execute(select(func.count(Room.id)))).scalar() or 0
    available_rooms = (await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatus.available)
    )).scalar() or 0

    # Occupancy rate = rooms currently occupied (checked_in) / total rooms
    occupied = (await db.execute(
        select(func.count(Reservation.id)).where(
            Reservation.status == ReservationStatus.checked_in
        )
    )).scalar() or 0
    occupancy_rate = round((occupied / total_rooms * 100) if total_rooms else 0, 1)

    return {
        "bookings_today": bookings_today,
        "revenue_this_month": revenue_this_month,
        "occupancy_rate": occupancy_rate,
        "available_rooms": available_rooms,
    }


async def get_revenue_chart(db: AsyncSession, days: int = 30) -> list:
    start = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await db.execute(
        select(
            func.date(Payment.paid_at).label("date"),
            func.sum(Payment.amount).label("revenue"),
        )
        .where(and_(
            Payment.status == PaymentStatus.completed,
            Payment.paid_at >= start,
        ))
        .group_by(func.date(Payment.paid_at))
        .order_by(func.date(Payment.paid_at))
    )).fetchall()
    return [{"date": str(r.date), "revenue": float(r.revenue)} for r in rows]


async def get_bookings_by_type(db: AsyncSession) -> list:
    rows = (await db.execute(
        select(RoomType.name.label("room_type"), func.count(Reservation.id).label("count"))
        .join(Room, Room.room_type_id == RoomType.id)
        .join(Reservation, Reservation.room_id == Room.id)
        .where(Reservation.status != ReservationStatus.cancelled)
        .group_by(RoomType.id, RoomType.name)
        .order_by(func.count(Reservation.id).desc())
    )).fetchall()
    return [{"room_type": r.room_type, "count": r.count} for r in rows]


async def get_recent_bookings(db: AsyncSession, limit: int = 10) -> list:
    rows = (await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.guest),
            selectinload(Reservation.room),
            selectinload(Reservation.payment),
        )
        .order_by(Reservation.created_at.desc())
        .limit(limit)
    )).scalars().all()
    return rows
