import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-secret-key-production"
    APP_NAME: str = "Small Business Management System"

    DATABASE_URL: str = ""

    JWT_SECRET_KEY: str = "change-me-jwt-production-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ADMIN_EMAIL: str = "admin@business.com"
    ADMIN_PASSWORD: str = "Admin@1234"
    ADMIN_NAME: str = "System Admin"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,*"

    # Email / SMTP settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "SBMS Business"
    SMTP_FROM_EMAIL: str = ""

    @property
    def database_url_resolved(self) -> str:
        url = self.DATABASE_URL.strip() if self.DATABASE_URL else ""
        if not url:
            # If running on Vercel / serverless without DB URL, store in writable /tmp
            if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
                return "sqlite+aiosqlite:////tmp/sbms.db"
            return "sqlite+aiosqlite:///./sbms.db"

        # Auto-convert postgres:// and postgresql:// to postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        return url

    @property
    def cors_origins_list(self) -> List[str]:
        if "*" in self.CORS_ORIGINS:
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
