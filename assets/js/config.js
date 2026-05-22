// =============================
// FILE: config.js
// Mục đích: Lưu cấu hình dùng chung cho toàn bộ website.
// =============================

// API dùng để đọc/ghi dữ liệu trên MockAPI.
// Khi đổi API, chỉ cần sửa tại file này.
const API = {
  products: 'https://6a05fc12c83ba8ad9b3d1502.mockapi.io/stock/Products',
  categories: 'https://6a05fc12c83ba8ad9b3d1502.mockapi.io/stock/Categories',
  transactions: 'https://6a05ff1ec83ba8ad9b3d19e2.mockapi.io/stock/Transactions'
};

// Ảnh mặc định nếu sản phẩm không có ảnh.
const PLACEHOLDER_IMG = 'https://placehold.co/100x100?text=StockPro';
