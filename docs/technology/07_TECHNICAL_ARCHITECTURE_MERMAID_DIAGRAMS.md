# Bizentra Technical Architecture — Mermaid Diagrams

**Purpose:** Provide implementation-ready Mermaid diagrams for the selected Bizentra technologies, application boundaries, data flow, repository dependencies, offline synchronization, and deployment process.

These diagrams follow the decisions in:

- [`00_TECHNOLOGY_STACK_INDEX.md`](./00_TECHNOLOGY_STACK_INDEX.md)
- [`01_ARCHITECTURE_RECOMMENDATION.md`](./01_ARCHITECTURE_RECOMMENDATION.md)
- [`06_ARCHITECTURE_TUTORIAL_AND_DEPLOYMENT_GUIDE.md`](./06_ARCHITECTURE_TUTORIAL_AND_DEPLOYMENT_GUIDE.md)

---

## 1. Complete Technology and Deployment Architecture

```mermaid
flowchart TB
    subgraph ACTORS["Users and Store Devices"]
        CASHIER["Cashier / Sales User"]
        MANAGER["Owner / Manager / Inventory / Finance User"]
        DEVICES["Scanner / Scale / Printer / Cash Drawer / Payment Terminal"]
    end

    subgraph EDGE["Internet Edge"]
        DNS["DNS + TLS Certificates"]
        CDN["CDN + WAF + Rate Protection"]
    end

    subgraph FRONTEND["Independent Frontend Deployables"]
        POS["POS Application<br/>Next.js 16 + React + TypeScript<br/>pos.example.com"]
        LOCALDB["Offline Store<br/>Dexie + IndexedDB<br/>Pending Commands + Catalog Snapshot"]
        DEVICEPORT["Device Adapter Layer<br/>Web APIs / Vendor SDK / Local Bridge"]
        BACKOFFICE["Back Office Application<br/>Next.js 16 + React + TypeScript<br/>app.example.com"]
        BFF["Frontend BFF<br/>Next.js Route Handlers<br/>Session / Proxy / Response Shaping"]
    end

    subgraph IDENTITY["Identity"]
        IDP["OIDC Identity Provider<br/>Keycloak or Managed OIDC<br/>Login + MFA + Passkeys + Federation"]
    end

    subgraph APPLICATION["Core Application Deployables"]
        GATEWAY["API Load Balancer"]
        API["Core API Replicas<br/>NestJS + Fastify + Node.js 24 LTS<br/>REST + OpenAPI"]
        AUTHZ["Business Context + Authorization<br/>Business / Branch / Role / Approval"]
        DOMAINS["Domain-Modular Monolith<br/>Catalog | Pricing | Sales | Payments<br/>Inventory | Purchasing | Finance<br/>CRM | Loyalty | Operations | Integrations"]
        WORKER["Worker Replicas<br/>NestJS Application Context + BullMQ<br/>Outbox / Jobs / Schedules / Reconciliation"]
        REALTIME["Optional Realtime Gateway<br/>WebSocket / Server-Sent Events"]
    end

    subgraph DATA["Managed Data Services"]
        POOL["PgBouncer-Compatible<br/>Transaction Pool"]
        PRISMA["Prisma ORM 7 GA<br/>Repositories + Unit of Work"]
        POSTGRES["PostgreSQL 18<br/>Authoritative OLTP Database<br/>Ledgers + Audit + Transactional Outbox"]
        REDIS["Redis-Compatible Service<br/>BullMQ + Cache + Rate Limits"]
        OBJECTS["S3-Compatible Object Storage<br/>Images + Attachments + Imports + Exports"]
        REPLICA["Optional Read Replica<br/>Only After Measured Need"]
    end

    subgraph EXTERNAL["External Providers and Systems"]
        PAYMENT["Payment Gateway / Certified Terminal"]
        MESSAGE["Email / SMS / Notification Provider"]
        ACCOUNTING["Accounting / ERP / Marketplace"]
        WEBHOOKS["Customer Webhook Endpoints"]
    end

    subgraph OPERATIONS["Platform and Operations"]
        CONTAINERS["Managed Container Platform<br/>Immutable Docker Images"]
        SECRETS["Secret Manager + KMS"]
        OTEL["OpenTelemetry Collector<br/>Logs + Metrics + Traces"]
        MONITORING["Dashboards + Alerts + Error Tracking"]
        IAC["OpenTofu / Terraform-Compatible IaC"]
        BACKUP["PostgreSQL HA + PITR + Restore Tests"]
    end

    CASHIER --> DNS
    MANAGER --> DNS
    DNS --> CDN
    CDN --> POS
    CDN --> BACKOFFICE

    DEVICES <--> DEVICEPORT
    DEVICEPORT <--> POS
    POS <--> LOCALDB

    POS -->|"OIDC login"| IDP
    BACKOFFICE -->|"OIDC login"| IDP
    POS -->|"HTTPS / Generated OpenAPI Client"| GATEWAY
    BACKOFFICE --> BFF
    BFF -->|"HTTPS / Generated OpenAPI Client"| GATEWAY

    GATEWAY --> API
    API -->|"Validate token"| IDP
    API --> AUTHZ
    AUTHZ --> DOMAINS
    WORKER --> DOMAINS

    DOMAINS --> PRISMA
    PRISMA --> POOL
    POOL --> POSTGRES
    WORKER -->|"Claim outbox / domain work"| POSTGRES
    WORKER <--> REDIS
    API <--> REDIS
    API <--> OBJECTS
    WORKER <--> OBJECTS
    POSTGRES -.-> REPLICA

    DOMAINS -->|"Payment intent / verification"| PAYMENT
    PAYMENT -->|"Signed callback / reconciliation"| API
    WORKER --> MESSAGE
    WORKER --> ACCOUNTING
    WORKER --> WEBHOOKS
    WORKER -->|"Committed status updates"| REALTIME
    REALTIME --> POS
    REALTIME --> BACKOFFICE

    CONTAINERS -.-> POS
    CONTAINERS -.-> BACKOFFICE
    CONTAINERS -.-> API
    CONTAINERS -.-> WORKER
    SECRETS -.-> API
    SECRETS -.-> WORKER
    API -.-> OTEL
    WORKER -.-> OTEL
    POS -.-> OTEL
    BACKOFFICE -.-> OTEL
    OTEL --> MONITORING
    IAC -.-> CDN
    IAC -.-> API
    IAC -.-> POSTGRES
    POSTGRES --> BACKUP

    classDef actor fill:#E8F1FF,stroke:#2563EB,color:#0F172A
    classDef frontend fill:#ECFDF5,stroke:#059669,color:#0F172A
    classDef application fill:#FFF7ED,stroke:#EA580C,color:#0F172A
    classDef data fill:#F5F3FF,stroke:#7C3AED,color:#0F172A
    classDef external fill:#FEF2F2,stroke:#DC2626,color:#0F172A
    classDef operations fill:#F8FAFC,stroke:#475569,color:#0F172A

    class CASHIER,MANAGER,DEVICES actor
    class POS,LOCALDB,DEVICEPORT,BACKOFFICE,BFF frontend
    class GATEWAY,API,AUTHZ,DOMAINS,WORKER,REALTIME application
    class POOL,PRISMA,POSTGRES,REDIS,OBJECTS,REPLICA data
    class PAYMENT,MESSAGE,ACCOUNTING,WEBHOOKS external
    class CONTAINERS,SECRETS,OTEL,MONITORING,IAC,BACKUP operations
```

