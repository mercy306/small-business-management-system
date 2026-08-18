"""
Seed script — initializes the database and creates system roles.
"""
import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.role import Role
import app.models  # noqa: ensure all models are registered


SYSTEM_ROLES = [
    ("administrator", "Full system and business access"),
    ("manager", "Operational and staff management access"),
    ("cashier", "Point of Sale (POS) and product view access"),
    ("inventory_clerk", "Stock and inventory management access"),
    ("accountant", "Financial reports, expenses, and invoices access"),
]


async def seed():
    # Create all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for role_name, description in SYSTEM_ROLES:
            existing = await db.execute(select(Role).where(Role.name == role_name))
            if not existing.scalar_one_or_none():
                db.add(Role(name=role_name, description=description))
                print(f"  [+] System Role created: {role_name}")
            else:
                print(f"  [-] Role exists: {role_name}")

        await db.commit()


if __name__ == "__main__":
    print("\n[*] Initializing system roles...\n")
    asyncio.run(seed())
    print("[+] Done.\n")
