# StockPro JavaScript README

Tài liệu này giải thích chức năng của từng file JavaScript trong project **StockPro - hệ thống quản lý kho hàng**.

Mục tiêu của bộ file JS này là giúp sinh viên dễ hiểu luồng hoạt động của website: lấy dữ liệu từ API, hiển thị dữ liệu ra giao diện, kiểm tra form, và xử lý các thao tác quản trị kho.

---

## 1. Tổng quan cấu trúc file

| File | Vai trò chính |
|---|---|
| `config.js` | Lưu cấu hình chung như đường dẫn API và ảnh mặc định. |
| `api.js` | Chứa các hàm gọi API: GET, POST, PUT, DELETE. |
| `utils.js` | Chứa hàm tiện ích dùng chung: lấy element, format tiền, format ngày, toast, kiểm tra tồn thấp. |
| `validation.js` | Kiểm tra dữ liệu nhập từ form trước khi gửi lên API. |
| `public.js` | Xử lý trang người dùng thường: xem tồn kho, tìm kiếm, lọc danh mục, xem giao dịch gần đây. |
| `admin.js` | Xử lý trang quản trị: thêm/sửa/xóa sản phẩm, nhập kho, xuất kho, thêm danh mục. |
| `history.js` | Xử lý trang lịch sử: hiển thị toàn bộ giao dịch nhập/xuất kho. |

---

## 2. Luồng hoạt động tổng quát

### 2.1. Khi mở trang người dùng thường

File chạy chính: `public.js`

Luồng xử lý:

1. Trang load xong.
2. Hàm `loadPublicData()` được gọi.
3. Website gọi API để lấy:
   - danh sách sản phẩm,
   - danh sách danh mục,
   - lịch sử giao dịch.
4. Sau khi có dữ liệu, website render:
   - bộ lọc danh mục,
   - bảng sản phẩm,
   - bảng giao dịch gần đây,
   - các thống kê tổng quan.
5. Người dùng có thể tìm kiếm hoặc lọc theo danh mục.

### 2.2. Khi mở trang quản trị

File chạy chính: `admin.js`

Luồng xử lý:

1. Trang load xong.
2. Hàm `loadAdminData()` được gọi.
3. Website gọi API để lấy sản phẩm, danh mục và giao dịch.
4. Sau đó gọi `renderAdminPage()` để render toàn bộ giao diện admin.
5. Admin có thể:
   - thêm sản phẩm,
   - sửa sản phẩm,
   - xóa sản phẩm,
   - nhập kho,
   - xuất kho,
   - thêm danh mục.

### 2.3. Khi mở trang lịch sử

File chạy chính: `history.js`

Luồng xử lý:

1. Trang load xong.
2. Hàm `loadHistoryPage()` được gọi.
3. Website gọi API lấy toàn bộ dữ liệu kho.
4. Giao dịch được sắp xếp theo thời gian mới nhất trước.
5. Bảng lịch sử được hiển thị ra màn hình.

---

## 3. File `config.js`

File này dùng để lưu các giá trị cấu hình dùng chung cho toàn bộ website.

### Biến `API`

```js
const API = {
  products: '...',
  categories: '...',
  transactions: '...'
};
```

Tác dụng:

- Lưu đường dẫn API của MockAPI.
- Các file khác sẽ dùng `API.products`, `API.categories`, `API.transactions` để gọi dữ liệu.
- Khi muốn đổi API, chỉ cần sửa ở file này, không cần sửa nhiều file khác.

Ý nghĩa từng thuộc tính:

| Thuộc tính | Tác dụng |
|---|---|
| `API.products` | API quản lý danh sách hàng hóa. |
| `API.categories` | API quản lý danh mục hàng hóa. |
| `API.transactions` | API quản lý lịch sử nhập/xuất kho. |

### Biến `PLACEHOLDER_IMG`

```js
const PLACEHOLDER_IMG = 'https://placehold.co/100x100?text=StockPro';
```

Tác dụng:

- Là ảnh mặc định.
- Nếu sản phẩm không có ảnh, website sẽ dùng ảnh này.

---

## 4. File `api.js`

File này gom các hàm gọi API để những file khác không phải viết lại `fetch()` nhiều lần.

