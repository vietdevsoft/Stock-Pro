// =============================
// FILE: history.js
// Mục đích: Xử lý riêng trang history.html.
// =============================

let historyProducts = [];
let historyTransactions = [];

async function loadHistoryPage() {
  showLoading(true);

  try {
    const data = await loadAllStockData();

    historyProducts = data.products;
    historyTransactions = data.transactions;

    renderFullHistoryTable();
  } catch (error) {
    console.error('Lỗi tải trang lịch sử:', error);
    showError('Không tải được lịch sử nhập/xuất.');
  } finally {
    showLoading(false);
  }
}

function getSortedTransactions() {
  const copiedTransactions = historyTransactions.slice();

  copiedTransactions.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return copiedTransactions;
}

function getTransactionTypeInfo(type) {
  if (type === 'import') {
    return {
      label: 'Nhập kho',
      badgeClass: 'success'
    };
  }

  return {
    label: 'Xuất kho',
    badgeClass: 'danger'
  };
}

function createHistoryRow(transaction) {
  const productName = getProductNameById(historyProducts, transaction.productId);
  const typeInfo = getTransactionTypeInfo(transaction.type);

  return `
    <tr>
      <td>${formatDateTime(transaction.createdAt)}</td>
      <td>${productName}</td>
      <td>
        <span class="badge text-bg-${typeInfo.badgeClass}">${typeInfo.label}</span>
      </td>
      <td>${transaction.quantity}</td>
      <td>${transaction.note || ''}</td>
    </tr>
  `;
}

function renderEmptyHistoryRow(tableBody) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">
        Chưa có giao dịch.
      </td>
    </tr>
  `;
}

function renderFullHistoryTable() {
  const tableBody = qs('historyTableBody');

  if (!tableBody) {
    return;
  }

  const sortedTransactions = getSortedTransactions();

  if (sortedTransactions.length === 0) {
    renderEmptyHistoryRow(tableBody);
    return;
  }

  let html = '';

  for (let i = 0; i < sortedTransactions.length; i++) {
    html += createHistoryRow(sortedTransactions[i]);
  }

  tableBody.innerHTML = html;
}

$(document).ready(function () {
  // Nếu không ở trang history.html thì không chạy file này.
  if (!qs('historyTableBody')) {
    return;
  }

  loadHistoryPage();
});
