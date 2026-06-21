/* Stock Pro Admin Dashboard - API backed */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DEFAULT_PRODUCT_IMAGE = "https://placehold.co/220x160/f7f3e8/0b1730?text=Stock+Pro";
const DEFAULT_PREVIEW_IMAGE = "https://placehold.co/320x180/f7f3e8/0b1730?text=Preview";

let pendingAction = null;
let products = [];
let categories = [];
let units = [];
let transactions = [];
let users = [];

const pageTitles = {
  overview: ["Tổng quan quản trị", "Theo dõi tình trạng kho hàng, giao dịch nhập xuất và hiệu suất vận hành."],
  products: ["Tất cả mặt hàng", "Tìm kiếm, lọc và quản lý danh sách sản phẩm trong kho."],
  "inventory-actions": ["Thêm / Nhập / Xuất hàng", "Tạo hàng hóa mới, nhập kho và xuất kho trong cùng một màn hình thao tác."],
  categories: ["Quản lý nhóm hàng", "Tổ chức danh mục sản phẩm và kiểm soát điều kiện xóa nhóm hàng."],
  transactions: ["Lịch sử giao dịch", "Tra cứu các phiếu nhập kho, xuất kho và giá trị giao dịch."],
  settings: ["Cấu hình website", "Quản lý nhận diện website và tài khoản người dùng."]
};

const roleNames = {
  1: "Admin",
  2: "User",
  3: "Quản lý",
  admin: "Admin",
  user: "User",
  member: "User",
  manager: "Quản lý",
  "thành viên": "User",
  "quản lý": "Quản lý"
};

const statusNames = {
  active: "Đã xác thực",
  verified: "Đã xác thực",
  pending: "Chưa xác thực",
  inactive: "Chưa xác thực",
  locked: "Bị khóa",
  blocked: "Bị khóa"
};

const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const sameId = (a, b) => Number(a) === Number(b);
const textValue = id => $(`#${id}`)?.value || "";
const lower = value => String(value || "").toLowerCase();

async function requestJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json();
    if (!response.ok || !data.success) console.error("Request failed:", data.message || url);
    return data;
  } catch (error) {
    console.error("Request error:", error);
    return { success: false, message: "Không thể kết nối tới server.", data: null };
  }
}

const api = {
  get: requestJSON,
  post: (url, body) => requestJSON(url, { method: "POST", body: JSON.stringify(body) }),
  del: url => requestJSON(url, { method: "DELETE" })
};

async function refresh() {
  const [categoryResult, unitResult, productResult, transactionResult, userResult] = await Promise.all([
    api.get("/view/categories"),
    api.get("/view/units"),
    api.get("/view/products"),
    api.get("/view/products/transactions"),
    api.get("/view/users")
  ]);

  categories = readList(categoryResult, "Không thể tải danh mục.");
  units = readList(unitResult, "Không thể tải đơn vị.");
  transactions = readList(transactionResult, "Không thể tải giao dịch.");
  users = readList(userResult, "Không thể tải người dùng.").map(normalizeUser);
  products = await normalizeProducts(readList(productResult, "Không thể tải sản phẩm."));

  renderAll();
}

function readList(result, fallbackMessage) {
  if (result.success) return result.data || [];
  toast(result.message || fallbackMessage, "error");
  return [];
}

