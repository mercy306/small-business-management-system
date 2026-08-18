from datetime import datetime
from decimal import Decimal
import enum

from sqlalchemy import String, ForeignKey, DateTime, Numeric, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SaleStatus(str, enum.Enum):
    completed = "completed"
    pending = "pending"
    cancelled = "cancelled"
    returned = "returned"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    cashier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    tax: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    balance_due: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    status: Mapped[SaleStatus] = mapped_column(Enum(SaleStatus), default=SaleStatus.completed)
    notes: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="sales")
    customer: Mapped["Customer | None"] = relationship("Customer", back_populates="sales")
    cashier: Mapped["User"] = relationship("User", back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="sale")
