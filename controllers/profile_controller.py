from fastapi import APIRouter, Request
from services.profile_service import UserService
from fastapi import UploadFile, File
from utils.security import JWT_Auth
from utils.response import success_response, error_response
from services.query_service import QueryDB


router = APIRouter(prefix="/users", tags=["users"])


def service_response(result):
    if result.get("success"):
        return success_response(message=result.get("message"), data=result.get("data"))

    return error_response(result.get("message"), result.get("data"))


@router.get("/profile")
def get_profile(request: Request):
    access_token = request.cookies.get("access_token")

    if access_token is None:
        return error_response("Bạn chưa đăng nhập.")

    payload = JWT_Auth().verify_access_token(access_token)

    if payload is None:
        return error_response("Token không hợp lệ hoặc đã hết hạn.")

    user_id = payload.get("sub")

    if user_id is None:
        return error_response("Token không chứa thông tin người dùng.")

    result = UserService(user_id).get_user_profile()
    return service_response(result)


@router.post("/avatar")
def upload_avatar(request: Request, avatar: UploadFile = File(...)):
    access_token = request.cookies.get("access_token")

    if access_token is None:
        return error_response("Bạn chưa đăng nhập.")

    payload = JWT_Auth().verify_access_token(access_token)

    if payload is None:
        return error_response("Token không hợp lệ hoặc đã hết hạn.")

    user_id = payload.get("sub")

    if user_id is None:
        return error_response("Token không chứa thông tin người dùng.")

    result = UserService(user_id).save_avatar(avatar)
    return service_response(result)

@router.post("/update-infomation")
def update_info(request: Request, data: dict):
    access_token = request.cookies.get("access_token")
    if access_token is None:
            return error_response("Bạn chưa đăng nhập.")
    
    payload = JWT_Auth().verify_access_token(access_token)
    if payload is None:
        return error_response("Token không hợp lệ hoặc đã hết hạn.")
    
    user_id = payload.get("sub")
    update_data = {
        "full_name": data.get("full_name"),
        "phone_number": data.get("phone_number")
    }

    try:
        QueryDB.query(
            "UPDATE users SET full_name = %s, phone_number = %s, updated_at = NOW() WHERE id = %s",
            (
                update_data["full_name"],
                update_data["phone_number"],
                user_id
            ),
            fetch="none"
        )
        return success_response(message="Cập nhật thông tin thành công.", data=update_data)
    except Exception:
        return error_response("Cập nhật thông tin thất bại.")
