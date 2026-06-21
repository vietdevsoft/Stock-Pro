from fastapi import APIRouter
from utils.response import success_response

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/")
def list_payments():
    return success_response(message="List payments")