### Main diagram rules

- POS and Back Office are separate Next.js deployments.
- The browser never connects directly to PostgreSQL, Prisma, Redis, or object-storage credentials.
- Next.js Route Handlers are a BFF, not the owner of core business rules.
- NestJS/Fastify owns authorization, application use cases, transactions, and stable APIs.
- PostgreSQL is the source of truth for sales, payments, stock, finance, loyalty, audit, and outbox records.
- Redis/BullMQ owns queued work, not authoritative business balances.
- Workers perform retryable and slow work after critical transactions commit.
- All production components send safe telemetry through OpenTelemetry.

---

## 2. Domain-Modular Monolith Architecture

```mermaid
flowchart LR
    subgraph TRANSPORT["Transport and Presentation"]
        POSUI["POS Next.js"]
        BOUI["Back Office Next.js"]
        HTTP["NestJS Controllers<br/>REST + OpenAPI"]
        JOBS["BullMQ Processors / Schedules"]
    end

    subgraph APPLICATION["Application Use Cases"]
        USECASES["Complete Sale | Receive Goods | Transfer Stock<br/>Return / Refund | Post Invoice | Run Export"]
    end

    subgraph DOMAIN["Business Domain Rules"]
        ACCESS["Business Access"]
        CATALOG["Catalog"]
        PRICING["Pricing / Promotion / Tax"]
        SALES["Sales / Orders"]
        PAYMENTS["Payments"]
        INVENTORY["Inventory"]
        PURCHASING["Purchasing"]
        FINANCE["Finance"]
        CRM["CRM / Loyalty"]
        OPS["Work Ticket / Booking / Traceability"]
    end

    subgraph ADAPTERS["Infrastructure Adapters"]
        REPOS["Prisma Repositories"]
        QUEUE["BullMQ / Redis Adapter"]
        PROVIDERS["Payment / Email / Webhook Adapters"]
        FILES["S3 Object Storage Adapter"]
    end

    subgraph STORES["Runtime Services"]
        PG["PostgreSQL 18"]
        REDIS["Redis-Compatible Service"]
        S3["S3-Compatible Storage"]
        EXT["External Providers"]
    end

    POSUI --> HTTP
    BOUI --> HTTP
    HTTP --> USECASES
    JOBS --> USECASES

    USECASES --> ACCESS
    USECASES --> CATALOG
    USECASES --> PRICING
    USECASES --> SALES
    USECASES --> PAYMENTS
    USECASES --> INVENTORY
    USECASES --> PURCHASING
    USECASES --> FINANCE
    USECASES --> CRM
    USECASES --> OPS

    ACCESS --> REPOS
    CATALOG --> REPOS
    PRICING --> REPOS
    SALES --> REPOS
    PAYMENTS --> REPOS
    INVENTORY --> REPOS
    PURCHASING --> REPOS
    FINANCE --> REPOS
    CRM --> REPOS
    OPS --> REPOS
    USECASES --> QUEUE
    USECASES --> FILES
    PAYMENTS --> PROVIDERS
    REPOS --> PG
    QUEUE --> REDIS
    FILES --> S3
    PROVIDERS --> EXT
```

