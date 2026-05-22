// =============================
// FILE: admin.js
// Mục đích: Xử lý trang quản trị kho hàng.
// Cách xử lý mới:
// - API Products/Categories hiện thiếu id ở nhiều dòng.
// - Nhập/xuất kho sẽ ghi vào Transactions, sau đó tính tồn kho hiện tại từ Products + Transactions.
// - Không bắt buộc PUT Products nữa, vì record thiếu id không thể cập nhật bằng /Products/:id.
// =============================

let products = [];
let categories = [];
let transactions = [];
let editingProductSelectId = null;

async function loadAdminData() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    categories = data.categories;
    transactions = data.transactions;
    products = applyCurrentStockToProducts(data.products, transactions);

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
    <option value="${product._selectId}">
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
        <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product._selectId}">Sửa</button>
        <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product._selectId}">Xóa</button>
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
  const productCount = countProductsByCategoryId(category._categoryId);
  const description = category.description || 'Không có mô tả';

  let deleteButton = '';

  if (category._canDeleteRemote) {
    deleteButton = `
      <button type="button" class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">
        Xóa
      </button>
    `;
  } else {
    deleteButton = '<span class="badge text-bg-light">Xóa</span>';
  }

  return `
    <li class="list-group-item">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div class="fw-semibold">${category.name}</div>
          <div class="text-muted small">${description}</div>
          <div class="text-muted small">${productCount} hàng hóa đang dùng danh mục này</div>
        </div>
        ${deleteButton}
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

function createProductPayload(form) {
  const imageUrl = getProductFormValue(form, 'image').trim() || PLACEHOLDER_IMG;
  const categoryId = getProductFormValue(form, 'categoryId');

  return {
    code: getProductFormValue(form, 'code').trim(),
    name: getProductFormValue(form, 'name').trim(),
    categoryId: Number(categoryId),
    quantity: Number(getProductFormValue(form, 'quantity')),
    unit: getProductFormValue(form, 'unit').trim(),
    price: Number(getProductFormValue(form, 'price')),
    minStock: Number(getProductFormValue(form, 'minStock')),
    description: getProductFormValue(form, 'description').trim(),
    image: imageUrl,
    imageUrl: imageUrl,
    createdAt: new Date().toISOString()
  };
}

function productPayload(form) {
  return createProductPayload(form);
}

function fillCategoryOptions() {
  let html = '<option value="">Chọn nhóm hàng</option>';

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    html += `<option value="${category._categoryId}">${category.name}</option>`;
  }

  $('#categoryId').html(html);
}

function resetProductForm() {
  editingProductSelectId = null;

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

function findProductBySelectId(selectId) {
  return products.find(function (product) {
    return String(product._selectId) === String(selectId);
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
  form.quantity.value = product.quantity || 0;
  form.unit.value = product.unit || '';
  form.price.value = product.price || 0;
  form.minStock.value = product.minStock || 0;
  form.description.value = product.description || '';
  form.image.value = getProductImage(product);
}

async function saveProduct(event) {
  event.preventDefault();

  const form = event.target;

  if (!validateProductForm(form)) {
    return;
  }

  const formData = createProductPayload(form);

  try {
    if (editingProductSelectId !== null) {
      const oldProduct = findProductBySelectId(editingProductSelectId);

      if (!oldProduct || !oldProduct._apiId) {
        showError('Sản phẩm này không có id API nên không thể sửa trực tiếp. Hãy thêm lại sản phẩm mới để có id.');
        return;
      }

      const updatedProduct = {
        ...oldProduct,
        ...formData,
        createdAt: oldProduct.createdAt || formData.createdAt
      };

      delete updatedProduct._selectId;
      delete updatedProduct._legacyId;
      delete updatedProduct._apiId;
      delete updatedProduct.currentQuantity;

      await apiPut(`${API.products}/${oldProduct._apiId}`, updatedProduct);
      showToast('Đã cập nhật hàng hóa.');
    } else {
      await apiPost(API.products, formData);
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

function startEditProduct(selectId) {
  const product = findProductBySelectId(selectId);

  if (!product) {
    showError('Không tìm thấy hàng hóa cần sửa.');
    return;
  }

  editingProductSelectId = String(selectId);
  fillCategoryOptions();
  fillProductForm(product);
  $('#productFormTitle').text('Cập nhật hàng hóa');
  showProductForm();
}

async function deleteProduct(selectId) {
  const product = findProductBySelectId(selectId);

  if (!product) {
    showError('Không tìm thấy hàng hóa cần xóa.');
    return;
  }

  if (!product._apiId) {
    showError('Sản phẩm này không có id API nên không thể xóa trực tiếp trên MockAPI.');
    return;
  }

  const accepted = confirm('Xóa hàng hóa này?');

  if (!accepted) {
    return;
  }

  try {
    await apiDelete(`${API.products}/${product._apiId}`);
    showToast('Đã xóa hàng hóa.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xóa hàng hóa:', error);
    showError('Xóa thất bại.');
  }
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
    productId: getProductStockKey(product),
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

  const productSelectId = getFormValue(form, 'productId');
  const product = findProductBySelectId(productSelectId);

  if (!product) {
    showError('Không tìm thấy hàng hóa.');
    return;
  }

  const quantity = Number(getFormValue(form, 'quantity'));
  const note = getFormValue(form, 'note').trim();

  if (type === 'export' && !validateExportQuantity(form, product, quantity)) {
    return;
  }

  const transaction = createTransactionPayload(product, type, quantity, note);

  try {
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
    showError('Xử lý kho thất bại: không ghi được lịch sử giao dịch.');
  }
}

function getCategoryFormData() {
  return {
    name: $('#categoryName').val().trim(),
    description: $('#categoryDescription').val().trim()
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
    await $.post(API.categories, data);

    $('#categoryForm')[0].reset();
    showToast('Đã thêm danh mục.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi thêm danh mục:', error);
    showError('Thêm danh mục thất bại.');
  }
}

function findCategoryByApiId(id) {
  return categories.find(function (category) {
    return String(category.id) === String(id);
  });
}

async function deleteCategory(id) {
  const category = findCategoryByApiId(id);

  if (!category) {
    showError('Danh mục này không có id API nên không thể xóa trực tiếp.');
    return;
  }

  const accepted = confirm(`Xóa danh mục "${category.name}"?`);

  if (!accepted) {
    return;
  }

  try {
    await apiDelete(`${API.categories}/${id}`);
    showToast('Đã xóa danh mục.');
    await loadAdminData();
  } catch (error) {
    console.error('Lỗi xóa danh mục:', error);
    showError('Xóa danh mục thất bại.');
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
    const productSelectId = $(this).attr('data-id');
    startEditProduct(productSelectId);
  });

  $(document).on('click', '.delete-product', function () {
    const productSelectId = $(this).attr('data-id');
    deleteProduct(productSelectId);
  });

  $(document).on('click', '.delete-category', function () {
    const categoryId = $(this).attr('data-id');
    deleteCategory(categoryId);
  });
}

$(document).ready(function () {
  if (!qs('adminProductBody')) {
    return;
  }

  loadAdminData();
  registerAdminEvents();
});
