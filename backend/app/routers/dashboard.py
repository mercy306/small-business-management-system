from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.sale import Sale, SaleStatus
from app.models.expense import Expense
from app.models.product import Product
from app.models.sale_item import SaleItem
from app.models.customer import Customer
from app.utils.response import ok

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=dict)
async def get_dashboard(current_user: CurrentUser, db: DB):
    bid = current_user.business_id
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    today_end = datetime.combine(date.today(), datetime.max.time()).replace(tzinfo=timezone.utc)

    # Today's sales total
    sales_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed,
                 Sale.created_at >= today_start, Sale.created_at <= today_end)
        )
    )
    today_sales = sales_result.scalar()

    # Today's transaction count
    tx_result = await db.execute(
        select(func.count(Sale.id)).where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed,
                 Sale.created_at >= today_start, Sale.created_at <= today_end)
        )
    )
    today_tx = tx_result.scalar()

    # Today's expenses
    exp_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            and_(Expense.business_id == bid,
                 Expense.created_at >= today_start, Expense.created_at <= today_end)
        )
    )
    today_expenses = exp_result.scalar()

    # Total products
    prod_result = await db.execute(
        select(func.count(Product.id)).where(
            and_(Product.business_id == bid, Product.is_active == True)
        )
    )
    total_products = prod_result.scalar()

    # Low stock count
    low_result = await db.execute(
        select(func.count(Product.id)).where(
            and_(Product.business_id == bid, Product.is_active == True,
                 Product.stock_quantity <= Product.minimum_stock)
        )
    )
    low_stock_count = low_result.scalar()

    # Customer count
    cust_result = await db.execute(
        select(func.count(Customer.id)).where(Customer.business_id == bid)
    )
    total_customers = cust_result.scalar()

    # Low stock list (top 10)
    low_products_result = await db.execute(
        select(Product).where(
            and_(Product.business_id == bid, Product.is_active == True,
                 Product.stock_quantity <= Product.minimum_stock)
        ).limit(10)
    )
    low_products = low_products_result.scalars().all()

    # Recent sales (last 10)
    recent_result = await db.execute(
        select(Sale).where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed)
        ).order_by(Sale.created_at.desc()).limit(10)
    )
    recent_sales_rows = recent_result.scalars().all()

    # Top 5 products by quantity today
    top_result = await db.execute(
        select(
            SaleItem.product_id,
            Product.name,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.total).label("total_rev"),
        )
        .join(Product, SaleItem.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed,
                 Sale.created_at >= today_start)
        )
        .group_by(SaleItem.product_id, Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    )
    top_products = top_result.all()

    return ok({
        "stats": {
            "today_sales": float(today_sales),
            "today_expenses": float(today_expenses),
            "today_profit": float(today_sales) - float(today_expenses),
            "today_transactions": today_tx,
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "total_customers": total_customers,
        },
        "low_stock": [
            {
                "id": p.id, "name": p.name,
                "stock_quantity": p.stock_quantity,
                "minimum_stock": p.minimum_stock,
                "unit": p.unit,
            }
            for p in low_products
        ],
        "recent_sales": [
            {
                "id": s.id,
                "invoice_number": s.invoice_number,
                "total": float(s.total),
                "created_at": s.created_at.isoformat(),
            }
            for s in recent_sales_rows
        ],
        "top_products": [
            {
                "product_id": row.product_id,
                "name": row.name,
                "total_quantity": row.total_qty,
                "total_revenue": float(row.total_rev),
            }
            for row in top_products
        ],
    })