### Hàm `requestJSON(url, options = {})`

Tác dụng:

- Gửi request đến API bằng `fetch()`.
- Tự thêm header `Content-Type: application/json`.
- Kiểm tra response có lỗi không.
- Nếu thành công, trả về dữ liệu JSON.
- Nếu thất bại, in lỗi ra console và ném lỗi ra ngoài.

Dùng khi:

- Cần gọi API dạng JSON.
- Các hàm `apiGet`, `apiPost`, `apiPut`, `apiDelete` đều gọi lại hàm này.

### Hàm `apiGet(url)`

Tác dụng:

- Lấy dữ liệu từ API.
- Tương ứng với HTTP method `GET`.

Ví dụ:

```js
const products = await apiGet(API.products);
```

### Hàm `apiPost(url, data)`

Tác dụng:

- Thêm dữ liệu mới lên API.
- Tương ứng với HTTP method `POST`.

Dùng khi:

- Thêm sản phẩm mới.
- Thêm danh mục mới.
- Thêm giao dịch nhập/xuất kho.

### Hàm `apiPut(url, data)`

Tác dụng:

- Cập nhật dữ liệu đã có trên API.
- Tương ứng với HTTP method `PUT`.

Dùng khi:

- Sửa thông tin sản phẩm.
- Cập nhật số lượng tồn kho sau khi nhập/xuất.

### Hàm `apiDelete(url)`

Tác dụng:

- Xóa dữ liệu trên API.
- Tương ứng với HTTP method `DELETE`.

Dùng khi:

- Xóa sản phẩm khỏi danh sách.

### Hàm `loadAllStockData()`

Tác dụng:

- Gọi 3 API chính:
  - sản phẩm,
  - danh mục,
  - giao dịch.
- Trả về một object chứa toàn bộ dữ liệu.

Dữ liệu trả về có dạng:

```js
{
  products: products,
  categories: categories,
  transactions: transactions
}
```

Dùng ở:

- `history.js`, để lấy toàn bộ dữ liệu phục vụ trang lịch sử.

---

## 5. File `utils.js`

File này chứa các hàm tiện ích dùng chung ở nhiều trang.

### Hàm `qs(id)`

Tác dụng:

- Lấy một phần tử HTML theo `id`.
- Viết ngắn gọn thay cho `document.getElementById(id)`.

Ví dụ:

```js
const tableBody = qs('productTableBody');
```

### Hàm `money(value)`

Tác dụng:

- Chuyển số thành định dạng tiền Việt Nam.

Ví dụ:

```js
money(1500000);
```

Kết quả:

```text
1.500.000 đ
```

### Hàm `dateTime(value)`

Tác dụng:

- Chuyển ngày giờ từ API sang định dạng dễ đọc theo chuẩn Việt Nam.
- Nếu không có ngày giờ thì trả về chuỗi rỗng.

### Hàm `formatDateTime(value)`

Tác dụng:

- Gọi lại `dateTime(value)`.
- Được giữ lại để file `history.js` có thể dùng tên hàm dễ hiểu hơn.

### Hàm `showLoading(show = true)`

Tác dụng:

- Hiển thị hoặc ẩn các phần tử có class `.loading-box`.

Tham số:

| Tham số | Ý nghĩa |
|---|---|
| `show = true` | Nếu `true` thì hiện loading, nếu `false` thì ẩn loading. |

### Hàm `showError(message)`

Tác dụng:

- Hiển thị thông báo lỗi.
- Bên trong hàm này gọi `showToast(message, 'danger')`.

### Hàm `showToast(message, type = 'success')`

Tác dụng:

- Hiển thị thông báo dạng toast bằng Bootstrap.
- Nếu trang không có `toastBox`, hàm sẽ dùng `alert()`.

Tham số:

| Tham số | Ý nghĩa |
|---|---|
| `message` | Nội dung thông báo. |
| `type` | Kiểu thông báo, ví dụ `success`, `danger`, `warning`. |

### Hàm `getCategoryName(categories, categoryId)`

Tác dụng:

- Tìm tên danh mục dựa vào `categoryId`.
- Nếu không tìm thấy thì trả về `Chưa phân loại`.

### Hàm `getProductNameById(products, productId)`

Tác dụng:

