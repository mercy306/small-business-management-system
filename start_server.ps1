# Run the SBMS server directly with PowerShell
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path "$ScriptDir\backend"

$PythonExe = "$ScriptDir\backend\.venv\Scripts\python.exe"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Small Business Management System Server" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Virtual environment not found at $PythonExe" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/2] Seeding database..." -ForegroundColor Yellow
& $PythonExe seed.py

Write-Host ""
Write-Host "[2/2] Launching server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SERVER IS ACTIVE AT: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  DO NOT CLOSE THIS POWERSHELL WINDOW WHILE USING THE APP!" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "http://127.0.0.1:8000"

& $PythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
