from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.user import User
from app.schemas.payment import PaymentResponse, PaymentUpdate
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_admin
from app.utils.pagination import paginate, get_offset

router = APIRouter(prefix="/admin/payments", tags=["Admin - Payments"])


def _enrich(p: Payment) -> dict:
    """Add nested booking + guest data to payment dict for the admin table."""
    base = PaymentResponse.model_validate(p).model_dump()
    r = p.reservation
    if r:
        guest = r.guest
        base["booking"] = {
            "id": r.id,
            "booking_reference": r.reference,
            "guest": {
                "id": guest.id if guest else None,
                "first_name": guest.first_name if guest else "",
                "last_name": guest.last_name if guest else "",
                "email": guest.email if guest else "",
            } if guest else None,
        }
    else:
        base["booking"] = None
    return base


@router.get("", response_model=PaginatedResponse)
async def list_payments(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    status: Optional[PaymentStatus] = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin),
):
    stmt = (
        select(Payment)
        .options(
            selectinload(Payment.reservation).selectinload(Reservation.guest),
        )
    )
    count_stmt = select(func.count(Payment.id))
    if status:
        stmt = stmt.where(Payment.status == status)
        count_stmt = count_stmt.where(Payment.status == status)
    total = (await db.execute(count_stmt)).scalar() or 0
    rows = (await db.execute(stmt.order_by(Payment.created_at.desc()).offset(get_offset(page, per_page)).limit(per_page))).scalars().all()
    return paginate([_enrich(p) for p in rows], total, page, per_page)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    return p


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: int, data: PaymentUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    for f, v in data.model_dump(exclude_none=True).items():
        setattr(p, f, v)
    if data.status == PaymentStatus.completed and not p.paid_at:
        p.paid_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(p)
    return PaymentResponse.model_validate(p)


@router.patch("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(payment_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    p.status = PaymentStatus.completed
    p.paid_at = datetime.now(timezone.utc)
    # Confirm the linked reservation
    r = (await db.execute(select(Reservation).where(Reservation.id == p.reservation_id))).scalar_one_or_none()
    if r:
        r.status = ReservationStatus.confirmed
    await db.flush()
    await db.refresh(p)
    return PaymentResponse.model_validate(p)


@router.patch("/{payment_id}/reject", response_model=PaymentResponse)
async def reject_payment(payment_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    p.status = PaymentStatus.failed
    await db.flush()
    await db.refresh(p)
    return PaymentResponse.model_validate(p)


@router.patch("/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(payment_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)):
    p = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    p.status = PaymentStatus.refunded
    await db.flush()
    await db.refresh(p)
    return PaymentResponse.model_validate(p)