### Dependency direction

```text
Transport -> Application -> Domain -> Ports <- Infrastructure Adapters
```

Domain rules shall not import Next.js, NestJS controllers, Prisma Client, Redis clients, or provider SDKs.

---

## 3. Monorepo Folder and Package Dependency Diagram

```mermaid
flowchart TB
    subgraph APPS["Deployable Applications"]
        POS["apps/pos<br/>Next.js POS"]
        BO["apps/backoffice<br/>Next.js Back Office"]
        API["apps/api<br/>NestJS/Fastify API"]
        WORKER["apps/worker<br/>NestJS/BullMQ Worker"]
    end

    subgraph SHARED["Shared Build-Time Packages"]
        UI["packages/design-system"]
        CLIENT["packages/api-client<br/>Generated from OpenAPI"]
        CONTRACTS["packages/contracts"]
        AUTH["packages/auth"]
        OFFLINE["packages/offline"]
        OBS["packages/observability"]
        DB["packages/database<br/>Prisma Schema + Migrations"]
        MONEY["packages/money"]
        IDS["packages/ids"]
    end

    subgraph DOMAINS["Domain Packages"]
        ACCESS["packages/domains/business-access"]
        CATALOG["packages/domains/catalog"]
        SALES["packages/domains/sales"]
        PAYMENTS["packages/domains/payments"]
        INVENTORY["packages/domains/inventory"]
        FINANCE["packages/domains/finance"]
        MORE["other domain packages"]
    end

    subgraph PACKS["Business-Pack Extensions"]
        GROCERY["packages/packs/grocery"]
        RETAIL["packages/packs/general-retail"]
        FUTURE["packages/packs/fashion and later packs"]
    end

    POS --> UI
    POS --> CLIENT
    POS --> CONTRACTS
    POS --> AUTH
    POS --> OFFLINE
    POS --> OBS

    BO --> UI
    BO --> CLIENT
    BO --> CONTRACTS
    BO --> AUTH
    BO --> OBS

    API --> ACCESS
    API --> CATALOG
    API --> SALES
    API --> PAYMENTS
    API --> INVENTORY
    API --> FINANCE
    API --> MORE
    API --> CONTRACTS
    API --> AUTH
    API --> OBS
    API --> DB

    WORKER --> SALES
    WORKER --> PAYMENTS
    WORKER --> INVENTORY
    WORKER --> FINANCE
    WORKER --> MORE
    WORKER --> CONTRACTS
    WORKER --> OBS
    WORKER --> DB

    DOMAINS --> MONEY
    DOMAINS --> IDS
    GROCERY --> CATALOG
    GROCERY --> SALES
    RETAIL --> CATALOG
    RETAIL --> SALES
    FUTURE --> MORE

    FORBIDDEN["Forbidden:<br/>Frontend -> Prisma/Database<br/>App -> another App source<br/>Pack -> duplicate ledger"]
    POS -.->|"Forbidden"| FORBIDDEN
    BO -.->|"Forbidden"| FORBIDDEN
    GROCERY -.->|"Forbidden duplicate ledger"| FORBIDDEN
    RETAIL -.->|"Forbidden duplicate ledger"| FORBIDDEN
    FUTURE -.->|"Forbidden duplicate ledger"| FORBIDDEN

    classDef app fill:#ECFDF5,stroke:#059669,color:#0F172A
    classDef pkg fill:#EFF6FF,stroke:#2563EB,color:#0F172A
    classDef domain fill:#FFF7ED,stroke:#EA580C,color:#0F172A
    classDef pack fill:#F5F3FF,stroke:#7C3AED,color:#0F172A
    classDef forbidden fill:#FEF2F2,stroke:#DC2626,color:#7F1D1D

    class POS,BO,API,WORKER app
    class UI,CLIENT,CONTRACTS,AUTH,OFFLINE,OBS,DB,MONEY,IDS pkg
    class ACCESS,CATALOG,SALES,PAYMENTS,INVENTORY,FINANCE,MORE domain
    class GROCERY,RETAIL,FUTURE pack
    class FORBIDDEN forbidden
```