async function normalizeProducts(rawProducts) {
  const exportedByProduct = transactions.reduce((totals, item) => {
    if (item.transaction_type === "export") {
      totals[item.product_id] = (totals[item.product_id] || 0) + Number(item.quantity || 0);
    }
    return totals;
  }, {});

  return Promise.all(rawProducts.map(async item => {
    const stock = await api.get(`/view/products/${item.id}/stock`);
    return {
      id: item.id,
      code: item.product_code,
      name: item.product_name,
      categoryId: item.category_id,
      unitId: item.unit_id,
      category: getCategoryName(item.category_id),
      unit: getUnitName(item.unit_id),
      quantity: Number(stock?.data?.quantity_on_hand || 0),
      exported: Number(item.exported ?? exportedByProduct[item.id] ?? 0),
      minStock: Number(item.min_stock || 0),
      price: Number(item.price || 0),
      image: item.image_url || DEFAULT_PRODUCT_IMAGE,
      description: item.description || "",
      status: item.status || "active",
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
  }));
}

function normalizeUser(user) {
  const roleKey = lower(user.role || user.role_name || user.role_id);
  const statusKey = lower(user.status);

  return {
    id: user.id,
    name: user.name || user.full_name || "Người dùng",
    email: user.email || "",
    phone: user.phone || user.phone_number || "",
    createdAt: formatDate(user.createdAt || user.created_at),
    role: roleNames[roleKey] || roleNames[Number(user.role_id)] || "Không xác định",
    status: user.statusLabel || statusNames[statusKey] || user.status || "Không xác định"
  };
}

function getCategoryName(categoryId) {
  return categories.find(category => sameId(category.id, categoryId))?.name || "Chưa xác định";
}

function getUnitName(unitId) {
  return units.find(unit => sameId(unit.id, unitId))?.name || "Đơn vị";
}

function getProductStatus(product) {
  if (product.quantity <= 0) return "Hết hàng";
  if (product.quantity <= product.minStock) return "Sắp hết hàng";
  return "Còn hàng";
}

function badgeClass(status = "") {
  if (status.includes("Hết") || status.includes("khóa")) return "danger";
  if (status.includes("Sắp") || status.includes("Chưa") || status.includes("Xuất")) return "warn";
  if (status.includes("Nhập")) return "info";
  return "good";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("vi-VN") : "";
}

function renderAll() {
  renderSelects();
  renderProducts();
  renderCategories();
  renderTransactions();
  renderUsers();
  renderOverview();
}

function renderOverview() {
  const totalValue = products.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const stats = [
    ["📦", "Tổng hàng hóa", products.length],
    ["⚠️", "Tổng danh mục", categories.length],
    ["⬇️", "Đã nhập kho", countTransactions("import")],
    ["⬆️", "Đã xuất kho", countTransactions("export")],
    ["💰", "Tổng giá trị kho", money(totalValue)]
  ];

  $("#overviewStats").innerHTML = stats.map(([icon, label, value]) => `
    <article class="stat-card tilt-card">
      <div class="icon">${icon}</div><strong>${value}</strong><span>${label}</span>
    </article>
  `).join("");

  renderMonthlyBars();
  drawChart();
}

function countTransactions(type) {
  return transactions.filter(item => item.transaction_type === type).length;
}

function renderMonthlyBars() {
  const monthBars = $("#monthBars");
  if (!monthBars) return;

  const totals = Array.from({ length: 12 }, () => 0);
  transactions.forEach(item => {
    if (item.created_at) totals[new Date(item.created_at).getMonth()] += Number(item.quantity || 0);
  });

  const max = Math.max(1, ...totals);
  monthBars.innerHTML = totals.map((value, index) => {
    const width = Math.max(4, Math.round((value / max) * 100));
    return `<div class="month-row"><span>T${index + 1}</span><div class="month-track"><span style="width:${width}%"></span></div><b>${value}</b></div>`;
  }).join("");
}

function drawChart() {
  const canvas = $("#stockChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const pad = 44;
  const values = Array.from({ length: 30 }, (_, index) => transactionQuantityByDay(index + 1));
  const max = Math.max(10, ...values) + 5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,.10)";

  for (let index = 0; index < 5; index++) {
    const y = pad + index * (canvas.height - pad * 2) / 4;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvas.width - pad, y);
    ctx.stroke();
  }

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = pad + index * (canvas.width - pad * 2) / (values.length - 1);
    const y = canvas.height - pad - (value / max) * (canvas.height - pad * 2);
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });

  ctx.strokeStyle = "#34a853";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function transactionQuantityByDay(day) {
  return transactions.reduce((sum, item) => {
    if (!item.created_at || new Date(item.created_at).getDate() !== day) return sum;
    return sum + Number(item.quantity || 0);
  }, 0);
}

