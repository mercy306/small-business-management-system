from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Boolean, ForeignKey, DateTime, Numeric, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(String(1000))
    cost_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    selling_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    minimum_stock: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(50), default="pcs")
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="products")
    category: Mapped["Category | None"] = relationship("Category", back_populates="products")
    inventory_transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction", back_populates="product"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="product")
