
import os
from pathlib import Path
from dotenv import load_dotenv

# Project root: MiChat/
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Load environment variables from the project root
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    APP_NAME = "MiChat"
    APP_VERSION = "1.0.0"
    API_V1_PREFIX = "/api/v1"

    DEBUG = os.getenv("DEBUG", "true").lower() == "true"

    # Frontend
    FRONTEND_URL = os.getenv(
        "FRONTEND_URL",
        "http://127.0.0.1:5500"
    )

    # Database
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "michat")

    JWT_SECRET = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
    )
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")
    )
    OTP_HMAC_SECRET = os.getenv("OTP_HMAC_SECRET", "")
    OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))


settings = Settings()


