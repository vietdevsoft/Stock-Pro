// =============================
// FILE: public.js
// Mục đích: Xử lý trang Public gồm:
// - Xem tồn kho
// - Tìm kiếm mặt hàng
// - Lọc theo nhóm hàng
// - Xem nhanh lịch sử nhập/xuất
// =============================

let publicProducts = [];
let publicCategories = [];
let publicTransactions = [];

async function loadPublicPage() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    publicProducts = data.products;
    publicCategories = data.categories;
    publicTransactions = data.transactions;

    renderCategoryFilter();
    renderProductTable();
    renderTransactionTable();
    renderPublicStatistic();
  } catch (error) {
    console.error(error);
    showError('Không tải được dữ liệu tồn kho từ MockAPI.');
  } finally {
    showLoading(false);
  }
}

function renderCategoryFilter() {
  const select = getElement('filterCategory');

  if (!select) {
    return;
  }

  let html = '<option value="">Tất cả nhóm hàng</option>';

  for (let i = 0; i < publicCategories.length; i++) {
    html = html + `
      <option value="${publicCategories[i].id}">
        ${publicCategories[i].name}
      </option>
    `;
  }

  select.innerHTML = html;
}

function getFilteredProducts() {
  const searchInput = getElement('searchInput');
  const categorySelect = getElement('filterCategory');

  const keyword = searchInput.value.trim().toLowerCase();
  const categoryId = categorySelect.value;

  const filteredProducts = [];

  for (let i = 0; i < publicProducts.length; i++) {
    const product = publicProducts[i];

    const productText = (
      product.code + ' ' + product.name + ' ' + (product.description || '')
    ).toLowerCase();

    const isMatchKeyword = keyword === '' || productText.includes(keyword);
    const isMatchCategory = categoryId === '' || String(product.categoryId) === String(categoryId);

    if (isMatchKeyword && isMatchCategory) {
      filteredProducts.push(product);
    }
  }

  return filteredProducts;
}

function renderProductTable() {
  const tableBody = getElement('productTableBody');

  if (!tableBody) {
    return;
  }

  const products = getFilteredProducts();
  let html = '';

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          Không có hàng hóa phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const lowStock = isLowStock(product);
    const categoryName = getCategoryNameById(publicCategories, product.categoryId);

    let stockBadge = '<span class="badge text-bg-success ms-1">Ổn</span>';

    if (lowStock) {
      stockBadge = '<span class="badge text-bg-warning ms-1">Sắp hết</span>';
    }

    html = html + `
      <tr class="${lowStock ? 'low-stock' : ''}">
        <td>
          <img
            class="product-img"
            src="${product.image || PLACEHOLDER_IMG}"
            alt="${product.name}"
            onerror="this.src='${PLACEHOLDER_IMG}'"
          >
        </td>
        <td>
          <strong>${product.code}</strong>
          <div class="small text-muted">${product.name}</div>
        </td>
        <td>${categoryName}</td>
        <td>
          <strong>${product.currentStock}</strong> ${product.unit || ''}
          ${stockBadge}
        </td>
        <td>${formatMoney(product.price)}</td>
        <td>${product.description || ''}</td>
      </tr>
    `;
  }

  tableBody.innerHTML = html;
}

function renderTransactionTable() {
  const tableBody = getElement('transactionTableBody');

  if (!tableBody) {
    return;
  }

  const sortedTransactions = publicTransactions.slice();

  sortedTransactions.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let html = '';

  if (sortedTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Chưa có lịch sử nhập/xuất.
        </td>
      </tr>
    `;
    return;
  }

  for (let i = 0; i < sortedTransactions.length && i < 50; i++) {
    const transaction = sortedTransactions[i];
    const productName = getProductNameById(publicProducts, transaction.productId);

    let typeLabel = 'Xuất kho';
    let badgeClass = 'danger';

    if (transaction.type === 'import') {
      typeLabel = 'Nhập kho';
      badgeClass = 'success';
    }

    html = html + `
      <tr>
        <td>${formatDateTime(transaction.createdAt)}</td>
        <td>${productName}</td>
        <td>
          <span class="badge text-bg-${badgeClass}">
            ${typeLabel}
          </span>
        </td>
        <td>${transaction.quantity}</td>
        <td>${transaction.note || ''}</td>
      </tr>
    `;
  }

  tableBody.innerHTML = html;
}

function renderPublicStatistic() {
  let lowStockCount = 0;

  for (let i = 0; i < publicProducts.length; i++) {
    if (isLowStock(publicProducts[i])) {
      lowStockCount = lowStockCount + 1;
    }
  }

  $('#totalProducts').html(publicProducts.length);
  $('#lowStockCount').html(lowStockCount);
  $('#inventoryValue').html(formatMoney(calculateInventoryValue(publicProducts)));
}

$(document).ready(function () {
  if (!getElement('productTableBody')) {
    return;
  }

  loadPublicPage();

  $('#searchInput').on('keyup', function () {
    renderProductTable();
    $('#productTableBody').hide().fadeIn(160);
  });

  $('#filterCategory').on('change', function () {
    renderProductTable();
  });

  $('#historyToggle').on('click', function () {
    $('#historyBox').slideDown(180);
    $(this).fadeOut(120);
  });
});