### Repository connection rule

Applications consume packages through declared package exports. They do not import private source files using relative paths across package boundaries.

---

## 4. Completed Sale — Transaction and Event Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Cashier
    participant POS as POS<br/>Next.js + Dexie
    participant API as Core API<br/>NestJS/Fastify
    participant Auth as Business Context<br/>Authorization
    participant Sales as Sales Use Case
    participant Payment as Payment Module/Provider
    participant DB as PostgreSQL 18<br/>Prisma Transaction
    participant Queue as Redis/BullMQ
    participant Worker as Worker
    participant External as Email/Webhook/Analytics

    Cashier->>POS: Scan items and complete sale
    POS->>POS: Create command_id + idempotency_key
    POS->>API: POST /api/v1/sales/complete
    API->>Auth: Verify User, Business, Branch, Role, terminal, shift
    Auth-->>API: Authorized BusinessContext
    API->>Sales: CompleteSale(command, context)
    Sales->>Payment: Verify/obtain allowed tender result
    Payment-->>Sales: Confirmed cash/provider reference

    rect rgb(245, 243, 255)
        Note over Sales,DB: One short atomic PostgreSQL transaction
        Sales->>DB: Check/create idempotency record
        Sales->>DB: Confirm sale and lines
        Sales->>DB: Record payment result
        Sales->>DB: Append stock movement(s)
        Sales->>DB: Record receipt/invoice and audit
        Sales->>DB: Insert outbox event SaleCompleted.v1
        DB-->>Sales: Commit authoritative result
    end

    Sales-->>API: Sale number + receipt + versions
    API-->>POS: 201 Completed
    POS-->>Cashier: Show success and print receipt

    Worker->>DB: Claim unpublished outbox rows
    Worker->>Queue: Enqueue using event_id as job key
    Queue-->>Worker: Deliver job, possibly more than once
    Worker->>Worker: Idempotency/processed-event check
    Worker->>External: Update projection / notify / signed webhook
    Worker->>DB: Record processing result

    Note over POS,DB: Repeating the same idempotency key returns the original result and creates no duplicate sale, payment, stock, or event effect.