- Tìm tên sản phẩm dựa vào `productId`.
- Nếu không tìm thấy thì trả về chính `productId`.

Dùng ở:

- `history.js`, để hiển thị tên sản phẩm trong bảng lịch sử.

### Hàm `isLowStock(product)`

Tác dụng:

- Kiểm tra sản phẩm có tồn kho thấp hay không.

Điều kiện:

```js
quantity <= minStock
```

Nếu số lượng hiện tại nhỏ hơn hoặc bằng tồn tối thiểu thì sản phẩm được xem là sắp hết hàng.

### Hàm `calcInventoryValue(products)`

Tác dụng:

- Tính tổng giá trị hàng tồn kho.

Công thức:

```text
Tổng giá trị = tổng của từng sản phẩm: số lượng * giá tiền
```

---

## 6. File `validation.js`

File này kiểm tra dữ liệu trong form trước khi gửi lên API.

Mục đích:

- Tránh gửi dữ liệu sai.
- Hiển thị lỗi ngay trên giao diện.
- Giúp người dùng biết cần sửa trường nào.

### Hàm `setFieldError(fieldId, message)`

Tác dụng:

- Hiển thị lỗi cho một field.
- Hàm sẽ tìm phần tử có id dạng:

```js
fieldId + 'Error'
```

Ví dụ:

```js
setFieldError('code', 'Mã hàng không hợp lệ');
```

Hàm sẽ tìm element có id:

```text
codeError
```

### Hàm `required(value)`

Tác dụng:

- Kiểm tra giá trị có bị rỗng không.

Trả về:

| Kết quả | Ý nghĩa |
|---|---|
| `true` | Có dữ liệu. |
| `false` | Rỗng, `null`, hoặc `undefined`. |

### Hàm `clearProductFormErrors()`

Tác dụng:

- Xóa toàn bộ thông báo lỗi của form sản phẩm.
- Được gọi trước khi kiểm tra lại form.

### Hàm `validateProductCode(code)`

Tác dụng:

- Kiểm tra mã sản phẩm có đúng định dạng không.

Định dạng hợp lệ:

```text
SP001, SP002, SP123, ...
```

Biểu thức kiểm tra:

```js
/^SP\d{3,}$/i
```

Ý nghĩa:

- Bắt đầu bằng `SP`.
- Sau đó có ít nhất 3 chữ số.
- Không phân biệt chữ hoa/thường.

### Hàm `validateProductForm(form)`

Tác dụng:

- Kiểm tra form thêm/sửa sản phẩm.

Các trường được kiểm tra:

| Trường | Điều kiện hợp lệ |
|---|---|
| `code` | Có dạng `SP001`, `SP002`, ... |
| `name` | Tên hàng phải từ 3 ký tự. |
| `categoryId` | Phải chọn nhóm hàng. |
| `quantity` | Số nguyên và >= 0. |
| `unit` | Không được rỗng. |
| `price` | Phải lớn hơn 0. |
| `minStock` | Số nguyên và >= 0. |

Trả về:

| Kết quả | Ý nghĩa |
|---|---|
| `true` | Form hợp lệ. |
| `false` | Form có lỗi. |

### Hàm `validateStockForm(form)`

Tác dụng:

- Kiểm tra form nhập kho hoặc xuất kho.

Các trường được kiểm tra:

| Trường | Điều kiện hợp lệ |
|---|---|
| `productId` | Phải chọn hàng hóa. |
| `quantity` | Số nguyên và > 0. |

---

## 7. File `public.js`

File này xử lý trang dành cho người dùng thường. Người dùng chỉ xem tồn kho, tìm kiếm, lọc và xem lịch sử gần đây.

### Biến toàn cục

```js
let publicProducts = [];
let publicCategories = [];
let publicTransactions = [];
```

Ý nghĩa:

| Biến | Tác dụng |
|---|---|
| `publicProducts` | Lưu danh sách sản phẩm lấy từ API. |
| `publicCategories` | Lưu danh sách danh mục lấy từ API. |
| `publicTransactions` | Lưu danh sách giao dịch lấy từ API. |

### Hàm `loadPublicData()`

Tác dụng:

