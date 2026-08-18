"""
Basic integration tests.
Run:  pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db

# Use in-memory SQLite for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True, scope="function")
async def setup_db():
    from app.models.role import Role
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestSession() as session:
        for r_name, desc in [
            ("administrator", "Admin"),
            ("manager", "Manager"),
            ("cashier", "Cashier"),
            ("inventory_clerk", "Clerk"),
            ("accountant", "Accountant"),
        ]:
            session.add(Role(name=r_name, description=desc))
        await session.commit()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


@pytest.mark.anyio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register
        r = await client.post("/api/auth/register", json={
            "business_name": "Test Shop",
            "name": "Admin User",
            "email": "admin@test.com",
            "password": "TestPass123",
            "currency": "USD",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        token = data["data"]["access_token"]

        # Me endpoint
        r2 = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["data"]["email"] == "admin@test.com"


@pytest.mark.anyio
async def test_create_product():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register + get token
        r = await client.post("/api/auth/register", json={
            "business_name": "Shop", "name": "Admin",
            "email": "a@b.com", "password": "Pass1234",
        })
        token = r.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create product
        r2 = await client.post("/api/products", json={
            "name": "Widget A",
            "selling_price": "9.99",
            "cost_price": "5.00",
            "minimum_stock": 5,
        }, headers=headers)
        assert r2.status_code == 200
        assert r2.json()["data"]["name"] == "Widget A"


@pytest.mark.anyio
async def test_insufficient_stock_sale():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/auth/register", json={
            "business_name": "Shop", "name": "Admin",
            "email": "x@y.com", "password": "Pass1234",
        })
        token = r.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create product with 0 stock
        r2 = await client.post("/api/products", json={
            "name": "Thing", "selling_price": "10.00", "cost_price": "5.00",
        }, headers=headers)
        product_id = r2.json()["data"]["id"]

        # Try to sell 6 units when stock=0 -> should fail with 400
        r3 = await client.post("/api/sales", json={
            "items": [{"product_id": product_id, "quantity": 6, "unit_price": "10.00"}],
            "amount_paid": "60.00",
        }, headers=headers)
        assert r3.status_code == 400
        assert r3.json()["success"] is False
        assert "INSUFFICIENT_STOCK" in r3.json()["error_code"]


@pytest.mark.anyio
async def test_complete_sales_and_inventory_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register Admin
        r = await client.post("/api/auth/register", json={
            "business_name": "Flow Retail", "name": "Manager Bob",
            "email": "bob@retail.com", "password": "Password123",
        })
        token = r.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Category and Product
        cat_r = await client.post("/api/categories", json={"name": "Electronics"}, headers=headers)
        cat_id = cat_r.json()["data"]["id"]

        prod_r = await client.post("/api/products", json={
            "name": "Wireless Mouse",
            "category_id": cat_id,
            "cost_price": "15.00",
            "selling_price": "25.00",
            "minimum_stock": 2,
        }, headers=headers)
        prod_id = prod_r.json()["data"]["id"]
        assert prod_r.json()["data"]["stock_quantity"] == 0

        # 3. Stock In 10 units
        tx_r = await client.post("/api/inventory/transactions", json={
            "product_id": prod_id,
            "type": "stock_in",
            "quantity": 10,
            "note": "Initial shipment",
        }, headers=headers)
        assert tx_r.status_code == 200
        assert tx_r.json()["data"]["quantity"] == 10

        # Verify stock quantity updated to 10
        prod_check = await client.get(f"/api/products/{prod_id}", headers=headers)
        assert prod_check.json()["data"]["stock_quantity"] == 10

        # 4. Create Sale for 3 units
        sale_r = await client.post("/api/sales", json={
            "items": [{"product_id": prod_id, "quantity": 3, "unit_price": "25.00"}],
            "amount_paid": "75.00",
            "payment_method": "cash",
        }, headers=headers)
        assert sale_r.status_code == 200
        sale_data = sale_r.json()["data"]
        assert float(sale_data["total"]) == 75.0
        assert sale_data["status"] == "completed"

        # 5. Verify inventory decreased from 10 to 7
        prod_after = await client.get(f"/api/products/{prod_id}", headers=headers)
        assert prod_after.json()["data"]["stock_quantity"] == 7

        # 6. Check Dashboard figures
        dash_r = await client.get("/api/dashboard", headers=headers)
        assert dash_r.status_code == 200
        stats = dash_r.json()["data"]["stats"]
        assert stats["today_sales"] == 75.0
        assert stats["today_transactions"] == 1


@pytest.mark.anyio
async def test_rbac_cashier_restrictions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register Admin
        r = await client.post("/api/auth/register", json={
            "business_name": "Secure Mart", "name": "Owner Alice",
            "email": "alice@secure.com", "password": "Password123",
        })
        admin_token = r.json()["data"]["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Get cashier role id
        roles_r = await client.get("/api/roles", headers=admin_headers)
        roles = roles_r.json()["data"]
        cashier_role = next(r for r in roles if r["name"] == "cashier")

        # Create Cashier user
        await client.post("/api/users", json={
            "name": "Cashier Dave",
            "email": "dave@secure.com",
            "password": "Password123",
            "role_id": cashier_role["id"],
        }, headers=admin_headers)

        # Login as Cashier
        login_r = await client.post("/api/auth/login", json={
            "email": "dave@secure.com",
            "password": "Password123",
        })
        cashier_token = login_r.json()["data"]["access_token"]
        cashier_headers = {"Authorization": f"Bearer {cashier_token}"}

        # Cashier CAN read products
        p_r = await client.get("/api/products", headers=cashier_headers)
        assert p_r.status_code == 200

        # Cashier CANNOT create/edit settings or manage users (403)
        u_r = await client.get("/api/users", headers=cashier_headers)
        assert u_r.status_code == 403

        s_r = await client.put("/api/settings", json={"name": "Hacked"}, headers=cashier_headers)
        assert s_r.status_code == 403

