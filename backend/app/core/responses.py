
from typing import Any


def success_response(
    data: Any = None,
    message: str = "Request successful",
    status_code: int = 200
):
    return {
        "success": True,
        "message": message,
        "data": data,
        "status_code": status_code
    }


def error_response(
    message: str = "Something went wrong",
    status_code: int = 400,
    errors: Any = None
):
    return {
        "success": False,
        "message": message,
        "data": None,
        "errors": errors,
        "status_code": status_code
    }
