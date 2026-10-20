const express    = require('express');
const axios      = require('axios');   // 0.21.1 — CVE-2021-3749 (ReDoS)
const jwt        = require('jsonwebtoken'); // 8.5.1 — CVE-2022-23529
const _          = require('lodash'); // 4.17.15 — CVE-2021-23337
const { v4: uuidv4 } = require('uuid');
const moment     = require('moment');
const bodyParser = require('body-parser');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5002;

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:8080';
const JWT_SECRET          = process.env.JWT_SECRET || 'shopeasy-insecure-secret';

app.use(bodyParser.json());

// In-memory orders store for demo
const ORDERS = {};

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service', version: '1.0.0' });
});

// ── JWT auth middleware (jsonwebtoken 8.5.1 — CVE-2022-23529) ─────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    // CVE-2022-23529: jwt.verify with a non-string secret can be bypassed
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── List orders ───────────────────────────────────────────────────────────────
app.get('/orders', authMiddleware, (req, res) => {
  const userOrders = Object.values(ORDERS).filter(o => o.userId === req.user.id);
  res.json(userOrders);
});

// ── Get order ─────────────────────────────────────────────────────────────────
app.get('/orders/:id', authMiddleware, (req, res) => {
  const order = ORDERS[req.params.id];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ── Create order ──────────────────────────────────────────────────────────────
app.post('/orders', authMiddleware, async (req, res) => {
  const { productIds, quantities } = req.body;
  if (!productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ error: 'productIds array required' });
  }

  try {
    // Fetch product details from product-service (axios 0.21.1 — CVE-2021-3749)
    const productFetches = productIds.map(pid =>
      axios.get(`${PRODUCT_SERVICE_URL}/products/${pid}`)
        .then(r => r.data)
        .catch(() => null)
    );
    const products = await Promise.all(productFetches);
    const validProducts = products.filter(Boolean);

    // Use lodash to build line items — CVE-2021-23337 prototype pollution
    const lineItems = _.map(validProducts, (p, idx) => ({
      productId: p.id,
      name:      p.name,
      price:     p.price,
      quantity:  (quantities && quantities[idx]) || 1,
      subtotal:  p.price * ((quantities && quantities[idx]) || 1),
    }));

    const total = _.sumBy(lineItems, 'subtotal');
    const orderId = uuidv4();

    ORDERS[orderId] = {
      id:         orderId,
      userId:     req.user.id,
      items:      lineItems,
      total:      total,
      status:     'pending',
      createdAt:  moment().toISOString(),
    };

    res.status(201).json(ORDERS[orderId]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', detail: err.message });
  }
});

// ── Update order status ───────────────────────────────────────────────────────
app.patch('/orders/:id/status', authMiddleware, (req, res) => {
  const order = ORDERS[req.params.id];
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', valid: VALID_STATUSES });
  }

  order.status    = status;
  order.updatedAt = moment().toISOString();
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`[order-service] Listening on port ${PORT}`);
});

module.exports = app;
