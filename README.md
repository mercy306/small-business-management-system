# Small Business Management System (SBMS)

A modern, full-stack **Small Business Management System & Point of Sale (POS)** built with **FastAPI**, **React**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

* **Multi-Tenant Architecture**: Complete data isolation per registered business.
* **Role-Based Access Control (RBAC)**: 5 granular staff roles (`Administrator`, `Manager`, `Cashier`, `Inventory Clerk`, `Accountant`).
* **Point of Sale (POS)**:
  * Fast checkout with live catalog search.
  * **Barcode Scanner Support**: Hardware USB/Bluetooth scanners & Camera scanning (`html5-qrcode`).
  * Multi-method payments: Cash, Card, Bank Transfer, and Store Credit (balance due).
  * Printable thermal receipts & instant **Email Receipts**.
* **Inventory Control**:
  * Real-time stock tracking with low-stock alerts.
  * Stock In (shipments), Stock Out (damages), and immutable audit log.
* **Product Catalog**: SKU, barcode, category organization, cost vs. selling price margins, and **Image Upload**.
* **Shift & Register Management**:
  * Open register shifts with starting cash floats.
  * End-of-day drawer cash counting with automated discrepancy calculations (Over/Short).
* **Customer & Supplier CRM**: Customer credit limits, running balance tracking, and vendor directory.
* **Operating Expenses**: Categorized expense tracking (Rent, Utilities, Maintenance, etc.).
* **Financial Reports & Analytics**:
  * Real-time **Profit & Loss Statement (P&L)** with Revenue, COGS, Gross Profit, and Net Profit.
  * **Excel (`.xlsx`) & PDF Export** for all reports.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Bcrypt, JWT (python-jose).
* **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide React, Axios.
* **Database**: SQLite (Development) / PostgreSQL (Production ready).
* **Containerization**: Docker & Docker Compose.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
* Python 3.12+
* Node.js 18+

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python -m uvicorn app.main:app --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

---

## 🔒 Security
* Passwords hashed using **Bcrypt**.
* Stateless authentication via **JWT Bearer Access & Refresh tokens**.
* Endpoints protected by granular role permission dependencies.
* Multi-tenant queries scoped by `current_user.business_id`.

---

## 📄 License
This project is licensed under the MIT License.
