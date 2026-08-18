from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500))
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="customers")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="customer")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="customer")