- Bật loading.
- Gọi API lấy sản phẩm, giao dịch và danh mục.
- Lưu dữ liệu vào biến toàn cục.
- Gọi các hàm render giao diện.
- Tắt loading sau khi hoàn tất.

Các hàm render được gọi:

```js
renderCategoryFilter();
renderPublicProducts();
renderPublicTransactions();
renderPublicStats();
```

### Hàm `renderCategoryFilter()`

Tác dụng:

- Đổ danh sách danh mục vào thẻ `<select>` lọc danh mục.
- Mặc định có lựa chọn `Tất cả nhóm hàng`.

### Hàm `getSearchKeyword()`

Tác dụng:

- Lấy từ khóa người dùng nhập trong ô tìm kiếm.
- Chuyển về chữ thường để tìm kiếm không phân biệt hoa/thường.

### Hàm `getSelectedCategoryId()`

Tác dụng:

- Lấy id danh mục đang được chọn trong bộ lọc.

### Hàm `isProductMatched(product, keyword, categoryId)`

Tác dụng:

- Kiểm tra một sản phẩm có phù hợp với điều kiện tìm kiếm và lọc không.

Điều kiện đúng:

- Tên hoặc mã sản phẩm chứa từ khóa tìm kiếm.
- Và sản phẩm thuộc danh mục đang chọn.

### Hàm `filterProducts()`

Tác dụng:

- Lọc danh sách sản phẩm dựa theo:
  - từ khóa tìm kiếm,
  - danh mục đang chọn.
- Trả về mảng sản phẩm phù hợp.

### Hàm `createLowStockBadge(product)`

Tác dụng:

- Nếu sản phẩm sắp hết hàng thì trả về badge `Sắp hết`.
- Nếu chưa sắp hết thì trả về chuỗi rỗng.

### Hàm `createPublicProductRow(product)`

Tác dụng:

- Tạo HTML cho một dòng sản phẩm trong bảng public.

Thông tin hiển thị:

- ảnh sản phẩm,
- mã sản phẩm,
- tên sản phẩm,
- danh mục,
- số lượng,
- giá tiền,
- mô tả.

### Hàm `renderPublicProducts()`

Tác dụng:

- Lấy danh sách sản phẩm đã lọc từ `filterProducts()`.
- Render ra bảng sản phẩm.
- Nếu không có sản phẩm phù hợp thì hiển thị dòng `Không có dữ liệu phù hợp`.

### Hàm `getProductLabel(productId)`

Tác dụng:

- Tìm sản phẩm theo `productId`.
- Nếu tìm thấy, trả về chuỗi:

```text
Mã sản phẩm - Tên sản phẩm
```

Ví dụ:

```text
SP001 - Bàn phím cơ
```

### Hàm `getTransactionBadge(transactionType)`

Tác dụng:

- Tạo badge cho loại giao dịch.

| `transactionType` | Badge hiển thị |
|---|---|
| `import` | Nhập kho |
| Khác `import` | Xuất kho |

### Hàm `createPublicTransactionRow(transaction)`

Tác dụng:

- Tạo HTML cho một dòng giao dịch trong bảng lịch sử gần đây.

Thông tin hiển thị:

- thời gian,
- sản phẩm,
- loại giao dịch,
- số lượng,
- ghi chú.

### Hàm `renderPublicTransactions()`

Tác dụng:

- Hiển thị 20 giao dịch mới nhất.
- Nếu chưa có giao dịch thì hiển thị `Chưa có giao dịch`.

### Hàm `renderPublicStats()`

Tác dụng:

- Hiển thị thống kê ở trang public.

Các chỉ số:

| Chỉ số | Ý nghĩa |
|---|---|
| Tổng sản phẩm | Số lượng sản phẩm trong kho. |
| Hàng tồn thấp | Số sản phẩm có `quantity <= minStock`. |
| Giá trị tồn kho | Tổng tiền của toàn bộ hàng tồn. |

### Hàm `registerPublicEvents()`

Tác dụng:

- Gắn sự kiện cho các thành phần trên trang public.

Các sự kiện:

| Element | Sự kiện | Tác dụng |
|---|---|---|
| `#searchInput` | `keyup` | Gõ tìm kiếm thì render lại bảng sản phẩm. |
| `#filterCategory` | `change` | Đổi danh mục thì render lại bảng sản phẩm. |
| `#historyToggle` | `click` | Hiện khung lịch sử giao dịch. |

