"""Shared response helpers."""
from typing import Any, Optional
from fastapi.responses import JSONResponse


def ok(data: Any = None, message: str = "Success", status_code: int = 200) -> dict:
    return {"success": True, "data": data, "message": message}


def err(message: str, error_code: str = "ERROR", status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error_code": error_code, "message": message},
    )
