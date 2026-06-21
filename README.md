# CRM — B2B Electronics Distribution

Phase 1 MVP monorepo: NestJS API + Next.js 15 frontend + PostgreSQL + MinIO.

## Prerequisites

- Node.js 20+
- npm 10+
- **Database:** Cloud PostgreSQL (default, no Docker) **or** Docker Desktop (optional)

## Quick Start

### Path A — Cloud database (recommended if Docker won't load)

See **[CLOUD_SETUP.md](./CLOUD_SETUP.md)** for full steps.

```bash
npm install
npm run db:generate
cd apps/api && npx prisma db push && npm run prisma:seed
```

### Path B — Local Docker (optional)

```bash
docker desktop start
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (user: `crm`, password: `crm_dev_password`, db: `crm`)
- **MinIO** on `localhost:9000` (console: `localhost:9001`)

Switch `apps/api/.env` `DATABASE_URL` to the local connection string.

### 2. Install dependencies

From the repo root:

```bash
npm install
```

### 3. Configure environment

`apps/api/.env` is pre-configured:

```
DATABASE_URL=postgresql://crm:crm_dev_password@localhost:5432/crm?schema=public
JWT_SECRET=crm_dev_jwt_secret_change_in_production
PORT=4000
```

### 4. Database setup

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Run development servers

```bash
# Terminal 1 — API (port 4000)
npm run dev:api

# Terminal 2 — Web (port 3000)
npm run dev:web
```

- **Web UI:** http://localhost:3000
- **API:** http://localhost:4000/api/v1

## Default Admin User

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@crm.local`  |
| Password | `Admin123!`        |
| Role     | `admin`            |

Login: `POST /api/v1/auth/login`

## API Endpoints (MVP)

| Resource     | Base Path                    |
|--------------|------------------------------|
| Auth         | `/api/v1/auth`               |
| Accounts     | `/api/v1/accounts`           |
| Contacts     | `/api/v1/contacts`           |
| Leads        | `/api/v1/leads`              |
| Deals        | `/api/v1/deals`              |
| Products     | `/api/v1/products`           |
| Quotes       | `/api/v1/quotes`             |
| Activities   | `/api/v1/activities`         |
| Territories  | `/api/v1/territories`        |
| Workqueue    | `/api/v1/workqueue`          |
| Search       | `/api/v1/search?q=`          |
| Reports      | `/api/v1/reports/{key}`      |
| ERP Events   | `POST /api/v1/integration/events` |

### Report Keys

- `pipeline-by-stage`
- `quotes-summary`
- `rep-activity`
- `account-list`
- `inventory-low-stock`

## ERP Integration

Send webhook events to ingest ERP data:

```bash
curl -X POST http://localhost:4000/api/v1/integration/events \
  -H "Content-Type: application/json" \
  -d '{
    "source": "erp",
    "event_type": "inventory.update",
    "payload": {
      "product_erp_id": "SKU-001",
      "warehouse_code": "MAIN",
      "on_hand": 100,
      "allocated": 10,
      "atp": 90
    }
  }'
```

Supported event types: `product.upsert`, `inventory.update`, `account.upsert`, `sync.heartbeat`

## Project Structure

```
CRM/
├── apps/
│   ├── api/          # NestJS backend (@crm/api)
│   │   ├── prisma/   # Schema, migrations, seed
│   │   └── src/      # Modules, auth, prisma service
│   └── web/          # Next.js 15 frontend (@crm/web)
├── docker-compose.yml
├── package.json      # Workspace root
├── PLAN.md           # Full product spec
└── README.md
```

## Workspace Scripts

| Script          | Description                |
|-----------------|----------------------------|
| `npm run dev:api`    | Start API in watch mode |
| `npm run dev:web`    | Start Next.js dev server |
| `npm run db:generate`| Generate Prisma client |
| `npm run db:migrate` | Run migrations         |
| `npm run db:seed`    | Seed default data      |
| `npm run docker:up`  | Start Docker services  |

## Seeded Data

- Default pipeline with 6 stages (RFQ Received → Closed Lost)
- Admin user (`admin@crm.local`)
- Territory: North America
- Warehouse: Main Distribution Center (MAIN)
- Price Book: Standard Price Book (default)

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Backend    | NestJS 11 + Prisma 7    |
| Frontend   | Next.js 15 + Tailwind 4 |
| Database   | PostgreSQL 16           |
| Storage    | MinIO (S3-compatible)   |
| Auth       | JWT + bcrypt            |