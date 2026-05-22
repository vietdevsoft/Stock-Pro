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
    console.error(error);
    showError('Không tải được lịch sử nhập/xuất.');
  } finally {
    showLoading(false);
  }
}

function renderFullHistoryTable() {
  const tableBody = getElement('historyTableBody');

  if (!tableBody) {
    return;
  }

  const sortedTransactions = historyTransactions.slice();

  sortedTransactions.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  let html = '';

  if (sortedTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          Chưa có giao dịch.
        </td>
      </tr>
    `;
    return;
  }

  for (let i = 0; i < sortedTransactions.length; i++) {
    const transaction = sortedTransactions[i];
    const productName = getProductNameById(historyProducts, transaction.productId);

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
          <span class="badge text-bg-${badgeClass}">${typeLabel}</span>
        </td>
        <td>${transaction.quantity}</td>
        <td>${transaction.note || ''}</td>
      </tr>
    `;
  }

  tableBody.innerHTML = html;
}

$(document).ready(function () {
  if (!getElement('historyTableBody')) {
    return;
  }

  loadHistoryPage();
});
