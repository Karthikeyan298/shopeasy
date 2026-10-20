# ShopEasy — IBM Concert Platform Demo

A realistic e-commerce microservices application purpose-built to demonstrate **IBM Concert** capabilities:

- 🔍 **CVE detection & fix** workflows
- 💥 **Blast radius** analysis across services
- 📦 **SBOM** generation & inventory tracking
- ☸️ **Kubernetes** deployment topology mapping

---

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  api-gateway  (Node.js/Express 4.17.1)  :3000           │
│  CVEs: lodash 4.17.15, qs 6.5.2, axios 0.21.1          │
└────────────────────────────┬────────────────────────────┘
            ┌────────────────┼─────────────────┐
            ▼                ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  user-service    │ │ product-service  │ │  order-service   │
│  Python/Flask    │ │ Java/Spring Boot │ │  Node.js         │
│  :5001           │ │ :8080            │ │  :5002           │
│  CVEs: Pillow,   │ │ CVEs: Log4Shell, │ │  CVEs: axios,    │
│  PyYAML          │ │ Spring4Shell,    │ │  jsonwebtoken,   │
│                  │ │ Text4Shell       │ │  lodash          │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

All services run in the `shopeasy` Kubernetes namespace.

---

## CVE Inventory

| CVE | Severity | CVSS | Affects | Description |
|-----|----------|------|---------|-------------|
| CVE-2021-44228 | 🔴 Critical | 10.0 | product-service | **Log4Shell** — JNDI injection RCE |
| CVE-2021-45046 | 🔴 Critical | 9.0 | product-service | Log4j incomplete fix (thread context) |
| CVE-2022-22965 | 🔴 Critical | 9.8 | product-service | **Spring4Shell** — data binding RCE |
| CVE-2022-42889 | 🔴 Critical | 9.8 | product-service | **Text4Shell** — StringSubstitutor RCE |
| CVE-2022-22817 | 🔴 Critical | 9.8 | user-service | Pillow ImageMath.eval RCE |
| CVE-2020-14343 | 🔴 Critical | 9.8 | user-service | PyYAML yaml.load() RCE |
| CVE-2022-23529 | 🟠 High | 8.8 | api-gateway, order-service | jsonwebtoken secret injection |
| CVE-2022-24999 | 🟠 High | 7.5 | api-gateway | qs prototype poisoning / ReDoS |
| CVE-2021-3749  | 🟠 High | 7.5 | api-gateway, order-service | axios ReDoS |
| CVE-2021-23337 | 🟠 High | 7.2 | api-gateway, order-service | lodash prototype pollution |

---

## Concert Demo Scenarios

### Scenario 1 — CVE Fix (Log4Shell)

**Goal**: Show end-to-end CVE remediation in Concert.

1. **Ingest SBOM** for `product-service`:
   ```bash
   # Upload product-service/sbom.json to Concert
   ```
2. Concert flags **CVE-2021-44228** (CVSS 10.0) on `log4j-core:2.14.1`
3. Concert recommends fix: upgrade to `log4j-core:2.17.1`
4. In `product-service/pom.xml`, change the log4j version:
   ```xml
   <!-- Before -->
   <version>2.14.1</version>
   <!-- After -->
   <version>2.17.1</version>
   ```
5. Rebuild and re-upload SBOM → Concert shows CVE resolved ✅

---

### Scenario 2 — Blast Radius Analysis

**Goal**: Show how one CVE propagates across multiple services.

**Shared vulnerable dependency**: `lodash@4.17.15` (CVE-2021-23337)

- Used in **`api-gateway`** (`src/index.js` — `_.merge()`)
- Used in **`order-service`** (`src/index.js` — `_.map()`, `_.sumBy()`)

**Concert blast radius view will show**:
```
CVE-2021-23337 (lodash 4.17.15)
  ├── api-gateway   [Deployment: shopeasy/api-gateway,  replicas: 2]
  └── order-service [Deployment: shopeasy/order-service, replicas: 2]
```

**Fix**: Update `lodash` to `4.17.21` in both `package.json` files.

---

### Scenario 3 — SBOM Inventory

