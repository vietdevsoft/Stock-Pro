// =============================
// FILE: utils.js
// Mục đích: Chứa các hàm tiện ích dùng chung.
// Sinh viên nên đọc file này trước khi đọc public.js/admin.js.
// =============================

function getElement(id) {
  return document.getElementById(id);
}

function getAllElements(selector) {
  return document.querySelectorAll(selector);
}

function convertToNumber(value) {
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return 0;
}

function formatMoney(value) {
  const number = convertToNumber(value);
  return number.toLocaleString('vi-VN') + ' đ';
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN');
}

function showLoading(isShow) {
  const loadingBoxes = getAllElements('.loading-box');

  loadingBoxes.forEach(function (box) {
    if (isShow) {
      box.classList.remove('d-none');
      box.style.display = 'block';
    } else {
      box.classList.add('d-none');
      box.style.display = 'none';
    }
  });
}

function showToast(message, type) {
  const toastBox = getElement('toastBox');

  if (!type) {
    type = 'success';
  }

  if (!toastBox || typeof bootstrap === 'undefined') {
    alert(message);
    return;
  }

  const toastId = 'toast-' + Date.now();

  toastBox.insertAdjacentHTML(
    'beforeend',
    `
      <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `
  );

  const toastElement = getElement(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 2500 });

  toast.show();

  toastElement.addEventListener('hidden.bs.toast', function () {
    toastElement.remove();
  });
}

function showError(message) {
  showToast(message || 'Có lỗi xảy ra.', 'danger');
}

function getCategoryNameById(categories, categoryId) {
  for (let i = 0; i < categories.length; i++) {
    if (String(categories[i].id) === String(categoryId)) {
      return categories[i].name;
    }
  }

  return 'Chưa phân loại';
}

function getProductById(products, productId) {
  for (let i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(productId)) {
      return products[i];
    }
  }

  return null;
}

function getProductNameById(products, productId) {
  const product = getProductById(products, productId);

  if (product) {
    return product.code + ' - ' + product.name;
  }

  return '#' + productId;
}

// Hàm chính của bài: tính tồn kho từ lịch sử nhập/xuất.
// Công thức: tồn kho hiện tại = số lượng ban đầu + tổng nhập - tổng xuất.
// Dùng reduce để đáp ứng yêu cầu đề bài.
function calculateCurrentStock(product, transactions) {
  const beginQuantity = convertToNumber(product.quantity);

  const currentStock = transactions.reduce(function (stock, transaction) {
    const isSameProduct = String(transaction.productId) === String(product.id);

    if (!isSameProduct) {
      return stock;
    }

    const quantity = convertToNumber(transaction.quantity);

    if (transaction.type === 'import') {
      return stock + quantity;
    }

    if (transaction.type === 'export') {
      return stock - quantity;
    }

    return stock;
  }, beginQuantity);

  return currentStock;
}

function addCurrentStockToProducts(products, transactions) {
  const result = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const currentStock = calculateCurrentStock(product, transactions);

    result.push({
      ...product,
      currentStock: currentStock
    });
  }

  return result;
}

function isLowStock(product) {
  const currentStock = convertToNumber(product.currentStock);
  const minStock = convertToNumber(product.minStock);

  return currentStock <= minStock;
}

function calculateInventoryValue(products) {
  let total = 0;

  for (let i = 0; i < products.length; i++) {
    const stock = convertToNumber(products[i].currentStock);
    const price = convertToNumber(products[i].price);

    total = total + stock * price;
  }

  return total;
}

function setFieldError(fieldId, message) {
  const input = getElement(fieldId);
  const errorBox = getElement(fieldId + 'Error');

  if (errorBox) {
    errorBox.innerText = message || '';
  }

  if (input) {
    if (message) {
      input.classList.add('is-invalid');
    } else {
      input.classList.remove('is-invalid');
    }
  }
}

function clearFieldErrors(fieldIds) {
  for (let i = 0; i < fieldIds.length; i++) {
    setFieldError(fieldIds[i], '');
  }
}
