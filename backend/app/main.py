from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import auth, transactions


def create_app() -> FastAPI:
    application = FastAPI(title="Money Tracker API", version="1.0.0")
    application.include_router(auth.router, prefix="/api")
    application.include_router(transactions.router, prefix="/api")

    frontend = get_settings().frontend_path
    application.mount("/css", StaticFiles(directory=frontend / "css"), name="css")
    application.mount("/js", StaticFiles(directory=frontend / "js"), name="js")

    @application.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(frontend / "index.html")

    return application


app = create_app()