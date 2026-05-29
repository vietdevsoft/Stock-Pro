// =============================
// FILE: public.js
// Mục đích: Xử lý trang xem tồn kho cho người dùng thường.
// =============================

let publicProducts = [];
let publicCategories = [];
let publicTransactions = [];

async function loadPublicData() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    publicProducts = data.products;
    publicCategories = data.categories;
    publicTransactions = data.transactions;

    renderCategoryFilter();
    renderPublicProducts();
    renderPublicTransactions();
    renderPublicStats();
  } catch (error) {
    console.error('Lỗi tải dữ liệu public:', error);
    showError('Không tải được dữ liệu tồn kho.');
  } finally {
    showLoading(false);
  }
}

function renderCategoryFilter() {
  const select = qs('filterCategory');

  if (!select) {
    return;
  }

  let html = '<option value="">Tất cả nhóm hàng</option>';

  for (let i = 0; i < publicCategories.length; i++) {
    const category = publicCategories[i];
    html += `<option value="${category.id}">${category.name}</option>`;
  }

  select.innerHTML = html;
}

function getSearchKeyword() {
  const input = qs('searchInput');
  return input ? input.value.trim().toLowerCase() : '';
}

function getSelectedCategoryId() {
  const select = qs('filterCategory');
  return select ? select.value : '';
}

function isProductMatched(product, keyword, categoryId) {
  const productName = String(product.name || '').toLowerCase();
  const productCode = String(product.code || '').toLowerCase();

  const matchKeyword = keyword === '' || productName.includes(keyword) || productCode.includes(keyword);
  const matchCategory = categoryId === '' || String(product.categoryId) === String(categoryId);

  return matchKeyword && matchCategory;
}

function filterProducts() {
  const keyword = getSearchKeyword();
  const categoryId = getSelectedCategoryId();
  const result = [];

  for (let i = 0; i < publicProducts.length; i++) {
    if (isProductMatched(publicProducts[i], keyword, categoryId)) {
      result.push(publicProducts[i]);
    }
  }

  return result;
}

function createLowStockBadge(product) {
  if (!isLowStock(product)) {
    return '';
  }

  return '<span class="badge text-bg-warning ms-1">Sắp hết</span>';
}

function createPublicProductRow(product) {
  const rowClass = isLowStock(product) ? 'low-stock' : '';
  const image = getProductImage(product);
  const categoryName = getCategoryName(publicCategories, product.categoryId);
  const lowStockBadge = createLowStockBadge(product);

  return `
    <tr class="${rowClass}">
      <td>
        <img class="product-img" src="${image}" onerror="this.src='${PLACEHOLDER_IMG}'">
      </td>
      <td>
        <strong>${product.code}</strong>
        <div class="small text-muted">${product.name}</div>
      </td>
      <td>${categoryName}</td>
      <td>${getDisplayQuantity(product)} ${product.unit || ''} ${lowStockBadge}</td>
      <td>${money(product.price)}</td>
      <td>${product.description || ''}</td>
    </tr>
  `;
}

function renderPublicProducts() {
  const tableBody = qs('productTableBody');

  if (!tableBody) {
    return;
  }

  const filteredProducts = filterProducts();

  if (filteredProducts.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Không có dữ liệu phù hợp</td></tr>';
    return;
  }

  let html = '';

  for (let i = 0; i < filteredProducts.length; i++) {
    html += createPublicProductRow(filteredProducts[i]);
  }

  tableBody.innerHTML = html;
}

function getTransactionBadge(transactionType) {
  if (transactionType === 'import') {
    return '<span class="badge text-bg-success">Nhập kho</span>';
  }

  return '<span class="badge text-bg-danger">Xuất kho</span>';
}

function createPublicTransactionRow(transaction) {
  return `
    <tr>
      <td>${dateTime(transaction.createdAt)}</td>
      <td>${getProductNameById(publicProducts, transaction.productId)}</td>
      <td>${getTransactionBadge(transaction.type)}</td>
      <td>${transaction.quantity}</td>
      <td>${transaction.note || ''}</td>
    </tr>
  `;
}

function renderPublicTransactions() {
  const tableBody = qs('transactionTableBody');

  if (!tableBody) {
    return;
  }

  const latestTransactions = sortByNewest(publicTransactions).slice(0, 50);

  if (latestTransactions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có giao dịch</td></tr>';
    return;
  }

  let html = '';

  for (let i = 0; i < latestTransactions.length; i++) {
    html += createPublicTransactionRow(latestTransactions[i]);
  }

  tableBody.innerHTML = html;
}

function renderPublicStats() {
  const lowStockProducts = publicProducts.filter(isLowStock);
  const inventoryValue = calcInventoryValue(publicProducts);

  $('#totalProducts').html(publicProducts.length);
  $('#lowStockCount').html(lowStockProducts.length);
  $('#inventoryValue').html(money(inventoryValue));
}

function registerPublicEvents() {
  $('#searchInput').on('keyup', function () {
    renderPublicProducts();
  });

  $('#filterCategory').on('change', function () {
    renderPublicProducts();
  });

  $('#historyToggle').on('click', function () {
    $('#historyBox').slideDown();
    $(this).fadeOut();
  });
}

$(document).ready(function () {
  if (!qs('productTableBody')) {
    return;
  }

  loadPublicData();
  registerPublicEvents();
});
