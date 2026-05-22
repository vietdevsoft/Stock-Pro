// =============================
// FILE: admin.js
// Mục đích: Xử lý trang Admin gồm:
// - CRUD hàng hóa
// - CRUD danh mục
// - Nhập kho
// - Xuất kho
// - Cảnh báo tồn kho thấp
// =============================

let adminProducts = [];
let rawProducts = [];
let adminCategories = [];
let adminTransactions = [];
let editingProductId = null;
let editingCategoryId = null;

async function loadAdminPage() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    adminProducts = data.products;
    rawProducts = data.rawProducts;
    adminCategories = data.categories;
    adminTransactions = data.transactions;

    renderAdminStatistics();
    renderProductSelectOptions();
    renderCategoryOptions();
    renderAdminProductTable();
    renderCategoryList();
    renderAdminTransactionTable();
    renderLowStockAlerts();
  } catch (error) {
    console.error(error);
    showError('Không tải được dữ liệu quản trị từ MockAPI.');
  } finally {
    showLoading(false);
  }
}

function renderAdminStatistics() {
  let lowStockCount = 0;

  for (let i = 0; i < adminProducts.length; i++) {
    if (isLowStock(adminProducts[i])) {
      lowStockCount = lowStockCount + 1;
    }
  }

  $('#adTotalProducts').html(adminProducts.length);
  $('#adLowStock').html(lowStockCount);
  $('#adInventoryValue').html(formatMoney(calculateInventoryValue(adminProducts)));
}

function renderProductSelectOptions() {
  let html = '<option value="">Chọn hàng hóa</option>';

  for (let i = 0; i < adminProducts.length; i++) {
    const product = adminProducts[i];

    html = html + `
      <option value="${product.id}">
        ${product.code} - ${product.name} | Tồn: ${product.currentStock} ${product.unit || ''}
      </option>
    `;
  }

  $('#importProductId').html(html);
  $('#exportProductId').html(html);
}

function renderCategoryOptions(selectedCategoryId) {
  let html = '<option value="">Chọn nhóm hàng</option>';

  for (let i = 0; i < adminCategories.length; i++) {
    const category = adminCategories[i];
    const selected = String(category.id) === String(selectedCategoryId) ? 'selected' : '';

    html = html + `
      <option value="${category.id}" ${selected}>
        ${category.name}
      </option>
    `;
  }

  $('#categoryId').html(html);
}

