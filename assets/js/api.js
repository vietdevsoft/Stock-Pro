// =============================
// FILE: api.js
// Mục đích: Gom các hàm gọi API.
// =============================

async function requestJSON(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const requestOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  const response = await fetch(url, requestOptions);
  const responseText = await response.text();

  if (!response.ok) {
    console.error('API lỗi:', response.status, responseText);
    throw new Error('API lỗi: ' + response.status);
  }

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Không đọc được JSON:', responseText);
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

function apiPatch(url, data) {
  return requestJSON(url, {
    method: 'PATCH',
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
    products: normalizeProducts(products || []),
    categories: normalizeCategories(categories || []),
    transactions: transactions || []
  };
}
