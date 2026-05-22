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

    renderCategoryFilter(publicCategories);
    renderPublicProducts();
    renderPublicTransactions();
    renderPublicStats();
  } catch (error) {
    showError('Không tải được dữ liệu tồn kho từ MockAPI.');
  } finally {
    showLoading(false);
  }
}

function renderCategoryFilter(categories) {
  const select = qs('filterCategory');
  if (!select) return;
  select.innerHTML = '<option value="">Tất cả nhóm hàng</option>' +
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function filterProducts() {
  const keyword = (qs('searchInput')?.value || '').trim().toLowerCase();
  const categoryId = qs('filterCategory')?.value || '';

  return publicProducts.filter(product => {
    const text = `${product.code} ${product.name} ${product.description || ''}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchCategory = !categoryId || String(product.categoryId) === String(categoryId);
    return matchKeyword && matchCategory;
  });
}

function renderPublicProducts() {
  const tbody = qs('productTableBody');
  if (!tbody) return;

  const rows = filterProducts().map(product => {
    const low = isLowStock(product);
    return `
      <tr class="${low ? 'low-stock' : ''}">
        <td><img class="product-img" src="${product.image || PLACEHOLDER_IMG}" onerror="this.src='${PLACEHOLDER_IMG}'" alt="${product.name}"></td>
        <td>
          <strong>${product.code}</strong>
          <div class="small text-muted">${product.name}</div>
        </td>
        <td>${getCategoryName(publicCategories, product.categoryId)}</td>
        <td>
          <strong>${product.currentStock}</strong> ${product.unit || ''}
          ${low ? '<span class="badge text-bg-warning ms-1">Sắp hết</span>' : '<span class="badge text-bg-success ms-1">Ổn</span>'}
        </td>
        <td>${money(product.price)}</td>
        <td>${product.description || ''}</td>
      </tr>`;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="6" class="text-center text-muted py-4">Không có hàng hóa phù hợp</td></tr>';
}

function renderPublicTransactions() {
  const tbody = qs('transactionTableBody');
  if (!tbody) return;

  const rows = publicTransactions
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50)
    .map(transaction => {
      const typeLabel = transaction.type === 'import' ? 'Nhập kho' : 'Xuất kho';
      const badge = transaction.type === 'import' ? 'success' : 'danger';
      return `
        <tr>
          <td>${dateTime(transaction.createdAt)}</td>
          <td>${getProductName(publicProducts, transaction.productId)}</td>
          <td><span class="badge text-bg-${badge}">${typeLabel}</span></td>
          <td>${transaction.quantity}</td>
          <td>${transaction.note || ''}</td>
        </tr>`;
    }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có lịch sử nhập/xuất</td></tr>';
}

function renderPublicStats() {
  $('#totalProducts').html(publicProducts.length);
  $('#lowStockCount').html(publicProducts.filter(isLowStock).length);
  $('#inventoryValue').html(money(calcInventoryValue(publicProducts)));
}

$(document).ready(function () {
  if (!qs('productTableBody') && !qs('transactionTableBody')) return;

  loadPublicData();

  $('#searchInput').on('keyup', function () {
    renderPublicProducts();
    $('#productTableBody').hide().fadeIn(160);
  });

  $('#filterCategory').on('change', function () {
    renderPublicProducts();
  });

  $('#historyToggle').on('click', function () {
    $('#historyBox').slideDown(180);
    $(this).fadeOut(120);
  });
});
