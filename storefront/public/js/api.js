// api.js — centralised fetch wrapper
// When served by nginx, /api/* is proxied to the gateway — no CORS.
// When opened directly (file:// or dev), fall back to localhost:3000.
const API_BASE = (location.protocol === 'http:' || location.protocol === 'https:') && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' ? '' : 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// Products
const ProductsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/products${qs ? '?' + qs : ''}`);
  },
  get: (id) => apiFetch(`/api/products/${id}`),
};

// Users
const UsersAPI = {
  register: (body) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  // user-service has no login endpoint — we fake a token from the returned user id for demo
};

// Orders
const OrdersAPI = {
  list:   ()     => apiFetch('/api/orders'),
  create: (body) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
};
