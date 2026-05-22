let products = [];
let rawProducts = [];
let categories = [];
let transactions = [];
let editingProductId = null;
let editingCategoryId = null;

async function loadAdminData() {
  showLoading(true);
  try {
    const data = await loadAllStockData();
    products = data.products;
    rawProducts = data.rawProducts;
    categories = data.categories;
    transactions = data.transactions;

    renderAdminStats();
    renderProductSelects();
    renderAdminProducts();
    renderCategoryList();
    renderAdminTransactions();
    renderLowStockAlerts();
  } catch (error) {
    showError('Không tải được dữ liệu quản trị từ MockAPI.');
  } finally {
    showLoading(false);
  }
}

function renderAdminStats() {
  $('#adTotalProducts').html(products.length);
  $('#adLowStock').html(products.filter(isLowStock).length);
  $('#adInventoryValue').html(money(calcInventoryValue(products)));
}

function renderProductSelects() {
  const html = '<option value="">Chọn hàng hóa</option>' + products.map(product =>
    `<option value="${product.id}">${product.code} - ${product.name} | Tồn: ${product.currentStock} ${product.unit || ''}</option>`
  ).join('');
  $('#importProductId, #exportProductId').html(html);
}

function fillCategoryOptions(selectedId = '') {
  $('#categoryId').html('<option value="">Chọn nhóm hàng</option>' +
    categories.map(c => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${c.name}</option>`).join('')
  );
}

function renderAdminProducts() {
  const tbody = qs('adminProductBody');
  if (!tbody) return;

  tbody.innerHTML = products.map(product => {
    const low = isLowStock(product);
    return `
      <tr class="${low ? 'low-stock' : ''}">
        <td><strong>${product.code}</strong></td>
        <td>${product.name}</td>
        <td>${getCategoryName(categories, product.categoryId)}</td>
        <td>${product.currentStock} ${product.unit || ''}</td>
        <td>${money(product.price)}</td>
        <td>${product.minStock}</td>
        <td>${low ? '<span class="badge text-bg-warning">Tồn thấp</span>' : '<span class="badge text-bg-success">Ổn</span>'}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id}">Sửa</button>
          <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id}">Xóa</button>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="8" class="text-center text-muted py-4">Chưa có hàng hóa</td></tr>';
}

function renderLowStockAlerts() {
  const box = qs('lowStockAlertList');
  if (!box) return;

  const lows = products.filter(isLowStock);
  box.innerHTML = lows.length ? lows.map(product => `
    <div class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>${product.code}</strong> - ${product.name}
        <div class="small text-muted">Tối thiểu: ${product.minStock} | Hiện tại: ${product.currentStock}</div>
      </div>
      <span class="badge text-bg-warning">Cần nhập thêm</span>
    </div>
  `).join('') : '<div class="list-group-item text-muted">Không có hàng tồn kho thấp.</div>';
}

function renderCategoryList() {
  $('#categoryList').html(categories.map(category => `
    <li class="list-group-item d-flex justify-content-between align-items-center gap-3">
      <div>
        <strong>${category.name}</strong>
        <div class="text-muted small">${category.description || 'Không có mô tả'}</div>
      </div>
      <div class="text-nowrap">
        <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}">Sửa</button>
        <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">Xóa</button>
      </div>
    </li>
  `).join('') || '<li class="list-group-item text-muted">Chưa có danh mục</li>');
}

