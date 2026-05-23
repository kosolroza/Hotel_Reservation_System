import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings

# Public routers
from app.routers.auth import router as auth_router
from app.routers.rooms import router as rooms_router
from app.routers.room_types import router as room_types_router
from app.routers.amenities import router as amenities_router
from app.routers.availability import router as availability_router
from app.routers.reservations import router as reservations_router
from app.routers.payments import router as payments_router
from app.routers.promotions import router as promotions_router
from app.routers.feedback import router as feedback_router
from app.routers.upload import router as upload_router
from app.routers.settings import router as settings_router

# Admin routers
from app.admin.dashboard import router as admin_dashboard_router
from app.admin.rooms import router as admin_rooms_router
from app.admin.room_types import router as admin_room_types_router
from app.admin.amenities import router as admin_amenities_router
from app.admin.reservations import router as admin_reservations_router
from app.admin.guests import router as admin_guests_router
from app.admin.staff import router as admin_staff_router
from app.admin.payments import router as admin_payments_router
from app.admin.promotions import router as admin_promotions_router
from app.admin.feedback import router as admin_feedback_router
from app.admin.reports import router as admin_reports_router
from app.admin.settings import router as admin_settings_router

limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

    prefix = "/api/v1"
    for router in [
        auth_router, rooms_router, room_types_router, amenities_router,
        availability_router, reservations_router, payments_router,
        promotions_router, feedback_router, upload_router, settings_router,
        admin_dashboard_router, admin_rooms_router, admin_room_types_router,
        admin_amenities_router, admin_reservations_router, admin_guests_router,
        admin_staff_router, admin_payments_router, admin_promotions_router,
        admin_feedback_router, admin_reports_router, admin_settings_router,
    ]:
        app.include_router(router, prefix=prefix)

    @app.on_event("startup")
    async def startup():
        from app.database import create_tables
        await create_tables()
        
    @app.get("/api/health", tags=["Health"])
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()