**Goal**: Demonstrate full software bill of materials ingestion.

Each service ships a `sbom.json` in CycloneDX 1.4 format:

| Service | SBOM Location | Format |
|---------|--------------|--------|
| api-gateway | `api-gateway/sbom.json` | CycloneDX 1.4 |
| user-service | `user-service/sbom.json` | CycloneDX 1.4 |
| product-service | `product-service/sbom.json` | CycloneDX 1.4 |
| order-service | `order-service/sbom.json` | CycloneDX 1.4 |

Ingest all four into Concert to get a unified inventory of:
- 20+ open source components
- 10 CVEs across 3 severity levels
- Cross-service dependency relationships

---

### Scenario 4 — Kubernetes Topology

**Goal**: Show Concert mapping K8s service-to-service dependencies.

```bash
# Deploy the full stack
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/api-gateway/
kubectl apply -f k8s/user-service/
kubectl apply -f k8s/product-service/
kubectl apply -f k8s/order-service/
```

Concert discovers:
- `api-gateway` → calls `user-service`, `product-service`, `order-service`
- `order-service` → calls `product-service`
- All 4 services in namespace `shopeasy`
- 2 replicas per service (8 pods total)

---

## Quick Start

### Option A — Docker Compose (local dev)

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:3000 |
| User Service | http://localhost:5001 |
| Product Service | http://localhost:8080 |
| Order Service | http://localhost:5002 |

### Option B — Kubernetes

```bash
# Prerequisites: kubectl configured, docker images built & pushed

# Build images
docker build -t shopeasy/api-gateway:1.0.0     ./api-gateway
docker build -t shopeasy/user-service:1.0.0    ./user-service
docker build -t shopeasy/product-service:1.0.0 ./product-service
docker build -t shopeasy/order-service:1.0.0   ./order-service

# Deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/api-gateway/
kubectl apply -f k8s/user-service/
kubectl apply -f k8s/product-service/
kubectl apply -f k8s/order-service/

# Verify
kubectl get pods -n shopeasy
```

---

## Sample API Calls

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:5001/health
curl http://localhost:8080/actuator/health
curl http://localhost:5002/health

# List products
curl http://localhost:3000/api/products

# Search products (triggers Log4Shell-vulnerable logger)
curl "http://localhost:3000/api/products?search=laptop"

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

# Text4Shell demo endpoint (product-service)
curl "http://localhost:8080/products/render-template?template=\${sys:os.name}"
```

---

## Project Structure

```
shopeasy/
├── README.md
├── docker-compose.yml
│
├── api-gateway/               # Node.js/Express — public entry point
│   ├── Dockerfile
│   ├── package.json           # lodash 4.17.15, qs 6.5.2, axios 0.21.1
│   ├── sbom.json              # CycloneDX SBOM
│   └── src/
│       └── index.js
│
├── user-service/              # Python/Flask — user management
│   ├── Dockerfile
│   ├── requirements.txt       # Pillow 9.0.0, PyYAML 5.3.1
│   ├── sbom.json
│   └── src/
│       └── app.py
│
├── product-service/           # Java/Spring Boot — product catalog
│   ├── Dockerfile
│   ├── pom.xml                # log4j 2.14.1, Spring Boot 2.5.0, commons-text 1.9
│   ├── sbom.json
│   └── src/main/java/com/shopeasy/product/
│       ├── ProductServiceApplication.java
│       ├── controller/ProductController.java
│       ├── model/Product.java
│       └── repository/ProductRepository.java
│
├── order-service/             # Node.js — order management
│   ├── Dockerfile
│   ├── package.json           # axios 0.21.1, jsonwebtoken 8.5.1, lodash 4.17.15
│   ├── sbom.json
│   └── src/
│       └── index.js
│
└── k8s/                       # Kubernetes manifests
    ├── namespace.yaml
    ├── api-gateway/deployment.yaml
    ├── user-service/deployment.yaml
    ├── product-service/deployment.yaml
    └── order-service/deployment.yaml
```

---

> ⚠️ **Demo Use Only** — This application contains intentionally vulnerable dependencies to demonstrate IBM Concert's CVE detection capabilities. Do not deploy to production.
