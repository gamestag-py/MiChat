
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import db
from app.core.config import settings

from app.api.router import api_router

from fastapi import HTTPException
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler
)

import logging

from app.core.middleware import request_logging_middleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

app.add_exception_handler(
    HTTPException,
    http_exception_handler
)

app.add_exception_handler(
    Exception,
    unhandled_exception_handler
)

app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX
)

app.middleware("http")(request_logging_middleware)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "MiChat API is running"
    }


@app.get("/health")
async def health():
    try:
        await db.fetch_one("SELECT 1")
        return {
            "status": "ok",
            "database": True
        }
    except Exception:
        return {
            "status": "error",
            "database": False
        }
