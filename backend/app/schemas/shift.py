from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class ShiftOpenRequest(BaseModel):
    starting_cash: Decimal = Decimal("0.00")
    notes: Optional[str] = None


class ShiftCloseRequest(BaseModel):
    ending_cash: Decimal
    notes: Optional[str] = None


class ShiftUserSummary(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class ShiftOut(BaseModel):
    id: int
    business_id: int
    user_id: int
    opened_at: datetime
    closed_at: Optional[datetime] = None
    starting_cash: Decimal
    ending_cash: Optional[Decimal] = None
    expected_cash: Optional[Decimal] = None
    cash_difference: Optional[Decimal] = None
    status: str
    notes: Optional[str] = None
    user: Optional[ShiftUserSummary] = None

    model_config = {"from_attributes": True}
