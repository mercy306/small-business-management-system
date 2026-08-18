from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, func, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)   # e.g. "CREATE", "UPDATE", "DELETE"
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "product", "sale"
    entity_id: Mapped[int | None] = mapped_column(Integer)
    details: Mapped[str | None] = mapped_column(Text)  # JSON string of change details
    ip_address: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="audit_logs")
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")
