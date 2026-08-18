from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.sale import Sale, SaleStatus
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.payment import Payment, PaymentMethod
from app.models.inventory import InventoryTransaction, TransactionType
from app.models.customer import Customer
from app.models.business import Business
from app.schemas.sale import SaleCreate, SaleOut, SaleCancel
from app.utils.response import ok, err
from app.utils.invoice import generate_invoice_number
from app.utils.audit import log_action
from app.utils.email import send_receipt_email
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/sales", tags=["sales"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=dict)
async def list_sales(
    current_user: CurrentUser,
    db: DB,
    status: Optional[SaleStatus] = Query(None),
    customer_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
):
    query = (
        select(Sale)
        .options(selectinload(Sale.items).selectinload(SaleItem.product))
        .where(Sale.business_id == current_user.business_id)
    )
    if status:
        query = query.where(Sale.status == status)
    if customer_id:
        query = query.where(Sale.customer_id == customer_id)
    query = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    sales = result.scalars().all()
    return ok([SaleOut.model_validate(s).model_dump() for s in sales])


@router.get("/{sale_id}", response_model=dict)
async def get_sale(sale_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items).selectinload(SaleItem.product))
        .where(Sale.id == sale_id, Sale.business_id == current_user.business_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        return err("Sale not found", "NOT_FOUND", 404)

    sale_dict = SaleOut.model_validate(sale).model_dump()
    # Enrich items with product name
    sale_dict["items"] = [
        {**SaleOut.model_fields["items"].default, **{
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else None,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "cost_price": float(item.cost_price),
            "discount": float(item.discount),
            "total": float(item.total),
        }}
        for item in sale.items
    ]
    return ok(sale_dict)


@router.post("", response_model=dict,
             dependencies=[Depends(require_permission("sales:write"))])
async def create_sale(payload: SaleCreate, current_user: CurrentUser, db: DB):
    # Fetch business for tax rate
    biz_result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = biz_result.scalar_one()

    # Validate all products and stock in one pass
    subtotal = Decimal("0.00")
    items_data = []

    for item_in in payload.items:
        prod_result = await db.execute(
            select(Product).where(
                Product.id == item_in.product_id,
                Product.business_id == current_user.business_id,
                Product.is_active == True,
            )
        )
        product = prod_result.scalar_one_or_none()
        if not product:
            return err(f"Product {item_in.product_id} not found", "PRODUCT_NOT_FOUND", 404)

        if product.stock_quantity < item_in.quantity:
            return err(
                f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}",
                "INSUFFICIENT_STOCK",
                400,
            )

        line_total = (item_in.unit_price * item_in.quantity) - item_in.discount
        subtotal += line_total
        items_data.append((product, item_in, line_total))

    # Calculate totals
    taxable = subtotal - payload.discount
    tax = (taxable * business.tax_rate / 100).quantize(Decimal("0.01"))
    total = taxable + tax
    balance_due = max(total - payload.amount_paid, Decimal("0.00"))

    # Generate unique invoice number
    invoice_number = generate_invoice_number()

    # Create sale
    sale = Sale(
        business_id=current_user.business_id,
        customer_id=payload.customer_id,
        cashier_id=current_user.id,
        invoice_number=invoice_number,
        subtotal=subtotal,
        discount=payload.discount,
        tax=tax,
        total=total,
        amount_paid=payload.amount_paid,
        balance_due=balance_due,
        status=SaleStatus.completed,
        notes=payload.notes,
    )
    db.add(sale)
    await db.flush()

    # Create sale items + deduct inventory
    for product, item_in, line_total in items_data:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=item_in.unit_price,
            cost_price=product.cost_price,
            discount=item_in.discount,
            total=line_total,
        )
        db.add(sale_item)

        # Deduct stock
        product.stock_quantity -= item_in.quantity

        # Record inventory transaction
        inv_tx = InventoryTransaction(
            business_id=current_user.business_id,
            product_id=product.id,
            type=TransactionType.sale,
            quantity=-item_in.quantity,
            reference_type="sale",
            reference_id=sale.id,
            created_by=current_user.id,
        )
        db.add(inv_tx)

    # Record payment
    payment = Payment(
        business_id=current_user.business_id,
        sale_id=sale.id,
        customer_id=payload.customer_id,
        amount=payload.amount_paid,
        method=payload.payment_method,
        reference=payload.payment_reference,
        received_by=current_user.id,
    )
    db.add(payment)

    # Update customer balance if credit sale
    if payload.customer_id and balance_due > 0:
        cust_result = await db.execute(select(Customer).where(Customer.id == payload.customer_id))
        customer = cust_result.scalar_one_or_none()
        if customer:
            customer.balance += balance_due

    await log_action(db, current_user.business_id, current_user.id, "CREATE", "sale", sale.id,
                     {"invoice": invoice_number, "total": float(total)})
    await db.commit()
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items).selectinload(SaleItem.product))
        .where(Sale.id == sale.id)
    )
    sale = result.scalar_one()
    return ok(SaleOut.model_validate(sale).model_dump(), "Sale created successfully", 201)


