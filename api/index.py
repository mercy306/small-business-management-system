import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app as fastapi_app

# Robust ASGI handler for Vercel serverless routing
async def app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        headers = dict(scope.get("headers", []))
        
        # Vercel passes the original incoming path in headers when rewrites are used
        matched_path = (
            headers.get(b"x-matched-path", b"").decode("utf-8")
            or headers.get(b"x-forwarded-uri", b"").decode("utf-8")
            or headers.get(b"x-vercel-matched-path", b"").decode("utf-8")
            or scope.get("path", "")
        )

        if matched_path:
            # Strip query string if present
            matched_path = matched_path.split("?")[0]
            if not matched_path.startswith("/api"):
                matched_path = f"/api{matched_path}" if matched_path.startswith("/") else f"/api/{matched_path}"
            scope["path"] = matched_path

    await fastapi_app(scope, receive, send)
