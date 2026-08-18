"""
Role-based permission definitions.
Each role maps to a set of permission strings.
Endpoints declare required permissions; the dependency checks the current user's role.
"""

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "administrator": {
        "users:read", "users:write", "users:delete",
        "roles:read", "roles:write",
        "products:read", "products:write", "products:delete",
        "categories:read", "categories:write", "categories:delete",
        "inventory:read", "inventory:write",
        "sales:read", "sales:write", "sales:cancel",
        "customers:read", "customers:write", "customers:delete",
        "suppliers:read", "suppliers:write", "suppliers:delete",
        "expenses:read", "expenses:write", "expenses:delete",
        "payments:read", "payments:write",
        "reports:read",
        "settings:read", "settings:write",
        "audit_logs:read",
    },
    "manager": {
        "products:read", "products:write", "products:delete",
        "categories:read", "categories:write",
        "inventory:read", "inventory:write",
        "sales:read", "sales:write", "sales:cancel",
        "customers:read", "customers:write",
        "suppliers:read", "suppliers:write",
        "expenses:read", "expenses:write",
        "payments:read", "payments:write",
        "reports:read",
        "settings:read",
    },
    "cashier": {
        "products:read",
        "categories:read",
        "inventory:read",
        "sales:read", "sales:write",
        "customers:read",
        "payments:read", "payments:write",
    },
    "inventory_clerk": {
        "products:read",
        "categories:read",
        "inventory:read", "inventory:write",
        "reports:read",
        "suppliers:read",
    },
    "accountant": {
        "expenses:read", "expenses:write",
        "payments:read", "payments:write",
        "reports:read",
        "sales:read",
        "customers:read",
        "suppliers:read",
    },
}


def get_permissions(role_name: str) -> set[str]:
    return ROLE_PERMISSIONS.get(role_name.lower(), set())


def has_permission(role_name: str, permission: str) -> bool:
    return permission in get_permissions(role_name)
