from calendar import monthrange
from datetime import date


def add_transaction(client, headers, *, kind="expense", category="Food", amount="100", day=None):
    response = client.post(
        "/api/transactions",
        headers=headers,
        json={
            "type": kind,
            "category": category,
            "amount": amount,
            "transaction_date": day or date.today().replace(day=1).isoformat(),
            "note": "Sample",
        },
    )
    assert response.status_code == 201


def test_summary_calculates_income_expenses_and_balance(client, auth_headers):
    month = date.today().strftime("%Y-%m")
    add_transaction(client, auth_headers, amount="120")
    add_transaction(client, auth_headers, kind="income", category="Salary", amount="500")
    result = client.get(f"/api/stats/summary?month={month}", headers=auth_headers).json()
    assert result["income"] == "500.00"
    assert result["expenses"] == "120.00"
    assert result["balance"] == "380.00"


def test_summary_only_includes_selected_month(client, auth_headers):
    add_transaction(client, auth_headers, day="2025-01-02")
    result = client.get("/api/stats/summary?month=2025-02", headers=auth_headers).json()
    assert result["expenses"] == "0"


def test_category_stats_include_percentages(client, auth_headers):
    month = date.today().strftime("%Y-%m")
    add_transaction(client, auth_headers, category="Food", amount="25")
    add_transaction(client, auth_headers, category="Shopping", amount="75")
    response = client.get(
        f"/api/stats/by-category?month={month}&type=expense", headers=auth_headers
    )
    assert response.json()[0]["category"] == "Shopping"
    assert response.json()[0]["percentage"] == 75


def test_category_stats_can_select_income(client, auth_headers):
    month = date.today().strftime("%Y-%m")
    add_transaction(client, auth_headers, kind="income", category="Salary", amount="500")
    response = client.get(
        f"/api/stats/by-category?month={month}&type=income", headers=auth_headers
    )
    assert response.json()[0]["category"] == "Salary"


def test_day_stats_fill_the_whole_month(client, auth_headers):
    month = date.today().strftime("%Y-%m")
    add_transaction(client, auth_headers, day=f"{month}-05", amount="50")
    response = client.get(f"/api/stats/by-day?month={month}", headers=auth_headers)
    assert len(response.json()) == monthrange(date.today().year, date.today().month)[1]
    assert response.json()[4]["total"] == "50.00"


def test_budget_can_be_created_and_updated(client, auth_headers):
    created = client.put("/api/budget", json={"monthly_limit": "20000"}, headers=auth_headers)
    assert created.status_code == 200
    assert created.json()["monthly_limit"] == "20000.00"
    updated = client.put("/api/budget", json={"monthly_limit": "30000"}, headers=auth_headers)
    assert updated.json()["monthly_limit"] == "30000.00"


def test_budget_reports_exceeded_state(client, auth_headers):
    client.put("/api/budget", json={"monthly_limit": "100"}, headers=auth_headers)
    add_transaction(client, auth_headers, amount="150")
    response = client.get("/api/budget", headers=auth_headers)
    assert response.json()["exceeded"] is True
    assert response.json()["remaining"] == "-50.00"


def test_negative_budget_is_rejected(client, auth_headers):
    response = client.put("/api/budget", json={"monthly_limit": "-1"}, headers=auth_headers)
    assert response.status_code == 422


def test_csv_export_includes_only_current_user_transactions(client, auth_headers):
    add_transaction(client, auth_headers, amount="25")
    response = client.get("/api/export/csv", headers=auth_headers)
    assert response.status_code == 200
    assert "date,type,category,amount,note" in response.text
    assert "Food" in response.text


def test_demo_data_adds_transactions(client, auth_headers):
    response = client.post("/api/demo-data", headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["created"] == 6
    assert len(client.get("/api/transactions", headers=auth_headers).json()) == 6


def test_delete_all_data_keeps_profile(client, auth_headers):
    add_transaction(client, auth_headers)
    client.put("/api/budget", json={"monthly_limit": "100"}, headers=auth_headers)
    response = client.delete("/api/data", headers=auth_headers)
    assert response.status_code == 204
    assert client.get("/api/transactions", headers=auth_headers).json() == []
    assert client.get("/api/auth/me", headers=auth_headers).status_code == 200


def test_profile_name_can_be_changed(client, auth_headers):
    response = client.put(
        "/api/auth/me",
        json={"display_name": "  New name "},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "New name"


def test_stats_require_authentication(client):
    assert client.get("/api/stats/summary?month=2026-10").status_code == 401