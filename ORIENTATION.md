# Định hướng thiết kế frontend StockPro

## 1. Các trang cần có
| Trang | File | Mục đích |
|---|---|---|
| Public tồn kho | `index.html` | Xem bảng tồn kho, tìm kiếm, lọc nhóm hàng, xem nhanh lịch sử |
| Public lịch sử | `history.html` | Xem lịch sử nhập/xuất kho |
| Admin | `pages/admin/dashboard.html` | CRUD hàng hóa, danh mục, nhập kho, xuất kho, cảnh báo tồn thấp |

## 2. Bố cục giao diện
- Navbar: logo StockPro, Public, Lịch sử, Admin.
- Dashboard cards: tổng mặt hàng, tồn thấp, giá trị kho.
- Bảng dữ liệu responsive bằng Bootstrap Table.
- Form quản trị nằm trong Card, có lỗi validation dưới từng input.
- Toast hiển thị kết quả thao tác.

## 3. Public bắt buộc
- Xem tồn kho dạng bảng.
- Tìm kiếm theo mã hàng hoặc tên hàng.
- Lọc theo nhóm hàng.
- Badge cảnh báo hàng tồn thấp.
- Xem lịch sử nhập/xuất từ Transactions.

## 4. Admin bắt buộc
- Thêm, sửa, xóa hàng hóa.
- Thêm danh mục hàng hóa.
- Nhập kho: tăng quantity sản phẩm và ghi transaction type `import`.
- Xuất kho: giảm quantity sản phẩm và ghi transaction type `export`.
- Chặn xuất quá số lượng tồn.
- Cảnh báo sản phẩm có `quantity <= minStock`.

## 5. Cấu trúc thư mục
```txt
stockpro_project/
├── index.html
├── history.html
├── pages/admin/dashboard.html
├── assets/css/style.css
├── assets/js/config.js
├── assets/js/utils.js
├── assets/js/api.js
├── assets/js/validation.js
├── assets/js/public.js
└── assets/js/admin.js
```

## 6. Phân chia nhiệm vụ JS
| File | Nhiệm vụ |
|---|---|
| `config.js` | Khai báo endpoint MockAPI |
| `utils.js` | Hàm format tiền, ngày, toast, loading, tính tổng kho |
| `api.js` | Hàm Fetch CRUD: GET, POST, PUT, DELETE |
| `validation.js` | Validate form hàng hóa, nhập/xuất kho |
| `public.js` | Load và render Public, jQuery search/filter/effect |
| `admin.js` | CRUD hàng hóa, danh mục, nhập/xuất kho |

## 7. Thiết kế dữ liệu MockAPI
### Products
```json
{
  "id": 1,
  "code": "SP001",
  "name": "Bàn phím Logitech K120",
  "categoryId": 1,
  "quantity": 25,
  "unit": "cái",
  "price": 180000,
  "minStock": 5,
  "description": "Bàn phím văn phòng",
  "image": "https://...",
  "createdAt": "2026-05-14T10:00:00Z"
}
```
### Categories
```json
{
  "id": 1,
  "name": "Thiết bị văn phòng",
  "description": "Bàn phím, chuột, màn hình..."
}
```
### Transactions
```json
{
  "id": 1,
  "productId": 1,
  "type": "import",
  "quantity": 10,
  "note": "Nhập thêm hàng đầu tháng",
  "createdAt": "2026-05-14T10:00:00Z"
}
```

## 8. API endpoint cần dùng
| Chức năng | Method | Endpoint |
|---|---:|---|
| Lấy hàng hóa | GET | `/Products` |
| Thêm hàng hóa | POST | `/Products` |
| Sửa hàng hóa | PUT | `/Products/:id` |
| Xóa hàng hóa | DELETE | `/Products/:id` |
| Lấy danh mục | GET | `/Categories` |
| Thêm danh mục | POST | `/Categories` |
| Lấy giao dịch | GET | `/Transactions` |
| Thêm giao dịch | POST | `/Transactions` |

## 9. Luồng nhập/xuất kho
### Nhập kho
1. Admin chọn sản phẩm.
2. Nhập số lượng > 0.
3. Lấy sản phẩm hiện tại từ Products.
4. Tính `quantity mới = quantity cũ + số lượng nhập`.
5. PUT cập nhật Products.
6. POST Transactions với `type = import`.
7. Reload bảng và hiển thị Toast.

### Xuất kho
1. Admin chọn sản phẩm.
2. Nhập số lượng > 0.
3. Kiểm tra không xuất quá tồn kho.
4. Tính `quantity mới = quantity cũ - số lượng xuất`.
5. PUT cập nhật Products.
6. POST Transactions với `type = export`.
7. Reload bảng và hiển thị Toast.

## 10. Checklist công nghệ
| Yêu cầu | Đã có trong dự án |
|---|---|
| Biến đúng kiểu dữ liệu | `let`, `const`, `Number`, `String` |
| if/else, for/while | Có `if`, toán tử điều kiện, vòng lặp qua `map/filter/reduce`; có thể bổ sung `for` nếu giảng viên yêu cầu cứng |
| Ít nhất 3 hàm có tham số và return | `money`, `dateTime`, `getCategoryName`, `isLowStock`, `calcInventoryValue` |
| DOM thuần | `getElementById`, `querySelector`, `innerHTML`, `classList` |
| Fetch CRUD | `api.js` có GET/POST/PUT/DELETE |
| JSON parse/hiển thị | `response.json()` và render table |
| Loading/error API | `showLoading`, `showError`, Toast |
| Form validation | `validation.js` |
| jQuery selector/event/effect | `public.js`, `admin.js` |
| jQuery AJAX | `$.get`, `$.post` |
| Bootstrap Grid/Components | Navbar, Card, Table, Form, Badge, Toast, Button |
| MockAPI không hardcode dữ liệu | Dữ liệu chính lấy từ API |
