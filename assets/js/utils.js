// =============================
// FILE: utils.js
// Mục đích: Chứa các hàm tiện ích dùng chung ở nhiều trang.
// =============================

function qs(id) {
  return document.getElementById(id);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isBadText(value) {
  const text = String(value || '').trim();
  return text === '' || text === 'NaN' || text.includes('undefined') || text.includes('null');
}

function cleanText(value, fallback = '') {
  if (isBadText(value)) {
    return fallback;
  }

  return String(value).trim();
}

function toSafeNumber(value, fallback = 0) {
  const numberValue = Number(value);

  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return fallback;
}

function toSafeInteger(value, fallback = 0) {
  const numberValue = Number(value);

  if (Number.isInteger(numberValue)) {
    return numberValue;
  }

  if (Number.isFinite(numberValue)) {
    return Math.floor(numberValue);
  }

  return fallback;
}

function money(value) {
  const numberValue = toSafeNumber(value, 0);
  return numberValue.toLocaleString('vi-VN') + ' đ';
}

function dateTime(value) {
  if (!hasValue(value)) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN');
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

function getCategoryName(categories, categoryId) {
  for (let i = 0; i < categories.length; i++) {
    if (String(categories[i].id) === String(categoryId)) {
      return categories[i].name;
    }
  }

  return 'Chưa phân loại';
}

function getProductImage(product) {
  const image = cleanText(product.image || product.imageUrl, '');
  return image || PLACEHOLDER_IMG;
}

function getProductNameById(products, productId) {
  for (let i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(productId)) {
      return products[i].name;
    }
  }

  return productId ? 'Sản phẩm #' + productId : 'Không rõ sản phẩm';
}

function getDisplayQuantity(product) {
  return toSafeInteger(product.quantity, 0);
}

function isLowStock(product) {
  const quantity = getDisplayQuantity(product);
  const minStock = toSafeInteger(product.minStock, 0);

  return quantity <= minStock;
}

function calcInventoryValue(products) {
  let total = 0;

  for (let i = 0; i < products.length; i++) {
    total += getDisplayQuantity(products[i]) * toSafeNumber(products[i].price, 0);
  }

  return total;
}

function sortByNewest(items) {
  const copiedItems = items.slice();

  copiedItems.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return copiedItems;
}

function buildItemUrl(resourceUrl, itemId) {
  if (!hasValue(itemId)) {
    throw new Error('Thiếu id bản ghi. Không được gọi DELETE/PUT vào URL gốc.');
  }

  const cleanResourceUrl = String(resourceUrl).replace(/\/+$/, '');
  return cleanResourceUrl + '/' + encodeURIComponent(String(itemId));
}
