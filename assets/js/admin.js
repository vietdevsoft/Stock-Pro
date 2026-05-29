// =============================
// FILE: admin.js
// Mục đích: Xử lý trang quản trị kho hàng.
// API hiện tại:
// - Products.categoryId là String: "1", "2", ...
// - Transactions.productId là String: "1", "2", ...
// - Không bao giờ gọi DELETE/PUT vào URL gốc, luôn bắt buộc có id bản ghi.
// =============================

let products = [];
let categories = [];
let transactions = [];
let editingProductId = null;

async function loadAdminData() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    products = data.products;
    categories = data.categories;
    transactions = data.transactions;

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
  renderLowStockAlerts();
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
      ${product.code} - ${product.name} (${getDisplayQuantity(product)} ${product.unit || ''})
    </option>
  `;
}

function renderProductSelect() {
  let html = '<option value="">Chọn hàng hóa</option>';

  for (let i = 0; i < products.length; i++) {
    html += createProductOption(products[i]);
  }

  $('#importProductId, #exportProductId').html(html);
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
  const image = getProductImage(product);

  return `
    <tr class="${rowClass}">
      <td>
        <img class="product-img" src="${image}" onerror="this.src='${PLACEHOLDER_IMG}'">
        <div class="small fw-semibold mt-1">${product.code}</div>
      </td>
      <td>${product.name}</td>
      <td>${categoryName}</td>
      <td>${getDisplayQuantity(product)}</td>
      <td>${money(product.price)}</td>
      <td>${product.minStock}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-product" type="button" data-id="${product.id}" title="Sửa hàng hóa">Sửa</button>
        <button class="btn btn-sm btn-outline-danger delete-product" type="button" data-id="${product.id}" title="Xóa hàng hóa">Xóa</button>
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
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Chưa có hàng hóa</td></tr>';
    return;
  }

  let html = '';

  for (let i = 0; i < products.length; i++) {
    html += createAdminProductRow(products[i]);
  }

  tableBody.innerHTML = html;
}

function countProductsByCategoryId(categoryId) {
  let count = 0;

  for (let i = 0; i < products.length; i++) {
    if (String(products[i].categoryId) === String(categoryId)) {
      count++;
    }
  }

  return count;
}

function createCategoryItem(category) {
  const productCount = countProductsByCategoryId(category.id);
  const description = category.description || 'Không có mô tả';
  const cannotDelete = productCount > 0;
  const disabled = cannotDelete ? 'disabled' : '';
  let title = 'Xóa danh mục';

  if (productCount > 0) {
    title = 'Không thể xóa danh mục đang có hàng hóa';
  }


  return `
    <li class="list-group-item">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div class="fw-semibold">${category.name}</div>
          <div class="text-muted small">${description}</div>
          <div class="text-muted small">${productCount} hàng hóa đang dùng danh mục này</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}" ${disabled} title="${title}">
          Xóa
        </button>
      </div>
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

function getAdminTransactionBadge(type) {
  if (type === 'import') {
    return '<span class="badge text-bg-success">Nhập kho</span>';
  }

  return '<span class="badge text-bg-danger">Xuất kho</span>';
}

function createAdminTransactionRow(transaction) {
  return `
    <tr>
      <td>${dateTime(transaction.createdAt)}</td>
      <td>${getProductNameById(products, transaction.productId)}</td>
      <td>${getAdminTransactionBadge(transaction.type)}</td>
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

  const latestTransactions = sortByNewest(transactions).slice(0, 15);

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

function renderLowStockAlerts() {
  const alertList = $('#lowStockAlertList');

  if (!alertList.length) {
    return;
  }

  const lowStockProducts = products.filter(isLowStock);

  if (lowStockProducts.length === 0) {
    alertList.html('<div class="list-group-item text-muted">Không có hàng tồn thấp</div>');
    return;
  }

  let html = '';

  for (let i = 0; i < lowStockProducts.length; i++) {
    const product = lowStockProducts[i];

    html += `
      <div class="list-group-item d-flex justify-content-between">
        <span>${product.code} - ${product.name}</span>
        <span class="badge text-bg-warning">Tồn: ${getDisplayQuantity(product)}</span>
      </div>
    `;
  }

  alertList.html(html);
}

function getProductFormValue(form, fieldName) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  return field ? field.value : '';
}

