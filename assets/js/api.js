// =============================
// FILE: api.js
// Mục đích: Gom các hàm gọi API dùng chung.
// Ghi chú:
// - Giữ nguyên config.js theo yêu cầu.
// - API hiện tại dùng Products, Categories, Transactions.
// - Resource Data trên MockAPI có thể không hiển thị id, vì vậy frontend chuẩn hóa id an toàn.
// =============================

async function requestJSON(url, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

function getRemoteId(item) {
  if (hasValue(item.id)) {
    return String(item.id);
  }

  if (hasValue(item.objectId)) {
    return String(item.objectId);
  }

  return '';
}

function getLocalId(item, index) {
  const remoteId = getRemoteId(item);

  if (hasValue(remoteId)) {
    return remoteId;
  }

  return String(index + 1);
}

function normalizeCategory(category, index) {
  const remoteId = getRemoteId(category);
  const localId = getLocalId(category, index);
  const apiId = hasValue(remoteId) ? remoteId : localId;

  return {
    ...category,
    id: localId,
    _remoteId: apiId,
    _hasRemoteId: true,
    name: cleanText(category.name, 'Danh mục ' + localId),
    description: cleanText(category.description, ''),
    createdAt: cleanText(category.createdAt, new Date().toISOString()),
    updatedAt: cleanText(category.updatedAt, category.createdAt || new Date().toISOString())
  };
}

function normalizeProduct(product, index) {
  const remoteId = getRemoteId(product);
  const localId = getLocalId(product, index);
  const apiId = hasValue(remoteId) ? remoteId : localId;
  const code = cleanText(product.code, 'SP' + String(index + 1).padStart(3, '0'));
  const name = cleanText(product.name, 'Hàng hóa ' + localId);
  const categoryId = cleanText(product.categoryId, '');
  const quantity = toSafeInteger(product.quantity, 0);
  const price = toSafeNumber(product.price, 0);
  const minStock = toSafeInteger(product.minStock, 0);
  const image = cleanText(product.image || product.imageUrl, PLACEHOLDER_IMG);

  return {
    ...product,
    id: localId,
    _remoteId: apiId,
    _hasRemoteId: true,
    code: code,
    name: name,
    categoryId: categoryId,
    quantity: quantity,
    unit: cleanText(product.unit, 'cái'),
    price: price,
    minStock: minStock,
    description: cleanText(product.description, ''),
    image: image,
    createdAt: cleanText(product.createdAt, new Date().toISOString()),
    updatedAt: cleanText(product.updatedAt, product.createdAt || new Date().toISOString())
  };
}

function normalizeTransaction(transaction, index) {
  const remoteId = getRemoteId(transaction);
  const localId = getLocalId(transaction, index);
  const type = transaction.type === 'export' ? 'export' : 'import';

  return {
    ...transaction,
    id: localId,
    _remoteId: remoteId,
    _hasRemoteId: hasValue(remoteId),
    productId: cleanText(transaction.productId, ''),
    type: type,
    quantity: toSafeInteger(transaction.quantity, 0),
    note: cleanText(transaction.note, ''),
    createdAt: cleanText(transaction.createdAt, new Date().toISOString())
  };
}

function normalizeList(items, normalizer) {
  const result = [];
  const safeItems = Array.isArray(items) ? items : [];

  for (let i = 0; i < safeItems.length; i++) {
    result.push(normalizer(safeItems[i] || {}, i));
  }

  return result;
}

async function loadAllStockData() {
  const products = await apiGet(API.products);
  const categories = await apiGet(API.categories);
  const transactions = await apiGet(API.transactions);

  return {
    products: normalizeList(products, normalizeProduct),
    categories: normalizeList(categories, normalizeCategory),
    transactions: normalizeList(transactions, normalizeTransaction)
  };
}
