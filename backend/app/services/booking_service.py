from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.reservation import Reservation, ReservationStatus
from app.models.room import Room
from app.models.promotion import Promotion
from app.models.user import User, UserRole
from app.schemas.reservation import ReservationCreate
from app.services.availability_service import is_room_available
from app.utils.security import generate_reference
from app.utils.date_utils import count_nights, calc_subtotal, calc_discount, calc_tax, calc_total
from app.config import settings


async def validate_promo(db: AsyncSession, code: str) -> Promotion | None:
    now = datetime.now(timezone.utc)
    promo = (await db.execute(
        select(Promotion).where(
            Promotion.code == code.upper(),
            Promotion.is_active == True,
            Promotion.valid_from <= now,
            Promotion.valid_until >= now,
        )
    )).scalar_one_or_none()
    if not promo:
        return None
    if promo.usage_limit and promo.used_count >= promo.usage_limit:
        return None
    return promo


async def create_reservation(data: ReservationCreate, guest: User, db: AsyncSession) -> Reservation:
    now = datetime.now(timezone.utc)
    check_in = datetime.fromisoformat(data.check_in_date).replace(tzinfo=timezone.utc)
    check_out = datetime.fromisoformat(data.check_out_date).replace(tzinfo=timezone.utc)

    if check_in >= check_out:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    if check_in.date() < now.date():
        raise HTTPException(status_code=400, detail="Check-in must be today or in the future")

    room = (await db.execute(select(Room).where(Room.id == data.room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Cancel any existing pending reservation from this guest for the same room+dates
    # so they can re-book (e.g. after a failed payment attempt)
    existing_pending = (await db.execute(
        select(Reservation).where(
            Reservation.guest_id == guest.id,
            Reservation.room_id == data.room_id,
            Reservation.status == ReservationStatus.pending,
        )
    )).scalars().all()
    for old in existing_pending:
        old.status = ReservationStatus.cancelled
    if existing_pending:
        await db.flush()

    if not await is_room_available(db, data.room_id, check_in, check_out):
        raise HTTPException(status_code=409, detail="Room is not available for these dates")

    discount_percent = 0.0
    if data.promo_code:
        promo = await validate_promo(db, data.promo_code)
        if not promo:
            raise HTTPException(status_code=400, detail="Invalid or expired promo code")
        discount_percent = float(promo.discount_percent)
        promo.used_count += 1

    nights = count_nights(check_in, check_out)
    price = float(room.price_per_night)
    subtotal = calc_subtotal(price, nights)
    discount_amount = calc_discount(subtotal, discount_percent)
    tax_amount = calc_tax(subtotal, discount_amount, settings.TAX_RATE)
    total_amount = calc_total(subtotal, discount_amount, tax_amount)

    # Unique reference
    ref = generate_reference()
    while (await db.execute(select(Reservation).where(Reservation.reference == ref))).scalar_one_or_none():
        ref = generate_reference()

    reservation = Reservation(
        reference=ref,
        guest_id=guest.id,
        room_id=data.room_id,
        check_in=check_in,
        check_out=check_out,
        num_guests=data.num_guests,
        status=ReservationStatus.pending,
        promo_code=data.promo_code,
        discount_percent=discount_percent,
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        special_requests=data.special_requests,
    )
    db.add(reservation)
    await db.flush()
    await db.refresh(reservation)
    return reservation


async def cancel_reservation(reservation_id: int, guest: User, db: AsyncSession) -> Reservation:
    reservation = (await db.execute(select(Reservation).where(Reservation.id == reservation_id))).scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if guest.role == UserRole.guest and reservation.guest_id != guest.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if reservation.status in (ReservationStatus.cancelled, ReservationStatus.checked_out):
        raise HTTPException(status_code=400, detail="Cannot cancel this reservation")
    reservation.status = ReservationStatus.cancelled
    await db.flush()

    # Re-select with explicit selectinload so Pydantic can read all attributes
    # synchronously without triggering a lazy async fetch.
    # (flush expires server-side onupdate columns like updated_at, and
    #  db.refresh() alone would expire relationships — a fresh select avoids both.)
    fresh = (await db.execute(
        select(Reservation)
        .where(Reservation.id == reservation_id)
        .options(
            selectinload(Reservation.room),
            selectinload(Reservation.guest),
            selectinload(Reservation.payment),
            selectinload(Reservation.feedback),
        )
    )).scalar_one()
    return fresh
