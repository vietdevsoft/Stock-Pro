# StockPro fixed v3

Bản này fix lỗi thao tác DELETE/PUT với MockAPI.

## Điểm sửa chính

- Không dùng id giả để gọi `DELETE /Products/:id` hoặc `DELETE /Categories/:id`.
- Nếu bản ghi không có id thật từ MockAPI, nút sửa/xóa sẽ bị disabled để tránh gọi nhầm vào URL không hợp lệ.
- Nếu danh mục đang có sản phẩm sử dụng, không cho xóa danh mục.
- Giữ nguyên `config.js` theo yêu cầu.

## Lưu ý MockAPI

Các record muốn sửa/xóa trực tiếp phải có field `id` thật do MockAPI sinh. Nếu phần Resource Data bạn nhập không trả về `id`, hãy tạo lại dữ liệu bằng POST hoặc kiểm tra schema resource có trường `id` kiểu Object ID.
