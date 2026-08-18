from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.models.business import Business
from app.models.audit_log import AuditLog
from app.schemas.admin import UserCreate, UserUpdate, UserOut, BusinessUpdate, BusinessOut, AuditLogOut
from app.utils.response import ok, err

router = APIRouter(tags=["admin"])

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Users ──────────────────────────────────────────────────────────────────

@router.get("/api/users", response_model=dict,
            dependencies=[Depends(require_permission("users:read"))])
async def list_users(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(User).where(User.business_id == current_user.business_id)
    )
    users = result.scalars().all()
    out = []
    for u in users:
        role_result = await db.execute(select(Role).where(Role.id == u.role_id))
        role = role_result.scalar_one_or_none()
        out.append({
            "id": u.id, "business_id": u.business_id, "name": u.name,
            "email": u.email, "role_id": u.role_id,
            "role_name": role.name if role else None,
            "is_active": u.is_active, "created_at": u.created_at.isoformat(),
        })
    return ok(out)


@router.post("/api/users", response_model=dict,
             dependencies=[Depends(require_permission("users:write"))])
async def create_user(payload: UserCreate, current_user: CurrentUser, db: DB):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        return err("Email already registered", "EMAIL_EXISTS", 400)

    u = User(
        business_id=current_user.business_id,
        role_id=payload.role_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return ok({"id": u.id, "name": u.name, "email": u.email}, "User created", 201)


@router.put("/api/users/{uid}", response_model=dict,
            dependencies=[Depends(require_permission("users:write"))])
async def update_user(uid: int, payload: UserUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(User).where(User.id == uid, User.business_id == current_user.business_id)
    )
    u = result.scalar_one_or_none()
    if not u:
        return err("User not found", "NOT_FOUND", 404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    await db.commit()
    return ok({"id": u.id, "name": u.name, "email": u.email})


@router.delete("/api/users/{uid}", response_model=dict,
               dependencies=[Depends(require_permission("users:delete"))])
async def deactivate_user(uid: int, current_user: CurrentUser, db: DB):
    if uid == current_user.id:
        return err("Cannot deactivate yourself", "SELF_DEACTIVATE", 400)
    result = await db.execute(
        select(User).where(User.id == uid, User.business_id == current_user.business_id)
    )
    u = result.scalar_one_or_none()
    if not u:
        return err("User not found", "NOT_FOUND", 404)
    u.is_active = False
    await db.commit()
    return ok(message="User deactivated")


# ── Roles ──────────────────────────────────────────────────────────────────

@router.get("/api/roles", response_model=dict)
async def list_roles(current_user: CurrentUser, db: DB):
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return ok([{"id": r.id, "name": r.name, "description": r.description} for r in roles])


# ── Business Settings ──────────────────────────────────────────────────────

@router.get("/api/settings", response_model=dict)
async def get_settings(current_user: CurrentUser, db: DB):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        return err("Business not found", "NOT_FOUND", 404)
    return ok(BusinessOut.model_validate(biz).model_dump())


@router.put("/api/settings", response_model=dict,
            dependencies=[Depends(require_permission("settings:write"))])
async def update_settings(payload: BusinessUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        return err("Business not found", "NOT_FOUND", 404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(biz, k, v)
    await db.commit()
    await db.refresh(biz)
    return ok(BusinessOut.model_validate(biz).model_dump(), "Settings updated")


# ── Audit Logs ─────────────────────────────────────────────────────────────

@router.get("/api/audit-logs", response_model=dict,
            dependencies=[Depends(require_permission("audit_logs:read"))])
async def get_audit_logs(
    current_user: CurrentUser, db: DB,
    entity_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
):
    query = select(AuditLog).where(AuditLog.business_id == current_user.business_id)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return ok([AuditLogOut.model_validate(l).model_dump() for l in logs])