function renderSelects() {
  setOptions("#categoryFilter", [["all", "Tất cả nhóm hàng"], ...categories.map(item => [item.id, item.name])]);
  setOptions("#addCategorySelect", categories.map(item => [item.id, item.name]));
  setOptions("[name='unit']", units.map(item => [item.id, item.name]), $("#addProductForm"));
  renderStockForm("#importForm", "import");
  renderStockForm("#exportForm", "export");
}

function setOptions(selector, options, root = document) {
  const select = $(selector, root);
  if (!select) return;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function renderProducts() {
  const filtered = products.filter(product => {
    const keyword = lower(textValue("productSearch"));
    const category = textValue("categoryFilter") || "all";
    const status = textValue("statusFilter") || "all";
    const productStatus = getProductStatus(product);

    return (!keyword || lower(`${product.code} ${product.name}`).includes(keyword))
      && (category === "all" || sameId(product.categoryId, category))
      && (status === "all" || productStatus === status);
  });

  $("#productTableBody").innerHTML = filtered.map(productTableRow).join("");
  $("#productCardList").innerHTML = filtered.map(productMobileCard).join("");
}

function productTableRow(product) {
  const status = getProductStatus(product);
  return `<tr>
    <td><img class="product-thumb" src="${product.image}" alt="${product.name}"></td>
    <td><b>${product.code}</b></td>
    <td>${product.name}</td>
    <td>${product.category}</td>
    <td>${product.quantity}</td>
    <td>${product.exported}</td>
    <td>${product.minStock}</td>
    <td>${product.unit}</td>
    <td>${money(product.price)}</td>
    <td><span class="badge ${badgeClass(status)}">${status}</span></td>
    <td><div class="action-row"><button class="small-btn delete" data-delete-product="${product.id}" data-product-code="${product.code}">Xóa</button></div></td>
  </tr>`;
}

function productMobileCard(product) {
  const status = getProductStatus(product);
  return `<article class="mobile-card">
    <img class="product-thumb" src="${product.image}" alt="${product.name}">
    <h3>${product.name}</h3>
    <p><b>${product.code}</b> • ${product.category}</p>
    <p>Tồn: ${product.quantity} ${product.unit} | Đã xuất: ${product.exported}</p>
    <p>Tồn tối thiểu: ${product.minStock} ${product.unit}</p>
    <p>Đơn giá: ${money(product.price)}</p>
    <span class="badge ${badgeClass(status)}">${status}</span>
    <div class="action-row"><button class="small-btn delete" data-delete-product="${product.id}" data-product-code="${product.code}">Xóa</button></div>
  </article>`;
}

function renderStockForm(selector, type) {
  const form = $(selector);
  if (!form) return;

  const isImport = type === "import";
  form.innerHTML = `
    <label>Chọn hàng hóa
      <select name="productCode">${products.map(product => `<option value="${product.code}">${product.code} - ${product.name}</option>`).join("")}</select>
    </label>
    <div class="product-info-box" data-info-box>
      <div><span>Mã sản phẩm</span><strong data-code></strong></div>
      <div><span>Tồn hiện tại</span><strong data-quantity></strong></div>
      <div><span>Đơn vị</span><strong data-unit></strong></div>
      <div><span>Đơn giá</span><strong data-price></strong></div>
    </div>
    <div class="form-grid two-col">
      <label>${isImport ? "Số lượng nhập" : "Số lượng xuất"}<input name="quantity" type="number" min="1" placeholder="0" /></label>
      <label>Đơn giá ${isImport ? "nhập" : "xuất"}<input name="price" type="number" min="1" placeholder="0" /></label>
    </div>
    <label>Ghi chú<textarea name="note" placeholder="Nhập ghi chú giao dịch..."></textarea></label>
    <button class="btn btn-primary" type="submit">${isImport ? "Xác nhận nhập kho" : "Xác nhận xuất kho"}</button>`;

  updateStockInfo(form);
}

function updateStockInfo(form) {
  const product = products.find(item => item.code === form?.productCode?.value);
  if (!product) return;

  $("[data-code]", form).textContent = product.code;
  $("[data-quantity]", form).textContent = `${product.quantity} ${product.unit}`;
  $("[data-unit]", form).textContent = product.unit;
  $("[data-price]", form).textContent = money(product.price);
  form.price.value = product.price;
}

function renderCategories() {
  $("#categoryList").innerHTML = categories.map(category => {
    const count = products.filter(product => sameId(product.categoryId, category.id)).length;
    return `<div class="category-item">
      <div>
        <h3>${category.name}</h3>
        <p>${category.description || "Chưa có mô tả"}</p>
        <div class="category-meta">
          <span class="badge info">${count} sản phẩm</span>
          <span class="badge ${count ? "good" : "warn"}">${count ? "Đang sử dụng" : "Có thể xóa"}</span>
          <span class="badge">${formatDate(category.created_at) || "Chưa rõ"}</span>
        </div>
      </div>
      <button class="small-btn delete" data-delete-category="${category.id}">Xóa</button>
    </div>`;
  }).join("");
}

function renderTransactions() {
  const filtered = normalizedTransactions().filter(item => {
    const keyword = lower(textValue("transactionSearch"));
    const type = textValue("transactionTypeFilter") || "all";
    const date = textValue("transactionDateFilter");
    return (!keyword || lower(`${item.code} ${item.name}`).includes(keyword))
      && (type === "all" || item.type === type)
      && (!date || item.rawDate === date);
  });

  $("#transactionTableBody").innerHTML = filtered.map(transactionTableRow).join("");
  $("#transactionCardList").innerHTML = filtered.map(transactionMobileCard).join("");
}

function normalizedTransactions() {
  return transactions.map(item => {
    const product = products.find(product => sameId(product.id, item.product_id));
    return {
      rawDate: item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : "",
      time: formatDateTime(item.created_at),
      code: item.code || product?.code || `#${item.product_id || ""}`,
      name: item.name || product?.name || "Sản phẩm",
      type: item.type || (item.transaction_type === "import" ? "Nhập kho" : item.transaction_type === "export" ? "Xuất kho" : ""),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || item.unit_price || product?.price || 0),
      note: item.note || ""
    };
  });
}

