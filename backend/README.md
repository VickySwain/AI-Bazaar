# CoverAI Backend API

> Production-grade NestJS backend for the CoverAI insurance aggregation platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 (Node.js) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 via TypeORM |
| Cache | Redis 7 via cache-manager |
| Message Broker | Apache Kafka (KafkaJS) |
| Authentication | JWT (RS256) + Google OAuth2 |
| Payments | Razorpay |
| Email | Nodemailer (SendGrid SMTP) |
| API Docs | Swagger / OpenAPI 3 |
| Containerisation | Docker + Docker Compose |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 2. Clone and install

```bash
git clone https://github.com/your-org/coverai-backend.git
cd coverai-backend
npm install
```

### 3. Environment

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and RAZORPAY keys
```

### 4. Start infrastructure

```bash
# Start Postgres, Redis, Kafka (and Kafka UI on port 8080)
docker-compose up -d postgres redis kafka zookeeper kafka-ui
```

### 5. Run the API

```bash
# Development (with hot reload)
npm run start:dev

# Production build
npm run build && npm run start:prod
```

### 6. API Docs

Open [http://localhost:3001/docs](http://localhost:3001/docs) for full Swagger UI.

---

## Project Structure

```
src/
├── auth/                   # JWT auth, OAuth2, strategies, guards
├── users/                  # User profiles, KYC, dashboard
├── policies/               # Policy catalog, comparison, quotes
│   └── adapters/           # Pluggable insurer adapter pattern
├── payments/               # Razorpay integration, webhooks
├── recommendations/        # ML scoring + rule-based fallback
├── notifications/          # Email templates, Kafka consumers
├── analytics/              # Admin metrics, funnel analysis
├── common/
│   ├── filters/            # Global exception filter
│   ├── interceptors/       # Logging, transform interceptors
│   ├── kafka/              # KafkaJS producer service
│   └── health/             # Terminus health checks
├── config/                 # All config via @nestjs/config
├── database/               # TypeORM data source, seed service
├── app.module.ts           # Root module
└── main.ts                 # Bootstrap
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login → access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh token | Rotate tokens |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| POST | `/api/v1/auth/forgot-password` | Public | Send reset email |
| POST | `/api/v1/auth/reset-password` | Public | Apply reset token |
| POST | `/api/v1/auth/change-password` | Bearer | Change password |
| POST | `/api/v1/auth/verify-email` | Public | Verify email token |
| GET | `/api/v1/auth/me` | Bearer | Current user |
| GET | `/api/v1/auth/google` | Public | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | OAuth | OAuth callback |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/users/dashboard` | Bearer | Dashboard data + stats |
| GET | `/api/v1/users/profile` | Bearer | Full profile |
| PUT | `/api/v1/users/profile` | Bearer | Update profile |
| GET | `/api/v1/users/policies` | Bearer | My purchased policies |
| GET | `/api/v1/users/quotes` | Bearer | My quotes |
| POST | `/api/v1/users/kyc` | Bearer | Submit KYC |
| DELETE | `/api/v1/users/account` | Bearer | Deactivate account |
| GET | `/api/v1/users` | Admin | List all users |
| PATCH | `/api/v1/users/:id/role` | Admin | Update role |

### Policies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/policies` | Public | Filter & paginate policies |
| GET | `/api/v1/policies/categories` | Public | All categories |
| GET | `/api/v1/policies/insurers` | Public | All active insurers |
| GET | `/api/v1/policies/:id` | Public | Policy detail |
| POST | `/api/v1/policies/compare` | Public | Compare 2–4 policies |
| POST | `/api/v1/policies/quote` | Bearer | Generate premium quote |
| POST | `/api/v1/policies` | Admin | Create policy |
| PUT | `/api/v1/policies/:id` | Admin | Update policy |
| DELETE | `/api/v1/policies/:id` | Admin | Deactivate policy |
| POST | `/api/v1/policies/admin/sync` | Admin | Sync from adapters |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/order` | Bearer | Create Razorpay order |
| POST | `/api/v1/payments/verify` | Bearer | Verify signature + activate |
| POST | `/api/v1/payments/webhook` | Public (sig-verified) | Razorpay webhook |
| GET | `/api/v1/payments/history` | Bearer | Payment history |
| GET | `/api/v1/payments/:id/status` | Bearer | Payment status |
| POST | `/api/v1/payments/refund` | Admin | Initiate refund |

### Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/recommendations` | Bearer | AI policy recommendations |
| GET | `/api/v1/recommendations/insights` | Bearer | Coverage gap insights |
| POST | `/api/v1/recommendations/track` | Bearer | Track interaction |

### Analytics (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/analytics/overview` | Admin | Platform KPIs |
| GET | `/api/v1/analytics/revenue-trend` | Admin | Monthly revenue chart |
| GET | `/api/v1/analytics/category-breakdown` | Admin | Sales by category |
| GET | `/api/v1/analytics/top-policies` | Admin | Best sellers |
| GET | `/api/v1/analytics/user-growth` | Admin | User growth trend |
| GET | `/api/v1/analytics/conversion-funnel` | Admin | Funnel analysis |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | DB + memory + disk check |
| GET | `/health/ping` | Public | Simple ping |

---

## Authentication Flow

```
1. POST /auth/register → { accessToken, refreshToken }
2. Use accessToken in header: Authorization: Bearer <token>
3. Token expires in 15 min → POST /auth/refresh with refreshToken body
4. Logout → POST /auth/logout (invalidates refresh token in DB)
```

## Payment Flow

```
1. Generate quote: POST /policies/quote
2. Create order:   POST /payments/order { quoteId }
3. Open Razorpay checkout with returned orderId + keyId
4. User pays → POST /payments/verify { razorpayOrderId, razorpayPaymentId, razorpaySignature }
5. Policy activates → email + SMS notification via Kafka
```

## Adding a New Insurer Adapter

```typescript
// 1. Create src/policies/adapters/newinsurer.adapter.ts
@Injectable()
export class NewInsurerAdapter extends InsurerAdapter {
  getName() { return 'New Insurer'; }
  async fetchPolicies(category?) { /* call their API */ }
  async fetchQuote(externalId, request) { /* normalize quote */ }
  async initiatePolicy(quoteId, userDetails) { /* create policy */ }
}

// 2. Register in AdapterRegistryService constructor
this.register('NewInsurerAdapter', newInsurerAdapter);

// 3. Add insurer row in DB with adapterClass: 'NewInsurerAdapter'
```

---

## Default Admin Credentials (dev only)

```
Email:    admin@coverai.in
Password: Admin@123456
```

> Change immediately in any non-local environment.

---

## Environment Variables

See `.env.example` for all variables. Critical ones:

```bash
JWT_SECRET=           # Min 32 chars, random
JWT_REFRESH_SECRET=   # Min 32 chars, different from above
RAZORPAY_KEY_ID=      # From Razorpay dashboard
RAZORPAY_KEY_SECRET=  # From Razorpay dashboard
RAZORPAY_WEBHOOK_SECRET= # From Razorpay webhook settings
DB_PASSWORD=          # Postgres password
```
