from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class DashboardStats(BaseModel):
    today_sales: Decimal
    today_expenses: Decimal
    today_profit: Decimal
    today_transactions: int
    total_products: int
    low_stock_count: int
    total_customers: int


class LowStockItem(BaseModel):
    id: int
    name: str
    stock_quantity: int
    minimum_stock: int
    unit: str


class RecentSale(BaseModel):
    id: int
    invoice_number: str
    total: Decimal
    customer_name: Optional[str]
    created_at: str


class TopProduct(BaseModel):
    product_id: int
    name: str
    total_quantity: int
    total_revenue: Decimal


class DashboardResponse(BaseModel):
    stats: DashboardStats
    low_stock: List[LowStockItem]
    recent_sales: List[RecentSale]
    top_products: List[TopProduct]


# ── Reports ───────────────────────────────────────────────────────────────

class SalesReportItem(BaseModel):
    date: str
    total_sales: Decimal
    total_transactions: int
    total_profit: Decimal


class ProfitLossSummary(BaseModel):
    period: str
    total_revenue: Decimal
    total_cogs: Decimal
    gross_profit: Decimal
    total_expenses: Decimal
    net_profit: Decimal


class InventoryReportItem(BaseModel):
    product_id: int
    name: str
    sku: Optional[str]
    category: Optional[str]
    stock_quantity: int
    cost_price: Decimal
    selling_price: Decimal
    stock_value: Decimal
