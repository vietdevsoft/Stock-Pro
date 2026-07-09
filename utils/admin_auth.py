from fastapi import HTTPException, Request, status

from services.query_service import QueryDB
from utils.security import JWT_Auth


def get_current_user(request: Request):
    access_token = request.cookies.get("access_token")
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bạn chưa đăng nhập.",
        )

    payload = JWT_Auth().verify_access_token(access_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn.",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin người dùng.",
        )

    user = QueryDB.query(
        """
        SELECT users.id, users.role_id, users.full_name, users.email, users.status,
               roles.name AS role_name
        FROM users
        LEFT JOIN roles ON roles.id = users.role_id
        WHERE users.id = %s
        """,
        (user_id,),
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại.",
        )

    user = dict(user)
    if user.get("status") in ("deleted", "locked", "blocked"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền truy cập.",
        )

    return user


def require_admin_user(request: Request):
    user = get_current_user(request)
    if int(user.get("role_id") or 0) not in (1, 3):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị.",
        )
    return user


def require_super_admin_user(request: Request):
    user = get_current_user(request)
    if int(user.get("role_id") or 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Admin mới có quyền thực hiện thao tác này.",
        )
    return user
