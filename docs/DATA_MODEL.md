# CRM Data Model

Relational schema implemented in PostgreSQL via Prisma (`apps/api/prisma/schema.prisma`).

## Entity Relationship Diagram

```mermaid
erDiagram
    ACCOUNT ||--o{ CONTACT : has
    ACCOUNT ||--o{ DEAL : owns
    ACCOUNT ||--o{ QUOTE : receives
    ACCOUNT ||--o{ ORDER : places
    ACCOUNT ||--o{ INVOICE : billed
    ACCOUNT ||--o{ SERVICE_CASE : raises
    ACCOUNT }o--|| TERRITORY : assigned
    ACCOUNT }o--o| PRICE_BOOK : uses

    CONTACT ||--o{ ACTIVITY : engages
    LEAD ||--o| ACCOUNT : converts_to
    LEAD ||--o| CONTACT : converts_to
    LEAD ||--o| DEAL : converts_to

    DEAL ||--o{ QUOTE : generates
    DEAL }o--|| PIPELINE_STAGE : in_stage
    QUOTE ||--o| ORDER : creates
    ORDER ||--o{ INVOICE : generates
    ORDER ||--o{ FULFILLMENT_TASK : orchestrates

    PRODUCT ||--o{ QUOTE_LINE_ITEM : references
    PRODUCT ||--o{ PRICE_BOOK_ENTRY : priced_in
    PRICE_BOOK ||--o{ PRICE_BOOK_ENTRY : contains

    CONTRACT ||--o| ACCOUNT : signs
    BILLING_SCHEDULE ||--o| INVOICE : schedules

    MARKETING_CAMPAIGN ||--o{ CAMPAIGN_MEMBER : includes
    MARKETING_CAMPAIGN ||--o{ LEAD : generates

    SERVICE_CASE ||--o{ KNOWLEDGE_ARTICLE : resolved_by
    INSTALLED_ASSET ||--o| ACCOUNT : installed_at

    USER ||--o{ ACTIVITY : schedules
    USER ||--o{ AUDIT_LOG : performs
    WEBHOOK_SUBSCRIPTION ||--o{ WEBHOOK_DELIVERY : delivers

    ACCOUNT {
        uuid id PK
        string name
        enum account_type
        uuid territory_id FK
        uuid price_book_id FK
    }

    CONTACT {
        uuid id PK
        uuid account_id FK
        string email
        enum contact_role
    }

    LEAD {
        uuid id PK
        enum status
        enum source
        decimal score
    }

    DEAL {
        uuid id PK
        uuid account_id FK
        uuid stage_id FK
        decimal amount
    }

    QUOTE {
        uuid id PK
        uuid account_id FK
        uuid price_book_id FK
        enum status
    }

    ORDER {
        uuid id PK
        string order_number
        enum status
    }

    INVOICE {
        uuid id PK
        enum status
        decimal total
    }

    SERVICE_CASE {
        uuid id PK
        string subject
        enum priority
        enum status
    }

    PRODUCT {
        uuid id PK
        string sku
        decimal list_price
    }

    PRICE_BOOK {
        uuid id PK
        string name
        char currency
    }

    ACTIVITY {
        uuid id PK
        enum type
        enum status
        datetime due_at
    }

    WEBHOOK_SUBSCRIPTION {
        uuid id PK
        string url
        json events
    }

    AUDIT_LOG {
        uuid id PK
        string entity_type
        uuid entity_id
        string action
        json changes
    }
```

## Entity Count

| Domain | Models |
|--------|--------|
| Sales core | Account, Contact, Lead, Deal, Pipeline, PipelineStage |
| Commercial | Product, PriceBook, PriceBookEntry, Quote, Order, Invoice, Contract |
| Service | ServiceCase, KnowledgeArticle, InstalledAsset, RmaRequest, FieldWorkOrder |
| Marketing | MarketingCampaign, CampaignMember, CadenceTemplate, CustomerJourney |
| Platform | User, Territory, AuditLog, WebhookSubscription, CustomModule, GdprRequest |
| AI / Agents | CopilotSession, Agent, AgentRun, AiAuditLog, GamificationScore |

**Total:** 70+ Prisma models.

## Key Relationships

- **Quote-to-cash:** Deal → Quote → Order → Invoice → BillingSchedule  
- **Lead conversion:** Lead → Account + Contact + Deal (wizard API)  
- **Partner channel:** PortalAccess, DealRegistration, EnablementPath, MdfRequest  
- **Electronics:** InstalledAsset (serial/IMEI), ExportScreening, EOL via Product flags  
- **Customer 360:** Data graph aggregates Account + ERP events + cases + orders

## Indexes & Performance

- Unique: `order_number`, `erp_external_id`, `sku`, user `email`  
- Search: Elasticsearch index (optional) with PostgreSQL `ILIKE` fallback  
- Field history: `FieldHistory` for audit trail per record field