```

---

## 5. Offline POS Synchronization Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Cashier
    participant POS as POS Next.js App
    participant IDB as Dexie / IndexedDB
    participant API as NestJS API
    participant Policy as Authorization + Offline Policy
    participant DB as PostgreSQL

    Note over POS,API: Internet is unavailable
    Cashier->>POS: Complete approved offline cash sale
    POS->>POS: Generate UUIDv7/ULID command ID and idempotency key
    POS->>IDB: Transactionally store immutable command
    IDB-->>POS: QUEUED
    POS-->>Cashier: Show offline status and permitted receipt

    Note over POS,API: Connectivity returns
    POS->>IDB: Read queued commands in dependency order
    POS->>API: Submit command with Business, Branch, terminal, user, policy versions
    API->>Policy: Revalidate identity, membership, terminal, shift, limits, catalog policy

    alt Command is valid
        Policy-->>API: Permit
        API->>DB: Execute idempotent sale transaction
        DB-->>API: Authoritative ACCEPTED result
        API-->>POS: ACCEPTED + entity versions + receipt
        POS->>IDB: Store sync receipt, mark command accepted
    else Business rule rejects command
        Policy-->>API: Reject with stable error code
        API-->>POS: REJECTED + required action
        POS->>IDB: Store rejection and preserve evidence
        POS-->>Cashier: Show manager/reconciliation action
    else Conflict needs review
        Policy-->>API: Conflict
        API-->>POS: CONFLICT_REVIEW
        POS->>IDB: Preserve command and conflict details
    else Temporary service failure
        API-->>POS: RETRYABLE_FAILURE
        POS->>IDB: Keep queued with next retry time
    end

    Note over POS,DB: Foreground sync owns correctness. Background Sync is only a supplemental optimization.
```

---

## 6. Payment Timeout and Reconciliation Sequence

```mermaid
sequenceDiagram
    autonumber
    participant API as NestJS API
    participant DB as PostgreSQL
    participant PSP as Payment Provider
    participant Worker as Reconciliation Worker

    API->>DB: Create payment attempt + provider idempotency reference
    DB-->>API: Commit PENDING attempt
    API->>PSP: Capture payment(reference, amount)

    alt Provider responds normally
        PSP-->>API: SUCCEEDED or FAILED
        API->>DB: Confirm one authoritative result
    else Response is lost or times out
        API->>DB: Mark attempt UNCERTAIN
        API-->>API: Do not blindly create another capture
        Worker->>DB: Load uncertain attempt
        Worker->>PSP: Query status using original reference
        PSP-->>Worker: Authoritative provider status
        Worker->>DB: Confirm/reconcile unique payment result
    end

    opt Signed callback arrives
        PSP->>API: Signed callback with provider event ID
        API->>API: Verify signature, timestamp, replay, and duplication
        API->>DB: Upsert/confirm one result using unique provider reference
    end
```

