import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    if DATABASE_URL is None:
        raise RuntimeError("Thiếu DATABASE_URL trong file .env")

    try:
        conn = psycopg2.connect(
            DATABASE_URL,
            cursor_factory=RealDictCursor
        )
        return conn

    except Exception as e:
        raise RuntimeError(f"Kết nối PostgreSQL thất bại: {e}")
    
if __name__ == "__main__":
    conn = get_connection()
    print("Kết nối PostgreSQL thành công")
    conn.close()