function transactionTableRow(item) {
  return `<tr>
    <td>${item.time}</td>
    <td><b>${item.code}</b></td>
    <td>${item.name}</td>
    <td><span class="badge ${badgeClass(item.type)}">${item.type}</span></td>
    <td>${item.quantity}</td>
    <td>${money(item.price)}</td>
    <td>${money(item.quantity * item.price)}</td>
    <td>${item.note}</td>
  </tr>`;
}

function transactionMobileCard(item) {
  return `<article class="mobile-card">
    <h3>${item.code} - ${item.name}</h3>
    <p>${item.time}</p>
    <p>${item.quantity} × ${money(item.price)} = <b>${money(item.quantity * item.price)}</b></p>
    <span class="badge ${badgeClass(item.type)}">${item.type}</span>
    <p>${item.note}</p>
  </article>`;
}

function renderUsers() {
  const filtered = users.filter(user => {
    const keyword = lower(textValue("userSearch"));
    const role = textValue("userRoleFilter") || "all";
    const status = textValue("userStatusFilter") || "all";
    return (!keyword || lower(`${user.name} ${user.email} ${user.phone}`).includes(keyword))
      && (role === "all" || user.role === role)
      && (status === "all" || user.status === status);
  });

  const verified = users.filter(user => user.status === "Đã xác thực").length;
  const locked = users.filter(user => user.status === "Bị khóa").length;
  const admin = users.filter(user => user.role === "Admin" || user.role === "Quản lý").length;

  $("#userStats").innerHTML = [
    ["Tổng user", users.length],
    ["Quản trị", admin],
    ["Đã xác thực", verified],
    ["Bị khóa", locked]
  ].map(([label, value]) => `<div class="mini-stat"><b>${value}</b><span>${label}</span></div>`).join("");

  $("#userTableBody").innerHTML = filtered.map(userTableRow).join("");
  $("#userCardList").innerHTML = filtered.map(userMobileCard).join("");
}

