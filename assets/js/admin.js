// =============================
// FILE: admin.js
// Mục đích: Xử lý trang quản trị kho hàng.
// =============================

let products = [];
let categories = [];
let transactions = [];
let editingProductId = null;

async function loadAdminData() {
  showLoading(true);

  try {
    const loadedProducts = await apiGet(API.products);
    const loadedCategories = await apiGet(API.categories);
    const loadedTransactions = await apiGet(API.transactions);

    products = loadedProducts;
    categories = loadedCategories;
    transactions = loadedTransactions;

    renderAdminPage();
  } catch (error) {
    console.error('Lỗi tải dữ liệu admin:', error);
    showError('Không tải được dữ liệu admin.');
  } finally {
    showLoading(false);
  }
}

function renderAdminPage() {
  renderAdminStats();
  renderProductSelect();
  renderAdminProducts();
  renderCategoryList();
  renderAdminTransactions();
  fillCategoryOptions();
}

function renderAdminStats() {
  const lowStockProducts = products.filter(isLowStock);
  const inventoryValue = calcInventoryValue(products);

  $('#adTotalProducts').html(products.length);
  $('#adLowStock').html(lowStockProducts.length);
  $('#adInventoryValue').html(money(inventoryValue));
}

function createProductOption(product) {
  return `
    <option value="${product.id}">
      ${product.code} - ${product.name} (${product.quantity} ${product.unit || ''})
    </option>
  `;
}

function renderProductSelect() {
  let html = '<option value="">Chọn hàng hóa</option>';

  for (let i = 0; i < products.length; i++) {
    html += createProductOption(products[i]);
  }

  $('#stockProductId, #exportProductId').html(html);
}

function createProductStatusBadge(product) {
  if (isLowStock(product)) {
    return '<span class="badge text-bg-warning">Tồn thấp</span>';
  }

  return '<span class="badge text-bg-success">Ổn</span>';
}

function createAdminProductRow(product) {
  const rowClass = isLowStock(product) ? 'low-stock' : '';
  const categoryName = getCategoryName(categories, product.categoryId);
  const statusBadge = createProductStatusBadge(product);

  return `
    <tr class="${rowClass}">
      <td>${product.code}</td>
      <td>${product.name}</td>
      <td>${categoryName}</td>
      <td>${product.quantity}</td>
      <td>${money(product.price)}</td>
      <td>${product.minStock}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id}">Sửa</button>
        <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id}">Xóa</button>
      </td>
    </tr>
  `;
}

function renderAdminProducts() {
  const tableBody = qs('adminProductBody');

  if (!tableBody) {
    return;
  }

  if (products.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Chưa có hàng hóa</td></tr>';
    return;
  }

  let html = '';

  for (let i = 0; i < products.length; i++) {
    html += createAdminProductRow(products[i]);
  }

  tableBody.innerHTML = html;
}

function createCategoryItem(category) {
  return `
    <li class="list-group-item d-flex justify-content-between">
      <span>${category.name}</span>
      <span class="text-muted small">${category.description || ''}</span>
    </li>
  `;
}

function renderCategoryList() {
  const categoryList = $('#categoryList');

  if (!categoryList.length) {
    return;
  }

  if (categories.length === 0) {
    categoryList.html('<li class="list-group-item text-muted">Chưa có danh mục</li>');
    return;
  }

  let html = '';

  for (let i = 0; i < categories.length; i++) {
    html += createCategoryItem(categories[i]);
  }

  categoryList.html(html);
}

function getAdminTransactionTypeLabel(type) {
  return type === 'import' ? 'Nhập kho' : 'Xuất kho';
}

function getTransactionProductName(productId) {
  const product = products.find(function (item) {
    return String(item.id) === String(productId);
  });

  return product ? product.name : productId;
}

function createAdminTransactionRow(transaction) {
  return `
    <tr>
      <td>${dateTime(transaction.createdAt)}</td>
      <td>${getTransactionProductName(transaction.productId)}</td>
      <td>${getAdminTransactionTypeLabel(transaction.type)}</td>
      <td>${transaction.quantity}</td>
      <td>${transaction.note || ''}</td>
    </tr>
  `;
}

function renderAdminTransactions() {
  const tableBody = $('#adminTransactionBody');

  if (!tableBody.length) {
    return;
  }

  const latestTransactions = transactions.slice().reverse().slice(0, 15);

  if (latestTransactions.length === 0) {
    tableBody.html('<tr><td colspan="5" class="text-center text-muted">Chưa có giao dịch</td></tr>');
    return;
  }

  let html = '';

  for (let i = 0; i < latestTransactions.length; i++) {
    html += createAdminTransactionRow(latestTransactions[i]);
  }

  tableBody.html(html);
}

function createProductPayload(form) {
  return {
    code: form.code.value.trim(),
    name: form.name.value.trim(),
    categoryId: Number(form.categoryId.value),
    quantity: Number(form.quantity.value),
    unit: form.unit.value.trim(),
    price: Number(form.price.value),
    minStock: Number(form.minStock.value),
    description: form.description.value.trim(),
    image: form.image.value.trim() || PLACEHOLDER_IMG,
    createdAt: new Date().toISOString()
  };
}

// Giữ lại tên cũ để không ảnh hưởng nếu HTML hoặc file khác đang gọi productPayload().
function productPayload(form) {
  return createProductPayload(form);
}

function fillCategoryOptions() {
  let html = '<option value="">Chọn nhóm hàng</option>';

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    html += `<option value="${category.id}">${category.name}</option>`;
  }

  $('#categoryId').html(html);
}

