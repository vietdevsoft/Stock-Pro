// =============================
// FILE: api.js
// Mục đích: Chứa toàn bộ hàm gọi MockAPI.io.
// =============================

async function apiGet(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('GET API lỗi: ' + url);
  }

  const data = await response.json();
  return data;
}

async function apiPost(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('POST API lỗi: ' + url);
  }

  const result = await response.json();
  return result;
}

async function apiPut(url, data) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('PUT API lỗi: ' + url);
  }

  const result = await response.json();
  return result;
}

async function apiDelete(url) {
  const response = await fetch(url, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('DELETE API lỗi: ' + url);
  }

  const result = await response.json();
  return result;
}

async function loadAllStockData() {
  const products = await apiGet(API.products);
  const transactions = await apiGet(API.transactions);

  // Dùng jQuery AJAX để đáp ứng yêu cầu môn học.
  const categories = await $.get(API.categories);

  const productsWithStock = addCurrentStockToProducts(products, transactions);

  return {
    rawProducts: products,
    products: productsWithStock,
    categories: categories,
    transactions: transactions
  };
}
