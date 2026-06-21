# Security & Compliance

## Role-Based Access Control (RBAC)

| Role | Access |
|------|--------|
| `admin` | Full access, GDPR toolkit, custom modules, routing, AI audit |
| `manager` | Team data, approvals, forecasting |
| `rep` | Own accounts, deals, activities, quotes |

Enforced via `JwtAuthGuard` on protected routes. Row-level filtering by `ownerId` on several list endpoints.

## Authentication

- **Local:** Email/password, bcrypt-hashed (`POST /auth/login`)  
- **SSO stub:** Azure AD OIDC flow (`GET /auth/sso/login`, demo code callback)  
- **Portal:** Separate bearer token per partner account  
- **MFA:** Not yet implemented (roadmap)

## Encryption

- **In transit:** TLS/HTTPS required in production  
- **At rest:** PostgreSQL disk encryption (hosting provider); S3 server-side encryption  
- **Secrets:** `JWT_SECRET`, `LLM_API_KEY`, IMAP/Graph credentials in `.env` (never committed)

## Audit Logs

- `AuditLog` table: user, entity, action, JSON diff, IP, timestamp  
- API: `GET /audit-logs`, `POST /audit-logs` (admin)  
- AI-specific: `AiAuditLog` via AI Trust Layer (`/admin/ai`)  
- Field history: per-field change tracking on key entities

## GDPR / CCPA

- Consent, export, and delete request workflow (`/admin/gdpr`)  
- Export payload includes contact, activities, deals  
- Right-to-delete marks records and anonymizes PII

## Compliance (Distribution)

- Export screening: ECCN and country restrictions on quote lines  
- GDPR toolkit for EU contacts

## Network Security (Production)

- VPC / security groups  
- WAF on public endpoints  
- Rate limiting on `/auth/login` and `/public/*` (recommended)  
- CORS restricted to web origin

## Data Residency

- **Self-hosted:** Full control — local PostgreSQL or on-prem Docker  
- **Cloud:** `CLOUD_SETUP.md` for Prisma-hosted or AWS RDS  
- Per-tenant isolation: single-tenant deployment today; multi-tenant schema isolation planned

## Security Checklist

- [x] JWT authentication  
- [x] Password hashing (bcrypt)  
- [x] SSO stub (OIDC)  
- [x] GDPR export/delete  
- [x] Audit log API  
- [x] AI prompt PII masking  
- [ ] MFA for admin users  
- [ ] SAML enterprise IdP  
- [ ] Penetration test schedule  
- [ ] SOC 2 controls documentation