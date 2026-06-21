from services.query_service import QueryDB
from utils.response import success_response, error_response


class LoginService:
    def __init__(self, email, password, captcha, answer_captcha):
        self.email = email
        self.password = password
        self.captcha = captcha
        self.answer_captcha = answer_captcha

    def login(self):
        if self.captcha != self.answer_captcha:
            return error_response("Captcha không chính xác.")

        get_id = QueryDB.query("SELECT id FROM users WHERE email = %s ", (self.email,))
        if get_id is None:
            return error_response("Email hoặc mật khẩu không chính xác.")

        get_id = dict(get_id)["id"]

        password = QueryDB.query("SELECT password_hash FROM user_credentials WHERE user_id = %s", (get_id,))
        if password is None:
            return error_response("Email hoặc mật khẩu không chính xác.")

        password = dict(password)["password_hash"]

        if self.password == password:
            user = QueryDB.query("SELECT id, full_name, role_id, email FROM users WHERE id = %s", (get_id,))

            if user is None:
                return error_response("Email hoặc mật khẩu không chính xác.")

            user = dict(user)

            return success_response(
                message="Đăng nhập thành công.",
                data={
                    "full_name": user["full_name"],
                    "role_id": user["role_id"],
                    "user_id": user["id"],
                    "email": user["email"],
                },
            )

        return error_response("Email hoặc mật khẩu không chính xác.")


class RegisterService:
    def __init__(self, full_name, phone_number, email, password, captcha, answer_captcha):
        self.full_name = full_name
        self.phone_number = phone_number
        self.email = email
        self.password = password
        self.captcha = captcha
        self.answer_captcha = answer_captcha

    def register(self):
        if self.captcha != self.answer_captcha:
            return error_response("Captcha không chính xác.")

        check_phone = QueryDB.query("SELECT id FROM users WHERE phone_number = %s", (self.phone_number,))
        if check_phone is not None:
            return error_response("Số điện thoại đã được sử dụng.")

        check_email = QueryDB.query("SELECT id FROM users WHERE email = %s", (self.email,))
        if check_email is not None:
            return error_response("Email đã được sử dụng.")

        role = QueryDB.query("SELECT id FROM roles WHERE name = %s", ("user",))
        if role is None:
            return error_response("Role user không tồn tại.")

        role_id = dict(role)["id"]

        QueryDB.query("INSERT INTO users (role_id, full_name, phone_number, email, avatar_url, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",(role_id, self.full_name, self.phone_number, self.email, None, "active"),fetch="none")

        get_user = QueryDB.query("SELECT id FROM users WHERE email = %s", (self.email,))
        if get_user is None:
            return error_response("Tạo tài khoản thất bại.")

        user_id = dict(get_user)["id"]

        QueryDB.query("INSERT INTO user_credentials (user_id, password_hash) VALUES (%s, %s)", (user_id, self.password),fetch="none")

        return success_response(message="Đăng ký tài khoản thành công.")


class ForgotService:
    def __init__(self, email, captcha, answer_captcha):
        self.email = email
        self.captcha = captcha
        self.answer_captcha = answer_captcha

    def forgot(self):
        if self.captcha != self.answer_captcha:
            return error_response("Captcha không chính xác.")

        check_email = QueryDB.query("SELECT EXISTS(SELECT 1 FROM users WHERE email = %s) AS exists", (self.email,))

        if check_email is None:
            return error_response("Không kiểm tra được email.")

        status_email = dict(check_email)["exists"]

        if not status_email:
            return error_response("Email không tồn tại.")

        return success_response(message="Đã cấp lại mật khẩu.")
