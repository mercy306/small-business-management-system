from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base

# Import all models so SQLAlchemy registers them before table creation
import app.models  # noqa: F401

from app.routers import (
    auth,
    dashboard,
    products,
    inventory,
    sales,
    customers_suppliers,
    expenses_payments,
    reports,
    admin,
    shifts,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Auto-initialize standard system roles
        from sqlalchemy import select
        from app.models.role import Role
        from app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            for r_name, r_desc in [
                ("administrator", "Full system and business access"),
                ("manager", "Operational and staff management access"),
                ("cashier", "Point of Sale (POS) and product view access"),
                ("inventory_clerk", "Stock and inventory management access"),
                ("accountant", "Financial reports, expenses, and invoices access"),
            ]:
                exist = await db.execute(select(Role).where(Role.name == r_name))
                if not exist.scalar_one_or_none():
                    db.add(Role(name=r_name, description=r_desc))
            await db.commit()
    except Exception as e:
        print(f"Warning during lifespan initialization: {e}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Small Business Management System REST API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(customers_suppliers.router)
app.include_router(expenses_payments.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(shifts.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# Mount built Frontend assets for local running (when not running in Vercel serverless mode)
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if not os.environ.get("VERCEL") and not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            if full_path.startswith("api"):
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="API endpoint not found")
            file_path = frontend_dist / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(frontend_dist / "index.html")
    else:
        @app.get("/")
        async def root():
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url="/docs")

