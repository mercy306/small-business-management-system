from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.schemas.customer_supplier import (
    CustomerCreate, CustomerUpdate, CustomerOut,
    SupplierCreate, SupplierUpdate, SupplierOut,
)
from app.utils.response import ok, err
from app.utils.audit import log_action

router = APIRouter(tags=["customers_suppliers"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Customers ──────────────────────────────────────────────────────────────

@router.get("/api/customers", response_model=dict)
async def list_customers(
    current_user: CurrentUser, db: DB,
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
):
    query = select(Customer).where(Customer.business_id == current_user.business_id)
    if search:
        query = query.where(Customer.name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return ok([CustomerOut.model_validate(c).model_dump() for c in result.scalars().all()])


@router.get("/api/customers/{cid}", response_model=dict)
async def get_customer(cid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Customer).where(Customer.id == cid, Customer.business_id == current_user.business_id)
    )
    c = result.scalar_one_or_none()
    return ok(CustomerOut.model_validate(c).model_dump()) if c else err("Customer not found", "NOT_FOUND", 404)


@router.post("/api/customers", response_model=dict,
             dependencies=[Depends(require_permission("customers:write"))])
async def create_customer(payload: CustomerCreate, current_user: CurrentUser, db: DB):
    c = Customer(business_id=current_user.business_id, **payload.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return ok(CustomerOut.model_validate(c).model_dump(), "Customer created", 201)


@router.put("/api/customers/{cid}", response_model=dict,
            dependencies=[Depends(require_permission("customers:write"))])
async def update_customer(cid: int, payload: CustomerUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Customer).where(Customer.id == cid, Customer.business_id == current_user.business_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        return err("Customer not found", "NOT_FOUND", 404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return ok(CustomerOut.model_validate(c).model_dump())


@router.delete("/api/customers/{cid}", response_model=dict,
               dependencies=[Depends(require_permission("customers:delete"))])
async def delete_customer(cid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Customer).where(Customer.id == cid, Customer.business_id == current_user.business_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        return err("Customer not found", "NOT_FOUND", 404)
    await db.delete(c)
    await db.commit()
    return ok(message="Customer deleted")


# ── Suppliers ──────────────────────────────────────────────────────────────

@router.get("/api/suppliers", response_model=dict)
async def list_suppliers(
    current_user: CurrentUser, db: DB,
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
):
    query = select(Supplier).where(Supplier.business_id == current_user.business_id)
    if search:
        query = query.where(Supplier.name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return ok([SupplierOut.model_validate(s).model_dump() for s in result.scalars().all()])


@router.get("/api/suppliers/{sid}", response_model=dict)
async def get_supplier(sid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Supplier).where(Supplier.id == sid, Supplier.business_id == current_user.business_id)
    )
    s = result.scalar_one_or_none()
    return ok(SupplierOut.model_validate(s).model_dump()) if s else err("Supplier not found", "NOT_FOUND", 404)


@router.post("/api/suppliers", response_model=dict,
             dependencies=[Depends(require_permission("suppliers:write"))])
async def create_supplier(payload: SupplierCreate, current_user: CurrentUser, db: DB):
    s = Supplier(business_id=current_user.business_id, **payload.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return ok(SupplierOut.model_validate(s).model_dump(), "Supplier created", 201)


@router.put("/api/suppliers/{sid}", response_model=dict,
            dependencies=[Depends(require_permission("suppliers:write"))])
async def update_supplier(sid: int, payload: SupplierUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Supplier).where(Supplier.id == sid, Supplier.business_id == current_user.business_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        return err("Supplier not found", "NOT_FOUND", 404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return ok(SupplierOut.model_validate(s).model_dump())


@router.delete("/api/suppliers/{sid}", response_model=dict,
               dependencies=[Depends(require_permission("suppliers:delete"))])
async def delete_supplier(sid: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Supplier).where(Supplier.id == sid, Supplier.business_id == current_user.business_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        return err("Supplier not found", "NOT_FOUND", 404)
    await db.delete(s)
    await db.commit()
    return ok(message="Supplier deleted")
