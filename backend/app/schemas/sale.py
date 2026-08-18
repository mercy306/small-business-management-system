from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.sale import SaleStatus
from app.models.payment import PaymentMethod


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal
    discount: Decimal = Decimal("0.00")


class SaleItemOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    cost_price: Decimal
    discount: Decimal
    total: Decimal

    model_config = {"from_attributes": True}


class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    items: List[SaleItemCreate]
    discount: Decimal = Decimal("0.00")
    amount_paid: Decimal
    payment_method: PaymentMethod = PaymentMethod.cash
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class SaleOut(BaseModel):
    id: int
    business_id: int
    customer_id: Optional[int]
    cashier_id: int
    invoice_number: str
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    status: SaleStatus
    notes: Optional[str]
    created_at: datetime
    items: List[SaleItemOut] = []

    model_config = {"from_attributes": True}


class SaleCancel(BaseModel):
    reason: Optional[str] = None