function renderAdminProductTable() {
  const tableBody = getElement('adminProductBody');

  if (!tableBody) {
    return;
  }

  let html = '';

  if (adminProducts.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          Chưa có hàng hóa.
        </td>
      </tr>
    `;
    return;
  }

  for (let i = 0; i < adminProducts.length; i++) {
    const product = adminProducts[i];
    const lowStock = isLowStock(product);
    const categoryName = getCategoryNameById(adminCategories, product.categoryId);

    let statusBadge = '<span class="badge text-bg-success">Ổn</span>';

    if (lowStock) {
      statusBadge = '<span class="badge text-bg-warning">Tồn thấp</span>';
    }

    html = html + `
      <tr class="${lowStock ? 'low-stock' : ''}">
        <td>
          <strong>${product.code}</strong>
        </td>
        <td>${product.name}</td>
        <td>${categoryName}</td>
        <td>${product.currentStock} ${product.unit || ''}</td>
        <td>${formatMoney(product.price)}</td>
        <td>${product.minStock}</td>
        <td>${statusBadge}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id}">
            Sửa
          </button>
          <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id}">
            Xóa
          </button>
        </td>
      </tr>
    `;
  }

  tableBody.innerHTML = html;
}

function renderLowStockAlerts() {
  const alertBox = getElement('lowStockAlertList');

  if (!alertBox) {
    return;
  }

  let html = '';
  let hasLowStock = false;

  for (let i = 0; i < adminProducts.length; i++) {
    const product = adminProducts[i];

    if (isLowStock(product)) {
      hasLowStock = true;

      html = html + `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${product.code}</strong> - ${product.name}
            <div class="small text-muted">
              Tối thiểu: ${product.minStock} | Hiện tại: ${product.currentStock}
            </div>
          </div>
          <span class="badge text-bg-warning">Cần nhập thêm</span>
        </div>
      `;
    }
  }

  if (!hasLowStock) {
    html = '<div class="list-group-item text-muted">Không có hàng tồn kho thấp.</div>';
  }

  alertBox.innerHTML = html;
}

function renderCategoryList() {
  let html = '';

  if (adminCategories.length === 0) {
    $('#categoryList').html('<li class="list-group-item text-muted">Chưa có danh mục.</li>');
    return;
  }

  for (let i = 0; i < adminCategories.length; i++) {
    const category = adminCategories[i];

    html = html + `
      <li class="list-group-item d-flex justify-content-between align-items-center gap-3">
        <div>
          <strong>${category.name}</strong>
          <div class="text-muted small">
            ${category.description || 'Không có mô tả'}
          </div>
        </div>
        <div class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}">
            Sửa
          </button>
          <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">
            Xóa
          </button>
        </div>
      </li>
    `;
  }

  $('#categoryList').html(html);
}

function renderAdminTransactionTable() {
  const sortedTransactions = adminTransactions.slice();

  sortedTransactions.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let html = '';

  if (sortedTransactions.length === 0) {
    $('#adminTransactionBody').html(`
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Chưa có giao dịch.
        </td>
      </tr>
    `);
    return;
  }

  for (let i = 0; i < sortedTransactions.length && i < 20; i++) {
    const transaction = sortedTransactions[i];
    const productName = getProductNameById(adminProducts, transaction.productId);

    let label = 'Xuất kho';
    let badgeClass = 'danger';

    if (transaction.type === 'import') {
      label = 'Nhập kho';
      badgeClass = 'success';
    }

    html = html + `
      <tr>
        <td>${formatDateTime(transaction.createdAt)}</td>
        <td>${productName}</td>
        <td>
          <span class="badge text-bg-${badgeClass}">${label}</span>
        </td>
        <td>${transaction.quantity}</td>
        <td>${transaction.note || ''}</td>
      </tr>
    `;
  }

  $('#adminTransactionBody').html(html);
}

function createProductPayload(form) {
  let image = form.image.value.trim();

  if (image === '') {
    image = PLACEHOLDER_IMG;
  }

  const payload = {
    code: form.code.value.trim().toUpperCase(),
    name: form.name.value.trim(),
    categoryId: Number(form.categoryId.value),
    quantity: Number(form.quantity.value),
    unit: form.unit.value.trim(),
    price: Number(form.price.value),
    minStock: Number(form.minStock.value),
    description: form.description.value.trim(),
    image: image,
    createdAt: new Date().toISOString()
  };

  if (editingProductId) {
    const oldProduct = getProductById(rawProducts, editingProductId);

    if (oldProduct && oldProduct.createdAt) {
      payload.createdAt = oldProduct.createdAt;
    }
  }

  return payload;
}

function isDuplicateProductCode(code) {
  for (let i = 0; i < adminProducts.length; i++) {
    const product = adminProducts[i];

    const sameCode = product.code.toLowerCase() === code.toLowerCase();
    const differentProduct = String(product.id) !== String(editingProductId);

    if (sameCode && differentProduct) {
      return true;
    }
  }

  return false;
}

async function saveProduct(event) {
  event.preventDefault();

  const form = event.target;
  const isValid = validateProductForm(form);

  if (!isValid) {
    return;
  }

  const code = form.code.value.trim();

  if (isDuplicateProductCode(code)) {
    setFieldError('code', 'Mã hàng đã tồn tại.');
    return;
  }

  const payload = createProductPayload(form);

  try {
    if (editingProductId) {
      await apiPut(API.products + '/' + editingProductId, payload);
      showToast('Đã cập nhật hàng hóa.');
    } else {
      await apiPost(API.products, payload);
      showToast('Đã thêm hàng hóa.');
    }

    editingProductId = null;
    form.reset();
    $('#productFormBox').fadeOut(120);
    await loadAdminPage();
  } catch (error) {
    console.error(error);
    showError('Lưu hàng hóa thất bại.');
  }
}

function startEditProduct(productId) {
  const product = getProductById(rawProducts, productId);

  if (!product) {
    return;
  }

  editingProductId = product.id;

  $('#productFormTitle').text('Cập nhật hàng hóa');
  $('#productFormBox').fadeIn(120);

  renderCategoryOptions(product.categoryId);

  const form = getElement('productForm');

  form.code.value = product.code || '';
  form.name.value = product.name || '';
  form.categoryId.value = product.categoryId || '';
  form.quantity.value = product.quantity || 0;
  form.unit.value = product.unit || '';
  form.price.value = product.price || 0;
  form.minStock.value = product.minStock || 0;
  form.description.value = product.description || '';
  form.image.value = product.image || '';
}

async function deleteProduct(productId) {
  const confirmDelete = confirm('Bạn có chắc muốn xóa hàng hóa này không?');

  if (!confirmDelete) {
    return;
  }

  try {
    await apiDelete(API.products + '/' + productId);
    showToast('Đã xóa hàng hóa.');
    await loadAdminPage();
  } catch (error) {
    console.error(error);
    showError('Xóa hàng hóa thất bại.');
  }
}

async function submitStock(event, type) {
  event.preventDefault();

  const form = event.target;
  const prefix = type === 'import' ? 'import' : 'export';

  if (!validateStockForm(form, prefix)) {
    return;
  }

  const productId = form.productId.value;
  const quantity = Number(form.quantity.value);
  const product = getProductById(adminProducts, productId);

  if (!product) {
    showError('Không tìm thấy hàng hóa.');
    return;
  }

  if (type === 'export' && quantity > Number(product.currentStock)) {
    setFieldError('exportQuantity', 'Không được xuất quá tồn kho hiện tại: ' + product.currentStock);
    return;
  }

  const transaction = {
    productId: Number(productId),
    type: type,
    quantity: quantity,
    note: form.note.value.trim(),
    createdAt: new Date().toISOString()
  };

  try {
    // Logic chính: chỉ lưu phiếu nhập/xuất vào Transactions.
    // Tồn kho sẽ được tính lại bằng JS từ Products + Transactions.
    await apiPost(API.transactions, transaction);

    if (type === 'import') {
      showToast('Nhập kho thành công.');
    } else {
      showToast('Xuất kho thành công.');
    }

    form.reset();
    await loadAdminPage();
  } catch (error) {
    console.error(error);
    showError('Xử lý nhập/xuất kho thất bại.');
  }
}

async function saveCategory(event) {
  event.preventDefault();

  if (!validateCategoryForm()) {
    return;
  }

  const payload = {
    name: $('#categoryName').val().trim(),
    description: $('#categoryDescription').val().trim()
  };

  try {
    if (editingCategoryId) {
      await apiPut(API.categories + '/' + editingCategoryId, payload);
      showToast('Đã cập nhật danh mục.');
    } else {
      // Dùng jQuery AJAX để đáp ứng yêu cầu đề bài.
      await $.ajax({
        url: API.categories,
        method: 'POST',
        data: JSON.stringify(payload),
        contentType: 'application/json'
      });

      showToast('Đã thêm danh mục.');
    }

    editingCategoryId = null;
    $('#categoryForm')[0].reset();
    $('#categorySubmitBtn').text('Thêm danh mục');
    await loadAdminPage();
  } catch (error) {
    console.error(error);
    showError('Lưu danh mục thất bại.');
  }
}

function startEditCategory(categoryId) {
  let category = null;

  for (let i = 0; i < adminCategories.length; i++) {
    if (String(adminCategories[i].id) === String(categoryId)) {
      category = adminCategories[i];
      break;
    }
  }

  if (!category) {
    return;
  }

  editingCategoryId = category.id;

  $('#categoryName').val(category.name);
  $('#categoryDescription').val(category.description || '');
  $('#categorySubmitBtn').text('Cập nhật danh mục');
}

async function deleteCategory(categoryId) {
  const confirmDelete = confirm('Xóa danh mục này?');

  if (!confirmDelete) {
    return;
  }

  try {
    await apiDelete(API.categories + '/' + categoryId);
    showToast('Đã xóa danh mục.');
    await loadAdminPage();
  } catch (error) {
    console.error(error);
    showError('Xóa danh mục thất bại.');
  }
}

$(document).ready(function () {
  if (!getElement('adminProductBody')) {
    return;
  }

  loadAdminPage();

  $('#showProductFormBtn').on('click', function () {
    editingProductId = null;
    $('#productForm')[0].reset();
    $('#productFormTitle').text('Thêm hàng hóa mới');
    renderCategoryOptions();
    $('#productFormBox').slideDown(180);
  });

  $('#cancelProductFormBtn').on('click', function () {
    editingProductId = null;
    $('#productForm')[0].reset();
    $('#productFormBox').slideUp(160);
  });

  $('#productForm').on('submit', saveProduct);

  $('#importForm').on('submit', function (event) {
    submitStock(event, 'import');
  });

  $('#exportForm').on('submit', function (event) {
    submitStock(event, 'export');
  });

  $('#categoryForm').on('submit', saveCategory);

  $(document).on('click', '.edit-product', function () {
    const productId = $(this).attr('data-id');
    startEditProduct(productId);
  });

  $(document).on('click', '.delete-product', function () {
    const productId = $(this).attr('data-id');
    deleteProduct(productId);
  });

  $(document).on('click', '.edit-category', function () {
    const categoryId = $(this).attr('data-id');
    startEditCategory(categoryId);
  });

  $(document).on('click', '.delete-category', function () {
    const categoryId = $(this).attr('data-id');
    deleteCategory(categoryId);
  });
});
