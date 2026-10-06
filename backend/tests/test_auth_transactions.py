from datetime import date

import pytest


def transaction_payload(**overrides):
    return {
        "type": "expense",
        "category": "Food",
        "amount": "1250.50",
        "transaction_date": date.today().isoformat(),
        "note": "Campus lunch",
        **overrides,
    }


def test_register_returns_token_and_profile(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "valid-password", "display_name": "New User"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "new@example.com"
    assert response.json()["token_type"] == "bearer"


def test_password_is_not_returned_by_register(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "valid-password", "display_name": "New User"},
    )
    assert "password" not in response.json()["user"]


def test_duplicate_email_is_rejected_case_insensitively(client, auth_headers):
    response = client.post(
        "/api/auth/register",
        json={"email": "BERMET@example.com", "password": "valid-password", "display_name": "Again"},
    )
    assert response.status_code == 400


def test_invalid_email_is_rejected(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "invalid", "password": "valid-password", "display_name": "Name"},
    )
    assert response.status_code == 422


def test_short_password_is_rejected(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "short@example.com", "password": "123", "display_name": "Name"},
    )
    assert response.status_code == 422


def test_login_returns_access_token(client, auth_headers):
    response = client.post(
        "/api/auth/login", json={"email": "BERMET@example.com", "password": "correct-horse-123"}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_wrong_password_returns_401(client, auth_headers):
    response = client.post(
        "/api/auth/login", json={"email": "bermet@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_profile(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["display_name"] == "Bermet"


def test_create_and_list_transaction(client, auth_headers):
    created = client.post("/api/transactions", json=transaction_payload(), headers=auth_headers)
    assert created.status_code == 201
    listed = client.get("/api/transactions", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()[0]["category"] == "Food"


def test_update_transaction(client, auth_headers):
    created = client.post("/api/transactions", json=transaction_payload(), headers=auth_headers)
    transaction_id = created.json()["id"]
    response = client.put(
        f"/api/transactions/{transaction_id}",
        json=transaction_payload(amount="2000", note="Updated"),
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["note"] == "Updated"


def test_delete_transaction(client, auth_headers):
    created = client.post("/api/transactions", json=transaction_payload(), headers=auth_headers)
    response = client.delete(f"/api/transactions/{created.json()['id']}", headers=auth_headers)
    assert response.status_code == 204


def test_transaction_requires_authentication(client):
    assert client.get("/api/transactions").status_code == 401


@pytest.mark.parametrize("amount", ["0", "-1", "1000000000"])
def test_amount_must_be_positive_and_below_limit(client, auth_headers, amount):
    response = client.post(
        "/api/transactions", json=transaction_payload(amount=amount), headers=auth_headers
    )
    assert response.status_code == 422


def test_category_must_match_transaction_type(client, auth_headers):
    response = client.post(
        "/api/transactions",
        json=transaction_payload(type="income", category="Food"),
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_missing_date_is_rejected(client, auth_headers):
    payload = transaction_payload()
    payload.pop("transaction_date")
    response = client.post("/api/transactions", json=payload, headers=auth_headers)
    assert response.status_code == 422


def test_user_cannot_read_another_users_transaction(client, auth_headers):
    created = client.post("/api/transactions", json=transaction_payload(), headers=auth_headers)
    client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "password": "other-password", "display_name": "Other"},
    )
    other_token = client.post(
        "/api/auth/login", json={"email": "other@example.com", "password": "other-password"}
    ).json()["access_token"]
    response = client.put(
        f"/api/transactions/{created.json()['id']}",
        json=transaction_payload(),
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert response.status_code == 404


def test_month_and_search_filters(client, auth_headers):
    client.post(
        "/api/transactions",
        json=transaction_payload(transaction_date="2026-01-03", note="Campus lunch"),
        headers=auth_headers,
    )
    client.post(
        "/api/transactions",
        json=transaction_payload(transaction_date="2026-02-03", note="Coffee"),
        headers=auth_headers,
    )
    response = client.get(
        "/api/transactions?month=2026-01&q=campus", headers=auth_headers
    )
    assert len(response.json()) == 1


def test_invalid_month_filter_is_rejected(client, auth_headers):
    response = client.get("/api/transactions?month=2026-13", headers=auth_headers)
    assert response.status_code == 422