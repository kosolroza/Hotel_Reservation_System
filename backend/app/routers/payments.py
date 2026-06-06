import json
import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentWithBookingResponse
from app.services.payment_service import process_payment
from app.dependencies import get_current_user
from app.utils.file_utils import save_upload_file
from app.services.telegram_service import send_receipt_to_admin
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])



async def _notify_telegram(
    payment_id: int,
    reservation_ref: str,
    guest_name: str,
    amount: float,
    slip_url: str,
    slip_local_path: str,
) -> None:
    """Fire-and-forget Telegram notification — runs after the HTTP response is returned."""
    try:
        await send_receipt_to_admin(
            payment_id=payment_id,
            reservation_ref=reservation_ref,
            guest_name=guest_name,
            amount=amount,
            slip_url=slip_url,
            slip_local_path=slip_local_path,
        )
    except Exception as exc:
        logger.warning("Telegram notification failed: %s", exc)


@router.post("", response_model=PaymentResponse, status_code=201)
async def create_payment(
    booking_id: int = Form(...),
    transaction_reference: Optional[str] = Form(None),
    slip_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slip_path: Optional[str] = None
    if slip_image and slip_image.filename:
        slip_path = await save_upload_file(slip_image, folder="payment_slips")

    notes_data: dict = {}
    if slip_path:
        notes_data["slip"] = slip_path
    if transaction_reference:
        notes_data["ref"] = transaction_reference

    data = PaymentCreate(
        reservation_id=booking_id,
        slip_image=slip_path,
        transaction_ref=json.dumps(notes_data) if notes_data else None,
    )
    payment = await process_payment(data, db)

    # ── Schedule Telegram notification as a background task ──────────
    # We collect all data from the DB BEFORE returning, then schedule the
    # Telegram call with asyncio.create_task so it runs AFTER the response
    # is sent. This prevents Telegram API latency from causing 502 timeouts.
    if slip_path:
        try:
            reservation = (await db.execute(
                select(Reservation)
                .where(Reservation.id == payment.reservation_id)
                .options(selectinload(Reservation.guest))
            )).scalar_one_or_none()

            if reservation and reservation.guest:
                guest_name = f"{reservation.guest.first_name} {reservation.guest.last_name}"
                slip_url = f"{settings.BACKEND_URL.rstrip('/')}{slip_path}"
                # schedule — does NOT block the response
                asyncio.create_task(_notify_telegram(
                    payment_id=payment.id,
                    reservation_ref=reservation.reference,
                    guest_name=guest_name,
                    amount=float(payment.amount),
                    slip_url=slip_url,
                    slip_local_path=slip_path,
                ))
        except Exception as exc:
            logger.warning("Could not schedule Telegram notification: %s", exc)
    # ─────────────────────────────────────────────────────────────────

    return PaymentResponse.model_validate(payment)


@router.get("/my", response_model=List[PaymentWithBookingResponse])
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all payments for the logged-in guest, enriched with booking details."""
    rows = (await db.execute(
        select(Payment)
        .join(Reservation, Payment.reservation_id == Reservation.id)
        .where(Reservation.guest_id == current_user.id)
        .options(
            selectinload(Payment.reservation).selectinload(Reservation.room)
        )
        .order_by(Payment.created_at.desc())
    )).scalars().all()

    results: List[PaymentWithBookingResponse] = []
    for p in rows:
        base = PaymentResponse.model_validate(p)
        r = p.reservation
        room = r.room if r else None
        room_type = room.room_type if room else None
        results.append(PaymentWithBookingResponse(
            **base.model_dump(),
            booking_reference=r.reference if r else None,
            check_in_date=r.check_in if r else None,
            check_out_date=r.check_out if r else None,
            room_number=room.room_number if room else None,
            room_type_name=room_type.name if room_type else None,
        ))
    return results


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (
        await db.execute(select(Payment).where(Payment.id == payment_id))
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return p
