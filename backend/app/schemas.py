from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

EXPENSE_CATEGORIES = (
    "Shopping",
    "Food",
    "Phone",
    "Entertainment",
    "Education",
    "Beauty",
    "Sports",
    "Social",
    "Transportation",
    "Clothing",
    "Car",
    "Alcohol",
    "Cigarettes",
    "Electronics",
    "Travel",
    "Health",
    "Pets",
    "Repairs",
    "Housing",
    "Home",
    "Gifts",
    "Donations",
    "Lottery",
    "Snacks",
    "Kids",
    "Vegetables",
    "Fruits",
)
INCOME_CATEGORIES = ("Salary", "Scholarship", "Freelance", "Gift", "Other")
TransactionType = Literal["expense", "income"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1, max_length=30)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class DisplayNameUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=30)

    @field_validator("display_name")
    @classmethod
    def trim_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name is required")
        return value


class UserRead(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TransactionCreate(BaseModel):
    type: TransactionType
    category: str = Field(min_length=1, max_length=32)
    amount: Decimal = Field(gt=0, lt=Decimal("1000000000"), max_digits=12, decimal_places=2)
    transaction_date: date
    note: str = Field(default="", max_length=80)

    @model_validator(mode="after")
    def validate_category_for_type(self) -> "TransactionCreate":
        choices = EXPENSE_CATEGORIES if self.type == "expense" else INCOME_CATEGORIES
        if self.category not in choices:
            raise ValueError(f"Category must be one of: {', '.join(choices)}")
        return self


class TransactionRead(BaseModel):
    id: int
    type: TransactionType
    category: str
    amount: Decimal
    transaction_date: date
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SummaryRead(BaseModel):
    month: str
    balance: Decimal
    income: Decimal
    expenses: Decimal


class CategoryStat(BaseModel):
    category: str
    total: Decimal
    percentage: float


class DayStat(BaseModel):
    day: date
    total: Decimal


class BudgetUpdate(BaseModel):
    monthly_limit: Decimal = Field(
        ge=0, lt=Decimal("1000000000"), max_digits=12, decimal_places=2
    )

    @field_validator("monthly_limit")
    @classmethod
    def normalize_monthly_limit(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"))


class BudgetRead(BaseModel):
    monthly_limit: Decimal
    spent: Decimal
    remaining: Decimal
    exceeded: bool