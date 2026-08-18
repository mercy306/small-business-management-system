from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.product import Product
from app.models.inventory import InventoryTransaction, TransactionType
from app.schemas.inventory import InventoryTransactionCreate, InventoryTransactionOut, InventoryOverviewItem
from app.utils.response import ok, err
from app.utils.audit import log_action

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=dict)
async def get_inventory_overview(
    current_user: CurrentUser,
    db: DB,
    low_stock_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
):
    query = select(Product).where(
        and_(Product.business_id == current_user.business_id, Product.is_active == True)
    )
    if low_stock_only:
        query = query.where(Product.stock_quantity <= Product.minimum_stock)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()

    items = [
        InventoryOverviewItem(
            product_id=p.id,
            name=p.name,
            sku=p.sku,
            stock_quantity=p.stock_quantity,
            minimum_stock=p.minimum_stock,
            unit=p.unit,
            is_low_stock=p.stock_quantity <= p.minimum_stock,
        )
        for p in products
    ]
    return ok([i.model_dump() for i in items])


@router.post("/transactions", response_model=dict,
             dependencies=[Depends(require_permission("inventory:write"))])
async def create_inventory_transaction(
    payload: InventoryTransactionCreate,
    current_user: CurrentUser,
    db: DB,
):
    # Fetch product
    prod_result = await db.execute(
        select(Product).where(
            Product.id == payload.product_id,
            Product.business_id == current_user.business_id,
        )
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        return err("Product not found", "NOT_FOUND", 404)

    # Validate stock for outgoing transactions
    if payload.type in (TransactionType.stock_out, TransactionType.adjustment) and payload.quantity < 0:
        new_qty = product.stock_quantity + payload.quantity
        if new_qty < 0:
            return err(
                f"Insufficient stock. Available: {product.stock_quantity}",
                "INSUFFICIENT_STOCK",
                400,
            )

    # Apply the stock change
    product.stock_quantity += payload.quantity

    tx = InventoryTransaction(
        business_id=current_user.business_id,
        product_id=payload.product_id,
        type=payload.type,
        quantity=payload.quantity,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        note=payload.note,
        created_by=current_user.id,
    )
    db.add(tx)
    await db.flush()
    await log_action(
        db, current_user.business_id, current_user.id,
        "INVENTORY_TX", "product", product.id,
        {"type": payload.type, "qty": payload.quantity},
    )
    await db.commit()
    await db.refresh(tx)
    return ok(InventoryTransactionOut.model_validate(tx).model_dump(), "Transaction recorded", 201)


@router.get("/transactions", response_model=dict)
async def list_inventory_transactions(
    current_user: CurrentUser,
    db: DB,
    product_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
):
    query = select(InventoryTransaction).where(
        InventoryTransaction.business_id == current_user.business_id
    )
    if product_id:
        query = query.where(InventoryTransaction.product_id == product_id)
    query = query.order_by(InventoryTransaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    txs = result.scalars().all()
    return ok([InventoryTransactionOut.model_validate(t).model_dump() for t in txs])