### Đoạn `$(document).ready(...)`

Tác dụng:

- Chờ HTML load xong rồi mới chạy JS.
- Nếu không phải trang public thì không chạy.
- Nếu đúng trang public thì gọi:

```js
loadPublicData();
registerPublicEvents();
```

---

## 8. File `admin.js`

File này xử lý trang quản trị kho hàng.

### Biến toàn cục

```js
let products = [];
let categories = [];
let transactions = [];
let editingProductId = null;
```

Ý nghĩa:

| Biến | Tác dụng |
|---|---|
| `products` | Danh sách sản phẩm. |
| `categories` | Danh sách danh mục. |
| `transactions` | Danh sách giao dịch. |
| `editingProductId` | Lưu id sản phẩm đang sửa. Nếu là `null` nghĩa là đang thêm mới. |

### Hàm `loadAdminData()`

Tác dụng:

- Bật loading.
- Gọi API lấy sản phẩm, danh mục, giao dịch.
- Lưu dữ liệu vào biến toàn cục.
- Gọi `renderAdminPage()` để cập nhật giao diện.
- Tắt loading sau khi hoàn tất.

### Hàm `renderAdminPage()`

Tác dụng:

- Render toàn bộ nội dung trang admin.

Các hàm được gọi:

```js
renderAdminStats();
renderProductSelect();
renderAdminProducts();
renderCategoryList();
renderAdminTransactions();
fillCategoryOptions();
```

### Hàm `renderAdminStats()`

Tác dụng:

- Hiển thị thống kê admin:
  - tổng sản phẩm,
  - số sản phẩm tồn thấp,
  - tổng giá trị tồn kho.

### Hàm `createProductOption(product)`

Tác dụng:

- Tạo HTML `<option>` cho một sản phẩm.
- Dùng trong select nhập kho/xuất kho.

### Hàm `renderProductSelect()`

Tác dụng:

- Đổ danh sách sản phẩm vào select nhập kho và xuất kho.

Các select được cập nhật:

```js
#stockProductId
#exportProductId
```

### Hàm `createProductStatusBadge(product)`

Tác dụng:

- Tạo badge trạng thái sản phẩm.

| Điều kiện | Badge |
|---|---|
| Tồn thấp | `Tồn thấp` |
| Bình thường | `Ổn` |

### Hàm `createAdminProductRow(product)`

Tác dụng:

- Tạo HTML cho một dòng sản phẩm trong bảng admin.

Thông tin hiển thị:

- mã hàng,
- tên hàng,
- danh mục,
- số lượng,
- giá tiền,
- tồn tối thiểu,
- trạng thái,
- nút sửa/xóa.

### Hàm `renderAdminProducts()`

Tác dụng:

- Render toàn bộ danh sách sản phẩm ra bảng admin.
- Nếu chưa có sản phẩm thì hiển thị `Chưa có hàng hóa`.

### Hàm `createCategoryItem(category)`

Tác dụng:

- Tạo HTML cho một danh mục trong danh sách danh mục.

### Hàm `renderCategoryList()`

Tác dụng:

- Hiển thị danh sách danh mục hiện có.
- Nếu chưa có danh mục thì hiển thị `Chưa có danh mục`.

### Hàm `getAdminTransactionTypeLabel(type)`

Tác dụng:

- Chuyển loại giao dịch từ dữ liệu kỹ thuật sang chữ dễ hiểu.

| Giá trị API | Hiển thị |
|---|---|
| `import` | Nhập kho |
| Khác `import` | Xuất kho |

### Hàm `getTransactionProductName(productId)`

Tác dụng:

- Tìm tên sản phẩm dựa vào `productId`.
- Nếu không tìm thấy thì hiển thị chính `productId`.

### Hàm `createAdminTransactionRow(transaction)`

Tác dụng:

- Tạo HTML cho một dòng giao dịch trong bảng admin.

### Hàm `renderAdminTransactions()`

Tác dụng:

- Hiển thị 15 giao dịch mới nhất trên trang admin.
- Nếu chưa có giao dịch thì hiển thị `Chưa có giao dịch`.

