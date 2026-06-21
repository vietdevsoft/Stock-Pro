from fastapi import APIRouter
from utils.response import success_response

router = APIRouter(prefix="/categorys", tags=["categorys"])


@router.get("/")
def list_categorys():
    return success_response(message="List categorys")
