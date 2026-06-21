from fastapi import APIRouter, Request, Response,  HTTPException
from schemas.auth_schema import RegisterRequests, LoginRequests, ForgotRequests
from services.auth_service import LoginService, RegisterService, ForgotService
from services.captcha_service import Captcha_Services
from utils.security import JWT_Auth
from utils.response import success_response
from urllib.parse import quote
router = APIRouter(prefix="/auths", tags=["auths"])


@router.post("/register")
def register(data: RegisterRequests, request: Request):
    full_name = data.full_name
    phone_number = data.phone_number
    email = data.email
    password = data.password
    captcha = data.captcha
    captcha_id = request.cookies.get("captcha_id")
    captcha_answer = Captcha_Services().get_captcha_answer(captcha_id)
    Captcha_Services().delete_captcha_answer(captcha_id)

    result = RegisterService(full_name, phone_number, email, password, captcha, captcha_answer).register()
    return result

@router.post("/login")
def login(data: LoginRequests, request: Request, response: Response):
    email = data.email
    password = data.password
    captcha = data.captcha
    captcha_id = request.cookies.get("captcha_id")
    captcha_answer = Captcha_Services().get_captcha_answer(captcha_id)
    Captcha_Services().delete_captcha_answer(captcha_id)

    result = LoginService(email, password, captcha, captcha_answer).login()
    if result["success"]:
        
        token_data = {
            "sub": str(result["data"]['user_id']),
            "role_id": result["data"]['role_id']
        }

        access_token = JWT_Auth().create_access_token(token_data)
        result["token_type"] = "bearer"
        result["access_token"] = access_token
        
        # Cookie dùng để xác thực
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=60 * 60 * 24,
            samesite="lax",
            secure=True
        )

    return result



@router.post("/forgot-password")
def forgot_password(data: ForgotRequests, request: Request):
    email = data.email
    captcha = data.captcha
    captcha_id = request.cookies.get("captcha_id")
    captcha_answer = Captcha_Services().get_captcha_answer(captcha_id)
    Captcha_Services().delete_captcha_answer(captcha_id)

    result = ForgotService(email, captcha, captcha_answer).forgot()
    return result


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return success_response(message="Đăng xuất thành công.")
