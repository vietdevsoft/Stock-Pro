from pydantic import BaseModel, EmailStr


class LoginRequests(BaseModel):
    email: EmailStr
    password: str
    captcha: str

class RegisterRequests(BaseModel):
    full_name: str
    phone_number: str
    email: EmailStr
    password: str
    captcha: str

class ForgotRequests(BaseModel):
    email: EmailStr
    captcha: str