---

## 7. CI/CD and Independent Deployment Architecture

```mermaid
flowchart LR
    DEV["Developer Change"] --> PR["Pull Request"]

    subgraph CI["CI Quality Pipeline"]
        INSTALL["pnpm Frozen Install"]
        TURBO["Turborepo Affected Graph"]
        QUALITY["Format + Lint + Typecheck<br/>Architecture Boundaries"]
        TESTS["Vitest + Testing Library<br/>PostgreSQL/Redis Integration<br/>Playwright + Contract Tests"]
        SECURITY["Secret + Dependency + SAST<br/>Container Scan + SBOM"]
        BUILD["Build Affected Apps"]
    end

    PR --> INSTALL --> TURBO --> QUALITY --> TESTS --> SECURITY --> BUILD

    BUILD --> REGISTRY["Signed Immutable Images<br/>Container Registry"]
    BUILD --> WEBARTIFACT["Next.js Web Artifacts"]

    subgraph STAGING["Staging"]
        STGMIGRATE["Controlled Prisma Migrate Deploy<br/>Direct PostgreSQL Connection"]
        STGAPPS["Deploy POS / Back Office / API / Worker"]
        STGVERIFY["Smoke + E2E + Performance<br/>Migration + Failure Tests"]
    end

    REGISTRY --> STGMIGRATE
    WEBARTIFACT --> STGAPPS
    STGMIGRATE --> STGAPPS --> STGVERIFY

    STGVERIFY --> APPROVAL["Production Approval"]

    subgraph PROD["Production Rolling/Canary Release"]
        PRODMIGRATE["Safe Additive Migration Job"]
        APIWORKER["API + Worker Canary/Rolling Deploy"]
        OBSERVE["Observe SLOs, Errors, Outbox,<br/>Payments, Stock, Sync"]
        FRONTENDS["Deploy Compatible POS and Back Office"]
        PROMOTE["Promote or Roll Back / Forward-Fix"]
    end

    APPROVAL --> PRODMIGRATE --> APIWORKER --> OBSERVE --> FRONTENDS --> PROMOTE

    classDef ci fill:#EFF6FF,stroke:#2563EB,color:#0F172A
    classDef staging fill:#FFF7ED,stroke:#EA580C,color:#0F172A
    classDef prod fill:#ECFDF5,stroke:#059669,color:#0F172A

    class INSTALL,TURBO,QUALITY,TESTS,SECURITY,BUILD ci
    class STGMIGRATE,STGAPPS,STGVERIFY staging
    class PRODMIGRATE,APIWORKER,OBSERVE,FRONTENDS,PROMOTE prod
```

### Deployment units

```mermaid
flowchart TB
    REPO["One Bizentra Monorepo"]
    REPO --> POSBUILD["Build apps/pos"]
    REPO --> BOBUILD["Build apps/backoffice"]
    REPO --> APIBUILD["Build apps/api"]
    REPO --> WORKERBUILD["Build apps/worker"]
    REPO --> MIGRATION["Package Prisma migrations"]

    POSBUILD --> POSDEPLOY["Deploy POS independently"]
    BOBUILD --> BODEPLOY["Deploy Back Office independently"]
    APIBUILD --> APIDEPLOY["Deploy API replicas independently"]
    WORKERBUILD --> WORKERDEPLOY["Deploy/scale Worker independently"]
    MIGRATION --> MIGRATIONJOB["Run one controlled migration job"]

    SHARED["packages/*"] -.->|"Bundled into consumers at build time"| POSBUILD
    SHARED -.-> BOBUILD
    SHARED -.-> APIBUILD
    SHARED -.-> WORKERBUILD
```