function userTableRow(user) {
  return `<tr>
    <td><b>${user.name}</b></td>
    <td>${user.email}</td>
    <td>${user.phone}</td>
    <td>${user.createdAt}</td>
    <td><span class="badge info">${user.role}</span></td>
    <td><span class="badge ${badgeClass(user.status)}">${user.status}</span></td>
    <td><div class="action-row"><button class="small-btn delete" data-delete-user="${user.email}">Xóa</button></div></td>
  </tr>`;
}

function userMobileCard(user) {
  return `<article class="mobile-card">
    <h3>${user.name}</h3>
    <p>${user.email}</p>
    <p>${user.phone} • ${user.createdAt}</p>
    <span class="badge info">${user.role}</span>
    <span class="badge ${badgeClass(user.status)}">${user.status}</span>
    <div class="action-row"><button class="small-btn delete" data-delete-user="${user.email}">Xóa</button></div>
  </article>`;
}

function initNavigation() {
  $("#sidebarToggle")?.addEventListener("click", () => {
    $("#adminSidebar")?.classList.add("open");
    $("#sidebarBackdrop")?.classList.add("show");
  });
  $("#sidebarBackdrop")?.addEventListener("click", closeSidebar);
  $("#collapseBtn")?.addEventListener("click", toggleSidebar);

  document.addEventListener("click", event => {
    const menu = event.target.closest("[data-section], [data-section-jump]");
    if (menu) switchSection(menu.dataset.section || menu.dataset.sectionJump);
  });
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
  $("#collapseBtn").textContent = document.body.classList.contains("sidebar-collapsed")
    ? "Mở rộng sidebar"
    : "Thu gọn sidebar";
}

function switchSection(section) {
  if (!section || !$(`#${section}`)) return;
  $$(".content-section").forEach(item => item.classList.toggle("active", item.id === section));
  $$(".menu-item").forEach(item => item.classList.toggle("active", item.dataset.section === section));
  const [title, desc] = pageTitles[section] || pageTitles.overview;
  $("#pageTitle").textContent = title;
  $("#pageDesc").textContent = desc;
  closeSidebar();
  if (section === "overview") drawChart();
}

function closeSidebar() {
  $("#adminSidebar")?.classList.remove("open");
  $("#sidebarBackdrop")?.classList.remove("show");
}

function initForms() {
  $("#imageUrl")?.addEventListener("input", event => {
    $("#imagePreview").src = event.target.value || DEFAULT_PREVIEW_IMAGE;
  });

  $("#addProductForm")?.addEventListener("submit", submitProduct);
  $("#categoryForm")?.addEventListener("submit", submitCategory);
  $("#importForm")?.addEventListener("submit", event => submitStock(event, "import"));
  $("#exportForm")?.addEventListener("submit", event => submitStock(event, "export"));
  $("#importForm")?.addEventListener("change", event => updateStockInfo(event.currentTarget));
  $("#exportForm")?.addEventListener("change", event => updateStockInfo(event.currentTarget));
  $("#websiteForm")?.addEventListener("submit", event => {
    event.preventDefault();
    toast("Lưu cấu hình website thành công.", "success");
  });

  ["iconInput", "logoInput"].forEach(id => $(`#${id}`)?.addEventListener("input", renderIdentityPreview));
  renderIdentityPreview();
}

async function submitProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const product = {
    code: form.code.value.trim(),
    name: form.name.value.trim(),
    categoryId: Number(form.category.value),
    unitId: Number(form.unit.value),
    quantity: Number(form.quantity.value || 0),
    minStock: Number(form.minStock.value || 0),
    price: Number(form.price.value || 0),
    image: form.image.value || DEFAULT_PRODUCT_IMAGE,
    description: form.description.value.trim()
  };

  if (!product.code || !product.name || product.quantity < 0 || product.price <= 0 || product.minStock < 0) {
    return toast("Vui lòng nhập đúng thông tin sản phẩm.", "error");
  }
  if (products.some(item => item.code === product.code)) {
    return toast("Mã sản phẩm đã tồn tại.", "error");
  }

  const saved = await saveAndRefresh(api.post("/view/products", product), "Thêm hàng hóa thành công.", form);
  if (!saved) return;

  $("#imagePreview").src = DEFAULT_PREVIEW_IMAGE;
  switchSection("products");
}

