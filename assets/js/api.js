async function requestJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!response.ok) throw new Error(`API lỗi ${response.status}: ${url}`);
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const apiGet = url => requestJSON(url);
const apiPost = (url, data) => requestJSON(url, { method: 'POST', body: JSON.stringify(data) });
const apiPut = (url, data) => requestJSON(url, { method: 'PUT', body: JSON.stringify(data) });
const apiDelete = url => requestJSON(url, { method: 'DELETE' });

async function loadAllStockData() {
  const [products, transactions] = await Promise.all([
    apiGet(API.products),
    apiGet(API.transactions)
  ]);

  // jQuery AJAX requirement: use $.get for one API call.
  const categories = await $.get(API.categories);

  const enrichedProducts = enrichProductsWithStock(products, transactions);
  return { products: enrichedProducts, rawProducts: products, categories, transactions };
}