### Hàm `createProductPayload(form)`

Tác dụng:

- Lấy dữ liệu từ form sản phẩm.
- Chuyển thành object để gửi lên API.

Object gồm:

```js
{
  code,
  name,
  categoryId,
  quantity,
  unit,
  price,
  minStock,
  description,
  image,
  createdAt
}
```

### Hàm `productPayload(form)`

Tác dụng:

- Gọi lại `createProductPayload(form)`.
- Giữ tên hàm cũ để tránh lỗi nếu HTML hoặc file khác vẫn gọi `productPayload()`.

### Hàm `fillCategoryOptions()`

Tác dụng:

- Đổ danh sách danh mục vào select trong form sản phẩm.

### Hàm `resetProductForm()`

Tác dụng:

- Đưa form sản phẩm về trạng thái ban đầu.
- Xóa `editingProductId`.
- Reset dữ liệu đang nhập.
- Load lại danh mục cho select.

### Hàm `showProductForm()`

Tác dụng:

- Hiện form thêm/sửa sản phẩm.

### Hàm `hideProductForm()`

Tác dụng:

- Ẩn form thêm/sửa sản phẩm.

### Hàm `saveProduct(event)`

Tác dụng:

- Xử lý khi người dùng submit form sản phẩm.

Luồng xử lý:

1. Chặn reload trang bằng `event.preventDefault()`.
2. Kiểm tra form bằng `validateProductForm(form)`.
3. Tạo dữ liệu bằng `createProductPayload(form)`.
4. Nếu `editingProductId` có giá trị thì cập nhật sản phẩm bằng `apiPut()`.
5. Nếu `editingProductId` là `null` thì thêm sản phẩm mới bằng `apiPost()`.
6. Reset form.
7. Ẩn form.
8. Load lại dữ liệu admin.

### Hàm `findProductById(id)`

Tác dụng:

- Tìm một sản phẩm trong mảng `products` theo id.

### Hàm `fillProductForm(product)`

Tác dụng:

- Đổ dữ liệu sản phẩm lên form để sửa.

### Hàm `startEditProduct(id)`

Tác dụng:

- Bắt đầu chế độ sửa sản phẩm.

Luồng xử lý:

1. Tìm sản phẩm theo id.
2. Gán `editingProductId` bằng id sản phẩm.
3. Đổ danh mục vào select.
4. Đổ dữ liệu sản phẩm vào form.
5. Hiện form.

### Hàm `deleteProduct(id)`

Tác dụng:

- Xóa sản phẩm.

Luồng xử lý:

1. Hiện hộp xác nhận `confirm()`.
2. Nếu người dùng đồng ý thì gọi `apiDelete()`.
3. Hiển thị thông báo thành công.
4. Load lại dữ liệu admin.

### Hàm `calculateNewQuantity(product, quantity, type)`

Tác dụng:

- Tính số lượng tồn mới sau khi nhập hoặc xuất kho.

Công thức:

| Loại giao dịch | Công thức |
|---|---|
| Nhập kho | `số lượng hiện tại + số lượng nhập` |
| Xuất kho | `số lượng hiện tại - số lượng xuất` |

### Hàm `validateExportQuantity(product, quantity)`

Tác dụng:

- Kiểm tra khi xuất kho có vượt quá số lượng tồn không.

Nếu xuất quá số lượng tồn:

- Hiển thị lỗi.
- Trả về `false`.

### Hàm `createTransactionPayload(productId, type, quantity, note)`

Tác dụng:

- Tạo object giao dịch để gửi lên API.

Object gồm:

```js
{
  productId,
  type,
  quantity,
  note,
  createdAt
}
```

### Hàm `submitStock(event, type)`

Tác dụng:

- Xử lý nhập kho hoặc xuất kho.

Luồng xử lý:

1. Chặn reload trang.
2. Kiểm tra form nhập/xuất bằng `validateStockForm(form)`.
3. Tìm sản phẩm theo id.
4. Nếu là xuất kho thì kiểm tra không được xuất quá tồn.
5. Tính số lượng mới.
6. Cập nhật sản phẩm bằng `apiPut()`.
7. Thêm giao dịch mới bằng `apiPost()`.
8. Reset form.
9. Load lại dữ liệu admin.

