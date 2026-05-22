// =============================
// FILE: utils.js
// Mục đích: Chứa các hàm tiện ích dùng chung ở nhiều trang.
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

  // Nếu trang không có vùng hiển thị toast thì dùng alert cho đơn giản.
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
  const category = categories.find(function (item) {
    return String(item.id) === String(categoryId);
  });

  return category ? category.name : 'Chưa phân loại';
}

function getProductNameById(products, productId) {
  const product = products.find(function (item) {
    return String(item.id) === String(productId);
  });

  return product ? product.name : productId;
}

function isLowStock(product) {
  const quantity = Number(product.quantity || 0);
  const minStock = Number(product.minStock || 0);

  return quantity <= minStock;
}

function calcInventoryValue(products) {
  let total = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const quantity = Number(product.quantity || 0);
    const price = Number(product.price || 0);

    total += quantity * price;
  }

  return total;
}
