from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.expense import Expense
from app.models.payment import Payment
from app.schemas.expense_payment import (
    ExpenseCreate, ExpenseUpdate, ExpenseOut,
    PaymentCreate, PaymentOut,
)
from app.utils.response import ok, err
from app.utils.audit import log_action

router = APIRouter(tags=["expenses_payments"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Expenses ──────────────────────────────────────────────────────────────

@router.get("/api/expenses", response_model=dict)
async def list_expenses(
    current_user: CurrentUser, db: DB,
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
):
    query = select(Expense).where(Expense.business_id == current_user.business_id)
    if category:
        query = query.where(Expense.category == category)
    query = query.order_by(Expense.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return ok([ExpenseOut.model_validate(e).model_dump() for e in result.scalars().all()])


@router.get("/api/expenses/{eid}", response_model=dict)
async def get_expense(eid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Expense).where(Expense.id == eid, Expense.business_id == current_user.business_id)
    )
    e = result.scalar_one_or_none()
    return ok(ExpenseOut.model_validate(e).model_dump()) if e else err("Expense not found", "NOT_FOUND", 404)


@router.post("/api/expenses", response_model=dict,
             dependencies=[Depends(require_permission("expenses:write"))])
async def create_expense(payload: ExpenseCreate, current_user: CurrentUser, db: DB):
    e = Expense(
        business_id=current_user.business_id,
        created_by=current_user.id,
        **payload.model_dump(),
    )
    db.add(e)
    await db.flush()
    await log_action(db, current_user.business_id, current_user.id, "CREATE", "expense", e.id,
                     {"amount": float(e.amount), "category": e.category})
    await db.commit()
    await db.refresh(e)
    return ok(ExpenseOut.model_validate(e).model_dump(), "Expense recorded", 201)


@router.put("/api/expenses/{eid}", response_model=dict,
            dependencies=[Depends(require_permission("expenses:write"))])
async def update_expense(eid: int, payload: ExpenseUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Expense).where(Expense.id == eid, Expense.business_id == current_user.business_id)
    )
    e = result.scalar_one_or_none()
    if not e:
        return err("Expense not found", "NOT_FOUND", 404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    await db.commit()
    await db.refresh(e)
    return ok(ExpenseOut.model_validate(e).model_dump())


@router.delete("/api/expenses/{eid}", response_model=dict,
               dependencies=[Depends(require_permission("expenses:delete"))])
async def delete_expense(eid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Expense).where(Expense.id == eid, Expense.business_id == current_user.business_id)
    )
    e = result.scalar_one_or_none()
    if not e:
        return err("Expense not found", "NOT_FOUND", 404)
    await db.delete(e)
    await db.commit()
    return ok(message="Expense deleted")


# ── Payments ──────────────────────────────────────────────────────────────

@router.get("/api/payments", response_model=dict)
async def list_payments(
    current_user: CurrentUser, db: DB,
    sale_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
):
    query = select(Payment).where(Payment.business_id == current_user.business_id)
    if sale_id:
        query = query.where(Payment.sale_id == sale_id)
    if customer_id:
        query = query.where(Payment.customer_id == customer_id)
    query = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return ok([PaymentOut.model_validate(p).model_dump() for p in result.scalars().all()])


@router.post("/api/payments", response_model=dict,
             dependencies=[Depends(require_permission("payments:write"))])
async def create_payment(payload: PaymentCreate, current_user: CurrentUser, db: DB):
    p = Payment(
        business_id=current_user.business_id,
        received_by=current_user.id,
        **payload.model_dump(),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return ok(PaymentOut.model_validate(p).model_dump(), "Payment recorded", 201)
