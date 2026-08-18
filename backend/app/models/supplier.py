from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500))
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="suppliers")
    inventory_transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        primaryjoin="and_(InventoryTransaction.reference_type == 'supplier', "
                    "foreign(InventoryTransaction.reference_id) == Supplier.id)",
        viewonly=True,
        overlaps="inventory_transactions",
    )
