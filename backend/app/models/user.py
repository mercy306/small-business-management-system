from datetime import datetime

from sqlalchemy import String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True, unique=True)
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="users")
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="cashier")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="created_by_user")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    inventory_transactions: Mapped[list["InventoryTransaction"]] = relationship(
        "InventoryTransaction", back_populates="created_by_user"
    )
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="received_by_user")
