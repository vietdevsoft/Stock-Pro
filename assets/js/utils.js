// =============================
// FILE: utils.js
// Mục đích: Chứa các hàm tiện ích dùng chung ở nhiều trang.
// Ghi chú quan trọng:
// - API hiện tại có Products/Categories thiếu id.
// - Vì vậy frontend tạo thêm _selectId, _legacyId, _categoryId để dùng nội bộ.
// =============================

function qs(id) {
  return document.getElementById(id);
}

function money(value) {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('vi-VN') + ' đ';
}

function dateTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('vi-VN');
}

function formatDateTime(value) {
  return dateTime(value);
}

function showLoading(show = true) {
  const loadingBoxes = document.querySelectorAll('.loading-box');

  loadingBoxes.forEach(function (element) {
    element.style.display = show ? 'block' : 'none';
  });
}

function showError(message) {
  showToast(message || 'Có lỗi xảy ra', 'danger');
}

function showToast(message, type = 'success') {
  const toastBox = qs('toastBox');

  if (!toastBox) {
    alert(message);
    return;
  }

  const toastId = 'toast-' + Date.now();

  toastBox.innerHTML += `
    <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  const toastElement = qs(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeCategories(rawCategories) {
  const result = [];

  for (let i = 0; i < rawCategories.length; i++) {
    const category = rawCategories[i];

    result.push({
      ...category,

      // Nếu API không có id thì lấy số thứ tự 1, 2, 3...
      // Nhờ đó product.categoryId = 1 vẫn map được với danh mục đầu tiên.
      _categoryId: hasValue(category.id) ? String(category.id) : String(i + 1),
      _canDeleteRemote: hasValue(category.id)
    });
  }

  return result;
}

function normalizeProducts(rawProducts) {
  const result = [];

  for (let i = 0; i < rawProducts.length; i++) {
    const product = rawProducts[i];

    result.push({
      ...product,

      // _selectId chỉ dùng cho <select>, không gửi lên API.
      _selectId: String(i),

      // _legacyId dùng để khớp với transaction cũ.
      // Vì Transactions hiện đang lưu productId = 1, 2, 3...
      _legacyId: String(i + 1),

      // _apiId dùng khi record có id thật để PUT/DELETE.
      _apiId: hasValue(product.id) ? String(product.id) : ''
    });
  }

  return result;
}

function getCategoryName(categories, categoryId) {
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];

    if (String(category._categoryId) === String(categoryId)) {
      return category.name;
    }

    if (hasValue(category.id) && String(category.id) === String(categoryId)) {
      return category.name;
    }
  }

  return 'Chưa phân loại';
}

function getProductImage(product) {
  if (product.image) {
    return product.image;
  }

  if (product.imageUrl) {
    return product.imageUrl;
  }

  return PLACEHOLDER_IMG;
}

function getProductStockKey(product) {
  // Sản phẩm cũ trong API không có id, nên dùng số thứ tự legacy 1,2,3...
  // Sản phẩm mới có id thật, nhưng có thể trùng với legacy id.
  // Vì vậy ta thêm tiền tố p- để tránh nhầm với transaction cũ.
  if (product._apiId) {
    return 'p-' + product._apiId;
  }

  return product._legacyId;
}

function isSameProductTransaction(product, transaction) {
  const transactionProductId = String(transaction.productId);

  if (transactionProductId === getProductStockKey(product)) {
    return true;
  }

  // Transaction cũ đang lưu productId = 1, 2, 3...
  // Chỉ cho sản phẩm thiếu id thật dùng cách match legacy này.
  if (!product._apiId && transactionProductId === String(product._legacyId)) {
    return true;
  }

  return false;
}

function calculateCurrentStock(product, transactions) {
  let currentQuantity = Number(product.quantity || 0);

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    if (!isSameProductTransaction(product, transaction)) {
      continue;
    }

    const quantity = Number(transaction.quantity || 0);

    if (transaction.type === 'import') {
      currentQuantity += quantity;
    }

    if (transaction.type === 'export') {
      currentQuantity -= quantity;
    }
  }

  return currentQuantity;
}

function getDisplayQuantity(product) {
  if (hasValue(product.currentQuantity)) {
    return Number(product.currentQuantity);
  }

  return Number(product.quantity || 0);
}

function getProductNameById(products, productId) {
  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (String(productId) === getProductStockKey(product)) {
      return product.name;
    }

    if (!product._apiId && String(productId) === String(product._legacyId)) {
      return product.name;
    }
  }

  return productId;
}

function isLowStock(product) {
  const quantity = getDisplayQuantity(product);
  const minStock = Number(product.minStock || 0);

  return quantity <= minStock;
}

function calcInventoryValue(products) {
  let total = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const quantity = getDisplayQuantity(product);
    const price = Number(product.price || 0);

    total += quantity * price;
  }

  return total;
}

function applyCurrentStockToProducts(products, transactions) {
  const result = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    result.push({
      ...product,
      currentQuantity: calculateCurrentStock(product, transactions)
    });
  }

  return result;
}
