import csv
from datetime import date, timedelta
from decimal import Decimal
from io import StringIO

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Budget, Transaction, User
from app.security import get_current_user

router = APIRouter(tags=["data"])


def safe_csv_value(value: str) -> str:
    if value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"
    return value


@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    ).all()
    buffer = StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(["date", "type", "category", "amount", "note"])
    for transaction in transactions:
        writer.writerow(
            [
                transaction.transaction_date.isoformat(),
                transaction.type,
                safe_csv_value(transaction.category),
                str(transaction.amount),
                safe_csv_value(transaction.note),
            ]
        )
    return StreamingResponse(
        iter(["\ufeff" + buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="transactions.csv"'},
    )


@router.post("/demo-data", status_code=status.HTTP_201_CREATED)
def add_demo_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    today = date.today()
    samples = [
        ("expense", "Food", "71", "Обед"),
        ("expense", "Transportation", "85", ""),
        ("expense", "Health", "750", "Аптека"),
        ("expense", "Shopping", "490", ""),
        ("expense", "Education", "427", "Книги"),
        ("income", "Scholarship", "3000", "Стипендия"),
    ]
    for index, (transaction_type, category, amount, note) in enumerate(samples):
        db.add(
            Transaction(
                user_id=user.id,
                type=transaction_type,
                category=category,
                amount=Decimal(amount),
                transaction_date=today - timedelta(days=index * 2),
                note=note,
            )
        )
    db.commit()
    return {"created": len(samples)}


@router.delete("/data", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    db.execute(delete(Transaction).where(Transaction.user_id == user.id))
    db.execute(delete(Budget).where(Budget.user_id == user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)