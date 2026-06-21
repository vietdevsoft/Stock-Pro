from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class HashingPasword:
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        return pwd_context.verify(password, password_hash)


class JWT_Auth:
    SECRET_KEY = "stock_pro_jwt_secret_key_123456"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


    def create_access_token(self, data: dict):
        payload = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_Auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload.update({"exp": expire})
        token = jwt.encode(payload, JWT_Auth.SECRET_KEY, algorithm=JWT_Auth.ALGORITHM)
        return token


    def verify_access_token(self, token: str) -> dict | None:
        try:
            payload = jwt.decode(token, JWT_Auth.SECRET_KEY, algorithms=[JWT_Auth.ALGORITHM])
            return payload
        except JWTError:
            return None
