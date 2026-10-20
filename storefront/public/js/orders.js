// orders.js — My Orders page
async function initOrdersPage() {
  const container = document.getElementById('orders-list');
  const user = getUser();

  if (!user) {
    container.innerHTML = '<div class="empty-state">Please <a href="#" onclick="showModal(\'login-modal\')">log in</a> to view your orders.</div>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading orders…</div>';

  try {
    const orders = await OrdersAPI.list();

    if (!orders || orders.length === 0) {
      container.innerHTML = '<div class="empty-state">No orders yet. <a href="index.html">Start shopping!</a></div>';
      return;
    }

    container.innerHTML = orders.map(renderOrderCard).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:#ef4444">Failed to load orders: ${err.message}</div>`;
  }
}

function renderOrderCard(order) {
  const date = new Date(order.createdAt).toLocaleString();
  const statusClass = `status-${order.status}`;
  const items = (order.items || []).map(item => `
    <div class="order-item-row">
      <span>${item.name} × ${item.quantity}</span>
      <span>$${Number(item.subtotal).toFixed(2)}</span>
    </div>`).join('');

  return `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">Order #${order.id}</span>
        <span class="order-status ${statusClass}">${order.status}</span>
        <span style="color:var(--muted);font-size:.8rem;margin-left:auto">${date}</span>
      </div>
      <div class="order-items">${items}</div>
      <div class="order-total">Total: $${Number(order.total).toFixed(2)}</div>
    </div>`;
}
