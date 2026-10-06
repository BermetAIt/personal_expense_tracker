import pytest
from app.database import Base, get_db
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    application = create_app()

    def override_get_db():
        with test_session() as session:
            yield session

    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as test_client:
        yield test_client
    application.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "bermet@example.com",
            "password": "correct-horse-123",
            "display_name": "Bermet",
        },
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}