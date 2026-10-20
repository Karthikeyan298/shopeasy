// cart.js — in-memory cart with localStorage persistence
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  saveCart();
  renderCart();
  toast(`${product.name} added to cart`, 'success');
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const countEl   = document.getElementById('cart-count');
  const totalEl   = document.getElementById('cart-total');
  if (!container) return;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (countEl) countEl.textContent = totalQty;
  if (totalEl) totalEl.textContent = total.toFixed(2);

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-state">Your cart is empty</div>';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-qty">
        <button onclick="updateQty(${item.id}, -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="updateQty(${item.id}, +1)">+</button>
      </div>
      <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
    </div>
  `).join('');
}

function toggleCart() {
  const sidebar  = document.getElementById('cart-sidebar');
  const overlay  = document.getElementById('cart-overlay');
  if (!sidebar) return;
  sidebar.classList.toggle('hidden');
  overlay.classList.toggle('hidden');
}

async function placeOrder() {
  if (!getToken()) {
    toast('Please log in to place an order', 'error');
    showModal('login-modal');
    return;
  }
  if (cart.length === 0) { toast('Your cart is empty', 'error'); return; }

  try {
    const order = await OrdersAPI.create({
      productIds: cart.map(i => i.id),
      quantities: cart.map(i => i.qty),
    });
    cart = [];
    saveCart();
    renderCart();
    toggleCart();
    toast(`Order #${order.id.slice(0, 8)}… placed! 🎉`, 'success');
  } catch (err) {
    toast(`Order failed: ${err.message}`, 'error');
  }
}

// Init cart count on load
document.addEventListener('DOMContentLoaded', renderCart);
