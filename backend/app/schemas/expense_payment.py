from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel

from app.models.payment import PaymentMethod


class ExpenseCreate(BaseModel):
    category: str
    description: Optional[str] = None
    amount: Decimal
    payment_method: str = "cash"
    reference: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    business_id: int
    category: str
    description: Optional[str]
    amount: Decimal
    payment_method: str
    reference: Optional[str]
    created_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Payment ───────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    sale_id: Optional[int] = None
    customer_id: Optional[int] = None
    amount: Decimal
    method: PaymentMethod = PaymentMethod.cash
    reference: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    business_id: int
    sale_id: Optional[int]
    customer_id: Optional[int]
    amount: Decimal
    method: PaymentMethod
    reference: Optional[str]
    received_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
