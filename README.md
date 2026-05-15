# StockPro - Quản lý kho hàng

Dự án frontend môn JavaScript, sử dụng:

- HTML/CSS
- JavaScript thuần
- Fetch API
- jQuery
- Bootstrap 5
- MockAPI.io

## Trang chính

- `index.html`: Public xem tồn kho, tìm kiếm, lọc nhóm hàng, xem nhanh lịch sử.
- `history.html`: Public xem toàn bộ lịch sử nhập/xuất.
- `pages/admin/dashboard.html`: Admin quản lý hàng hóa, danh mục, nhập kho, xuất kho.

## Logic tồn kho

Dữ liệu được lấy từ 2 bảng chính:

- `Products`: thông tin hàng hóa và số lượng ban đầu.
- `Transactions`: lịch sử nhập/xuất.

Tồn kho hiện tại được tính bằng JavaScript:

```js
tồn kho = số lượng ban đầu + tổng nhập - tổng xuất
```

Hàm tính nằm trong file:

```txt
assets/js/utils.js
```

Tên hàm:

```js
calculateCurrentStock(product, transactions)
```

## API

API được khai báo trong:

```txt
assets/js/config.js
```
