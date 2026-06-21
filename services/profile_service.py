import os
import uuid
from services.query_service import QueryDB
from utils.response import success_response, error_response


class UserService:
    def __init__(self, user_id):
        self.user_id = user_id

    def get_user_profile(self):
        user = QueryDB.query(
            """SELECT full_name, role_id, phone_number, email, avatar_url, status, created_at, updated_at FROM users WHERE id = %s""",
            (self.user_id,)
        )

        if user is None:
            return error_response("Không tìm thấy thông tin người dùng.")

        user = dict(user)

        return success_response(
            message="Lấy thông tin người dùng thành công.",
            data={
                "full_name": user["full_name"],
                "role_id": user["role_id"],
                "phone_number": user["phone_number"],
                "email": user["email"],
                "avatar_url": user["avatar_url"],
                "status": user["status"],
                "created_at": user["created_at"],
                "updated_at": user["updated_at"],
            },
        )

    def save_avatar(self, avatar):
        old_avatar = QueryDB.query("SELECT avatar_url FROM users WHERE id = %s", (self.user_id,))
        old_avatar_url = dict(old_avatar)["avatar_url"] if old_avatar else None

        ext = avatar.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        save_path = os.path.join("static", "avatar", filename)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, "wb") as f:
            f.write(avatar.file.read())

        avatar_url = f"/static/avatar/{filename}"

        QueryDB.query("UPDATE users SET avatar_url = %s, updated_at = NOW() WHERE id = %s",(avatar_url, self.user_id),)

        if old_avatar_url:
            avatar_folder = os.path.abspath(os.path.join("static", "avatar"))
            old_avatar_path = os.path.abspath(os.path.normpath(old_avatar_url.lstrip("/")))

            if old_avatar_path.startswith(avatar_folder + os.sep) and os.path.isfile(old_avatar_path):
                os.remove(old_avatar_path)

        return success_response(message="Cập nhật avatar thành công.", data={"avatar_url": avatar_url})
