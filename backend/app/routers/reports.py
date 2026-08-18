from decimal import Decimal
from typing import Annotated, Optional
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.sale import Sale, SaleStatus
from app.models.sale_item import SaleItem
from app.models.expense import Expense
from app.models.product import Product
from app.models.category import Category
from app.utils.response import ok

router = APIRouter(prefix="/api/reports", tags=["reports"],
                   dependencies=[Depends(require_permission("reports:read"))])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def parse_date(d: Optional[str], default: date) -> date:
    if d:
        return date.fromisoformat(d)
    return default


@router.get("/sales", response_model=dict)
async def sales_report(
    current_user: CurrentUser, db: DB,
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    bid = current_user.business_id
    from_dt = datetime.combine(parse_date(date_from, date.today().replace(day=1)), datetime.min.time()).replace(tzinfo=timezone.utc)
    to_dt = datetime.combine(parse_date(date_to, date.today()), datetime.max.time()).replace(tzinfo=timezone.utc)

    result = await db.execute(
        select(
            func.date(Sale.created_at).label("sale_date"),
            func.count(Sale.id).label("transactions"),
            func.coalesce(func.sum(Sale.total), 0).label("total_sales"),
        )
        .where(and_(
            Sale.business_id == bid,
            Sale.status == SaleStatus.completed,
            Sale.created_at >= from_dt,
            Sale.created_at <= to_dt,
        ))
        .group_by(func.date(Sale.created_at))
        .order_by(func.date(Sale.created_at))
    )
    rows = result.all()
    return ok([
        {"date": str(r.sale_date), "transactions": r.transactions, "total_sales": float(r.total_sales)}
        for r in rows
    ])


@router.get("/profit-loss", response_model=dict)
async def profit_loss_report(
    current_user: CurrentUser, db: DB,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    bid = current_user.business_id
    from_dt = datetime.combine(parse_date(date_from, date.today().replace(day=1)), datetime.min.time()).replace(tzinfo=timezone.utc)
    to_dt = datetime.combine(parse_date(date_to, date.today()), datetime.max.time()).replace(tzinfo=timezone.utc)

    # Revenue
    rev_result = await db.execute(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed,
                 Sale.created_at >= from_dt, Sale.created_at <= to_dt)
        )
    )
    total_revenue = Decimal(str(rev_result.scalar()))

    # COGS (sum of cost_price * quantity in sale items)
    cogs_result = await db.execute(
        select(func.coalesce(func.sum(SaleItem.cost_price * SaleItem.quantity), 0))
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(
            and_(Sale.business_id == bid, Sale.status == SaleStatus.completed,
                 Sale.created_at >= from_dt, Sale.created_at <= to_dt)
        )
    )
    total_cogs = Decimal(str(cogs_result.scalar()))

    # Expenses
    exp_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            and_(Expense.business_id == bid,
                 Expense.created_at >= from_dt, Expense.created_at <= to_dt)
        )
    )
    total_expenses = Decimal(str(exp_result.scalar()))

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_expenses

    return ok({
        "period": f"{date_from or 'month-start'} to {date_to or 'today'}",
        "total_revenue": float(total_revenue),
        "total_cogs": float(total_cogs),
        "gross_profit": float(gross_profit),
        "total_expenses": float(total_expenses),
        "net_profit": float(net_profit),
    })


@router.get("/inventory", response_model=dict)
async def inventory_report(current_user: CurrentUser, db: DB):
    bid = current_user.business_id
    result = await db.execute(
        select(Product, Category)
        .outerjoin(Category, Product.category_id == Category.id)
        .where(and_(Product.business_id == bid, Product.is_active == True))
        .order_by(Product.name)
    )
    rows = result.all()
    items = []
    for product, category in rows:
        items.append({
            "product_id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": category.name if category else None,
            "stock_quantity": product.stock_quantity,
            "cost_price": float(product.cost_price),
            "selling_price": float(product.selling_price),
            "stock_value": float(product.cost_price * product.stock_quantity),
            "is_low_stock": product.stock_quantity <= product.minimum_stock,
        })
    return ok(items)


@router.get("/expenses", response_model=dict)
async def expenses_report(
    current_user: CurrentUser, db: DB,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    bid = current_user.business_id
    from_dt = datetime.combine(parse_date(date_from, date.today().replace(day=1)), datetime.min.time()).replace(tzinfo=timezone.utc)
    to_dt = datetime.combine(parse_date(date_to, date.today()), datetime.max.time()).replace(tzinfo=timezone.utc)

    result = await db.execute(
        select(
            Expense.category,
            func.count(Expense.id).label("count"),
            func.sum(Expense.amount).label("total"),
        )
        .where(and_(Expense.business_id == bid,
                    Expense.created_at >= from_dt, Expense.created_at <= to_dt))
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    )
    rows = result.all()
    return ok([{"category": r.category, "count": r.count, "total": float(r.total)} for r in rows])