function hasRemoteId(record) {
  return record && hasValue(record._remoteId);
}

function getApiRecordId(record) {
  if (!record) {
    return '';
  }

  if (hasValue(record._remoteId)) {
    return String(record._remoteId);
  }

  return hasValue(record.id) ? String(record.id) : '';
}

function getMissingRemoteIdMessage(resourceName) {
  return resourceName + ' này chưa có id để thao tác trên MockAPI.';
}

function createProductPayload(form, oldProduct = null) {
  const imageUrl = getProductFormValue(form, 'image').trim() || PLACEHOLDER_IMG;
  const categoryId = getProductFormValue(form, 'categoryId');
  const now = new Date().toISOString();

  return {
    code: getProductFormValue(form, 'code').trim(),
    name: getProductFormValue(form, 'name').trim(),
    categoryId: String(categoryId),
    quantity: toSafeInteger(getProductFormValue(form, 'quantity'), 0),
    unit: getProductFormValue(form, 'unit').trim(),
    price: toSafeNumber(getProductFormValue(form, 'price'), 0),
    minStock: toSafeInteger(getProductFormValue(form, 'minStock'), 0),
    description: getProductFormValue(form, 'description').trim(),
    image: imageUrl,
    createdAt: oldProduct && oldProduct.createdAt ? oldProduct.createdAt : now,
    updatedAt: now
  };
}

function productPayload(form) {
  return createProductPayload(form);
}

function fillCategoryOptions() {
  let html = '<option value="">Chọn nhóm hàng</option>';

  for (let i = 0; i < categories.length; i++) {
    html += `<option value="${categories[i].id}">${categories[i].name}</option>`;
  }

  $('#categoryId').html(html);
}

function resetProductForm() {
  editingProductId = null;

  const form = qs('productForm');

  if (form) {
    form.reset();
  }

  $('#productFormTitle').text('Thêm hàng hóa mới');
  fillCategoryOptions();
}

function showProductForm() {
  $('#productFormBox').fadeIn();
}

function hideProductForm() {
  $('#productFormBox').fadeOut();
}

function findProductById(id) {
  return products.find(function (product) {
    return String(product.id) === String(id);
  });
}

function findCategoryById(id) {
  return categories.find(function (category) {
    return String(category.id) === String(id);
  });
}

function fillProductForm(product) {
  const form = qs('productForm');

  if (!form) {
    return;
  }

  form.code.value = product.code || '';
  form.name.value = product.name || '';
  form.categoryId.value = String(product.categoryId || '');
  form.quantity.value = getDisplayQuantity(product);
  form.unit.value = product.unit || '';
  form.price.value = toSafeNumber(product.price, 0);
  form.minStock.value = toSafeInteger(product.minStock, 0);
  form.description.value = product.description || '';
  form.image.value = getProductImage(product);
}

