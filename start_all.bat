@echo off
title SBMS Server
echo ========================================================
echo   Small Business Management System
echo ========================================================
echo.

cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at backend\.venv
    echo Please make sure the folder exists.
    pause
    exit /b 1
)

echo [1/2] Seeding database...
.venv\Scripts\python.exe seed.py
echo.

echo [2/2] Starting server...
echo.
echo ========================================================
echo   SERVER IS RUNNING AT: http://127.0.0.1:8000
echo   KEEP THIS WINDOW OPEN WHILE USING THE APP!
echo ========================================================
echo.

start http://127.0.0.1:8000

.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo Server has stopped.
pause
