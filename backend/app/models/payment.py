from datetime import datetime
from decimal import Decimal
import enum

from sqlalchemy import String, ForeignKey, DateTime, Numeric, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    transfer = "transfer"
    credit = "credit"
    mobile = "mobile"
    other = "other"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    sale_id: Mapped[int | None] = mapped_column(ForeignKey("sales.id"), nullable=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), default=PaymentMethod.cash)
    reference: Mapped[str | None] = mapped_column(String(200))  # e.g. cheque/transfer ref
    received_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sale: Mapped["Sale | None"] = relationship("Sale", back_populates="payments")
    customer: Mapped["Customer | None"] = relationship("Customer", back_populates="payments")
    received_by_user: Mapped["User | None"] = relationship("User", back_populates="payments")
