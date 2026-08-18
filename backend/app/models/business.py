from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import String, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500))
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="business")
    categories: Mapped[list["Category"]] = relationship("Category", back_populates="business")
    products: Mapped[list["Product"]] = relationship("Product", back_populates="business")
    customers: Mapped[list["Customer"]] = relationship("Customer", back_populates="business")
    suppliers: Mapped[list["Supplier"]] = relationship("Supplier", back_populates="business")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="business")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="business")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="business")
