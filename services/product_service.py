from services.query_service import QueryDB
from utils.response import success_response, error_response


class ProductList:
    def _success(self, message, data=None):
        return success_response(message=message, data=data)

    def _failure(self, message, data=None):
        return error_response(message, data)

    def _payload_value(self, payload, *keys, default=None):
        for key in keys:
            if key in payload and payload[key] not in (None, ""):
                return payload[key]
        return default

    def get_products(self):
        products = QueryDB.query(
            "SELECT * FROM products WHERE COALESCE(status, 'active') <> 'deleted' ORDER BY id DESC",
            None,
            'all'
        )
        if products is None:
            return self._failure("Không có sản phẩm nào.")
        else:
            return self._success("Lấy danh sách sản phẩm thành công.", products)
        
    
    def get_categories(self):
        categories = QueryDB.query(
            "SELECT * FROM categories WHERE COALESCE(status, 'active') <> 'deleted' ORDER BY id DESC",
            None,
            'all'
        )
        if categories is None:
            return self._failure("Không có danh mục nào.")
        else:
            return self._success("Lấy danh sách danh mục thành công.", categories)
        
    def get_product_stock(self, product_id):
        stock = QueryDB.query("SELECT quantity_on_hand FROM product_stocks WHERE product_id = %s", (product_id,))
        if stock is None:
            return self._failure("Sản phẩm không tồn tại.")
        else:
            return self._success("Lấy thông tin tồn kho thành công.", stock)
        
    def get_transaction(self):
        transactions = QueryDB.query("SELECT * FROM inventory_transactions ORDER BY created_at DESC", None, 'all')
        if transactions is None:
            return self._failure("Không có lịch sử giao dịch nào cho sản phẩm này.")
        else:
            return self._success("Lấy lịch sử giao dịch thành công.", transactions)

    def get_unit(self):
        units = QueryDB.query("SELECT * FROM units", None, 'all')
        if units is None:
            return self._failure("Không có đơn vị nào.")
        else:
            return self._success("Lấy danh sách đơn vị thành công.", units)

    def create_product(self, payload):
        try:
            code = str(self._payload_value(payload, "code", "product_code", default="")).strip()
            name = str(self._payload_value(payload, "name", "product_name", default="")).strip()
            category_id = self._payload_value(payload, "categoryId", "category_id")
            unit_id = self._payload_value(payload, "unitId", "unit_id")
            quantity = int(self._payload_value(payload, "quantity", default=0) or 0)
            min_stock = int(self._payload_value(payload, "minStock", "min_stock", default=0) or 0)
            price = float(self._payload_value(payload, "price", default=0) or 0)
            image_url = self._payload_value(payload, "image", "image_url")
            description = self._payload_value(payload, "description", default="")

            if not code or not name:
                return self._failure("Mã sản phẩm và tên sản phẩm không được trống.")

            if quantity < 0 or min_stock < 0 or price <= 0:
                return self._failure("Số lượng, tồn tối thiểu và đơn giá không hợp lệ.")

            duplicate = QueryDB.query(
                "SELECT id FROM products WHERE product_code = %s AND COALESCE(status, 'active') <> 'deleted'",
                (code,)
            )
            if duplicate is not None:
                return self._failure("Mã sản phẩm đã tồn tại.")

            product = QueryDB.query(
                """
                INSERT INTO products (
                    product_code, product_name, category_id, unit_id,
                    min_stock, price, image_url, description, status,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', NOW(), NOW())
                RETURNING *
                """,
                (code, name, category_id, unit_id, min_stock, price, image_url, description)
            )

            try:
                QueryDB.query(
                    """
                    INSERT INTO product_stocks (product_id, quantity_on_hand, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    """,
                    (product["id"], quantity),
                    fetch="none"
                )
            except Exception:
                QueryDB.query(
                    "INSERT INTO product_stocks (product_id, quantity_on_hand) VALUES (%s, %s)",
                    (product["id"], quantity),
                    fetch="none"
                )

            return self._success("Thêm sản phẩm thành công.", product)

        except Exception as error:
            return self._failure(f"Không thể thêm sản phẩm: {error}")

    def create_category(self, payload):
        try:
            name = str(self._payload_value(payload, "name", default="")).strip()
            description = self._payload_value(payload, "description", default="")

            if not name:
                return self._failure("Tên danh mục không được trống.")

            duplicate = QueryDB.query(
                "SELECT id FROM categories WHERE LOWER(name) = LOWER(%s) AND COALESCE(status, 'active') <> 'deleted'",
                (name,)
            )
            if duplicate is not None:
                return self._failure("Danh mục đã tồn tại.")

            category = QueryDB.query(
                """
                INSERT INTO categories (name, description, status, created_at, updated_at)
                VALUES (%s, %s, 'active', NOW(), NOW())
                RETURNING *
                """,
                (name, description)
            )

            return self._success("Thêm danh mục thành công.", category)

        except Exception as error:
            return self._failure(f"Không thể thêm danh mục: {error}")

    def delete_product(self, product_id):
        try:
            product = QueryDB.query(
                "SELECT id FROM products WHERE id = %s AND COALESCE(status, 'active') <> 'deleted'",
                (product_id,)
            )

            if product is None:
                return self._failure("Không tìm thấy sản phẩm.")

            try:
                QueryDB.query(
                    "UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id = %s",
                    (product_id,),
                    fetch="none"
                )
            except Exception:
                QueryDB.query(
                    "UPDATE products SET status = 'deleted' WHERE id = %s",
                    (product_id,),
                    fetch="none"
                )

            return self._success("Xóa sản phẩm thành công.")

        except Exception as error:
            return self._failure(f"Không thể xóa sản phẩm: {error}")

    def delete_category(self, category_id):
        try:
            count_row = QueryDB.query(
                """
                SELECT COUNT(*) AS total
                FROM products
                WHERE category_id = %s AND COALESCE(status, 'active') <> 'deleted'
                """,
                (category_id,)
            )
            total = int(count_row["total"]) if count_row else 0

            if total > 0:
                return self._failure("Không thể xóa danh mục đang có sản phẩm.")

            category = QueryDB.query(
                "SELECT id FROM categories WHERE id = %s AND COALESCE(status, 'active') <> 'deleted'",
                (category_id,)
            )

            if category is None:
                return self._failure("Không tìm thấy danh mục.")

            try:
                QueryDB.query(
                    "UPDATE categories SET status = 'deleted', updated_at = NOW() WHERE id = %s",
                    (category_id,),
                    fetch="none"
                )
            except Exception:
                QueryDB.query(
                    "UPDATE categories SET status = 'deleted' WHERE id = %s",
                    (category_id,),
                    fetch="none"
                )

            return self._success("Xóa danh mục thành công.")

        except Exception as error:
            return self._failure(f"Không thể xóa danh mục: {error}")

    def create_transaction(self, payload):
        try:
            product_id = self._payload_value(payload, "productId", "product_id")
            product_code = self._payload_value(payload, "code", "product_code")
            transaction_type = self._payload_value(payload, "transactionType", "transaction_type")
            quantity = int(self._payload_value(payload, "quantity", default=0) or 0)
            price = float(self._payload_value(payload, "price", "unit_price", default=0) or 0)
            note = self._payload_value(payload, "note", default="")

            if transaction_type not in ("import", "export"):
                return self._failure("Loại giao dịch không hợp lệ.")

            if quantity <= 0 or price <= 0:
                return self._failure("Số lượng và đơn giá phải lớn hơn 0.")

            if product_id:
                product = QueryDB.query(
                    "SELECT id FROM products WHERE id = %s AND COALESCE(status, 'active') <> 'deleted'",
                    (product_id,)
                )
            else:
                product = QueryDB.query(
                    "SELECT id FROM products WHERE product_code = %s AND COALESCE(status, 'active') <> 'deleted'",
                    (product_code,)
                )

            if product is None:
                return self._failure("Không tìm thấy sản phẩm.")

            product_id = product["id"]
            stock = QueryDB.query(
                "SELECT quantity_on_hand FROM product_stocks WHERE product_id = %s",
                (product_id,)
            )
            current_quantity = int(stock["quantity_on_hand"]) if stock else 0

            if transaction_type == "export" and quantity > current_quantity:
                return self._failure("Không thể xuất quá số lượng tồn hiện tại.")

            next_quantity = current_quantity + quantity if transaction_type == "import" else current_quantity - quantity

            if stock:
                try:
                    QueryDB.query(
                        "UPDATE product_stocks SET quantity_on_hand = %s, updated_at = NOW() WHERE product_id = %s",
                        (next_quantity, product_id),
                        fetch="none"
                    )
                except Exception:
                    QueryDB.query(
                        "UPDATE product_stocks SET quantity_on_hand = %s WHERE product_id = %s",
                        (next_quantity, product_id),
                        fetch="none"
                    )
            else:
                try:
                    QueryDB.query(
                        """
                        INSERT INTO product_stocks (product_id, quantity_on_hand, created_at, updated_at)
                        VALUES (%s, %s, NOW(), NOW())
                        """,
                        (product_id, next_quantity),
                        fetch="none"
                    )
                except Exception:
                    QueryDB.query(
                        "INSERT INTO product_stocks (product_id, quantity_on_hand) VALUES (%s, %s)",
                        (product_id, next_quantity),
                        fetch="none"
                    )

            try:
                transaction = QueryDB.query(
                    """
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, unit_price, note,
                        created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING *
                    """,
                    (product_id, transaction_type, quantity, price, note)
                )
            except Exception:
                transaction = QueryDB.query(
                    """
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, unit_price, note, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING *
                    """,
                    (product_id, transaction_type, quantity, price, note)
                )

            return self._success("Ghi nhận giao dịch thành công.", transaction)

        except Exception as error:
            return self._failure(f"Không thể ghi nhận giao dịch: {error}")


    def delete_user(self, email):
        try:
            user = QueryDB.query(
                "SELECT id FROM users WHERE email = %s AND COALESCE(status, 'active') <> 'deleted'",
                (email,)
            )

            if user is None:
                return self._failure("Không tìm thấy tài khoản.")

            try:
                QueryDB.query(
                    "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE email = %s",
                    (email,),
                    fetch="none"
                )
            except Exception:
                QueryDB.query(
                    "UPDATE users SET status = 'deleted' WHERE email = %s",
                    (email,),
                    fetch="none"
                )

            return self._success("Xóa tài khoản thành công.")

        except Exception as error:
            return self._failure(f"Không thể xóa tài khoản: {error}")
