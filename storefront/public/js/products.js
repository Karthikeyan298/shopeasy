// products.js — product grid rendering
const CATEGORY_ICONS = {
  electronics: '💻',
  accessories: '🖱️',
  audio:       '🎧',
  storage:     '💾',
  default:     '📦',
};

let searchTimer = null;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 350);
}

async function loadProducts() {
  const grid     = document.getElementById('products-grid');
  const search   = document.getElementById('search-input')?.value.trim() || '';
  const category = document.getElementById('category-filter')?.value || '';

  grid.innerHTML = '<div class="loading">Loading products…</div>';

  try {
    const params = {};
    if (search)   params.search   = search;
    if (category) params.category = category;

    const products = await ProductsAPI.list(params);

    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="loading">No products found.</div>';
      return;
    }

    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="loading" style="color:#ef4444">
      Failed to load products: ${err.message}<br>
      <small>Make sure the api-gateway is running on port 3000.</small>
    </div>`;
  }
}

function renderProductCard(p) {
  const icon = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.default;
  const stockLabel = p.stock > 10
    ? `<span class="product-stock">${p.stock} in stock</span>`
    : p.stock > 0
      ? `<span class="product-stock" style="color:#f59e0b">Only ${p.stock} left!</span>`
      : `<span class="product-stock" style="color:#ef4444">Out of stock</span>`;

  return `
    <div class="product-card">
      <div class="product-image">${icon}</div>
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-meta">
          <span class="product-price">$${Number(p.price).toFixed(2)}</span>
          ${stockLabel}
        </div>
        <button
          class="btn btn-primary add-to-cart-btn"
          ${p.stock === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}
          onclick='addToCart(${JSON.stringify({ id: p.id, name: p.name, price: p.price })})'>
          Add to Cart
        </button>
      </div>
    </div>`;
}