### Hàm `getCategoryFormData()`

Tác dụng:

- Lấy dữ liệu từ form thêm danh mục.

Dữ liệu gồm:

- tên danh mục,
- mô tả danh mục.

### Hàm `validateCategoryName(name)`

Tác dụng:

- Kiểm tra tên danh mục có bị rỗng không.
- Nếu rỗng thì focus vào ô nhập tên danh mục.

### Hàm `addCategory(event)`

Tác dụng:

- Thêm danh mục mới.

Luồng xử lý:

1. Chặn reload trang.
2. Lấy dữ liệu form danh mục.
3. Kiểm tra tên danh mục.
4. Gửi dữ liệu lên API bằng `$.post()`.
5. Reset form.
6. Hiển thị thông báo.
7. Load lại dữ liệu admin.

### Hàm `registerAdminEvents()`

Tác dụng:

- Gắn toàn bộ sự kiện cho trang admin.

Các sự kiện chính:

| Element | Sự kiện | Tác dụng |
|---|---|---|
| `#showProductForm` | `click` | Hiện form thêm sản phẩm. |
| `#hideProductForm` | `click` | Ẩn form sản phẩm. |
| `#productForm` | `submit` | Thêm hoặc sửa sản phẩm. |
| `#importForm` | `submit` | Nhập kho. |
| `#exportForm` | `submit` | Xuất kho. |
| `#categoryForm` | `submit` | Thêm danh mục. |
| `.edit-product` | `click` | Sửa sản phẩm. |
| `.delete-product` | `click` | Xóa sản phẩm. |

### Đoạn `$(document).ready(...)`

Tác dụng:

- Chờ HTML load xong rồi mới chạy JS.
- Nếu không phải trang admin thì không chạy.
- Nếu đúng trang admin thì gọi:

```js
loadAdminData();
registerAdminEvents();
```

---

## 9. File `history.js`

File này xử lý trang xem toàn bộ lịch sử nhập/xuất kho.

### Biến toàn cục

```js
let historyProducts = [];
let historyTransactions = [];
```

Ý nghĩa:

| Biến | Tác dụng |
|---|---|
| `historyProducts` | Lưu danh sách sản phẩm để tra tên sản phẩm. |
| `historyTransactions` | Lưu danh sách toàn bộ giao dịch. |

### Hàm `loadHistoryPage()`

Tác dụng:

- Bật loading.
- Gọi `loadAllStockData()` để lấy dữ liệu.
- Lưu sản phẩm và giao dịch vào biến toàn cục.
- Gọi `renderFullHistoryTable()` để hiển thị bảng.
- Tắt loading sau khi hoàn tất.

### Hàm `getSortedTransactions()`

Tác dụng:

- Sao chép mảng giao dịch.
- Sắp xếp giao dịch mới nhất lên đầu.
- Trả về mảng đã sắp xếp.

Lý do phải dùng `.slice()`:

- Để sao chép mảng trước khi sort.
- Tránh làm thay đổi mảng gốc `historyTransactions`.

### Hàm `getTransactionTypeInfo(type)`

Tác dụng:

- Chuyển loại giao dịch thành thông tin hiển thị.

Nếu `type === 'import'`:

```js
{
  label: 'Nhập kho',
  badgeClass: 'success'
}
```

Ngược lại:

```js
{
  label: 'Xuất kho',
  badgeClass: 'danger'
}
```

### Hàm `createHistoryRow(transaction)`

Tác dụng:

- Tạo HTML cho một dòng lịch sử giao dịch.

Thông tin hiển thị:

- thời gian,
- tên sản phẩm,
- loại giao dịch,
- số lượng,
- ghi chú.

### Hàm `renderEmptyHistoryRow(tableBody)`

Tác dụng:

- Hiển thị dòng thông báo `Chưa có giao dịch` nếu không có dữ liệu lịch sử.

### Hàm `renderFullHistoryTable()`

Tác dụng:

- Render toàn bộ lịch sử nhập/xuất ra bảng.

Luồng xử lý:

