from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.shift import Shift, ShiftStatus
from app.models.sale import Sale
from app.models.payment import Payment, PaymentMethod
from app.schemas.shift import ShiftOpenRequest, ShiftCloseRequest, ShiftOut
from app.utils.response import ok, err
from app.utils.audit import log_action

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/current", response_model=dict)
async def get_current_shift(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Shift)
        .options(selectinload(Shift.user))
        .where(
            Shift.business_id == current_user.business_id,
            Shift.user_id == current_user.id,
            Shift.status == ShiftStatus.open,
        )
        .order_by(Shift.opened_at.desc())
    )
    shift = result.scalar_one_or_none()
    if not shift:
        return ok(None, "No active shift")
    return ok(ShiftOut.model_validate(shift).model_dump())


@router.post("/open", response_model=dict)
async def open_shift(payload: ShiftOpenRequest, current_user: CurrentUser, db: DB):
    # Check if user already has an active open shift
    existing = await db.execute(
        select(Shift).where(
            Shift.business_id == current_user.business_id,
            Shift.user_id == current_user.id,
            Shift.status == ShiftStatus.open,
        )
    )
    if existing.scalar_one_or_none():
        return err("You already have an active open shift. Please close it first.", "SHIFT_ALREADY_OPEN", 400)

    shift = Shift(
        business_id=current_user.business_id,
        user_id=current_user.id,
        starting_cash=payload.starting_cash,
        notes=payload.notes,
        status=ShiftStatus.open,
    )
    db.add(shift)
    await db.flush()
    await log_action(db, current_user.business_id, current_user.id, "OPEN", "shift", shift.id)
    await db.commit()

    # Re-fetch with user relationship
    result = await db.execute(
        select(Shift).options(selectinload(Shift.user)).where(Shift.id == shift.id)
    )
    shift = result.scalar_one()
    return ok(ShiftOut.model_validate(shift).model_dump(), "Shift opened successfully", 201)


@router.post("/{shift_id}/close", response_model=dict)
async def close_shift(shift_id: int, payload: ShiftCloseRequest, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Shift)
        .options(selectinload(Shift.user))
        .where(
            Shift.id == shift_id,
            Shift.business_id == current_user.business_id,
        )
    )
    shift = result.scalar_one_or_none()
    if not shift:
        return err("Shift not found", "NOT_FOUND", 404)
    if shift.status == ShiftStatus.closed:
        return err("This shift is already closed", "SHIFT_ALREADY_CLOSED", 400)

    # Calculate cash collected during this shift
    now = datetime.now(timezone.utc)
    cash_sales_res = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.business_id == current_user.business_id,
            Sale.created_by == shift.user_id,
            Payment.payment_method == PaymentMethod.cash,
            Sale.created_at >= shift.opened_at,
            Sale.created_at <= now,
        )
    )
    cash_collected = Decimal(str(cash_sales_res.scalar() or "0.00"))
    expected_cash = shift.starting_cash + cash_collected
    cash_diff = payload.ending_cash - expected_cash

    shift.closed_at = now
    shift.ending_cash = payload.ending_cash
    shift.expected_cash = expected_cash
    shift.cash_difference = cash_diff
    shift.status = ShiftStatus.closed
    if payload.notes:
        shift.notes = (shift.notes or "") + f" | Close: {payload.notes}"

    await log_action(db, current_user.business_id, current_user.id, "CLOSE", "shift", shift.id, {
        "expected": float(expected_cash),
        "actual": float(payload.ending_cash),
        "difference": float(cash_diff),
    })
    await db.commit()

    return ok(ShiftOut.model_validate(shift).model_dump(), "Shift closed successfully")


@router.get("", response_model=dict)
async def list_shifts(
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    result = await db.execute(
        select(Shift)
        .options(selectinload(Shift.user))
        .where(Shift.business_id == current_user.business_id)
        .order_by(Shift.opened_at.desc())
        .offset(skip)
        .limit(limit)
    )
    shifts = result.scalars().all()
    return ok([ShiftOut.model_validate(s).model_dump() for s in shifts])
