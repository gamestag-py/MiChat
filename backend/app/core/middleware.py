
import logging
import time

from fastapi import Request

logger = logging.getLogger("michat.requests")


async def request_logging_middleware(
    request: Request,
    call_next
):
    start_time = time.perf_counter()

    try:
        response = await call_next(request)

        duration = (time.perf_counter() - start_time) * 1000

        logger.info(
            "%s %s | Status: %s | Duration: %.2f ms",
            request.method,
            request.url.path,
            response.status_code,
            duration
        )

        return response

    except Exception:
        duration = (time.perf_counter() - start_time) * 1000

        logger.exception(
            "%s %s | Failed | Duration: %.2f ms",
            request.method,
            request.url.path,
            duration
        )
        raise
