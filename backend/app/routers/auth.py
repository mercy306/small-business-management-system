from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.business import Business
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, ChangePasswordRequest
from app.core.deps import get_current_user
from app.utils.response import ok, err

router = APIRouter(prefix="/api/auth", tags=["auth"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/register", response_model=dict)
async def register(payload: RegisterRequest, db: DB):
    """Create a new business and its administrator account."""
    # Check email not already taken
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        return err("Email already registered", "EMAIL_EXISTS", 400)

    # Get or create administrator role
    result = await db.execute(select(Role).where(Role.name == "administrator"))
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="administrator", description="Full system access")
        db.add(admin_role)
        await db.flush()

    # Create business
    business = Business(
        name=payload.business_name,
        currency=payload.currency,
    )
    db.add(business)
    await db.flush()

    # Create admin user
    user = User(
        business_id=business.id,
        role_id=admin_role.id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return ok(
        TokenResponse(access_token=access_token, refresh_token=refresh_token).model_dump(),
        "Business registered successfully",
    )


@router.post("/login", response_model=dict)
async def login(payload: LoginRequest, db: DB):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        return err("Invalid email or password", "INVALID_CREDENTIALS", 401)

    if not user.is_active:
        return err("Account is deactivated", "ACCOUNT_INACTIVE", 403)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return ok(
        TokenResponse(access_token=access_token, refresh_token=refresh_token).model_dump(),
        "Login successful",
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(payload: RefreshRequest, db: DB):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        return err("Invalid refresh token", "INVALID_TOKEN", 401)

    user_id = decoded.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return err("User not found", "USER_NOT_FOUND", 401)

    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return ok(TokenResponse(access_token=new_access, refresh_token=new_refresh).model_dump())


@router.get("/me", response_model=dict)
async def me(current_user: Annotated[User, Depends(get_current_user)], db: DB):
    await db.refresh(current_user, ["role"])
    return ok({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.name if current_user.role else None,
        "business_id": current_user.business_id,
        "is_active": current_user.is_active,
    })


@router.post("/change-password", response_model=dict)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    if not verify_password(payload.current_password, current_user.password_hash):
        return err("Current password is incorrect", "WRONG_PASSWORD", 400)

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    await db.commit()
    return ok(message="Password changed successfully")