1. Lấy `historyTableBody`.
2. Lấy danh sách giao dịch đã sắp xếp.
3. Nếu không có giao dịch thì gọi `renderEmptyHistoryRow()`.
4. Nếu có giao dịch thì tạo HTML từng dòng bằng `createHistoryRow()`.
5. Gán HTML vào bảng.

### Đoạn `$(document).ready(...)`

Tác dụng:

- Chờ HTML load xong.
- Nếu không phải trang lịch sử thì không chạy.
- Nếu đúng trang lịch sử thì gọi `loadHistoryPage()`.

---

## 10. Thứ tự nhúng file JS nên dùng trong HTML

Vì các file có phụ thuộc lẫn nhau, nên nên nhúng theo thứ tự sau:

```html
<script src="js/config.js"></script>
<script src="js/api.js"></script>
<script src="js/utils.js"></script>
<script src="js/validation.js"></script>

<!-- Chỉ nhúng file trang nào cần dùng -->
<script src="js/public.js"></script>
<!-- hoặc -->
<script src="js/admin.js"></script>
<!-- hoặc -->
<script src="js/history.js"></script>
```

Lưu ý:

- `config.js` nên đặt trước `api.js` vì `api.js` cần dùng biến `API`.
- `utils.js` nên đặt trước các file trang vì các file trang dùng hàm `qs`, `money`, `showToast`, `isLowStock`, ...
- `validation.js` cần cho `admin.js` vì admin có form thêm/sửa sản phẩm và nhập/xuất kho.

---

## 11. Các khái niệm JavaScript xuất hiện trong project

| Khái niệm | Project dùng ở đâu? |
|---|---|
| Biến `let`, `const` | Lưu dữ liệu sản phẩm, danh mục, giao dịch. |
| Hàm `function` | Tách chức năng thành từng phần nhỏ. |
| Mảng `Array` | Lưu danh sách sản phẩm, danh mục, giao dịch. |
| Vòng lặp `for` | Duyệt qua mảng để tạo HTML. |
| Điều kiện `if/else` | Kiểm tra lỗi, kiểm tra tồn kho, kiểm tra loại giao dịch. |
| DOM | Lấy element và cập nhật HTML. |
| `innerHTML` | Gán nội dung bảng. |
| `fetch()` | Gọi API bằng JavaScript thuần. |
| `async/await` | Chờ API trả dữ liệu. |
| `try/catch` | Bắt lỗi khi gọi API. |
| jQuery | Gắn sự kiện, gọi `$.get`, `$.post`, hiệu ứng `fadeIn`, `fadeOut`. |
| Bootstrap Toast | Hiển thị thông báo thành công/lỗi. |

---

## 12. Gợi ý cách học project này

Nên đọc theo thứ tự:

1. `config.js`: biết API nằm ở đâu.
2. `api.js`: hiểu cách gọi API.
3. `utils.js`: hiểu các hàm dùng chung.
4. `validation.js`: hiểu cách kiểm tra form.
5. `public.js`: hiểu chức năng người dùng thường.
6. `history.js`: hiểu cách render lịch sử.
7. `admin.js`: học phần quan trọng nhất, gồm CRUD và nhập/xuất kho.

Cách tự kiểm tra:

- Thêm `console.log()` trong từng hàm để xem hàm nào chạy trước.
- Mở DevTools bằng `F12`.
- Xem tab `Console` để kiểm tra lỗi.
- Xem tab `Network` để kiểm tra API có được gọi không.

---

## 13. Tóm tắt nhanh chức năng chính

| Chức năng | File xử lý chính |
|---|---|
| Xem danh sách sản phẩm | `public.js`, `admin.js` |
| Tìm kiếm sản phẩm | `public.js` |
| Lọc theo danh mục | `public.js` |
| Xem lịch sử giao dịch gần đây | `public.js`, `admin.js` |
| Xem toàn bộ lịch sử | `history.js` |
| Thêm sản phẩm | `admin.js` |
| Sửa sản phẩm | `admin.js` |
| Xóa sản phẩm | `admin.js` |
| Nhập kho | `admin.js` |
| Xuất kho | `admin.js` |
| Thêm danh mục | `admin.js` |
| Gọi API | `api.js` |
| Kiểm tra form | `validation.js` |
| Format tiền/ngày/thông báo | `utils.js` |
| Cấu hình API | `config.js` |
