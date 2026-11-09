"""
db.py
=====

Production-grade asynchronous MySQL data-access layer built on top of
``aiomysql``, designed for high-concurrency Telegram bots (aiogram /
python-telegram-bot) and FastAPI services sharing the same MySQL instance.

Key properties
--------------
* Single shared connection pool (no per-query connections).
* Lazy, coroutine-safe + thread-safe singleton initialization.
* Automatic reconnection / pool rebuild on fatal connection errors.
* Exponential-backoff retry for transient errors:
    - "MySQL server has gone away" (2006)
    - "Lost connection to MySQL server during query" (2013)
    - "Can't connect to MySQL server" (2003)
    - Deadlock found when trying to get lock (1213)
    - Lock wait timeout exceeded (1205)
    - Too many connections (1040)
    - Generic network resets / broken pipes / timeouts
* Background health-check task that proactively detects and repairs a
  broken pool (e.g. after a MySQL restart) instead of waiting for the
  next failing query.
* Safe transaction context manager with guaranteed connection release.
* Helper methods for the four common query shapes plus a transaction
  runner with built-in deadlock retry.

Environment variables
----------------------
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_POOL_MIN, DB_POOL_MAX
(plus optional tuning knobs documented in ``DBConfig``).

Usage examples are provided at the bottom of this file.
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
import threading
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable, Optional, Sequence, TypeVar

import aiomysql
from pymysql.err import InterfaceError, MySQLError

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #

class UserError(Exception):
    """Expected user-facing error (don't log as server error)."""
    pass

logger = logging.getLogger("db")
if not logger.handlers:
    # Avoid "No handlers could be found" warnings if the host app hasn't
    # configured logging yet. The host application is expected to attach
    # its own handlers/formatters; this is just a safe default.
    logger.addHandler(logging.NullHandler())

T = TypeVar("T")

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #


class DBConfig:
    """Database configuration loaded from environment variables.

    All values have sane defaults so the module works out of the box in
    development, but every value relevant to production tuning is
    overridable via environment variables without touching code.
    """

    def __init__(self) -> None:
        self.host: str = os.getenv("DB_HOST", "localhost")
        self.port: int = int(os.getenv("DB_PORT", "3306"))
        self.user: str = os.getenv("DB_USER", "root")
        self.password: str = os.getenv("DB_PASSWORD", "")
        self.db: str = os.getenv("DB_NAME", "michat")

        self.minsize: int = int(os.getenv("DB_POOL_MIN", "5"))
        self.maxsize: int = int(os.getenv("DB_POOL_MAX", "50"))

        # Recycle connections older than this many seconds to avoid
        # "MySQL server has gone away" caused by wait_timeout on the server.
        self.pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))

        self.connect_timeout: int = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
        self.charset: str = os.getenv("DB_CHARSET", "utf8mb4")

        # Background health checker cadence (seconds).
        self.health_check_interval: int = int(os.getenv("DB_HEALTH_CHECK_INTERVAL", "30"))

        # Retry tuning for transient errors.
        self.max_retries: int = int(os.getenv("DB_MAX_RETRIES", "5"))
        self.retry_base_delay: float = float(os.getenv("DB_RETRY_BASE_DELAY", "0.25"))
        self.retry_max_delay: float = float(os.getenv("DB_RETRY_MAX_DELAY", "8.0"))


# MySQL error codes that represent transient / recoverable conditions.
_RETRYABLE_ERROR_CODES = {
    2003,  # Can't connect to MySQL server
    2006,  # MySQL server has gone away
    2013,  # Lost connection to MySQL server during query
    2014,  # Commands out of sync
    1040,  # Too many connections
    1205,  # Lock wait timeout exceeded
    1213,  # Deadlock found when trying to get lock
    4031,  # Client was disconnected by the server (idle timeout)
}

# Error codes that mean the underlying TCP/connection itself is dead and the
# whole pool should be considered suspect, not just the one query.
_POOL_FATAL_ERROR_CODES = {2003, 2006, 2013}


def _error_code(exc: BaseException) -> Optional[int]:
    args = getattr(exc, "args", ())
    if args and isinstance(args[0], int):
        return args[0]
    return None


def _is_retryable(exc: BaseException) -> bool:
    """Return True if ``exc`` represents a transient error worth retrying."""
    if isinstance(exc, (InterfaceError, ConnectionResetError, BrokenPipeError,
                         OSError, asyncio.TimeoutError)):
        return True
    if isinstance(exc, MySQLError):
        code = _error_code(exc)
        if code in _RETRYABLE_ERROR_CODES:
            return True
    return False