---

## 8. Safe Database Migration Sequence

```mermaid
flowchart LR
    A["Release A: Expand<br/>Add nullable/new structures"] --> B["Deploy Compatible Code<br/>Read old, write old + new"]
    B --> C["Worker Backfill<br/>Small resumable batches"]
    C --> D["Validate Counts, Constraints,<br/>Performance, Reconciliation"]
    D --> E["Release B: Enforce<br/>Switch reads and validate new writes"]
    E --> F["Compatibility Window<br/>All old app versions retired"]
    F --> G["Release C: Contract<br/>Remove old structures/code"]

    classDef safe fill:#ECFDF5,stroke:#059669,color:#0F172A
    classDef verify fill:#FFF7ED,stroke:#EA580C,color:#0F172A
    class A,B,C,E,F,G safe
    class D verify
```

Never run destructive schema changes before every deployed application version is compatible.

---

## 9. Business Data Isolation Architecture

```mermaid
flowchart TB
    USER["Authenticated User"] --> TOKEN["OIDC Token<br/>Identity + Coarse Claims"]
    TOKEN --> MEMBERSHIP["Bizentra Membership Lookup"]
    MEMBERSHIP --> CONTEXT["Verified BusinessContext<br/>business_id + branch access + user"]
    CONTEXT --> AUTHZ["Role + Permission + Approval + Record State"]
    AUTHZ --> USECASE["Application Use Case"]
    USECASE --> REPO["Business-Scoped Repository"]
    REPO --> CONSTRAINTS["PostgreSQL Constraints<br/>business_id in ownership and uniqueness"]
    CONSTRAINTS --> RLS["Optional Proven PostgreSQL RLS<br/>Defense in Depth"]
    RLS --> DATA["Business-Owned Rows"]

    CONTEXT -.-> CACHE["Business-Scoped Cache Keys"]
    CONTEXT -.-> JOB["Business-Scoped Jobs and Events"]
    CONTEXT -.-> FILES["Business-Scoped Object Paths"]
    CONTEXT -.-> TELEMETRY["Safe Business/Branch Telemetry Fields"]

    ATTACK["Browser-Supplied business_id"] -.->|"Never trusted by itself"| REJECT["Reject / derive from verified membership"]

    classDef trusted fill:#ECFDF5,stroke:#059669,color:#0F172A
    classDef defense fill:#EFF6FF,stroke:#2563EB,color:#0F172A
    classDef rejected fill:#FEF2F2,stroke:#DC2626,color:#7F1D1D
    class TOKEN,MEMBERSHIP,CONTEXT,AUTHZ,USECASE trusted
    class REPO,CONSTRAINTS,RLS,DATA,CACHE,JOB,FILES,TELEMETRY defense
    class ATTACK,REJECT rejected
```

---

## 10. Architecture Summary

```mermaid
mindmap
  root((Bizentra))
    Frontend
      POS
        Next.js
        React
        TypeScript
        Dexie and IndexedDB
        Device adapters
      Back Office
        Next.js
        React
        TypeScript
        Design system
    Backend
      NestJS
      Fastify
      REST and OpenAPI
      Modular monolith
      Node.js LTS
    Data
      PostgreSQL
        Source of truth
        Ledgers
        Audit
        Transactional outbox
      Prisma ORM
      PgBouncer-compatible pool
      Redis and BullMQ
      S3-compatible storage
    Reliability
      Idempotency
      Reconciliation
      Offline command queue
      Backup and PITR
      OpenTelemetry
    Delivery
      pnpm
      Turborepo
      Docker
      Managed containers
      Infrastructure as Code
      Independent deployables
```

The main rule is:

```text
Frontend asks -> API authorizes and decides -> PostgreSQL commits the truth
-> Outbox and workers complete retryable side effects -> Telemetry and reconciliation prove the result
```
