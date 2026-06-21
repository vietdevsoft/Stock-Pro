import os
import random
import uuid
from fastapi import HTTPException
import redis


CAPTCHA_FOLDER = "static/captcha"
CAPTCHA_TTL_SECONDS = 100

class Captcha_Services:
    def __init__(self):
        self.redis_client = redis.Redis(
            host="localhost",
            port=6379,
            db=0,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        
    def get_random_captcha_path(self,):
        captcha_files = [file for file in os.listdir(CAPTCHA_FOLDER) if file.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]

        selected_file = random.choice(captcha_files)

        captcha_path = os.path.join(CAPTCHA_FOLDER, selected_file)
        captcha_answer = os.path.splitext(selected_file)[0]
        return captcha_path, captcha_answer


    def save_captcha_answer(self, captcha_answer):
        captcha_id = str(uuid.uuid4())
        self.redis_client.set(f"captcha:{captcha_id}", captcha_answer, ex=CAPTCHA_TTL_SECONDS)
        return captcha_id


    def get_captcha_answer(self, captcha_id):
        return self.redis_client.get(f"captcha:{captcha_id}")


    def delete_captcha_answer(self, captcha_id):
        return self.redis_client.delete(f"captcha:{captcha_id}")
