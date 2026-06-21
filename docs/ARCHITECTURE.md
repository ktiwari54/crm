# Architecture

## Overview

Monorepo CRM for B2B electronics distribution. Modular monolith (NestJS) with optional service extraction path.

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Next.js 15 │────▶│  NestJS API │────▶│  PostgreSQL 16   │
│  (port 3000)│ JWT │  (port 4000)│     │  Prisma ORM      │
└─────────────┘     └──────┬──────┘     └──────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌────────────┐    ┌──────────────┐
   │ MinIO/S3 │    │Elasticsearch│   │ Redis (cache)│
   │ documents│    │   search    │   │  sessions    │
   └──────────┘    └────────────┘    └──────────────┘
```

## Deployment Modes

| Mode | Use Case | Components |
|------|----------|------------|
| **Local dev** | Single developer | API + Web + local/cloud PostgreSQL |
| **Docker compose** | Self-hosted small team | postgres, minio, elasticsearch, redis |
| **SaaS (future)** | Multi-tenant | K8s, load balancer, RDS, ElastiCache |

## API Layer

- **REST:** `/api/v1/*` — 50+ resource controllers  
- **Public:** `/api/v1/public/*` — web-to-lead, web-to-case (no JWT)  
- **Portal:** Token auth separate from JWT (`/api/v1/portal/me`)  
- **Auth:** JWT + Azure AD SSO stub (`/auth/sso/*`)

GraphQL and SDK are roadmap items (see [GAP_ANALYSIS.md](./GAP_ANALYSIS.md)).

## Module Structure

```
apps/api/src/
├── auth/           # JWT, SSO, portal token guards
├── prisma/         # Database service
├── storage/        # S3/MinIO with local fallback
└── modules/        # Domain modules (accounts, deals, ...)
```

Each module: `*.module.ts`, `*.controller.ts`, `*.service.ts`.

## Frontend

- Next.js App Router, client components for data fetching  
- `useFetch` hook + `apiFetch` with JWT from `AuthContext`  
- Responsive Tailwind 4; no native mobile app (responsive web)

## Event & Integration Flow

1. **Inbound ERP:** `POST /integration/events` → inventory, products, accounts  
2. **Outbound webhooks:** `WebhookSubscription` → HTTP POST on CRM events  
3. **Email sync:** IMAP or Microsoft Graph when env configured  
4. **AI:** `LLM_API_KEY` → OpenAI-compatible API; rule-based fallback

## Caching Strategy

- Redis available in Docker (session/query cache — wiring optional)  
- Elasticsearch for global search; PostgreSQL fallback  
- CDN for static assets in production (CloudFront equivalent)

## CI/CD

GitHub Actions: lint, build API + web, Playwright E2E (see `.github/workflows/ci.yml`).

## Scaling Path

| Users | Architecture |
|-------|--------------|
| 1–10 | Single VM, one API instance |
| 10–100 | Load-balanced API replicas, read replica DB |
| 100+ | K8s, Redis cluster, ES cluster, event bus (Kafka) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | NestJS 11, TypeScript |
| ORM | Prisma 7, PostgreSQL 16 |
| Web | Next.js 15, React 19, Tailwind 4 |
| Storage | MinIO / AWS S3 |
| Search | Elasticsearch 8 (optional) |
| Auth | JWT, bcrypt, OIDC stub |
| Tests | Jest (API), Playwright (E2E) |