@router.post("/{sale_id}/cancel", response_model=dict,
             dependencies=[Depends(require_permission("sales:cancel"))])
async def cancel_sale(sale_id: int, payload: SaleCancel, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Sale).options(selectinload(Sale.items))
        .where(Sale.id == sale_id, Sale.business_id == current_user.business_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        return err("Sale not found", "NOT_FOUND", 404)
    if sale.status != SaleStatus.completed:
        return err("Only completed sales can be cancelled", "INVALID_STATUS", 400)

    sale.status = SaleStatus.cancelled

    # Reverse inventory
    for item in sale.items:
        prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = prod_result.scalar_one_or_none()
        if product:
            product.stock_quantity += item.quantity
            db.add(InventoryTransaction(
                business_id=current_user.business_id,
                product_id=item.product_id,
                type=TransactionType.return_,
                quantity=item.quantity,
                reference_type="sale_cancel",
                reference_id=sale.id,
                note=payload.reason,
                created_by=current_user.id,
            ))

    await log_action(db, current_user.business_id, current_user.id, "CANCEL", "sale", sale.id,
                     {"reason": payload.reason})
    await db.commit()
    return ok(message="Sale cancelled and inventory reversed")


# ── Send Email Receipt ─────────────────────────────────────────────────────

class SendReceiptRequest(BaseModel):
    email: str


@router.post("/{sale_id}/send-receipt", response_model=dict)
async def send_receipt(sale_id: int, payload: SendReceiptRequest, current_user: CurrentUser, db: DB):
    # Load sale with items
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items).selectinload(SaleItem.product))
        .where(Sale.id == sale_id, Sale.business_id == current_user.business_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        return err("Sale not found", "NOT_FOUND", 404)

    # Load business name
    biz = await db.get(Business, current_user.business_id)
    business_name = biz.name if biz else "Your Business"

    sale_dict = {
        "invoice_number": sale.invoice_number,
        "created_at": str(sale.created_at),
        "payment_method": sale.payment_method,
        "total_amount": float(sale.total_amount),
        "discount_amount": float(sale.discount_amount or 0),
        "tax_amount": float(sale.tax_amount or 0),
    }
    items_list = [
        {
            "product_name": item.product.name if item.product else "Item",
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.subtotal),
        }
        for item in sale.items
    ]

    try:
        await send_receipt_email(
            to_email=payload.email,
            sale=sale_dict,
            items=items_list,
            business_name=business_name,
        )
        return ok(message=f"Receipt sent to {payload.email}")
    except ValueError as e:
        return err(str(e), "SMTP_NOT_CONFIGURED", 503)
    except Exception as e:
        return err(f"Failed to send email: {str(e)}", "EMAIL_ERROR", 500)
