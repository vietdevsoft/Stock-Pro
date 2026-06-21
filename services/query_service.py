from services.database_service import get_connection


class QueryDB:
    @staticmethod
    def query(sql: str, data: tuple | None, fetch: str = "one"):
        conn = None
        cursor = None

        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(sql, data)

            # SELECT lấy 1 dòng
            if fetch == "one":
                result = cursor.fetchone()

            # SELECT lấy nhiều dòng
            elif fetch == "all":
                result = cursor.fetchall()

            # INSERT / UPDATE / DELETE không cần lấy dữ liệu
            elif fetch == "none":
                result = None

            else:
                result = cursor.fetchone()

            conn.commit()

            return result

        except Exception as e:
            if conn:
                conn.rollback()
            raise e

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
