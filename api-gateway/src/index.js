const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const _ = require('lodash');
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs (resolved via K8s DNS in cluster, env vars locally)
const SERVICES = {
  users:    process.env.USER_SERVICE_URL    || 'http://user-service:5001',
  products: process.env.PRODUCT_SERVICE_URL || 'http://product-service:8080',
  orders:   process.env.ORDER_SERVICE_URL   || 'http://order-service:5002',
};

app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    version: '1.0.0',
    upstream: SERVICES,
  });
});

// ── Request enrichment (uses lodash — CVE-2021-23337 present) ─────────────────
function enrichRequest(req) {
  // Merge default headers with request headers (lodash merge — prototype pollution risk)
  return _.merge({}, { requestId: Date.now(), gateway: 'shopeasy' }, req.headers);
}

// ── Query string parsing (qs 6.5.2 — CVE-2022-24999) ─────────────────────────
app.use((req, _res, next) => {
  if (req.query && Object.keys(req.query).length) {
    req.parsedQuery = qs.parse(req.query);
  }
  req.enriched = enrichRequest(req);
  next();
});

// ── Proxy routes ───────────────────────────────────────────────────────────────
app.use('/api/users', createProxyMiddleware({
  target: SERVICES.users,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
  logLevel: 'warn',
}));

app.use('/api/products', createProxyMiddleware({
  target: SERVICES.products,
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
  logLevel: 'warn',
}));

app.use('/api/orders', createProxyMiddleware({
  target: SERVICES.orders,
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' },
  logLevel: 'warn',
}));

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] Listening on port ${PORT}`);
  console.log(`[api-gateway] Upstream services: ${JSON.stringify(SERVICES, null, 2)}`);
});

module.exports = app;
