let allProducts = [];
let allCategories = [];
let currentCategoryId = "all";
let currentPage = 1;
const PRODUCTS_PER_PAGE = 8;


async function getProducts() {
    const response = await fetch("/view/products", {
        method: "GET",
        credentials: "same-origin"
    });

    return await response.json();
}


async function getCategories() {
    const response = await fetch("/view/categories", {
        method: "GET",
        credentials: "same-origin"
    });

    return await response.json();
}


function formatPrice(price) {
    if (price === null || price === undefined) {
        return "0đ";
    }

    return Number(price).toLocaleString("vi-VN") + "đ";
}


function createCategoryMap(categories) {
    const categoryMap = {};

    categories.forEach(function (category) {
        categoryMap[category.id] = category.name;
    });

    return categoryMap;
}


function updateProductStats(products, categories) {
    const productCountElement = document.getElementById("productCount");
    const categoryCountElement = document.getElementById("categoryCount");

    const activeProducts = products.filter(function (product) {
        return product.status === "active";
    });

    const activeCategories = categories.filter(function (category) {
        return category.status === "active";
    });

    if (productCountElement) {
        productCountElement.textContent = activeProducts.length;
    }

    if (categoryCountElement) {
        categoryCountElement.textContent = activeCategories.length;
    }
}


function getStockBadge(product) {
    if (product.status !== "active") {
        return {
            text: "Ngừng bán",
            className: "out-stock"
        };
    }

    if (product.min_stock <= 5) {
        return {
            text: "Sắp hết hàng",
            className: "low-stock"
        };
    }

    return {
        text: "Còn hàng",
        className: "in-stock"
    };
}


function renderCategoryFilters(categories) {
    const categoryFilter = document.getElementById("categoryFilter");

    if (!categoryFilter) return;

    const activeCategories = categories.filter(function (category) {
        return category.status === "active";
    });

    let html = `
        <div class="filter-chip active" data-category-id="all">Tất cả</div>
    `;

    html += activeCategories.map(function (category) {
        return `
            <div class="filter-chip" data-category-id="${category.id}">
                ${category.name}
            </div>
        `;
    }).join("");

    categoryFilter.innerHTML = html;

    initCategoryFilterEvents();
}


function initCategoryFilterEvents() {
    const filterChips = document.querySelectorAll(".filter-chip");

    filterChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            filterChips.forEach(function (item) {
                item.classList.remove("active");
            });

            chip.classList.add("active");

            currentCategoryId = chip.dataset.categoryId;
            currentPage = 1;

            renderProductCards();
        });
    });
}


function getFilteredProducts() {
    if (currentCategoryId === "all") {
        return allProducts;
    }

    return allProducts.filter(function (product) {
        return String(product.category_id) === String(currentCategoryId);
    });
}


function getPaginatedProducts(products) {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;

    return products.slice(startIndex, endIndex);
}


function createProductCard(product, categoryMap) {
    const badge = getStockBadge(product);
    const categoryName = categoryMap[product.category_id] || "Chưa phân loại";
    const imageUrl = product.image_url || "/static/images/no-image.png";
    const productName = product.product_name || "Sản phẩm";
    const productCode = product.product_code || "";
    const minStock = product.min_stock ?? "";

    return `
        <article class="product-card tilt-card">
            <div class="product-image">
                <img src="${imageUrl}" alt="${productName}" loading="lazy" decoding="async">
                <span class="stock-badge ${badge.className}">${badge.text}</span>
            </div>

            <div class="product-body">
                <span class="product-category">${categoryName}</span>
                <h3>${productName}</h3>
                <p class="price">${formatPrice(product.price)}</p>
                <p class="quantity">Mã sản phẩm: ${productCode}</p>
                <p class="quantity">Tồn kho tối thiểu: ${minStock}</p>

                <div class="product-actions">
                    <a href="/products/${product.id}" class="btn-small btn-outline">Xem chi tiết</a>
                    <a href="#" class="btn-small btn-buy">Mua ngay</a>
                </div>
            </div>
        </article>
    `;
}


function renderPagination(totalItems) {
    const pagination = document.getElementById("productPagination");

    if (!pagination) return;

    const totalPages = Math.ceil(totalItems / PRODUCTS_PER_PAGE);

    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    let html = `
        <button class="pagination-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>
            Trước
        </button>
    `;

    for (let page = 1; page <= totalPages; page++) {
        html += `
            <button class="pagination-btn ${page === currentPage ? "active" : ""}" data-page="${page}">
                ${page}
            </button>
        `;
    }

    html += `
        <button class="pagination-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>
            Sau
        </button>
    `;

    pagination.innerHTML = html;

    initPaginationEvents(totalPages);
}


function initPaginationEvents(totalPages) {
    const paginationButtons = document.querySelectorAll(".pagination-btn");

    paginationButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const pageValue = button.dataset.page;

            if (pageValue === "prev" && currentPage > 1) {
                currentPage--;
            } else if (pageValue === "next" && currentPage < totalPages) {
                currentPage++;
            } else if (!Number.isNaN(Number(pageValue))) {
                currentPage = Number(pageValue);
            }

            renderProductCards();

            const catalogSection = document.getElementById("catalog");
            if (catalogSection) {
                catalogSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
}


function renderProductCards() {
    const productGrid = document.getElementById("productGrid");

    if (!productGrid) return;

    const categoryMap = createCategoryMap(allCategories);
    const filteredProducts = getFilteredProducts();
    const paginatedProducts = getPaginatedProducts(filteredProducts);

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = "<p>Không có sản phẩm trong danh mục này.</p>";
        renderPagination(0);
        return;
    }

    productGrid.innerHTML = paginatedProducts
        .map(function (product) {
            return createProductCard(product, categoryMap);
        })
        .join("");

    renderPagination(filteredProducts.length);
}


async function renderProducts() {
    const productGrid = document.getElementById("productGrid");

    if (!productGrid) return;

    productGrid.innerHTML = "<p>Đang tải sản phẩm...</p>";

    try {
        const [productResult, categoryResult] = await Promise.all([
            getProducts(),
            getCategories()
        ]);

        if (!productResult.success) {
            productGrid.innerHTML = "<p>Không thể tải danh sách sản phẩm.</p>";
            return;
        }

        if (!categoryResult.success) {
            productGrid.innerHTML = "<p>Không thể tải danh sách danh mục.</p>";
            return;
        }

        allProducts = productResult.data || [];
        allCategories = categoryResult.data || [];

        currentPage = 1;
        currentCategoryId = "all";

        updateProductStats(allProducts, allCategories);
        renderCategoryFilters(allCategories);
        renderProductCards();

    } catch (error) {
        console.error("Lỗi lấy danh sách sản phẩm:", error);
        productGrid.innerHTML = "<p>Không thể kết nối tới server.</p>";
    }
}


document.addEventListener("DOMContentLoaded", function () {
    renderProducts();
});