def _is_pool_fatal(exc: BaseException) -> bool:
    """Return True if ``exc`` indicates the pool's connections are broken."""
    if isinstance(exc, (InterfaceError, ConnectionResetError, BrokenPipeError, OSError)):
        return True
    if isinstance(exc, MySQLError):
        return _error_code(exc) in _POOL_FATAL_ERROR_CODES
    return False


# --------------------------------------------------------------------------- #
# Singleton Database class
# --------------------------------------------------------------------------- #



class Database:
    """Singleton, lazily-initialized async MySQL access layer.

    A single instance of this class is shared by the whole process (web
    server, bot polling loop, cron jobs, etc.) so that all callers share
    one bounded connection pool instead of exhausting MySQL's
    ``max_connections`` with ad-hoc connections.

    The class is safe to instantiate from multiple threads (e.g. a sync
    framework offloading work to a thread pool) and from multiple
    concurrent coroutines; pool creation happens exactly once.
    """

    _instance: Optional["Database"] = None
    _instance_thread_lock = threading.Lock()


    def __new__(cls) -> "Database":
        if cls._instance is None:
            with cls._instance_thread_lock:
                if cls._instance is None:
                    obj = super().__new__(cls)
                    obj._initialized_flag = False
                    cls._instance = obj
        return cls._instance

    def __init__(self) -> None:
        if self._initialized_flag:
            return
        self._initialized_flag = True

        self.config = DBConfig()
        self.pool: Optional[aiomysql.Pool] = None

        # Coroutine-level lock guarding pool creation/recreation.
        self._init_lock = asyncio.Lock()
        self._health_task: Optional[asyncio.Task] = None
        self._closing = False

    # ----------------------------------------------------------------- #
    # Lifecycle
    # ----------------------------------------------------------------- #

    @classmethod
    async def get_instance(cls) -> "Database":
        """Return the singleton :class:`Database`, ensuring the pool is ready."""
        db = cls()
        await db.init_pool()
        return db

    async def init_pool(self) -> None:
        """Create the connection pool if it doesn't already exist.

        Safe to call from many coroutines concurrently: only the first
        caller actually creates the pool, the rest simply observe that
        it's ready.
        """
        if self.pool is not None and not self.pool.closed:
            return

        async with self._init_lock:
            if self.pool is not None and not self.pool.closed:
                return

            logger.info(
                "db: creating connection pool host=%s db=%s min=%d max=%d recycle=%ds",
                self.config.host, self.config.db, self.config.minsize,
                self.config.maxsize, self.config.pool_recycle,
            )
            self.pool = await aiomysql.create_pool(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                db=self.config.db,
                minsize=self.config.minsize,
                maxsize=self.config.maxsize,
                pool_recycle=self.config.pool_recycle,
                connect_timeout=self.config.connect_timeout,
                charset=self.config.charset,
                autocommit=True,
            )

            if self._health_task is None or self._health_task.done():
                self._health_task = asyncio.create_task(self._health_check_loop())

    async def _recreate_pool(self) -> None:
        """Tear down the current pool (if any) and build a fresh one.

        Called when the health checker or a query detects the existing
        pool's connections are no longer usable (e.g. MySQL restarted).
        """
        async with self._init_lock:
            logger.warning("db: recreating connection pool after fatal error")
            old_pool, self.pool = self.pool, None
            if old_pool is not None:
                try:
                    old_pool.close()
                    await old_pool.wait_closed()
                except Exception as exc:  # noqa: BLE001 - best-effort cleanup
                    logger.error("db: error closing stale pool: %s", exc)

        await self.init_pool()

    async def _health_check_loop(self) -> None:
        """Background task: periodically ping the pool, repair it if dead."""
        while not self._closing:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                if self.pool is None or self.pool.closed:
                    continue
                async with self.pool.acquire() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute("SELECT 1")
                        await cur.fetchone()
            except asyncio.CancelledError:
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("db: health check failed (%s) - rebuilding pool", exc, exc_info=True)
                try:
                    await self._recreate_pool()
                except Exception as recreate_exc:  # noqa: BLE001
                    logger.critical("db: pool recreation failed: %s", recreate_exc, exc_info=True)

    async def close(self) -> None:
        """Gracefully stop the health checker and close the pool.

        Call this from your application's shutdown hook
        (FastAPI ``lifespan``, aiogram ``on_shutdown``, etc.).
        """
        self._closing = True
        if self._health_task is not None:
            self._health_task.cancel()
            try:
                await self._health_task
            except asyncio.CancelledError:
                pass
            self._health_task = None

        if self.pool is not None:
            self.pool.close()
            await self.pool.wait_closed()
            self.pool = None
        logger.info("db: connection pool closed")

    # ----------------------------------------------------------------- #
    # Retry wrapper
    # ----------------------------------------------------------------- #

    async def _run_with_retry(self, func: Callable[[], Awaitable[T]]) -> T:
        """Run ``func`` with exponential-backoff retry on transient errors."""
        attempt = 0
        while True:
            try:
                return await func()
            except Exception as exc:
                attempt += 1
                retryable = _is_retryable(exc)

                if not retryable or attempt > self.config.max_retries:
                    if not isinstance(exc, UserError):
                        logger.error(
                            "db: operation failed permanently after %d attempt(s): %s",
                            attempt,
                            exc,
                            exc_info=True,
                        )
                    raise

                delay = min(
                    self.config.retry_base_delay * (2 ** (attempt - 1)),
                    self.config.retry_max_delay,
                )
                delay += random.uniform(0, delay * 0.25)  # jitter

                logger.warning(
                    "db: transient error (attempt %d/%d): %s - retrying in %.2fs",
                    attempt, self.config.max_retries, exc, delay,
                )

                if _is_pool_fatal(exc):
                    try:
                        await self._recreate_pool()
                    except Exception as recreate_exc:  # noqa: BLE001
                        logger.error("db: pool recreation during retry failed: %s", recreate_exc)

                await asyncio.sleep(delay)

    # ----------------------------------------------------------------- #
    # Query helpers
    # ----------------------------------------------------------------- #

    async def fetch_one(
        self, query: str, params: Sequence[Any] | None = None
    ) -> Optional[dict[str, Any]]:
        """Execute a SELECT and return a single row as a dict, or ``None``."""

        async def _do() -> Optional[dict[str, Any]]:
            await self.init_pool()
            async with self.pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(query, params or ())
                    return await cur.fetchone()

        return await self._run_with_retry(_do)

    async def fetch_all(
        self, query: str, params: Sequence[Any] | None = None
    ) -> list[dict[str, Any]]:
        """Execute a SELECT and return all rows as a list of dicts."""

        async def _do() -> list[dict[str, Any]]:
            await self.init_pool()
            async with self.pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cur:
                    await cur.execute(query, params or ())
                    return list(await cur.fetchall())

        return await self._run_with_retry(_do)

    async def execute(self, query: str, params: Sequence[Any] | None = None) -> int:
        """Execute INSERT/UPDATE/DELETE/DDL.

        Returns the new auto-increment id for INSERTs (``lastrowid``) when
        one was generated, otherwise the number of affected rows.
        """

        async def _do() -> int:
            await self.init_pool()
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(query, params or ())
                    return cur.lastrowid or cur.rowcount

        return await self._run_with_retry(_do)


    async def execute_many(self, query: str, params_list: Iterable[Sequence[Any]]) -> int:
        """Execute a batch INSERT/UPDATE/DELETE via ``executemany``.

        Returns the total number of affected rows.
        """
        params_seq = list(params_list)

        async def _do() -> int:
            await self.init_pool()
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.executemany(query, params_seq)
                    return cur.rowcount

        return await self._run_with_retry(_do)


    # ----------------------------------------------------------------- #
    # Transactions
    # ----------------------------------------------------------------- #

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[aiomysql.Connection]:
        """Async context manager yielding a transactional connection.

        Commits automatically on clean exit, rolls back on any exception,
        and always returns the connection to the pool.

        Note: this context manager does NOT retry on deadlock/lock-wait
        errors by itself, because re-running arbitrary side-effecting code
        blindly is unsafe. Use :meth:`run_transaction` when you want
        automatic deadlock retry around a self-contained unit of work.

        Example
        -------
        ::

            async with db.transaction() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("UPDATE accounts SET balance = balance - %s WHERE id=%s",
                                      (amount, from_id))
                    await cur.execute("UPDATE accounts SET balance = balance + %s WHERE id=%s",
                                      (amount, to_id))
        """
        await self.init_pool()
        conn = await self.pool.acquire()
        try:
            await conn.begin()
            yield conn
            await conn.commit()
        except Exception:
            try:
                await conn.rollback()
            except Exception as rollback_exc:  # noqa: BLE001
                logger.error("db: rollback failed: %s", rollback_exc, exc_info=True)
            raise
        finally:
            self.pool.release(conn)

    async def run_transaction(
        self,
        func: Callable[..., Awaitable[T]],
        *args: Any,
        **kwargs: Any,
    ) -> T:
        """Run ``func(conn, *args, **kwargs)`` inside a transaction with retry.

        ``func`` must be a coroutine function accepting the connection as
        its first positional argument. The whole transaction is retried
        with exponential backoff if it fails with a deadlock or lock-wait
        timeout, which is safe specifically because the transaction either
        fully commits or fully rolls back before any retry happens.

        Example
        -------
        ::

            async def _transfer(conn, from_id, to_id, amount):
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE accounts SET balance = balance - %s "
                        "WHERE id=%s AND balance >= %s",
                        (amount, from_id, amount),
                    )
                    if cur.rowcount == 0:
                        raise ValueError("insufficient balance")
                    await cur.execute(
                        "UPDATE accounts SET balance = balance + %s WHERE id=%s",
                        (amount, to_id),
                    )

            await db.run_transaction(_transfer, from_id, to_id, amount)
        """

        async def _do() -> T:
            async with self.transaction() as conn:
                return await func(conn, *args, **kwargs)

        return await self._run_with_retry(_do)




