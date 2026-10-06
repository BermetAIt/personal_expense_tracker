from calendar import monthrange
from datetime import date


def month_bounds(month: str) -> tuple[date, date]:
    year, month_number = map(int, month.split("-"))
    start = date(year, month_number, 1)
    end = date(year + (month_number == 12), month_number % 12 + 1, 1)
    return start, end


def days_in_month(month: str) -> int:
    year, month_number = map(int, month.split("-"))
    return monthrange(year, month_number)[1]