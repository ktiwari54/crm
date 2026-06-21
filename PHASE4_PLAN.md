# Phase 6 Roadmap — Batches 11–16

**Status:** ✅ **PHASE 6 COMPLETE** — All batches 11–16 shipped (2026-06-20)  
**Prerequisite:** Batches 1–10 complete (Phase 1–2 done; Phase 3–5 foundations in place)

---

## Where We Are

| Phase | Planned Scope | Delivered (Batches) | Gap |
|-------|---------------|---------------------|-----|
| **Phase 1 MVP** | Core sales + inventory | Batches 1–5 (implicit) | Email Hub still stub; no IMAP |
| **Phase 2 Distribution** | Orders, CPQ, forecasting | Batches 1–5 | Mostly complete |
| **Phase 3 Enterprise** | PRM, portals, journeys, RevOps, platform | Batches 6–7, 10 | CLM, order orchestration, SSO, GDPR, custom modules |
| **Phase 4 Electronics** | Serial, field service, compliance | Batches 8, 10 (incidents) | IMEI/EOL, field service, live chat, export compliance |
| **Phase 5 Intelligence** | Copilot, agents, ML scoring | Batches 9, 15–16 | Real LLM optional via env |

**Current module count:** 37+ API modules, 40+ UI pages  
**Auth:** JWT + Azure AD SSO stub  
**AI:** Rule-based Copilot (no external LLM)

---

## Guiding Principles for Phase 6

1. **Depth over breadth** — upgrade stubs (portals, email, copilot) before adding new modules
2. **Distribution-first** — order orchestration, pricing analytics, EOL/serial traceability beat generic LCNC
3. **Incremental platform** — SSO and GDPR before sandbox/marketplace
4. **Same batch pattern** — schema → API → UI → seed → verify (4–6 modules per batch)

---

## Batch 11 — Order & Revenue Ops ✅ COMPLETE

*Closes Phase 3 commercial gaps*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **Order Orchestration** | Fulfillment plan per order: allocate → pick → ship tasks | `GET/POST /orders/:id/fulfillment`, `PATCH /fulfillment/:taskId` | Order detail → fulfillment timeline |
| **Order Fallout** | Failed/overdue fulfillment alerts | `GET /orders/fallout` | Fallout queue on Orders page |
| **Forecast What-If** | Adjust deal probabilities, see forecast delta | `POST /forecasting/simulate` | Slider UI on Forecasting page |
| **Pricing Analytics** | Margin/revenue by product, account, rep | `GET /analytics/pricing` | `/pricing-analytics` dashboard |
| **CLM Enhancement** | Clause library + contract templates | `GET/POST /contracts/clauses`, `POST /contracts/from-template` | Contracts page tabs |

**Seed:** Demo order with 4 fulfillment tasks (1 failed → fallout alert)

---

## Batch 12 — Partner & Channel Depth ✅ COMPLETE

*Completes PRM + portal experience*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **Partner Enablement** | Training paths, certifications per partner tier | `GET/POST /prm/enablement` | `/partner-enablement` |
| **PRM Analytics** | Partner pipeline, win rate, MDF ROI | `GET /prm/analytics` | Widget on RevOps + PRM page |
| **Mutual Action Plans** | Customer-facing milestones on account plans | `POST /account-plans/:id/map` | MAP tab on Account Plans |
| **Portal Experience** | Real partner/customer portal (read-only quotes, orders, cases) | `GET /portal/me` (token auth) | `/portal` public layout |
| **Web-to-Case / Web-to-Lead** | Public intake forms | `POST /public/cases`, `POST /public/leads` | `/support` + `/register` landing |

**Seed:** BrightWave enablement path (3 modules), 1 mutual action plan with 4 milestones

---

## Batch 13 — Electronics Industry Layer ✅ COMPLETE

*Phase 4 depth for B2B distribution*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **Serial / IMEI Registry** | Lot, IMEI, MAC tracking on assets | Extend `InstalledAsset` + `GET /assets/trace/:serial` | Asset detail trace view |
| **EOL Manager** | EOL products, successor mapping, account impact | `GET /products/eol-impact` | `/eol` dashboard |
| **Export Compliance** | ECCN, country restrictions per SKU | `GET/POST /compliance/screening` | Quote warning banner |
| **Field Service** | Work orders, technician assign, visit schedule | `GET/POST /field-service/work-orders` | `/field-service` calendar |
| **Billing Schedules** | Invoice billing schedules (ERP sync stub) | `GET/POST /billing/schedules` | Invoice detail schedules |

**Seed:** 2 EOL products with successors, 1 export-blocked quote line, 1 field work order

---

## Batch 14 — Platform & Compliance ✅ COMPLETE

