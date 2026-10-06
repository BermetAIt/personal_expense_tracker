from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.date_utils import days_in_month, month_bounds
from app.models import Transaction, User
from app.schemas import CategoryStat, DayStat, SummaryRead
from app.security import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])
Month = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


def monthly_transactions(db: Session, user_id: int, month: str):
    start, end = month_bounds(month)
    return select(Transaction).where(
        Transaction.user_id == user_id,
        Transaction.transaction_date >= start,
        Transaction.transaction_date < end,
    )


@router.get("/summary", response_model=SummaryRead)
def summary(
    month: Month,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SummaryRead:
    rows = db.execute(
        select(Transaction.type, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= month_bounds(month)[0],
            Transaction.transaction_date < month_bounds(month)[1],
        )
        .group_by(Transaction.type)
    ).all()
    totals = {transaction_type: amount for transaction_type, amount in rows}
    income = totals.get("income") or Decimal("0")
    expenses = totals.get("expense") or Decimal("0")
    return SummaryRead(month=month, income=income, expenses=expenses, balance=income - expenses)


@router.get("/by-category", response_model=list[CategoryStat])
def by_category(
    month: Month,
    type: Literal["expense", "income"] = "expense",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CategoryStat]:
    start, end = month_bounds(month)
    rows = db.execute(
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == type,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    total = sum((amount for _category, amount in rows), Decimal("0"))
    return [
        CategoryStat(category=category, total=amount, percentage=float(amount / total * 100))
        for category, amount in rows
    ] if total else []


@router.get("/by-day", response_model=list[DayStat])
def by_day(
    month: Month,
    type: Literal["expense", "income"] = "expense",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DayStat]:
    start, end = month_bounds(month)
    rows = db.execute(
        select(Transaction.transaction_date, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == type,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .group_by(Transaction.transaction_date)
    ).all()
    totals = {day: amount for day, amount in rows}
    days = [date(start.year, start.month, number) for number in range(1, days_in_month(month) + 1)]
    return [
        DayStat(day=day, total=totals.get(day, Decimal("0")))
        for day in days
    ]