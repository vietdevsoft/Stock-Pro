// =============================
// FILE: api.js
// Mục đích: Gom các hàm gọi API để code ở file khác ngắn và dễ hiểu hơn.
// =============================

async function requestJSON(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const requestOptions = {
    ...defaultOptions,
    ...options
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error('API lỗi: ' + response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi gọi API:', error);
    throw error;
  }
}

function apiGet(url) {
  return requestJSON(url);
}

function apiPost(url, data) {
  return requestJSON(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

function apiPut(url, data) {
  return requestJSON(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

function apiDelete(url) {
  return requestJSON(url, {
    method: 'DELETE'
  });
}

async function loadAllStockData() {
  const products = await apiGet(API.products);
  const categories = await apiGet(API.categories);
  const transactions = await apiGet(API.transactions);

  return {
    products: products,
    categories: categories,
    transactions: transactions
  };
}
