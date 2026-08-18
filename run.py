"""
Single-command launcher for Small Business Management System.
Run:
    python run.py
"""
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
PYTHON_EXE = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"

if not PYTHON_EXE.exists():
    PYTHON_EXE = Path(sys.executable)

print("=" * 60)
print("Starting Small Business Management System...")
print("=" * 60)

# 1. Run database seed
print("\n[1/2] Initializing database & default accounts...")
try:
    subprocess.run([str(PYTHON_EXE), "seed.py"], cwd=str(BACKEND_DIR), check=True)
except Exception as e:
    print(f"Warning during seed: {e}")

# 2. Open browser after brief delay
def open_browser():
    time.sleep(2)
    url = "http://127.0.0.1:8000"
    print(f"\n[+] Opening browser at: {url}\n")
    webbrowser.open(url)

import threading
threading.Thread(target=open_browser, daemon=True).start()

# 3. Start uvicorn server
print("\n[2/2] Starting server on http://127.0.0.1:8000 ...")
print("Press CTRL+C in this terminal window to stop the server.\n")

try:
    subprocess.run(
        [str(PYTHON_EXE), "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=str(BACKEND_DIR)
    )
except KeyboardInterrupt:
    print("\nServer stopped.")