# --------------------------------------------------------------------------- #
# Module-level convenience accessor
# --------------------------------------------------------------------------- #

db = Database()
"""Process-wide singleton instance. Import this directly in most code:

    from db import db
    user = await db.fetch_one("SELECT * FROM users WHERE user_id=%s", (uid,))
"""


async def get_db() -> Database:
    """FastAPI-style dependency / general accessor that guarantees the pool is ready.

    Usage in FastAPI::

        @app.get("/users/{user_id}")
        async def get_user(user_id: int, db: Database = Depends(get_db)):
            return await db.fetch_one("SELECT * FROM users WHERE user_id=%s", (user_id,))
    """
    await db.init_pool()
    return db


__all__ = ["Database", "DBConfig", "db", "get_db"]


# =========================================================================== #
# Usage examples
# =========================================================================== #
#
# --- Plain async script -----------------------------------------------------
#
# import asyncio
# from db import db
#
# async def main():
#     await db.init_pool()
#     await db.execute(
#         "INSERT IGNORE INTO users (user_id, username) VALUES (%s, %s)",
#         (123456, "shivansh"),
#     )
#     user = await db.fetch_one("SELECT * FROM users WHERE user_id=%s", (123456,))
#     print(user)
#     await db.close()
#
# asyncio.run(main())
#
#
# --- FastAPI -----------------------------------------------------------------
#
# from contextlib import asynccontextmanager
# from fastapi import FastAPI, Depends
# from db import db, get_db, Database
#
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await db.init_pool()
#     yield
#     await db.close()
#
# app = FastAPI(lifespan=lifespan)
#
# @app.get("/orders/{order_id}")
# async def read_order(order_id: int, database: Database = Depends(get_db)):
#     return await database.fetch_one("SELECT * FROM orders WHERE id=%s", (order_id,))
#
#
# --- aiogram (v3) --------------------------------------------------------
#
# from aiogram import Bot, Dispatcher
# from db import db
#
# dp = Dispatcher()
#
# @dp.startup()
# async def on_startup():
#     await db.init_pool()
#
# @dp.shutdown()
# async def on_shutdown():
#     await db.close()
#
# @dp.message()
# async def handle_message(message):
#     row = await db.fetch_one(
#         "SELECT balance FROM users WHERE user_id=%s", (message.from_user.id,)
#     )
#     balance = row["balance"] if row else 0
#     await message.answer(f"Your balance: {balance}")
#
#
# --- python-telegram-bot (v20+) ----------------------------------------------
#
# from telegram.ext import ApplicationBuilder, CommandHandler
# from db import db
#
# async def post_init(application):
#     await db.init_pool()
#
# async def post_shutdown(application):
#     await db.close()
#
# async def balance_command(update, context):
#     row = await db.fetch_one(
#         "SELECT balance FROM users WHERE user_id=%s", (update.effective_user.id,)
#     )
#     await update.message.reply_text(f"Balance: {row['balance'] if row else 0}")
#
# app = (
#     ApplicationBuilder()
#     .token("BOT_TOKEN")
#     .post_init(post_init)
#     .post_shutdown(post_shutdown)
#     .build()
# )
# app.add_handler(CommandHandler("balance", balance_command))
# app.run_polling()
#
#
# --- Safe balance transfer using run_transaction (deadlock-safe) ------------
#
# async def _transfer(conn, from_id, to_id, amount):
#     async with conn.cursor() as cur:
#         await cur.execute(
#             "SELECT balance FROM users WHERE user_id=%s FOR UPDATE",
#             (from_id,),
#         )
#         row = await cur.fetchone()
#         if row is None or row[0] < amount:
#             raise ValueError("insufficient balance")
#         await cur.execute(
#             "UPDATE users SET balance = balance - %s WHERE user_id=%s",
#             (amount, from_id),
#         )
#         await cur.execute(
#             "UPDATE users SET balance = balance + %s WHERE user_id=%s",
#             (amount, to_id),
#         )
#
# await db.run_transaction(_transfer, from_user_id, to_user_id, 100)
#
#
# --- execute_many for bulk inserts (e.g. importing OTP numbers) ------------
#
# await db.execute_many(
#     "INSERT INTO numbers (provider, number, country) VALUES (%s, %s, %s)",
#     [("lion", "+1555000111", "US"), ("lion", "+1555000222", "US")],
# )