from fastapi import APIRouter
from utils.response import success_response

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions():
    return success_response(message="List transactions")