async function submitCategory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.name.value.trim();

  if (!name) return toast("Tên nhóm hàng không được trống.", "error");
  if (categories.some(item => lower(item.name) === lower(name))) return toast("Nhóm hàng đã tồn tại.", "error");

  await saveAndRefresh(api.post("/view/categories", {
    name,
    description: form.description.value.trim() || "Chưa có mô tả"
  }), "Thêm nhóm hàng thành công.", form);
}

async function submitStock(event, type) {
  event.preventDefault();
  const form = event.currentTarget;
  const product = products.find(item => item.code === form.productCode.value);
  const quantity = Number(form.quantity.value || 0);
  const price = Number(form.price.value || 0);
  const label = type === "import" ? "Nhập kho" : "Xuất kho";

  if (!product) return toast("Vui lòng chọn hàng hóa hợp lệ.", "error");
  if (quantity <= 0 || price <= 0) return toast("Số lượng và đơn giá phải lớn hơn 0.", "error");
  if (type === "export" && quantity > product.quantity) return toast("Không thể xuất quá số lượng tồn hiện tại.", "error");

  await saveAndRefresh(api.post("/view/products/transactions", {
    productId: product.id,
    code: product.code,
    transactionType: type,
    type: label,
    quantity,
    price,
    note: form.note.value || label
  }), `${label} thành công.`, form);
}

async function saveAndRefresh(promise, successMessage, form) {
  const result = await promise;
  if (!result.success) {
    toast(result.message || "Thao tác thất bại.", "error");
    return false;
  }

  form?.reset();
  await refresh();
  toast(successMessage, "success");
  return true;
}

function renderIdentityPreview() {
  if ($("#iconPreview") && $("#iconInput")) $("#iconPreview").src = $("#iconInput").value;
  if ($("#logoPreview") && $("#logoInput")) $("#logoPreview").src = $("#logoInput").value;
}

function initFilters() {
  ["productSearch", "categoryFilter", "statusFilter"].forEach(id => $(`#${id}`)?.addEventListener("input", renderProducts));
  ["transactionSearch", "transactionTypeFilter", "transactionDateFilter"].forEach(id => $(`#${id}`)?.addEventListener("input", renderTransactions));
  ["userSearch", "userRoleFilter", "userStatusFilter"].forEach(id => $(`#${id}`)?.addEventListener("input", renderUsers));

  $("#resetProductFilters")?.addEventListener("click", () => {
    $("#productSearch").value = "";
    $("#categoryFilter").value = "all";
    $("#statusFilter").value = "all";
    renderProducts();
  });

  $$(".stock-tab").forEach(button => button.addEventListener("click", () => {
    $$(".stock-tab").forEach(item => item.classList.remove("active"));
    $$(".stock-form").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    $(`#${button.dataset.stockTab === "import" ? "importForm" : "exportForm"}`).classList.add("active");
  }));
}

function initActions() {
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-product], [data-delete-category], [data-delete-user]");
    if (!button) return;

    if (button.dataset.deleteProduct) return confirmDeleteProduct(button);
    if (button.dataset.deleteCategory) return confirmDeleteCategory(button.dataset.deleteCategory);
    if (button.dataset.deleteUser) return confirmDeleteUser(button.dataset.deleteUser);
  });

  $("#logoutBtn")?.addEventListener("click", confirmLogout);
  $("#quickLogout")?.addEventListener("click", confirmLogout);
}

function confirmDeleteProduct(button) {
  openModal("Xóa sản phẩm?", `Bạn có chắc muốn xóa sản phẩm ${button.dataset.productCode || button.dataset.deleteProduct}?`, async () => {
    await deleteAndRefresh(api.del(`/view/products/${button.dataset.deleteProduct}`), "Đã xóa sản phẩm.");
  });
}

