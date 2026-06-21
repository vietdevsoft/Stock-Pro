from fastapi import APIRouter
from utils.response import success_response

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/")
def list_orders():
    return success_response(message="List orders")
