from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import String, ForeignKey, DateTime, Numeric, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ShiftStatus(str, Enum):
    open = "open"
    closed = "closed"


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    starting_cash: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    ending_cash: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    expected_cash: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    cash_difference: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    status: Mapped[ShiftStatus] = mapped_column(
        SQLEnum(ShiftStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=ShiftStatus.open,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    user: Mapped["User"] = relationship("User")