function resetProductForm() {
  editingProductId = null;

  const form = qs('productForm');

  if (form) {
    form.reset();
  }

  fillCategoryOptions();
}

function showProductForm() {
  $('#productFormBox').fadeIn();
}

function hideProductForm() {
  $('#productFormBox').fadeOut();
}

async function saveProduct(event) {
  event.preventDefault();

  const form = event.target;

  if (!validateProductForm(form)) {
    return;
  }

  const data = createProductPayload(form);

  try {
    if (editingProductId) {
      await apiPut(`${API.products}/${editingProductId}`, data);
      showToast('Đã cập nhật hàng hóa.');
    } else {
      await apiPost(API.products, data);
      showToast('Đã thêm hàng hóa.');
    }

    resetProductForm();
    hideProductForm();
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi lưu hàng hóa:', error);
    showError('Lưu hàng hóa thất bại.');
  }
}

function findProductById(id) {
  return products.find(function (product) {
    return String(product.id) === String(id);
  });
}

function fillProductForm(product) {
  const form = qs('productForm');

  if (!form) {
    return;
  }

  form.code.value = product.code;
  form.name.value = product.name;
  form.categoryId.value = product.categoryId;
  form.quantity.value = product.quantity;
  form.unit.value = product.unit;
  form.price.value = product.price;
  form.minStock.value = product.minStock;
  form.description.value = product.description || '';
  form.image.value = product.image || '';
}

function startEditProduct(id) {
  const product = findProductById(id);

  if (!product) {
    showError('Không tìm thấy hàng hóa cần sửa.');
    return;
  }

  editingProductId = product.id;
  fillCategoryOptions();
  fillProductForm(product);
  showProductForm();
}

async function deleteProduct(id) {
  const accepted = confirm('Xóa hàng hóa này?');

  if (!accepted) {
    return;
  }

  try {
    await apiDelete(`${API.products}/${id}`);
    showToast('Đã xóa hàng hóa.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xóa hàng hóa:', error);
    showError('Xóa thất bại.');
  }
}

function calculateNewQuantity(product, quantity, type) {
  const currentQuantity = Number(product.quantity || 0);

  if (type === 'import') {
    return currentQuantity + quantity;
  }

  return currentQuantity - quantity;
}

function validateExportQuantity(product, quantity) {
  const currentQuantity = Number(product.quantity || 0);

  if (quantity > currentQuantity) {
    setFieldError('stockQuantity', 'Không được xuất quá số lượng tồn.');
    return false;
  }

  return true;
}

function createTransactionPayload(productId, type, quantity, note) {
  return {
    productId: Number(productId),
    type: type,
    quantity: quantity,
    note: note,
    createdAt: new Date().toISOString()
  };
}

async function submitStock(event, type) {
  event.preventDefault();

  const form = event.target;

  if (!validateStockForm(form)) {
    return;
  }

  const product = findProductById(form.productId.value);

  if (!product) {
    showError('Không tìm thấy hàng hóa.');
    return;
  }

  const quantity = Number(form.quantity.value);

  if (type === 'export' && !validateExportQuantity(product, quantity)) {
    return;
  }

  const newQuantity = calculateNewQuantity(product, quantity, type);
  const note = form.note.value.trim();
  const transaction = createTransactionPayload(product.id, type, quantity, note);

  try {
    await apiPut(`${API.products}/${product.id}`, {
      ...product,
      quantity: newQuantity
    });

    await apiPost(API.transactions, transaction);

    if (type === 'import') {
      showToast('Nhập kho thành công.');
    } else {
      showToast('Xuất kho thành công.');
    }

    form.reset();
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xử lý kho:', error);
    showError('Xử lý kho thất bại.');
  }
}

function getCategoryFormData() {
  return {
    name: $('#categoryName').val().trim(),
    description: $('#categoryDescription').val().trim()
  };
}

function validateCategoryName(name) {
  if (name) {
    return true;
  }

  $('#categoryName')
    .attr('placeholder', 'Tên nhóm hàng bắt buộc')
    .focus();

  return false;
}

async function addCategory(event) {
  event.preventDefault();

  const data = getCategoryFormData();

  if (!validateCategoryName(data.name)) {
    return;
  }

  try {
    // Yêu cầu bài: dùng jQuery AJAX ít nhất một API.
    await $.post(API.categories, data);

    $('#categoryForm')[0].reset();
    showToast('Đã thêm danh mục.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi thêm danh mục:', error);
    showError('Thêm danh mục thất bại.');
  }
}

function registerAdminEvents() {
  $('#showProductForm').on('click', function () {
    resetProductForm();
    showProductForm();
  });

  $('#hideProductForm').on('click', function () {
    hideProductForm();
  });

  $('#productForm').on('submit', saveProduct);

  $('#importForm').on('submit', function (event) {
    submitStock(event, 'import');
  });

  $('#exportForm').on('submit', function (event) {
    submitStock(event, 'export');
  });

  $('#categoryForm').on('submit', addCategory);

  $(document).on('click', '.edit-product', function () {
    const productId = $(this).attr('data-id');
    startEditProduct(productId);
  });

  $(document).on('click', '.delete-product', function () {
    const productId = $(this).attr('data-id');
    deleteProduct(productId);
  });
}

$(document).ready(function () {
  // Nếu không ở trang admin thì không chạy file này.
  if (!qs('adminProductBody')) {
    return;
  }

  loadAdminData();
  registerAdminEvents();
});
