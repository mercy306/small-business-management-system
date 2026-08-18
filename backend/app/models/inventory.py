from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Integer, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class TransactionType(str, enum.Enum):
    stock_in = "stock_in"
    stock_out = "stock_out"
    adjustment = "adjustment"
    sale = "sale"
    return_ = "return"


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)  # positive or negative
    reference_type: Mapped[str | None] = mapped_column(String(50))   # e.g. "sale", "purchase"
    reference_id: Mapped[int | None] = mapped_column(Integer)         # FK to sale_id etc.
    note: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_transactions")
    created_by_user: Mapped["User | None"] = relationship(
        "User", back_populates="inventory_transactions"
    )
