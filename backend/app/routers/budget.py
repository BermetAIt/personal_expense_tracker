from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.date_utils import month_bounds
from app.models import Budget, Transaction, User
from app.schemas import BudgetRead, BudgetUpdate
from app.security import get_current_user

router = APIRouter(prefix="/budget", tags=["budget"])


def budget_status(db: Session, user_id: int, monthly_limit: Decimal) -> BudgetRead:
    today = datetime.now(UTC).date()
    month = today.strftime("%Y-%m")
    spent = db.scalar(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= today.replace(day=1),
            Transaction.transaction_date < month_bounds(month)[1],
        )
    ) or Decimal("0")
    return BudgetRead(
        monthly_limit=monthly_limit,
        spent=spent,
        remaining=monthly_limit - spent,
        exceeded=spent > monthly_limit,
    )


@router.get("", response_model=BudgetRead)
def get_budget(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetRead:
    budget = db.scalar(select(Budget).where(Budget.user_id == user.id))
    return budget_status(db, user.id, budget.monthly_limit if budget else Decimal("0"))


@router.put("", response_model=BudgetRead)
def update_budget(
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BudgetRead:
    budget = db.scalar(select(Budget).where(Budget.user_id == user.id))
    if budget is None:
        budget = Budget(user_id=user.id, monthly_limit=payload.monthly_limit)
        db.add(budget)
    else:
        budget.monthly_limit = payload.monthly_limit
        budget.updated_at = datetime.now(UTC)
    db.commit()
    return budget_status(db, user.id, payload.monthly_limit)