# Phase 3–5 — Ecosystem, Service & AI

**Status:** Batch 10 complete — 2026-06-20

## Batch 6 — Phase 3 Start

### Modules
| Module | Endpoints |
|--------|-----------|
| Vendors | `GET/POST /vendors`, `POST /vendors/:id/products` |
| Marketing | `GET/POST /marketing/campaigns`, `POST /marketing/campaigns/:id/enroll` |
| Knowledge | `GET/POST /knowledge`, `POST /knowledge/:id/view`, `POST /knowledge/:id/publish` |

### UI
- Vendors — supplier lead times and SKU sourcing
- Marketing — account-based campaigns
- Knowledge — searchable articles with product links

## Batch 7 — PRM & Account Strategy

### Modules
| Module | Endpoints |
|--------|-----------|
| Deal Registration | `GET/POST /deal-registrations`, `POST /deal-registrations/:id/review` |
| Portals | `GET /portals`, `POST /portals/grant`, `GET /portals/summary/:accountId` |
| Account Plans | `GET/POST /account-plans`, `POST /account-plans/:id/goals` |

### UI
- Deal Registration — partner deal protection workflow
- Portals — grant access + portal data preview stub
- Account Plans — SWOT + goals per account

## Batch 8 — Phase 4 Service

### Modules
| Module | Endpoints |
|--------|-----------|
| Cases | `GET/POST /cases`, `PATCH /cases/:id/status`, `GET /cases/suggest-articles` |
| Assets | `GET/POST /assets`, `GET /assets/expiring-warranties` |
| RMA | `GET/POST /rma`, `PATCH /rma/:id/status` |

### UI
- Cases — support ticketing with SLA
- Installed Base — serial/warranty tracking
- RMA — returns and warranty claims

## Batch 9 — Phase 5 AI

### Modules
| Module | Endpoints |
|--------|-----------|
| Copilot | `GET /copilot/insights`, `GET /copilot/next-best-actions`, `GET /copilot/reorder-predictions`, `POST /copilot/chat`, `POST /copilot/summarize/:accountId` |

### Features
- Rule-based conversational assistant (ERP/CRM context)
- Reorder prediction from order history
- Next-best-action queue (at-risk accounts, stalled deals, overdue tasks)
- Account summarization

### UI
- Copilot — chat + insights sidebar

## Batch 10 — Enterprise Ops

### Modules
| Module | Endpoints |
|--------|-----------|
| MDF | `GET/POST /mdf`, `POST /mdf/:id/review` |
| Incidents | `GET/POST /incidents`, `PATCH /incidents/:id/status`, `POST /incidents/:id/accounts` |
| Journeys | `GET/POST /journeys`, `GET /journeys/enrollments`, `POST /journeys/:id/enroll`, `POST /journeys/enrollments/:id/advance` |
| RevOps | `GET /revops/dashboard` |
| Email Hub | `GET /emails`, `GET/POST /emails/templates`, `POST /emails/send`, `POST /emails/log` |

### UI
- MDF — partner fund requests with approve/reject
- Incidents — major outage tracking with affected accounts
- Journeys — template builder view + active enrollments
- RevOps — pipeline, revenue, and operations KPI dashboard
- Email Hub — templates, send & log stub

## Quick Test Flow
1. **Vendors** → Cisco + Samsung with SKU lead times
2. **Knowledge** → expand PoE troubleshooting article
3. **Deal Registration** → approve BrightWave registration
4. **Account Plans** → TechMart FY2026 SWOT
5. **Cases** → PoE power fault case linked to KB article
6. **Assets** → warranty expiring alert for DataPro SSD
7. **Copilot** → ask "show reorder predictions" or "what should I do today"
8. **RevOps** → pipeline value, commit forecast, ops queue
9. **MDF** → approve BrightWave trade show request
10. **Journeys** → advance BrightWave onboarding enrollment
11. **Incidents** → view Cisco firmware outage affecting 2 accounts
12. **Email Hub** → send quote follow-up template