function confirmDeleteCategory(categoryId) {
  const category = categories.find(item => String(item.id) === String(categoryId));
  if (!category) return;
  if (products.some(product => sameId(product.categoryId, categoryId))) {
    return toast("Không thể xóa nhóm hàng đang có sản phẩm.", "error");
  }

  openModal("Xóa nhóm hàng?", `Bạn có chắc muốn xóa nhóm hàng ${category.name}?`, async () => {
    await deleteAndRefresh(api.del(`/view/categories/${categoryId}`), "Đã xóa nhóm hàng.");
  });
}

function confirmDeleteUser(email) {
  openModal("Xóa tài khoản?", `Nên ưu tiên khóa tài khoản thay vì xóa. Bạn vẫn muốn xóa ${email}?`, async () => {
    await deleteAndRefresh(api.del(`/view/users/${encodeURIComponent(email)}`), "Đã xóa tài khoản.");
  });
}

async function deleteAndRefresh(promise, successMessage) {
  const result = await promise;
  if (!result.success) return toast(result.message || "Không thể xóa.", "error");
  await refresh();
  toast(successMessage, "success");
}

function confirmLogout() {
  openModal("Bạn có chắc muốn đăng xuất?", "Phiên quản trị hiện tại sẽ kết thúc.", async () => {
    const result = await api.post("/auths/logout", {});
    if (result.success) window.location.replace("/");
    else toast(result.message || "Không thể đăng xuất.", "error");
  });
}

function openModal(title, message, action) {
  $("#modalTitle").textContent = title;
  $("#modalMessage").textContent = message;
  pendingAction = action;
  $("#modalBackdrop").classList.add("show");
}

function closeModal() {
  $("#modalBackdrop")?.classList.remove("show");
  pendingAction = null;
}

function initModal() {
  $("#modalClose")?.addEventListener("click", closeModal);
  $("#modalCancel")?.addEventListener("click", closeModal);
  $("#modalBackdrop")?.addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  $("#modalConfirm")?.addEventListener("click", async () => {
    if (pendingAction) await pendingAction();
    closeModal();
  });
}

function toast(message, type = "success") {
  const container = $("#toastContainer");
  if (!container) return;

  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  container.appendChild(element);
  setTimeout(() => element.remove(), 2800);
}

function initPagination() {
  $$(".pagination").forEach(pager => {
    const buttons = $$("button", pager);
    const label = $("span", pager);
    if (buttons.length < 2 || !label) return;

    const total = Number(label.textContent.match(/\/\s*(\d+)/)?.[1] || 1);
    let page = 1;
    const update = () => {
      label.textContent = `Trang ${page} / ${total}`;
      buttons[0].classList.toggle("is-disabled", page === 1);
      buttons[1].classList.toggle("is-disabled", page === total);
    };

    buttons[0].addEventListener("click", () => {
      if (page > 1) page -= 1;
      update();
    });
    buttons[1].addEventListener("click", () => {
      if (page < total) page += 1;
      update();
    });
    update();
  });
}

async function loadAdminProfile() {
  const result = await api.get("/users/profile");
  if (!result.success || !result.data) return window.location.assign("/login");

  const user = result.data;
  const roleId = Number(user.role_id);
  if (roleId !== 1 && roleId !== 3) return window.location.assign("/profile");

  const fullName = user.full_name || "Người quản trị";
  $("#adminAvatar").textContent = fullName.trim().charAt(0).toUpperCase();
  $("#adminFullName").textContent = fullName;
  $("#adminEmail").textContent = user.email || "Không có email";
  $("#roleLabel").textContent = roleNames[roleId] || "Không xác định";
  $("#settingsMenuItem")?.classList.toggle("is-visible", roleId === 1);
}

async function init() {
  initNavigation();
  initFilters();
  initForms();
  initActions();
  initModal();
  initPagination();
  await refresh();
  await loadAdminProfile();
  switchSection("overview");
}

document.addEventListener("DOMContentLoaded", init);
