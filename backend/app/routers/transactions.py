from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.date_utils import month_bounds
from app.models import Transaction, User
from app.schemas import TransactionCreate, TransactionRead
from app.security import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])
Month = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


def owned_transaction(db: Session, transaction_id: int, user_id: int) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
    )
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    month: Month | None = None,
    type: Literal["expense", "income"] | None = None,
    q: str | None = Query(default=None, max_length=80),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Transaction]:
    statement = select(Transaction).where(Transaction.user_id == user.id)
    if month:
        start, end = month_bounds(month)
        statement = statement.where(
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
    if type:
        statement = statement.where(Transaction.type == type)
    if q and q.strip():
        search = f"%{q.strip()}%"
        statement = statement.where(
            Transaction.note.ilike(search) | Transaction.category.ilike(search)
        )
    statement = statement.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    return list(db.scalars(statement).all())


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Transaction:
    transaction = Transaction(user_id=user.id, **payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Transaction:
    transaction = owned_transaction(db, transaction_id, user.id)
    for key, value in payload.model_dump().items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    transaction = owned_transaction(db, transaction_id, user.id)
    db.delete(transaction)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)