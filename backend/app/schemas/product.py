from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(CategoryBase):
    id: int
    business_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Product ──────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    cost_price: Decimal = Decimal("0.00")
    selling_price: Decimal = Decimal("0.00")
    minimum_stock: int = 0
    unit: str = "pcs"
    image_url: Optional[str] = None
    category_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    minimum_stock: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: int
    business_id: int
    stock_quantity: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}
