import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app as fastapi_app

# ASGI wrapper to ensure all incoming /api routes match FastAPI routes
async def app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        path = scope.get("path", "")
        # If Vercel stripped the /api prefix, add it back so FastAPI routers match
        if not path.startswith("/api"):
            scope["path"] = f"/api{path}" if path.startswith("/") else f"/api/{path}"
    await fastapi_app(scope, receive, send)