async function saveProduct(event) {
  event.preventDefault();

  const form = event.target;

  if (!validateProductForm(form)) {
    return;
  }

  try {
    if (editingProductId !== null) {
      const oldProduct = findProductById(editingProductId);

      if (!oldProduct) {
        showError('Không tìm thấy hàng hóa cần cập nhật.');
        return;
      }

      const updatedProduct = createProductPayload(form, oldProduct);
      await apiPut(buildItemUrl(API.products, getApiRecordId(oldProduct)), updatedProduct);
      showToast('Đã cập nhật hàng hóa.');
    } else {
      const newProduct = createProductPayload(form);
      await apiPost(API.products, newProduct);
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

function startEditProduct(id) {
  const product = findProductById(id);

  if (!product) {
    showError('Không tìm thấy hàng hóa cần sửa.');
    return;
  }

  editingProductId = String(id);
  fillCategoryOptions();
  fillProductForm(product);
  $('#productFormTitle').text('Cập nhật hàng hóa');
  showProductForm();
}

async function deleteProduct(id) {
  const product = findProductById(id);

  if (!product) {
    showError('Không tìm thấy hàng hóa cần xóa.');
    return;
  }

  const accepted = confirm(`Xóa hàng hóa "${product.name}"?`);

  if (!accepted) {
    return;
  }

  try {
    await apiDelete(buildItemUrl(API.products, getApiRecordId(product)));
    showToast('Đã xóa hàng hóa.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xóa hàng hóa:', error);
    showError('Xóa thất bại. Kiểm tra lại id bản ghi trong MockAPI.');
  }
}

function calculateNewQuantity(product, quantity, type) {
  const currentQuantity = getDisplayQuantity(product);

  if (type === 'import') {
    return currentQuantity + quantity;
  }

  return currentQuantity - quantity;
}

function validateExportQuantity(form, product, quantity) {
  const currentQuantity = getDisplayQuantity(product);

  if (quantity > currentQuantity) {
    setStockQuantityError(form, 'Không được xuất quá số lượng tồn.');
    return false;
  }

  return true;
}

function createTransactionPayload(product, type, quantity, note) {
  return {
    productId: String(product.id),
    type: type,
    quantity: quantity,
    note: note,
    createdAt: new Date().toISOString()
  };
}

function createUpdatedProductStockPayload(product, newQuantity) {
  return {
    code: product.code,
    name: product.name,
    categoryId: String(product.categoryId),
    quantity: newQuantity,
    unit: product.unit,
    price: toSafeNumber(product.price, 0),
    minStock: toSafeInteger(product.minStock, 0),
    description: product.description || '',
    image: getProductImage(product),
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function submitStock(event, type) {
  event.preventDefault();

  const form = event.target;

  if (!validateStockForm(form)) {
    return;
  }

  const productId = getFormValue(form, 'productId');
  const product = findProductById(productId);

  if (!product) {
    showError('Không tìm thấy hàng hóa.');
    return;
  }

  const quantity = toSafeInteger(getFormValue(form, 'quantity'), 0);
  const note = getFormValue(form, 'note').trim();

  if (type === 'export' && !validateExportQuantity(form, product, quantity)) {
    return;
  }

  const newQuantity = calculateNewQuantity(product, quantity, type);
  const updatedProduct = createUpdatedProductStockPayload(product, newQuantity);
  const transaction = createTransactionPayload(product, type, quantity, note);

  try {
    await apiPut(buildItemUrl(API.products, getApiRecordId(product)), updatedProduct);
    await apiPost(API.transactions, transaction);

    showToast(type === 'import' ? 'Nhập kho thành công.' : 'Xuất kho thành công.');
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
    description: $('#categoryDescription').val().trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function validateCategoryName(name) {
  setFieldError('categoryName', '');

  if (name) {
    return true;
  }

  setFieldError('categoryName', 'Tên danh mục không được để trống.');
  $('#categoryName').focus();

  return false;
}

async function addCategory(event) {
  event.preventDefault();

  const data = getCategoryFormData();

  if (!validateCategoryName(data.name)) {
    return;
  }

  try {
    await apiPost(API.categories, data);
    $('#categoryForm')[0].reset();
    showToast('Đã thêm danh mục.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi thêm danh mục:', error);
    showError('Thêm danh mục thất bại.');
  }
}

async function deleteCategory(id) {
  const category = findCategoryById(id);

  if (!category) {
    showError('Không tìm thấy danh mục cần xóa.');
    return;
  }

  const productCount = countProductsByCategoryId(category.id);

  if (productCount > 0) {
    showError('Không thể xóa danh mục đang có hàng hóa.');
    return;
  }

  const accepted = confirm(`Xóa danh mục "${category.name}"?`);

  if (!accepted) {
    return;
  }

  try {
    await apiDelete(buildItemUrl(API.categories, getApiRecordId(category)));
    showToast('Đã xóa danh mục.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xóa danh mục:', error);
    showError('Xóa danh mục thất bại. Kiểm tra lại id bản ghi trong MockAPI.');
  }
}

function registerAdminEvents() {
  $('#showProductFormBtn').on('click', function () {
    resetProductForm();
    showProductForm();
  });

  $('#cancelProductFormBtn').on('click', function () {
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
    startEditProduct($(this).attr('data-id'));
  });

  $(document).on('click', '.delete-product', function () {
    deleteProduct($(this).attr('data-id'));
  });

  $(document).on('click', '.delete-category', function () {
    deleteCategory($(this).attr('data-id'));
  });
}

$(document).ready(function () {
  if (!qs('adminProductBody')) {
    return;
  }

  loadAdminData();
  registerAdminEvents();
});
