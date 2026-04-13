"""
Structured request/response logging middleware.
Logs method, path, status, latency, and user context for every request.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    SKIP_PATHS = {"/health/ping", "/health/ready", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start = time.time()

        # Attach request_id to log context
        with logger.contextualize(request_id=request_id):
            try:
                response = await call_next(request)
                elapsed_ms = (time.time() - start) * 1000

                logger.info(
                    "{method} {path} {status} {elapsed:.0f}ms",
                    method=request.method,
                    path=request.url.path,
                    status=response.status_code,
                    elapsed=elapsed_ms,
                )

                response.headers["X-Request-ID"]   = request_id
                response.headers["X-Response-Time"] = f"{elapsed_ms:.0f}ms"
                return response

            except Exception as exc:
                elapsed_ms = (time.time() - start) * 1000
                logger.error(
                    "{method} {path} UNHANDLED {elapsed:.0f}ms — {error}",
                    method=request.method,
                    path=request.url.path,
                    elapsed=elapsed_ms,
                    error=str(exc),
                )
                raise