*Enterprise readiness*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **SSO / SAML** | OIDC login (Azure AD stub) | `GET /auth/sso/login`, `POST /auth/sso/callback` | Login page SSO button |
| **GDPR Toolkit** | Consent, export, right-to-delete requests | `GET/POST /compliance/gdpr` | `/admin/gdpr` |
| **Custom Modules** | Admin-defined record types (JSON schema) | `GET/POST /custom-modules` | `/admin/custom-modules` |
| **Sales Programs** | Structured initiatives with targets | `GET/POST /sales-programs` | `/sales-programs` |
| **Omni-Channel Routing** | Route cases/leads by skill + load | `POST /routing/assign` | Admin routing rules |

**Seed:** 1 custom module "Rebate Claims", 1 sales program Q3 networking push

---

## Batch 15 — AI Upgrade ✅ COMPLETE

*Phase 5 intelligence (v1)*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **Deal Intelligence** | Engagement + stage history → win score | `GET /ai/deal-score/:dealId` | Score badge on Deals kanban |
| **Churn Prediction** | Order cadence + activity → dormancy score | `GET /ai/churn-risk` | Account health enrichment |
| **NLP Case Routing** | Auto-categorize case subject → queue | `POST /cases/classify` | Auto on case create |
| **Similar Cases** | Resolved case recommendations | `GET /cases/:id/similar` | Sidebar on case detail |
| **Email Draft AI** | Contextual draft from template + deal | `POST /emails/draft` | Email Hub "AI Draft" button |

**Note:** Wire to OpenAI/Anthropic via env `LLM_API_KEY` when available; keep rule-based fallback.

---

## Batch 16 — Agents & Data Platform ✅ COMPLETE

*Phase 5 intelligence (v2)*

| Module | What | API Sketch | UI |
|--------|------|------------|-----|
| **Agentforce** | Autonomous agents: quote prep, approval route, email send | `GET/POST /agents`, `POST /agents/:id/run` | `/agents` control panel |
| **Customer Graph** | Unified account view across CRM + ERP events | `GET /data-graph/account/:id` | Account 360° tab |
| **Revenue Attribution** | Activity → revenue linkage | `GET /analytics/attribution` | RevOps attribution chart |
| **AI Trust Layer** | Mask PII in AI prompts, audit log | `GET /ai/audit` | Admin AI settings |
| **Gamification** | Rep leaderboard, targets (optional) | `GET /gamification/leaderboard` | Dashboard widget |

---

## Recommended Execution Order

```
Batch 11 (revenue ops)     ← highest business value for distributors
    ↓
Batch 13 (electronics)     ← industry differentiator
    ↓
Batch 12 (partner/portal)  ← channel scale
    ↓
Batch 15 (AI v1)           ← upgrade existing Copilot
    ↓
Batch 14 (platform)        ← enterprise sales requirement
    ↓
Batch 16 (agents/graph)    ← long-term moat
```

---

## Technical Debt to Address (Any Batch)

| Item | Priority |
|------|----------|
| `req.user.sub` → `req.user.id` audit across all controllers | ✅ Done |
| S3/cloud storage for documents (replace local `uploads/`) | Medium |
| Elasticsearch for global search (if catalog > 10K SKUs) | Medium |
| Real IMAP/Graph API for Email Hub | Medium |
| E2E test suite (Playwright) for critical flows | High |
| Portal token auth (separate from JWT) | ✅ Done (Batch 12) |

---

## Success Criteria — Phase 6 Complete

1. Rep sees fulfillment status and fallout alerts on every order
2. Partner logs into portal and views quotes, orders, cases without CRM login
3. Quote blocked or warned when ECCN/country restriction applies
4. EOL report shows affected accounts and successor SKUs
5. Copilot uses LLM when configured, rule-based otherwise
6. Admin can export/delete contact data via GDPR flow
7. Deal card shows AI win-score with explainable factors

---

## Post-Phase 6 — Infrastructure ✅ COMPLETE

| Item | Status |
|------|--------|
| E2E test suite (Playwright) — login, quote, portal, GDPR | ✅ `npm run test:e2e` |
| IMAP + Microsoft Graph inbox sync for Email Hub | ✅ `POST /emails/sync` |
| S3/MinIO document storage | ✅ `StorageService` + MinIO in docker-compose |
| Elasticsearch global search | ✅ `ELASTICSEARCH_URL` + PG fallback |
| LLM wiring for Copilot + agents | ✅ `LLM_API_KEY` env |

**Verified (2026-06-20):** API starts with S3 + Elasticsearch graceful fallbacks when Docker services are down; `npm run test:e2e` — 5/5 passing (login, SSO, quotes, portal, GDPR).

---

## Quick Reference — Batches 11–16 (Complete)

| Batch | Status |
|-------|--------|
| 11 Order & Revenue Ops | ✅ |
| 12 Partner & Channel | ✅ |
| 13 Electronics Layer | ✅ |
| 14 Platform & Compliance | ✅ |
| 15 AI Upgrade | ✅ |
| 16 Agents & Data Platform | ✅ |