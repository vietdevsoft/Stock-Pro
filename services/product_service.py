from datetime import date, datetime
from decimal import Decimal

from psycopg2.extras import Json

from services.database_service import get_connection
from services.query_service import QueryDB
from utils.response import error_response, success_response


class ProductList:
    def _success(self, message, data=None, **extra):
        response = success_response(message=message, data=data)
        response.update(extra)
        return response

    def _failure(self, message, data=None):
        return error_response(message, data)

    def _payload_dict(self, payload, exclude_unset=False):
        if payload is None:
            return {}
        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=exclude_unset)
        return dict(payload)

    def _payload_value(self, payload, *keys, default=None):
        payload = self._payload_dict(payload)
        for key in keys:
            if key in payload and payload[key] not in (None, ""):
                return payload[key]
        return default

    def _page(self, page=1, page_size=500):
        try:
            page = int(page or 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(page_size or 500)
        except (TypeError, ValueError):
            page_size = 500

        page = max(page, 1)
        page_size = min(max(page_size, 1), 500)
        return page, page_size, (page - 1) * page_size

    def _pagination(self, page, page_size, total):
        total = int(total or 0)
        total_pages = (total + page_size - 1) // page_size if total else 0
        return {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }

    def _actor_metadata(self, actor):
        if not actor:
            return {"id": None, "email": None, "role_id": None, "role_name": None}
        return {
            "id": actor.get("id"),
            "email": actor.get("email"),
            "role_id": actor.get("role_id"),
            "role_name": actor.get("role_name"),
        }

    def _json_safe(self, value):
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: self._json_safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [self._json_safe(item) for item in value]
        return value

    def _audit(self, cursor, actor, action, entity_type, entity_id=None, metadata=None):
        actor = self._actor_metadata(actor)
        cursor.execute(
            """
            INSERT INTO audit_logs (
                actor_user_id, actor_email, actor_role_id,
                action, entity_type, entity_id, metadata, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                actor["id"],
                actor["email"],
                actor["role_id"],
                action,
                entity_type,
                str(entity_id) if entity_id is not None else None,
                Json(self._json_safe(metadata or {})),
            ),
        )

    def _ensure_category_and_unit(self, cursor, category_id, unit_id):
        if category_id is not None:
            cursor.execute(
                "SELECT id FROM categories WHERE id = %s AND COALESCE(status, 'active') <> 'deleted'",
                (category_id,),
            )
            if cursor.fetchone() is None:
                raise ValueError("Danh mục không tồn tại.")

        if unit_id is not None:
            cursor.execute("SELECT id FROM units WHERE id = %s", (unit_id,))
            if cursor.fetchone() is None:
                raise ValueError("Đơn vị không tồn tại.")

    def _stock_has_available_columns(self, cursor):
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'product_stocks'
              AND column_name IN ('quantity_reserved', 'quantity_available')
            """
        )
        columns = {row["column_name"] for row in cursor.fetchall()}
        return {"quantity_reserved", "quantity_available"}.issubset(columns)

    def _ensure_stock_row(self, cursor, product_id):
        if self._stock_has_available_columns(cursor):
            cursor.execute(
                """
                INSERT INTO product_stocks (
                    product_id, quantity_on_hand, quantity_reserved,
                    quantity_available, created_at, updated_at
                )
                VALUES (%s, 0, 0, 0, NOW(), NOW())
                ON CONFLICT (product_id) DO NOTHING
                """,
                (product_id,),
            )
            return

        cursor.execute(
            """
            INSERT INTO product_stocks (product_id, quantity_on_hand, created_at, updated_at)
            VALUES (%s, 0, NOW(), NOW())
            ON CONFLICT (product_id) DO NOTHING
            """,
            (product_id,),
        )

    def _set_stock_quantity(self, cursor, product_id, quantity):
        if self._stock_has_available_columns(cursor):
            cursor.execute(
                """
                INSERT INTO product_stocks (
                    product_id, quantity_on_hand, quantity_reserved,
                    quantity_available, created_at, updated_at
                )
                VALUES (%s, %s, 0, %s, NOW(), NOW())
                ON CONFLICT (product_id) DO UPDATE
                SET quantity_on_hand = EXCLUDED.quantity_on_hand,
                    quantity_available = EXCLUDED.quantity_on_hand - product_stocks.quantity_reserved,
                    updated_at = NOW()
                """,
                (product_id, quantity, quantity),
            )
            return

        cursor.execute(
            """
            INSERT INTO product_stocks (product_id, quantity_on_hand, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON CONFLICT (product_id) DO UPDATE
            SET quantity_on_hand = EXCLUDED.quantity_on_hand,
                updated_at = NOW()
            """,
            (product_id, quantity),
        )

    def _update_stock_quantity(self, cursor, product_id, quantity):
        if self._stock_has_available_columns(cursor):
            cursor.execute(
                """
                UPDATE product_stocks
                SET quantity_on_hand = %s,
                    quantity_available = %s - quantity_reserved,
                    updated_at = NOW()
                WHERE product_id = %s
                """,
                (quantity, quantity, product_id),
            )
            return

        cursor.execute(
            "UPDATE product_stocks SET quantity_on_hand = %s, updated_at = NOW() WHERE product_id = %s",
            (quantity, product_id),
        )

    def get_products(self, q=None, category_id=None, status=None, page=1, page_size=500):
        page, page_size, offset = self._page(page, page_size)
        where = ["COALESCE(products.status, 'active') <> 'deleted'"]
        params = []

        if q:
            where.append("(products.product_code ILIKE %s OR products.product_name ILIKE %s)")
            keyword = f"%{q}%"
            params.extend([keyword, keyword])
        if category_id not in (None, "", "all"):
            where.append("products.category_id = %s")
            params.append(category_id)
        if status not in (None, "", "all"):
            where.append("COALESCE(products.status, 'active') = %s")
            params.append(status)

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM products
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        sql = f"""
            SELECT
                products.*,
                categories.name AS category_name,
                units.name AS unit_name,
                COALESCE(product_stocks.quantity_on_hand, 0) AS quantity_on_hand,
                COALESCE(exported.total_exported, 0) AS exported
            FROM products
            LEFT JOIN categories ON categories.id = products.category_id
            LEFT JOIN units ON units.id = products.unit_id
            LEFT JOIN product_stocks ON product_stocks.product_id = products.id
            LEFT JOIN (
                SELECT product_id, SUM(quantity) AS total_exported
                FROM inventory_transactions
                WHERE transaction_type = 'export'
                GROUP BY product_id
            ) exported ON exported.product_id = products.id
            WHERE {" AND ".join(where)}
            ORDER BY products.id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([page_size, offset])
        products = QueryDB.query(sql, tuple(params), "all") or []
        return self._success(
            "Lấy danh sách sản phẩm thành công.",
            products,
            pagination=self._pagination(page, page_size, total),
        )

    def get_categories(self, q=None, status=None, page=1, page_size=500):
        page, page_size, offset = self._page(page, page_size)
        where = ["COALESCE(status, 'active') <> 'deleted'"]
        params = []
        if q:
            where.append("name ILIKE %s")
            params.append(f"%{q}%")
        if status not in (None, "", "all"):
            where.append("COALESCE(status, 'active') = %s")
            params.append(status)

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM categories
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        params.extend([page_size, offset])
        categories = QueryDB.query(
            f"""
            SELECT *
            FROM categories
            WHERE {" AND ".join(where)}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
            "all",
        ) or []
        return self._success(
            "Lấy danh sách danh mục thành công.",
            categories,
            pagination=self._pagination(page, page_size, total),
        )

    def get_product_stock(self, product_id):
        stock = QueryDB.query(
            "SELECT quantity_on_hand FROM product_stocks WHERE product_id = %s",
            (product_id,),
        )
        if stock is None:
            return self._failure("Sản phẩm không tồn tại.")
        return self._success("Lấy thông tin tồn kho thành công.", stock)

    def get_transaction(self, q=None, transaction_type=None, date=None, page=1, page_size=500):
        page, page_size, offset = self._page(page, page_size)
        where = ["1 = 1"]
        params = []

        if q:
            where.append(
                """
                (
                    products.product_code ILIKE %s
                    OR products.product_name ILIKE %s
                    OR inventory_transactions.note ILIKE %s
                    OR inventory_transactions.operator_name ILIKE %s
                )
                """
            )
            keyword = f"%{q}%"
            params.extend([keyword, keyword, keyword, keyword])
        if transaction_type in ("import", "export"):
            where.append("inventory_transactions.transaction_type = %s")
            params.append(transaction_type)
        if date:
            where.append("inventory_transactions.created_at::date = %s")
            params.append(date)

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM inventory_transactions
            LEFT JOIN products ON products.id = inventory_transactions.product_id
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        params.extend([page_size, offset])
        transactions = QueryDB.query(
            f"""
            SELECT
                inventory_transactions.*,
                products.product_code AS code,
                products.product_name AS name
            FROM inventory_transactions
            LEFT JOIN products ON products.id = inventory_transactions.product_id
            WHERE {" AND ".join(where)}
            ORDER BY inventory_transactions.created_at DESC, inventory_transactions.id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
            "all",
        ) or []
        return self._success(
            "Lấy lịch sử giao dịch thành công.",
            transactions,
            pagination=self._pagination(page, page_size, total),
        )

    def get_unit(self, q=None, page=1, page_size=500):
        page, page_size, offset = self._page(page, page_size)
        where = ["1 = 1"]
        params = []
        if q:
            where.append("(name ILIKE %s OR symbol ILIKE %s)")
            keyword = f"%{q}%"
            params.extend([keyword, keyword])

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM units
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        params.extend([page_size, offset])
        units = QueryDB.query(
            f"""
            SELECT *
            FROM units
            WHERE {" AND ".join(where)}
            ORDER BY id ASC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
            "all",
        ) or []
        return self._success(
            "Lấy danh sách đơn vị thành công.",
            units,
            pagination=self._pagination(page, page_size, total),
        )

    def get_users(self, q=None, role_id=None, status=None, page=1, page_size=500):
        page, page_size, offset = self._page(page, page_size)
        where = ["1 = 1"]
        params = []

        if q:
            where.append("(users.full_name ILIKE %s OR users.email ILIKE %s OR users.phone_number ILIKE %s)")
            keyword = f"%{q}%"
            params.extend([keyword, keyword, keyword])
        if role_id not in (None, "", "all"):
            where.append("users.role_id = %s")
            params.append(role_id)
        if status not in (None, "", "all"):
            where.append("COALESCE(users.status, 'active') = %s")
            params.append(status)

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM users
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        params.extend([page_size, offset])
        users = QueryDB.query(
            f"""
            SELECT
                users.id,
                users.role_id,
                roles.name AS role_name,
                users.full_name,
                users.phone_number,
                users.email,
                users.avatar_url,
                users.status,
                users.created_at,
                users.updated_at
            FROM users
            LEFT JOIN roles ON roles.id = users.role_id
            WHERE {" AND ".join(where)}
            ORDER BY users.id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
            "all",
        ) or []
        return self._success(
            "Lấy danh sách người dùng thành công.",
            users,
            pagination=self._pagination(page, page_size, total),
        )

    def create_product(self, payload, actor=None):
        data = self._payload_dict(payload)
        code = str(data.get("code") or data.get("product_code") or "").strip()
        name = str(data.get("name") or data.get("product_name") or "").strip()
        category_id = data.get("categoryId") or data.get("category_id")
        unit_id = data.get("unitId") or data.get("unit_id")
        quantity = int(data.get("quantity") or 0)
        min_stock = int(data.get("minStock") or data.get("min_stock") or 0)
        price = float(data.get("price") or 0)
        image_url = data.get("image") or data.get("image_url")
        description = data.get("description") or ""

        if not code or not name:
            return self._failure("Mã sản phẩm và tên sản phẩm không được trống.")
        if quantity < 0 or min_stock < 0 or price <= 0:
            return self._failure("Số lượng, tồn tối thiểu và đơn giá không hợp lệ.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            self._ensure_category_and_unit(cursor, category_id, unit_id)

            cursor.execute(
                "SELECT id FROM products WHERE product_code = %s AND COALESCE(status, 'active') <> 'deleted'",
                (code,),
            )
            if cursor.fetchone() is not None:
                conn.rollback()
                return self._failure("Mã sản phẩm đã tồn tại.")

            cursor.execute(
                """
                INSERT INTO products (
                    product_code, product_name, category_id, unit_id,
                    min_stock, price, image_url, description, status,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', NOW(), NOW())
                RETURNING *
                """,
                (code, name, category_id, unit_id, min_stock, price, image_url, description),
            )
            product = cursor.fetchone()
            self._set_stock_quantity(cursor, product["id"], quantity)
            self._audit(cursor, actor, "product.create", "product", product["id"], {"code": code})
            conn.commit()
            return self._success("Thêm sản phẩm thành công.", product)
        except ValueError as error:
            if conn:
                conn.rollback()
            return self._failure(str(error))
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể thêm sản phẩm: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_product(self, product_id, payload, actor=None):
        data = self._payload_dict(payload, exclude_unset=True)
        if not data:
            return self._failure("Không có dữ liệu cập nhật.")

        field_map = {
            "code": ("product_code", lambda value: str(value).strip()),
            "name": ("product_name", lambda value: str(value).strip()),
            "categoryId": ("category_id", lambda value: value),
            "unitId": ("unit_id", lambda value: value),
            "minStock": ("min_stock", lambda value: int(value)),
            "price": ("price", lambda value: float(value)),
            "image": ("image_url", lambda value: value),
            "description": ("description", lambda value: value or ""),
            "status": ("status", lambda value: value),
        }

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM products WHERE id = %s AND COALESCE(status, 'active') <> 'deleted' FOR UPDATE",
                (product_id,),
            )
            before = cursor.fetchone()
            if before is None:
                conn.rollback()
                return self._failure("Không tìm thấy sản phẩm.")

            category_id = data.get("categoryId")
            unit_id = data.get("unitId")
            self._ensure_category_and_unit(cursor, category_id, unit_id)

            if "code" in data:
                code = str(data["code"]).strip()
                if not code:
                    conn.rollback()
                    return self._failure("Mã sản phẩm không được trống.")
                cursor.execute(
                    """
                    SELECT id
                    FROM products
                    WHERE product_code = %s
                      AND id <> %s
                      AND COALESCE(status, 'active') <> 'deleted'
                    """,
                    (code, product_id),
                )
                if cursor.fetchone() is not None:
                    conn.rollback()
                    return self._failure("Mã sản phẩm đã tồn tại.")

            updates = []
            params = []
            for key, (column, transform) in field_map.items():
                if key not in data:
                    continue
                value = transform(data[key])
                if key in ("code", "name") and not value:
                    conn.rollback()
                    return self._failure("Mã và tên sản phẩm không được trống.")
                updates.append(f"{column} = %s")
                params.append(value)

            product = before
            if updates:
                params.append(product_id)
                cursor.execute(
                    f"""
                    UPDATE products
                    SET {", ".join(updates)}, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    tuple(params),
                )
                product = cursor.fetchone()

            if "quantity" in data and data["quantity"] is not None:
                quantity = int(data["quantity"])
                if quantity < 0:
                    conn.rollback()
                    return self._failure("Số lượng tồn không hợp lệ.")
                self._set_stock_quantity(cursor, product_id, quantity)

            self._audit(
                cursor,
                actor,
                "product.update",
                "product",
                product_id,
                {"before": dict(before), "changes": data},
            )
            conn.commit()
            return self._success("Cập nhật sản phẩm thành công.", product)
        except ValueError as error:
            if conn:
                conn.rollback()
            return self._failure(str(error))
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể cập nhật sản phẩm: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def create_category(self, payload, actor=None):
        data = self._payload_dict(payload)
        name = str(data.get("name") or "").strip()
        description = data.get("description") or ""

        if not name:
            return self._failure("Tên danh mục không được trống.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM categories WHERE LOWER(name) = LOWER(%s) AND COALESCE(status, 'active') <> 'deleted'",
                (name,),
            )
            if cursor.fetchone() is not None:
                conn.rollback()
                return self._failure("Danh mục đã tồn tại.")

            cursor.execute(
                """
                INSERT INTO categories (name, description, status, created_at, updated_at)
                VALUES (%s, %s, 'active', NOW(), NOW())
                RETURNING *
                """,
                (name, description),
            )
            category = cursor.fetchone()
            self._audit(cursor, actor, "category.create", "category", category["id"], {"name": name})
            conn.commit()
            return self._success("Thêm danh mục thành công.", category)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể thêm danh mục: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_category(self, category_id, payload, actor=None):
        data = self._payload_dict(payload, exclude_unset=True)
        if not data:
            return self._failure("Không có dữ liệu cập nhật.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM categories WHERE id = %s AND COALESCE(status, 'active') <> 'deleted' FOR UPDATE",
                (category_id,),
            )
            before = cursor.fetchone()
            if before is None:
                conn.rollback()
                return self._failure("Không tìm thấy danh mục.")

            if "name" in data:
                name = str(data["name"]).strip()
                if not name:
                    conn.rollback()
                    return self._failure("Tên danh mục không được trống.")
                cursor.execute(
                    """
                    SELECT id
                    FROM categories
                    WHERE LOWER(name) = LOWER(%s)
                      AND id <> %s
                      AND COALESCE(status, 'active') <> 'deleted'
                    """,
                    (name, category_id),
                )
                if cursor.fetchone() is not None:
                    conn.rollback()
                    return self._failure("Danh mục đã tồn tại.")

            field_map = {
                "name": ("name", lambda value: str(value).strip()),
                "description": ("description", lambda value: value or ""),
                "status": ("status", lambda value: value),
            }
            updates = []
            params = []
            for key, (column, transform) in field_map.items():
                if key in data:
                    updates.append(f"{column} = %s")
                    params.append(transform(data[key]))

            params.append(category_id)
            cursor.execute(
                f"""
                UPDATE categories
                SET {", ".join(updates)}, updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                tuple(params),
            )
            category = cursor.fetchone()
            self._audit(
                cursor,
                actor,
                "category.update",
                "category",
                category_id,
                {"before": dict(before), "changes": data},
            )
            conn.commit()
            return self._success("Cập nhật danh mục thành công.", category)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể cập nhật danh mục: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def delete_product(self, product_id, actor=None):
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM products WHERE id = %s AND COALESCE(status, 'active') <> 'deleted' FOR UPDATE",
                (product_id,),
            )
            product = cursor.fetchone()
            if product is None:
                conn.rollback()
                return self._failure("Không tìm thấy sản phẩm.")

            cursor.execute(
                "UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id = %s",
                (product_id,),
            )
            self._audit(cursor, actor, "product.delete", "product", product_id, {"product": dict(product)})
            conn.commit()
            return self._success("Xóa sản phẩm thành công.")
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể xóa sản phẩm: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def delete_category(self, category_id, actor=None):
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM products
                WHERE category_id = %s AND COALESCE(status, 'active') <> 'deleted'
                """,
                (category_id,),
            )
            total = int(cursor.fetchone()["total"])
            if total > 0:
                conn.rollback()
                return self._failure("Không thể xóa danh mục đang có sản phẩm.")

            cursor.execute(
                "SELECT * FROM categories WHERE id = %s AND COALESCE(status, 'active') <> 'deleted' FOR UPDATE",
                (category_id,),
            )
            category = cursor.fetchone()
            if category is None:
                conn.rollback()
                return self._failure("Không tìm thấy danh mục.")

            cursor.execute(
                "UPDATE categories SET status = 'deleted', updated_at = NOW() WHERE id = %s",
                (category_id,),
            )
            self._audit(cursor, actor, "category.delete", "category", category_id, {"category": dict(category)})
            conn.commit()
            return self._success("Xóa danh mục thành công.")
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể xóa danh mục: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def create_unit(self, payload, actor=None):
        data = self._payload_dict(payload)
        name = str(data.get("name") or "").strip()
        symbol = data.get("symbol")
        if not name:
            return self._failure("Tên đơn vị không được trống.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM units WHERE LOWER(name) = LOWER(%s)", (name,))
            if cursor.fetchone() is not None:
                conn.rollback()
                return self._failure("Đơn vị đã tồn tại.")

            cursor.execute(
                "INSERT INTO units (name, symbol) VALUES (%s, %s) RETURNING *",
                (name, symbol),
            )
            unit = cursor.fetchone()
            self._audit(cursor, actor, "unit.create", "unit", unit["id"], {"name": name})
            conn.commit()
            return self._success("Thêm đơn vị thành công.", unit)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể thêm đơn vị: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_unit(self, unit_id, payload, actor=None):
        data = self._payload_dict(payload, exclude_unset=True)
        if not data:
            return self._failure("Không có dữ liệu cập nhật.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM units WHERE id = %s FOR UPDATE", (unit_id,))
            before = cursor.fetchone()
            if before is None:
                conn.rollback()
                return self._failure("Không tìm thấy đơn vị.")

            if "name" in data:
                name = str(data["name"]).strip()
                if not name:
                    conn.rollback()
                    return self._failure("Tên đơn vị không được trống.")
                cursor.execute(
                    "SELECT id FROM units WHERE LOWER(name) = LOWER(%s) AND id <> %s",
                    (name, unit_id),
                )
                if cursor.fetchone() is not None:
                    conn.rollback()
                    return self._failure("Đơn vị đã tồn tại.")

            updates = []
            params = []
            if "name" in data:
                updates.append("name = %s")
                params.append(str(data["name"]).strip())
            if "symbol" in data:
                updates.append("symbol = %s")
                params.append(data["symbol"])

            params.append(unit_id)
            cursor.execute(
                f"UPDATE units SET {', '.join(updates)} WHERE id = %s RETURNING *",
                tuple(params),
            )
            unit = cursor.fetchone()
            self._audit(cursor, actor, "unit.update", "unit", unit_id, {"before": dict(before), "changes": data})
            conn.commit()
            return self._success("Cập nhật đơn vị thành công.", unit)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể cập nhật đơn vị: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def delete_unit(self, unit_id, actor=None):
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM products
                WHERE unit_id = %s AND COALESCE(status, 'active') <> 'deleted'
                """,
                (unit_id,),
            )
            if int(cursor.fetchone()["total"]) > 0:
                conn.rollback()
                return self._failure("Không thể xóa đơn vị đang được sử dụng.")

            cursor.execute("DELETE FROM units WHERE id = %s RETURNING *", (unit_id,))
            unit = cursor.fetchone()
            if unit is None:
                conn.rollback()
                return self._failure("Không tìm thấy đơn vị.")

            self._audit(cursor, actor, "unit.delete", "unit", unit_id, {"unit": dict(unit)})
            conn.commit()
            return self._success("Xóa đơn vị thành công.")
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể xóa đơn vị: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def create_transaction(self, payload, actor=None):
        data = self._payload_dict(payload)
        product_id = data.get("productId") or data.get("product_id")
        product_code = data.get("code") or data.get("product_code")
        transaction_type = data.get("transactionType") or data.get("transaction_type")
        quantity = int(data.get("quantity") or 0)
        price = float(data.get("price") or data.get("unit_price") or 0)
        note = data.get("note") or ""

        if transaction_type not in ("import", "export"):
            return self._failure("Loại giao dịch không hợp lệ.")
        if quantity <= 0 or price <= 0:
            return self._failure("Số lượng và đơn giá phải lớn hơn 0.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            if product_id:
                cursor.execute(
                    """
                    SELECT id, product_code, product_name
                    FROM products
                    WHERE id = %s AND COALESCE(status, 'active') <> 'deleted'
                    FOR UPDATE
                    """,
                    (product_id,),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, product_code, product_name
                    FROM products
                    WHERE product_code = %s AND COALESCE(status, 'active') <> 'deleted'
                    FOR UPDATE
                    """,
                    (product_code,),
                )
            product = cursor.fetchone()
            if product is None:
                conn.rollback()
                return self._failure("Không tìm thấy sản phẩm.")

            product_id = product["id"]
            self._ensure_stock_row(cursor, product_id)
            cursor.execute(
                "SELECT quantity_on_hand FROM product_stocks WHERE product_id = %s FOR UPDATE",
                (product_id,),
            )
            stock = cursor.fetchone()
            current_quantity = int(stock["quantity_on_hand"]) if stock else 0

            if transaction_type == "export" and quantity > current_quantity:
                conn.rollback()
                return self._failure("Không thể xuất quá số lượng tồn hiện tại.")

            next_quantity = current_quantity + quantity if transaction_type == "import" else current_quantity - quantity
            self._update_stock_quantity(cursor, product_id, next_quantity)

            actor_meta = self._actor_metadata(actor)
            cursor.execute(
                """
                INSERT INTO inventory_transactions (
                    product_id, transaction_type, quantity, unit_price, note,
                    created_by, operator_name, operator_role,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
                """,
                (
                    product_id,
                    transaction_type,
                    quantity,
                    price,
                    note,
                    actor_meta["id"],
                    actor_meta["email"],
                    actor_meta["role_name"] or actor_meta["role_id"],
                ),
            )
            transaction = cursor.fetchone()
            self._audit(
                cursor,
                actor,
                f"inventory.{transaction_type}",
                "inventory_transaction",
                transaction["id"],
                {
                    "product_id": product_id,
                    "product_code": product["product_code"],
                    "quantity": quantity,
                    "before_quantity": current_quantity,
                    "after_quantity": next_quantity,
                    "unit_price": price,
                },
            )
            conn.commit()
            return self._success("Ghi nhận giao dịch thành công.", transaction)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể ghi nhận giao dịch: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def update_user(self, user_id, payload, actor=None):
        data = self._payload_dict(payload, exclude_unset=True)
        if not data:
            return self._failure("Không có dữ liệu cập nhật.")

        actor_id = int(actor.get("id")) if actor and actor.get("id") is not None else None
        if actor_id == int(user_id) and ("role_id" in data or data.get("status") in ("locked", "blocked", "deleted")):
            return self._failure("Bạn không thể tự khóa, xóa hoặc đổi quyền của chính mình.")

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (user_id,))
            before = cursor.fetchone()
            if before is None:
                conn.rollback()
                return self._failure("Không tìm thấy tài khoản.")

            updates = []
            params = []
            if "role_id" in data and data["role_id"] is not None:
                cursor.execute("SELECT id FROM roles WHERE id = %s", (data["role_id"],))
                if cursor.fetchone() is None:
                    conn.rollback()
                    return self._failure("Role không tồn tại.")
                updates.append("role_id = %s")
                params.append(data["role_id"])
            if "status" in data and data["status"] is not None:
                updates.append("status = %s")
                params.append(data["status"])

            if not updates:
                conn.rollback()
                return self._failure("Không có dữ liệu hợp lệ để cập nhật.")

            params.append(user_id)
            cursor.execute(
                f"""
                UPDATE users
                SET {", ".join(updates)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, role_id, full_name, phone_number, email, avatar_url, status, created_at, updated_at
                """,
                tuple(params),
            )
            user = cursor.fetchone()
            self._audit(cursor, actor, "user.update", "user", user_id, {"before": dict(before), "changes": data})
            conn.commit()
            return self._success("Cập nhật tài khoản thành công.", user)
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể cập nhật tài khoản: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def delete_user(self, email, actor=None):
        actor_id = int(actor.get("id")) if actor and actor.get("id") is not None else None
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE email = %s AND COALESCE(status, 'active') <> 'deleted' FOR UPDATE",
                (email,),
            )
            user = cursor.fetchone()
            if user is None:
                conn.rollback()
                return self._failure("Không tìm thấy tài khoản.")
            if actor_id == int(user["id"]):
                conn.rollback()
                return self._failure("Bạn không thể xóa chính tài khoản đang đăng nhập.")

            cursor.execute(
                "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE email = %s",
                (email,),
            )
            self._audit(cursor, actor, "user.delete", "user", user["id"], {"email": email})
            conn.commit()
            return self._success("Xóa tài khoản thành công.")
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể xóa tài khoản: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_audit_logs(self, q=None, action=None, entity_type=None, page=1, page_size=100):
        page, page_size, offset = self._page(page, page_size)
        where = ["1 = 1"]
        params = []
        if q:
            where.append("(actor_email ILIKE %s OR action ILIKE %s OR entity_type ILIKE %s OR entity_id ILIKE %s)")
            keyword = f"%{q}%"
            params.extend([keyword, keyword, keyword, keyword])
        if action:
            where.append("action = %s")
            params.append(action)
        if entity_type:
            where.append("entity_type = %s")
            params.append(entity_type)

        total_row = QueryDB.query(
            f"""
            SELECT COUNT(*) AS total
            FROM audit_logs
            WHERE {" AND ".join(where)}
            """,
            tuple(params),
        )
        total = total_row["total"] if total_row else 0

        params.extend([page_size, offset])
        logs = QueryDB.query(
            f"""
            SELECT *
            FROM audit_logs
            WHERE {" AND ".join(where)}
            ORDER BY created_at DESC, id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params),
            "all",
        ) or []
        return self._success(
            "Lấy nhật ký quản trị thành công.",
            logs,
            pagination=self._pagination(page, page_size, total),
        )

    def get_site_settings(self):
        row = QueryDB.query("SELECT value FROM app_settings WHERE key = %s", ("site",))
        default_settings = {
            "siteName": "Stock Pro",
            "icon": "https://placehold.co/80x80/163b59/ffffff?text=SP",
            "logo": "https://placehold.co/240x80/163b59/ffffff?text=Stock+Pro",
            "color": "#163b59",
            "desc": "Nền tảng quản lý kho hàng và bán sản phẩm trực tuyến.",
        }
        if row is None:
            return self._success("Lấy cấu hình website thành công.", default_settings)
        return self._success("Lấy cấu hình website thành công.", row["value"])

    def update_site_settings(self, payload, actor=None):
        settings = self._payload_dict(payload, exclude_unset=True)
        if "extra" in settings and settings["extra"]:
            settings.update(settings.pop("extra"))

        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO app_settings (key, value, updated_by, updated_at)
                VALUES ('site', %s, %s, NOW())
                ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
                RETURNING value
                """,
                (Json(settings), actor.get("id") if actor else None),
            )
            row = cursor.fetchone()
            self._audit(cursor, actor, "settings.update", "settings", "site", settings)
            conn.commit()
            return self._success("Lưu cấu hình website thành công.", row["value"])
        except Exception as error:
            if conn:
                conn.rollback()
            return self._failure(f"Không thể lưu cấu hình website: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
