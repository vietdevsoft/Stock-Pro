from fastapi import APIRouter
from fastapi.responses import FileResponse
from services.captcha_service import Captcha_Services
import redis, uuid


router = APIRouter(tags=["Captcha"])


@router.get("/captcha")
def get_captcha():
    captcha_path, captcha_answer= Captcha_Services().get_random_captcha_path()

    captcha_id = Captcha_Services().save_captcha_answer(captcha_answer)


    response = FileResponse(path=captcha_path, media_type="image/png")

    response.set_cookie(key="captcha_id", value=captcha_id, httponly=True, max_age=100)

    return response