function renderAdminTransactions() {
  $('#adminTransactionBody').html(transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map(transaction => {
      const label = transaction.type === 'import' ? 'Nhập kho' : 'Xuất kho';
      const badge = transaction.type === 'import' ? 'success' : 'danger';
      return `
        <tr>
          <td>${dateTime(transaction.createdAt)}</td>
          <td>${getProductName(products, transaction.productId)}</td>
          <td><span class="badge text-bg-${badge}">${label}</span></td>
          <td>${transaction.quantity}</td>
          <td>${transaction.note || ''}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có giao dịch</td></tr>');
}

function productPayload(form) {
  return {
    code: form.code.value.trim().toUpperCase(),
    name: form.name.value.trim(),
    categoryId: Number(form.categoryId.value),
    quantity: Number(form.quantity.value),
    unit: form.unit.value.trim(),
    price: Number(form.price.value),
    minStock: Number(form.minStock.value),
    description: form.description.value.trim(),
    image: form.image.value.trim() || PLACEHOLDER_IMG,
    createdAt: editingProductId ? (rawProducts.find(p => String(p.id) === String(editingProductId))?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.target;
  if (!validateProductForm(form)) return;

  const duplicateCode = products.some(p =>
    p.code.toLowerCase() === form.code.value.trim().toLowerCase() && String(p.id) !== String(editingProductId)
  );
  if (duplicateCode) {
    setFieldError('code', 'Mã hàng đã tồn tại.');
    return;
  }

  try {
    const payload = productPayload(form);
    if (editingProductId) {
      await apiPut(`${API.products}/${editingProductId}`, payload);
      showToast('Đã cập nhật hàng hóa.');
    } else {
      await apiPost(API.products, payload);
      showToast('Đã thêm hàng hóa.');
    }
    editingProductId = null;
    form.reset();
    $('#productFormBox').fadeOut(120);
    await loadAdminData();
    fillCategoryOptions();
  } catch (error) {
    showError('Lưu hàng hóa thất bại.');
  }
}

function startEditProduct(id) {
  const product = rawProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  editingProductId = product.id;
  fillCategoryOptions(product.categoryId);
  $('#productFormTitle').text('Cập nhật hàng hóa');
  $('#productFormBox').fadeIn(120);

  const form = qs('productForm');
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

async function deleteProduct(id) {
  const hasTransactions = transactions.some(t => String(t.productId) === String(id));
  const message = hasTransactions
    ? 'Hàng hóa này đã có lịch sử nhập/xuất. Vẫn xóa hàng hóa? Lịch sử giao dịch sẽ giữ lại productId.'
    : 'Xóa hàng hóa này?';
  if (!confirm(message)) return;

  try {
    await apiDelete(`${API.products}/${id}`);
    showToast('Đã xóa hàng hóa.');
    await loadAdminData();
    fillCategoryOptions();
  } catch (error) {
    showError('Xóa hàng hóa thất bại.');
  }
}

async function submitStock(event, type) {
  event.preventDefault();
  const form = event.target;
  const prefix = type === 'import' ? 'import' : 'export';
  if (!validateStockForm(form, prefix)) return;

  const product = products.find(p => String(p.id) === String(form.productId.value));
  if (!product) {
    showError('Không tìm thấy hàng hóa.');
    return;
  }

  const qty = Number(form.quantity.value);
  if (type === 'export' && qty > Number(product.currentStock)) {
    setFieldError('exportQuantity', `Không được xuất quá tồn kho hiện tại (${product.currentStock}).`);
    return;
  }

  try {
    await apiPost(API.transactions, {
      productId: Number(product.id),
      type,
      quantity: qty,
      note: form.note.value.trim(),
      createdAt: new Date().toISOString()
    });

    showToast(type === 'import' ? 'Nhập kho thành công.' : 'Xuất kho thành công.');
    form.reset();
    await loadAdminData();
  } catch (error) {
    showError('Xử lý nhập/xuất kho thất bại.');
  }
}

async function saveCategory(event) {
  event.preventDefault();
  if (!validateCategoryForm()) return;

  const payload = {
    name: $('#categoryName').val().trim(),
    description: $('#categoryDescription').val().trim()
  };

  try {
    if (editingCategoryId) {
      await apiPut(`${API.categories}/${editingCategoryId}`, payload);
      showToast('Đã cập nhật danh mục.');
    } else {
      // jQuery AJAX requirement: POST at least one API by jQuery.
      await $.ajax({ url: API.categories, method: 'POST', data: JSON.stringify(payload), contentType: 'application/json' });
      showToast('Đã thêm danh mục.');
    }
    editingCategoryId = null;
    $('#categoryFormTitle').text('Thêm danh mục');
    $('#categoryForm')[0].reset();
    await loadAdminData();
    fillCategoryOptions();
  } catch (error) {
    showError('Lưu danh mục thất bại.');
  }
}

function startEditCategory(id) {
  const category = categories.find(c => String(c.id) === String(id));
  if (!category) return;
  editingCategoryId = category.id;
  $('#categoryFormTitle').text('Cập nhật danh mục');
  $('#categoryName').val(category.name);
  $('#categoryDescription').val(category.description || '');
  $('#categoryName').focus();
}

async function deleteCategory(id) {
  const used = products.some(p => String(p.categoryId) === String(id));
  if (used) {
    showError('Không thể xóa danh mục đang có hàng hóa sử dụng.');
    return;
  }
  if (!confirm('Xóa danh mục này?')) return;

  try {
    await apiDelete(`${API.categories}/${id}`);
    showToast('Đã xóa danh mục.');
    await loadAdminData();
    fillCategoryOptions();
  } catch (error) {
    showError('Xóa danh mục thất bại.');
  }
}

$(document).ready(function () {
  if (!qs('adminProductBody')) return;

  loadAdminData().then(() => fillCategoryOptions());

  $('#showProductForm').on('click', function () {
    editingProductId = null;
    $('#productFormTitle').text('Thêm hàng hóa');
    qs('productForm').reset();
    clearFieldErrors(['code', 'name', 'categoryId', 'quantity', 'unit', 'price', 'minStock']);
    fillCategoryOptions();
    $('#productFormBox').fadeIn(120);
  });

  $('#hideProductForm').on('click', function () {
    editingProductId = null;
    $('#productFormBox').fadeOut(120);
  });

  $('#productForm').on('submit', saveProduct);
  $('#importForm').on('submit', event => submitStock(event, 'import'));
  $('#exportForm').on('submit', event => submitStock(event, 'export'));
  $('#categoryForm').on('submit', saveCategory);
  $('#resetCategoryForm').on('click', function () {
    editingCategoryId = null;
    $('#categoryFormTitle').text('Thêm danh mục');
    $('#categoryForm')[0].reset();
    $('#categoryNameError').text('');
  });

  $(document).on('click', '.edit-product', function () { startEditProduct($(this).attr('data-id')); });
  $(document).on('click', '.delete-product', function () { deleteProduct($(this).attr('data-id')); });
  $(document).on('click', '.edit-category', function () { startEditCategory($(this).attr('data-id')); });
  $(document).on('click', '.delete-category', function () { deleteCategory($(this).attr('data-id')); });
});
