# personal_expense_tracker
# Personal Expense Tracker

**Author:** Arstanalieva Bermet  
**Date:** September 22, 2026  

## 1. Project Overview
A simple web application that allows a user to record daily expenses, view them in a table, and see a basic spending chart. The application runs locally in the browser using Python and Streamlit, and stores data in a local SQLite database. No account or internet connection is required.

## 2. Features
1. **Add Expense** — A form to enter amount, category, date, and description.
2. **View Expenses** — A table displaying all recorded expenses.
3. **Delete Expense** — Remove an incorrect entry by its ID.
4. **Spending Chart** — A simple bar chart showing total spending per category.

## 3. Technology Stack
| Tool | Version | Purpose |
| :--- | :--- | :--- |
| Python | 3.10+ | Core programming language |
| Streamlit | latest | Web interface |
| SQLite3 | built-in | Local database (included with Python) |

## 4. Database Schema
The application uses a local SQLite database with a single table named `expenses` to store all user data.

### Table: `expenses`
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for each expense |
| `amount` | REAL | NOT NULL | The amount of money spent |
| `category` | TEXT | NOT NULL | Category of the expense (e.g., Food, Transport) |
| `date` | DATE | NOT NULL | Date of the expense |
| `description` | TEXT | | Optional description or note |

**SQL Creation Script:**
```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT
);