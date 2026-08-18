from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
import shutil, os, uuid
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.schemas.product import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    ProductCreate, ProductUpdate, ProductOut,
)
from app.utils.response import ok, err
from app.utils.audit import log_action

router = APIRouter(tags=["products"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/api/categories", response_model=dict)
async def list_categories(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Category).where(Category.business_id == current_user.business_id)
    )
    categories = result.scalars().all()
    return ok([CategoryOut.model_validate(c).model_dump() for c in categories])


@router.post("/api/categories", response_model=dict,
             dependencies=[Depends(require_permission("categories:write"))])
async def create_category(payload: CategoryCreate, current_user: CurrentUser, db: DB):
    cat = Category(business_id=current_user.business_id, **payload.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return ok(CategoryOut.model_validate(cat).model_dump(), "Category created", 201)


@router.put("/api/categories/{cat_id}", response_model=dict,
            dependencies=[Depends(require_permission("categories:write"))])
async def update_category(cat_id: int, payload: CategoryUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Category).where(Category.id == cat_id, Category.business_id == current_user.business_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        return err("Category not found", "NOT_FOUND", 404)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.commit()
    await db.refresh(cat)
    return ok(CategoryOut.model_validate(cat).model_dump())


@router.delete("/api/categories/{cat_id}", response_model=dict,
               dependencies=[Depends(require_permission("categories:delete"))])
async def delete_category(cat_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Category).where(Category.id == cat_id, Category.business_id == current_user.business_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        return err("Category not found", "NOT_FOUND", 404)
    await db.delete(cat)
    await db.commit()
    return ok(message="Category deleted")


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/api/products", response_model=dict)
async def list_products(
    current_user: CurrentUser,
    db: DB,
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    low_stock: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
):
    query = (
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.business_id == current_user.business_id)
    )
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if search:
        query = query.where(
            or_(Product.name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%"),
                Product.barcode.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    if low_stock:
        query = query.where(Product.stock_quantity <= Product.minimum_stock)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()
    return ok([ProductOut.model_validate(p).model_dump() for p in products])


@router.get("/api/products/{product_id}", response_model=dict)
async def get_product(product_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product_id, Product.business_id == current_user.business_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        return err("Product not found", "NOT_FOUND", 404)
    return ok(ProductOut.model_validate(product).model_dump())


@router.post("/api/products", response_model=dict,
             dependencies=[Depends(require_permission("products:write"))])
async def create_product(payload: ProductCreate, current_user: CurrentUser, db: DB):
    product = Product(business_id=current_user.business_id, **payload.model_dump())
    db.add(product)
    await db.flush()
    await log_action(db, current_user.business_id, current_user.id, "CREATE", "product", product.id, {"name": product.name})
    await db.commit()
    result = await db.execute(
        select(Product).options(selectinload(Product.category)).where(Product.id == product.id)
    )
    product = result.scalar_one()
    return ok(ProductOut.model_validate(product).model_dump(), "Product created", 201)


@router.put("/api/products/{product_id}", response_model=dict,
            dependencies=[Depends(require_permission("products:write"))])
async def update_product(product_id: int, payload: ProductUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.id == product_id, Product.business_id == current_user.business_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        return err("Product not found", "NOT_FOUND", 404)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await log_action(db, current_user.business_id, current_user.id, "UPDATE", "product", product.id)
    await db.commit()
    result = await db.execute(
        select(Product).options(selectinload(Product.category)).where(Product.id == product.id)
    )
    product = result.scalar_one()
    return ok(ProductOut.model_validate(product).model_dump())


@router.delete("/api/products/{product_id}", response_model=dict,
               dependencies=[Depends(require_permission("products:delete"))])
async def archive_product(product_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.business_id == current_user.business_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        return err("Product not found", "NOT_FOUND", 404)
    product.is_active = False
    await db.flush()
    await log_action(db, current_user.business_id, current_user.id, "ARCHIVE", "product", product.id)
    await db.commit()
    return ok(message="Product archived")


# ── Image Upload ──────────────────────────────────────────────────────────────

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist" / "uploads"

@router.post("/api/products/{product_id}/image", response_model=dict,
             dependencies=[Depends(require_permission("products:write"))])
async def upload_product_image(
    product_id: int,
    current_user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.business_id == current_user.business_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        return err("Product not found", "NOT_FOUND", 404)

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        return err("Only JPEG, PNG, WebP or GIF images are allowed", "INVALID_FILE", 400)

    # Save file
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    image_url = f"/uploads/{filename}"
    product.image_url = image_url
    await db.commit()
    return ok({"image_url": image_url}, "Image uploaded successfully")
