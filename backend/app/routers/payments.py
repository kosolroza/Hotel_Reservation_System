import json
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import process_payment
from app.dependencies import get_current_user
from app.utils.file_utils import save_upload_file

router = APIRouter(prefix="/payments", tags=["Payments"])


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

    # Store both slip path and transaction ref as JSON in the notes field
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
    return await process_payment(data, db)


@router.get("/my", response_model=List[dict])
async def get_my_payments(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return all payments for the current guest, with reservation & room info embedded."""
    payments = (await db.execute(
        select(Payment)
        .join(Reservation, Reservation.id == Payment.reservation_id)
        .where(Reservation.guest_id == current_user.id)
        .order_by(Payment.created_at.desc())
    )).scalars().all()

    result = []
    for p in payments:
        d = PaymentResponse.model_validate(p).model_dump()
        r = p.reservation
        if r:
            d["booking_reference"] = r.reference
            d["check_in_date"] = r.check_in.isoformat() if r.check_in else None
            d["check_out_date"] = r.check_out.isoformat() if r.check_out else None
            if r.room:
                d["room_number"] = r.room.room_number
                d["room_type_name"] = r.room.room_type.name if r.room.room_type else None
        result.append(d)
    return result


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return PaymentResponse.model_validate(p)
