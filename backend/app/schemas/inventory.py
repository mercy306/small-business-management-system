from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.inventory import TransactionType


class InventoryTransactionCreate(BaseModel):
    product_id: int
    type: TransactionType
    quantity: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    note: Optional[str] = None


class InventoryTransactionOut(BaseModel):
    id: int
    business_id: int
    product_id: int
    type: TransactionType
    quantity: int
    reference_type: Optional[str]
    reference_id: Optional[int]
    note: Optional[str]
    created_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryOverviewItem(BaseModel):
    product_id: int
    name: str
    sku: Optional[str]
    stock_quantity: int
    minimum_stock: int
    unit: str
    is_low_stock: bool

    model_config = {"from_attributes": True}
