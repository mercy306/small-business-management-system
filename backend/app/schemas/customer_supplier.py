from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr


# ── Customer ──────────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    credit_limit: Decimal = Decimal("0.00")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    credit_limit: Optional[Decimal] = None


class CustomerOut(CustomerBase):
    id: int
    business_id: int
    balance: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Supplier ──────────────────────────────────────────────────────────────

class SupplierBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class SupplierOut(SupplierBase):
    id: int
    business_id: int
    balance: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
