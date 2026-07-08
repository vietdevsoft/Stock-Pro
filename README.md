# Stock Pro - Hệ thống quản lý kho hàng

Stock Pro là ứng dụng web quản lý kho hàng được xây dựng bằng **FastAPI**, **Jinja2** và **PostgreSQL**. Dự án hỗ trợ đăng ký, đăng nhập, phân quyền người dùng, quản lý hồ sơ cá nhân, quản lý sản phẩm, danh mục, đơn vị tính, tồn kho, lịch sử giao dịch nhập/xuất kho, quản lý người dùng và nhật ký hoạt động cho quản trị viên.

## Mục lục

- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Cấu hình biến môi trường](#cấu-hình-biến-môi-trường)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Tài khoản và phân quyền](#tài-khoản-và-phân-quyền)
- [Các route giao diện](#các-route-giao-diện)
- [API chính](#api-chính)
- [Ví dụ request API](#ví-dụ-request-api)
- [Ghi chú vận hành](#ghi-chú-vận-hành)
- [Hướng phát triển](#hướng-phát-triển)

## Tính năng chính

### Xác thực người dùng

- Đăng ký tài khoản với họ tên, số điện thoại, email, mật khẩu và captcha.
- Đăng nhập bằng email, mật khẩu và captcha.
- Lưu token JWT vào cookie `access_token` (httponly).
- Đăng xuất bằng cách xóa cookie đăng nhập.
- Khôi phục mật khẩu ở mức mô phỏng: kiểm tra email và captcha.

### Phân quyền giao diện

- Người dùng chưa đăng nhập có thể xem trang chủ, sản phẩm, đăng nhập, đăng ký và quên mật khẩu.
- Người dùng role `2` được điều hướng vào trang hồ sơ cá nhân `/profile`.
- Người dùng role `1` hoặc `3` được điều hướng vào trang quản trị `/admin`.

### Quản lý hồ sơ

- Xem thông tin hồ sơ người dùng đang đăng nhập.
- Cập nhật họ tên và số điện thoại.
- Tải ảnh đại diện lên thư mục `static/avatar`.

### Quản lý sản phẩm, danh mục và đơn vị tính (khu vực quản trị)

- Lấy danh sách sản phẩm với bộ lọc theo từ khóa, danh mục, trạng thái và phân trang.
- Thêm, cập nhật và xóa mềm sản phẩm.
- Lấy, thêm, cập nhật và xóa mềm danh mục.
- Lấy, thêm, cập nhật và xóa đơn vị tính.

### Quản lý tồn kho và giao dịch

- Xem số lượng tồn hiện tại của từng sản phẩm.
- Ghi nhận giao dịch nhập/xuất kho và cập nhật bảng `product_stocks`.
- Lưu lịch sử vào bảng `inventory_transactions`.

### Quản trị người dùng và hệ thống (chỉ Admin)

- Lấy danh sách người dùng, cập nhật vai trò/trạng thái, xóa mềm người dùng.
- Xem nhật ký hoạt động (`audit_logs`).
- Xem và cập nhật cấu hình website (`app_settings`).

### Captcha

- Sinh captcha từ các ảnh trong `static/captcha`.
- Lưu đáp án captcha tạm thời qua Redis.
- Xóa đáp án captcha sau khi người dùng đăng nhập, đăng ký hoặc quên mật khẩu.

## Công nghệ sử dụng

- Python 3.12+
- FastAPI + Uvicorn
- Jinja2 Templates
- PostgreSQL + psycopg2
- Pydantic
- python-jose (JWT)
- passlib (bcrypt)
- Redis
- HTML, CSS, JavaScript

Thư viện Python được khai báo trong [requirements.txt](requirements.txt).

## Cấu trúc thư mục

```text
.
├── main.py                     # Điểm khởi động FastAPI, khai báo route giao diện và include router
├── database.py                 # Kết nối PostgreSQL qua DATABASE_URL
├── requirements.txt
├── controllers/                # Định nghĩa các API endpoint
│   ├── auth_controller.py
│   ├── captcha_controller.py
│   ├── product_controller.py   # Prefix /view: sản phẩm, danh mục, đơn vị, tồn kho, user, audit, settings
│   └── profile_controller.py
├── services/                   # Logic nghiệp vụ
│   ├── auth_service.py
│   ├── captcha_service.py
│   ├── database_service.py
│   ├── product_service.py
│   ├── profile_service.py
│   ├── category_service.py
│   └── query_service.py
├── schemas/                    # Pydantic models
│   ├── admin_schema.py
│   ├── auth_schema.py
│   ├── category_schema.py
│   ├── product_schema.py
│   └── user_schema.py
├── utils/
│   ├── admin_auth.py           # Dependency phân quyền admin / super admin
│   ├── helpers.py
│   ├── response.py
│   └── security.py             # Hash mật khẩu (bcrypt) và JWT
├── database/
│   └── init.sql                # Script khởi tạo schema và dữ liệu mẫu
├── templates/
│   ├── base.html
│   ├── layouts/                # user-layout, admin-layout, auth-layout
│   ├── components/             # header, footer, sidebar, admin-sidebar, alert...
│   └── pages/                  # index, login, register, forgot-password, profile, products, admin-dashboard
└── static/
    ├── css/
    ├── js/
    ├── images/
    ├── avatar/
    └── captcha/
```

## Yêu cầu môi trường

Cần cài đặt trước:

- Python 3.12 hoặc mới hơn
- PostgreSQL
- Redis
- Git (nếu muốn clone/quản lý source code)

Kiểm tra Python:

```powershell
python --version
```

Kiểm tra Redis đang chạy (kết quả mong đợi là `PONG`):

```powershell
redis-cli ping
```

## Cài đặt và chạy dự án

### 1. Di chuyển vào thư mục dự án

```powershell
cd "C:\Users\My Aspire\OneDrive\Máy tính\Stock-Pro"
```

### 2. Tạo môi trường ảo

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Nếu PowerShell chặn script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 3. Cài đặt thư viện

```powershell
pip install -r requirements.txt
```

### 4. Tạo file `.env`

Tạo file `.env` ở thư mục gốc dự án:

```env
APP_NAME=Stock Pro
APP_ENV=development
SECRET_KEY=change-this-secret-key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/stockpro_db
```

Thay `your_password` và tên database theo thông tin PostgreSQL trên máy.

### 5. Khởi tạo cơ sở dữ liệu

```powershell
psql "postgresql://postgres:your_password@localhost:5432/stockpro_db" -f database/init.sql
```

### 6. Chạy server

```powershell
uvicorn main:app --reload
```

Mở trình duyệt:

- Ứng dụng: `http://127.0.0.1:8000`
- Tài liệu API tự động: `http://127.0.0.1:8000/docs`

## Cấu hình biến môi trường

Dự án đọc biến môi trường trong [database.py](database.py).

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `SECRET_KEY` | Không | Khóa bí mật ứng dụng |
| `APP_NAME` | Không | Tên ứng dụng |
| `APP_ENV` | Không | Môi trường chạy |
| `COOKIE_SECURE` | Không | `true`/`false`, quyết định cookie đăng nhập có gắn cờ `secure` hay không (mặc định `true`) |

## Cơ sở dữ liệu

Toàn bộ schema và dữ liệu mẫu được định nghĩa trong [database/init.sql](database/init.sql). Các bảng chính:

| Bảng | Mô tả |
| --- | --- |
| `roles` | Vai trò: admin, user, manager, staff |
| `users` | Thông tin người dùng |
| `user_credentials` | Mật khẩu của người dùng |
| `categories` | Danh mục sản phẩm |
| `units` | Đơn vị tính |
| `products` | Sản phẩm |
| `product_stocks` | Số lượng tồn kho theo sản phẩm |
| `inventory_transactions` | Lịch sử giao dịch nhập/xuất kho |
| `audit_logs` | Nhật ký hoạt động của quản trị viên |
| `app_settings` | Cấu hình website |

Script `init.sql` tự động tạo bảng, chỉ mục, chèn dữ liệu role và đơn vị tính mặc định, có thể chạy lại nhiều lần một cách an toàn (dùng `IF NOT EXISTS` và các câu `INSERT ... WHERE NOT EXISTS`).

## Tài khoản và phân quyền

| `role_id` | Vai trò | Quyền truy cập |
| --- | --- | --- |
| `1` | Admin | Vào `/admin`, đầy đủ quyền quản trị và quản lý người dùng/cấu hình |
| `2` | User thường | Vào `/profile` |
| `3` | Manager | Vào `/admin`, quyền quản trị sản phẩm/kho |

Phân quyền API được kiểm soát trong [utils/admin_auth.py](utils/admin_auth.py):

- `require_admin_user`: cho phép role `1` và `3`.
- `require_super_admin_user`: chỉ cho phép role `1`.

Khi đăng ký tài khoản mới, hệ thống tìm role có `name = 'user'` và gán cho người dùng mới.

## Các route giao diện

| Route | Mô tả |
| --- | --- |
| `GET /` | Trang chủ |
| `GET /register` | Trang đăng ký |
| `GET /login` | Trang đăng nhập |
| `GET /forgot-password` | Trang quên mật khẩu |
| `GET /profile` | Trang hồ sơ người dùng, yêu cầu đăng nhập role `2` |
| `GET /admin` | Trang quản trị, yêu cầu role `1` hoặc `3` |
| `GET /products` | Trang sản phẩm |

## API chính

### Auth (`/auths`)

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `POST` | `/auths/register` | Đăng ký tài khoản |
| `POST` | `/auths/login` | Đăng nhập và tạo JWT cookie |
| `POST` | `/auths/forgot-password` | Kiểm tra yêu cầu quên mật khẩu |
| `POST` | `/auths/logout` | Đăng xuất |

### Captcha

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/captcha` | Lấy captcha mới |

### User (`/users`)

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/users/profile` | Lấy thông tin hồ sơ người dùng đang đăng nhập |
| `POST` | `/users/avatar` | Tải ảnh đại diện |
| `POST` | `/users/update-infomation` | Cập nhật họ tên và số điện thoại |

> Lưu ý: endpoint được viết là `update-infomation`, không phải `update-information`.

### Quản trị (`/view`)

Các endpoint dưới đây yêu cầu quyền quản trị (`require_admin_user`), riêng nhóm người dùng/nhật ký/cấu hình yêu cầu Admin (`require_super_admin_user`).

| Method | Endpoint | Mô tả | Quyền |
| --- | --- | --- | --- |
| `GET` | `/view/products` | Danh sách sản phẩm | Công khai |
| `POST` | `/view/products` | Tạo sản phẩm | Admin/Manager |
| `PUT` | `/view/products/{product_id}` | Cập nhật sản phẩm | Admin/Manager |
| `DELETE` | `/view/products/{product_id}` | Xóa mềm sản phẩm | Admin/Manager |
| `GET` | `/view/categories` | Danh sách danh mục | Công khai |
| `POST` | `/view/categories` | Tạo danh mục | Admin/Manager |
| `PUT` | `/view/categories/{category_id}` | Cập nhật danh mục | Admin/Manager |
| `DELETE` | `/view/categories/{category_id}` | Xóa mềm danh mục | Admin/Manager |
| `GET` | `/view/units` | Danh sách đơn vị tính | Admin/Manager |
| `POST` | `/view/units` | Tạo đơn vị tính | Admin/Manager |
| `PUT` | `/view/units/{unit_id}` | Cập nhật đơn vị tính | Admin/Manager |
| `DELETE` | `/view/units/{unit_id}` | Xóa đơn vị tính | Admin/Manager |
| `GET` | `/view/products/{product_id}/stock` | Lấy tồn kho sản phẩm | Admin/Manager |
| `GET` | `/view/products/transactions` | Lịch sử giao dịch kho | Admin/Manager |
| `POST` | `/view/products/transactions` | Tạo giao dịch nhập/xuất kho | Admin/Manager |
| `GET` | `/view/users` | Danh sách người dùng | Admin |
| `PATCH` | `/view/users/{user_id}` | Cập nhật vai trò/trạng thái người dùng | Admin |
| `DELETE` | `/view/users/{email}` | Xóa mềm người dùng theo email | Admin |
| `GET` | `/view/audit-logs` | Nhật ký hoạt động | Admin |
| `GET` | `/view/settings` | Lấy cấu hình website | Admin |
| `PUT` | `/view/settings` | Cập nhật cấu hình website | Admin |

## Ví dụ request API

### Đăng ký

```json
{
  "full_name": "Nguyen Van A",
  "phone_number": "0912345678",
  "email": "a@example.com",
  "password": "123456",
  "captcha": "abcd1"
}
```

### Đăng nhập

```json
{
  "email": "a@example.com",
  "password": "123456",
  "captcha": "abcd1"
}
```

### Tạo sản phẩm

```json
{
  "code": "SP001",
  "name": "Ban phim co",
  "categoryId": 1,
  "unitId": 1,
  "quantity": 50,
  "minStock": 10,
  "price": 350000,
  "image": "/static/images/keyboard.png",
  "description": "Ban phim co cho van phong"
}
```

### Tạo giao dịch nhập/xuất kho

```json
{
  "productId": 1,
  "transactionType": "import",
  "quantity": 20,
  "price": 300000,
  "note": "Nhap hang dau thang"
}
```

## Ghi chú vận hành

- **Mật khẩu đang lưu và so sánh dưới dạng plain text** trong [services/auth_service.py](services/auth_service.py) (dòng `INSERT ... user_credentials` khi đăng ký và phép so sánh khi đăng nhập). Lớp `HashingPasword` trong [utils/security.py](utils/security.py) đã có sẵn hàm hash/verify bằng bcrypt nhưng chưa được tích hợp. Cần hash mật khẩu trước khi đưa vào môi trường thật.
- **`JWT_Auth.SECRET_KEY` đang hard-code** trong [utils/security.py](utils/security.py). Nên đưa giá trị này vào `.env`.
- Cookie đăng nhập gắn cờ `secure` theo biến `COOKIE_SECURE` (mặc định `true`). Khi test local qua `http://127.0.0.1:8000`, một số trình duyệt sẽ không lưu cookie secure; đặt `COOKIE_SECURE=false` trong `.env` để test HTTP.
- Các module `order`, `payment`, `transaction`, `cart` đã được loại bỏ vì chưa triển khai.

## Hướng phát triển

- Mã hóa mật khẩu bằng bcrypt khi đăng ký và verify khi đăng nhập.
- Chuyển `SECRET_KEY` và các cấu hình bảo mật sang `.env`.
- Bổ sung migration database bằng Alembic thay cho `init.sql` thủ công.
- Hoàn thiện luồng đặt hàng, thanh toán, giỏ hàng nếu nghiệp vụ cần đến.
- Viết test cho service đăng nhập, đăng ký, tạo sản phẩm và giao dịch kho.
