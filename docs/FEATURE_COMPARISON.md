# Feature Comparison — Vendors vs Built CRM

Maps the executive summary vendor table to this project's implementation status.

| Feature / Module | Zoho | Oracle CX | Dynamics 365 | Odoo | **This CRM** | Phase |
|------------------|------|-----------|--------------|------|--------------|-------|
| Contacts & Accounts | ✔ | ✔ | ✔ | ✔ | ✅ `/accounts`, `/contacts` | 1 |
| Leads & Opportunities | ✔ | ✔ | ✔ | ✔ | ✅ `/leads`, `/deals` | 1 |
| Activities / Tasks | ✔ | ✔ | ✔ | ✔ | ✅ `/activities`, `/workqueue` | 1 |
| Calendar | ✔ | ✔ | ✔ | ✔ | ⚠️ `/calendar` (activities view) | 1 |
| Email Integration | ✔ | ✔ | ✔ | ✔ | ✅ `/emails`, IMAP/Graph | 1 |
| Notes | ✔ | ✔ | ✔ | ✔ | ⚠️ Chatter + field history | 1 |
| Documents | ✔ | ✔ | ✔ | ✔ | ✅ `/documents`, S3/MinIO | 1 |
| Products & Price Books | ✔ | ✔ | ✔ | ✔ | ⚠️ `/products`, `/price-books` | 2 |
| Quotes / Orders / Invoices | ✔ ($) | ✔ (CPQ) | ✔ ($) | ✔ | ✅ Full chain + CPQ rules | 2 |
| Billing / Subscriptions | ✔ | ✔ | ✔ | ✔ | ⚠️ Billing schedules; no subs | 2 |
| Contracts / CLM | ✔ | ✔ | ✔ | ✔ | ✅ `/contracts`, clauses | 2 |
| Cases / Support | ↔ Desk | ✔ Fusion | ✔ Service | ✔ Helpdesk | ✅ `/cases` | 3 |
| Knowledge Base | ✔ | ✔ | ✔ | ✔ | ✅ `/knowledge` | 3 |
| Marketing Campaigns | ✔ | ✔ | ✖ add-on | ✔ | ✅ `/marketing`, journeys | 3 |
| Web Forms | ✔ | ✔ | ✔ | ✔ | ✅ `/register`, `/support` | 3 |
| Landing Pages | ✔ | ✔ | ✔ | ✔ | ❌ Static only | 3 |
| Dashboards / Reports | ✔ | ✔ | ✔ + Power BI | ✔ | ✅ `/dashboard`, `/revops` | 1–3 |
| Forecasting | ✔ | ✔ | ✔ | ✔ | ✅ `/forecasting` | 2 |
| Territory Management | ✔ | ✔ | ✔ | ✔ | ⚠️ `/territories` | 2 |
| Workflows / Blueprints | ✔ | ✔ | ✔ + Power Automate | ✔ | ✅ blueprints, flow-builder | 2 |
| Approvals | ✔ | ✔ | ✔ | ✔ | ✅ `/approvals` | 2 |
| Custom Objects | ✔ | ✔ PaaS | ✔ Power Apps | ✔ Studio | ✅ custom modules | 5 |
| Multi-currency | ✔ | ✔ | ✔ | ✔ | ✅ `/currencies` | 2 |
| Multi-language | ✔ | ✔ | ✔ | ✔ | ❌ English only | 6 |
| AI Lead Scoring | ✔ Zia | ✔ | ✔ Insights | ✔ predictive | ✅ deal + churn AI | 4 |
| Copilot / Agents | ✔ | ✔ Assistant | ✔ Copilot | ✔ | ✅ `/copilot`, `/agents` | 4–5 |
| Sentiment Analysis | ✔ | ✔ | ✔ | — | ❌ Planned | 4 |
| Chatbot / Voice | ✔ Voice | ✔ | ✔ CTI | ✔ Live Chat | ⚠️ Copilot; CTI stub | 4 |
| CTI / Telephony | ✔ | ✔ | ✔ | — | ⚠️ CTI module stub | 4 |
| Omnichannel | ✔ | ✔ | ✔ | ✔ | ⚠️ Email + cases + routing | 4 |
| Mobile / Offline | ✔ offline | ✔ | ✔ | ✔ responsive | ⚠️ Responsive web | 4 |
| Low-code / LCNC | ✔ Canvas | ✔ | ✔ Power Platform | ✔ | ✅ flow-builder, custom modules | 5 |
| SSO / OAuth | ✔ | ✔ | ✔ Azure AD | ✔ | ⚠️ SSO stub + JWT | 5 |
| MFA | ✔ | ✔ | ✔ | ✔ | ❌ Planned | 5 |
| GDPR / Privacy | ✔ | ✔ | ✔ | ✔ | ✅ `/admin/gdpr` | 6 |
| Audit Logs | ✔ | ✔ | ✔ | ✔ | ✅ `/admin/audit-logs` | 6 |
| Webhooks / Events | ✔ | ✔ | ✔ | ✔ | ✅ `/admin/webhooks` | 5 |
| Data Import | ✔ CSV | ✔ | ✔ | ✔ | ✅ `/admin/import` CSV | 1 |
| ERP Integration | ✔ | ✔ Oracle ERP | ✔ BC/Finance | ✔ native | ✅ integration events | 2 |
| Payment Gateways | ✔ | ✔ | ✔ | ✔ | ❌ Planned | 2 |
| E-signature | ✔ Sign | ✔ | ✔ | ✔ | ❌ Planned | 3 |
| Elasticsearch Search | — | ✔ | ✔ | — | ✅ `/search` | Infra |
| Partner PRM / Portals | ✔ | ✔ | ✔ | ✔ | ✅ portals, PRM, MDF | 3 |
| Field Service | — | ✔ | ✔ | ✔ | ✅ `/field-service` | 4 |
| Electronics (serial/EOL) | — | — | — | — | ✅ assets, EOL, export | Industry |

**Legend:** ✔ native · ↔ separate product · ✖ add-on · ✅ built · ⚠️ partial · ❌ not yet

## Differentiators vs Generic CRMs

This build targets **B2B electronics distribution**:

- Live ERP inventory sync and ATP on quotes  
- Serial / IMEI traceability, RMA, EOL manager, export compliance (ECCN)  
- Order orchestration with fallout queue  
- Partner enablement, deal registration, mutual action plans  
- Revenue attribution and pricing analytics for thin-margin distribution