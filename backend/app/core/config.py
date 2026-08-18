from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me"
    APP_NAME: str = "Small Business Management System"

    DATABASE_URL: str = "sqlite+aiosqlite:///./sbms.db"

    JWT_SECRET_KEY: str = "change-me-jwt"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ADMIN_EMAIL: str = "admin@business.com"
    ADMIN_PASSWORD: str = "Admin@1234"
    ADMIN_NAME: str = "System Admin"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Email / SMTP settings (configure in .env to enable)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "SBMS Business"
    SMTP_FROM_EMAIL: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
