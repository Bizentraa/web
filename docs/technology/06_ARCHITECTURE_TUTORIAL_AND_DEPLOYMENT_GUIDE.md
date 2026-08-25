# Bizentra Architecture Tutorial — From Folder Structure to Production Deployment

**Audience:** Developers, technical leads, product owners, QA engineers, and anyone learning the Bizentra architecture  
**Goal:** Explain the architecture in simple language, show how repository folders connect, and teach how the applications are developed and deployed safely  
**Read first:** [`00_TECHNOLOGY_STACK_INDEX.md`](./00_TECHNOLOGY_STACK_INDEX.md)

---

## 1. What Are We Building?

Bizentra is not only a billing screen. It is a cloud platform that may serve:

- a supermarket with barcode scanners, scales, batches, expiry, and many cashiers;
- a fashion shop with styles, colours, sizes, exchanges, and seasonal stock;
- an electronics shop with serial numbers, IMEI, warranty, and repairs;
- a restaurant with tables, kitchen tickets, recipes, and delivery;
- a garage with vehicles, job cards, parts, labour, and customer credit;
- a distributor with warehouses, vans, routes, deliveries, and collections.

These businesses look different to the user, but most of their basic operations are the same:

```text
Customer
  -> Order or Sale
  -> Payment
  -> Stock Movement
  -> Invoice or Receipt
  -> Report and Audit
```

The architecture therefore builds the common engines once and allows each business pack to add only its special rules.

## 2. The Architecture in One Sentence

> Two Next.js applications talk to one modular NestJS API; PostgreSQL stores the truth; workers complete slow/retryable work; shared packages connect the code at build time; every deployable can be released independently.

The four main deployables are:

| Deployable | Simple meaning | Main users/job |
|---|---|---|
| POS | The checkout counter | Cashier, scanner, printer, payment, offline sale |
| Back Office | The manager's office | Catalog, stock, purchasing, finance, reports, administration |
| API | The business-rule controller | Validates and performs every important business operation |
| Worker | The reliable background assistant | Retries, events, receipts, webhooks, imports, exports, scheduled jobs |

PostgreSQL, Redis, and object storage are managed platform services used by the deployables.

## 3. A Real-World Analogy

Think of a large supermarket.

| Real supermarket | Bizentra architecture |
|---|---|
| Checkout counter | POS Next.js application |
| Manager's office | Back Office Next.js application |
| Store rules and supervisors | NestJS API/application layer |
| Official sales and stock books | PostgreSQL |
| Staff member delivering receipts/reports later | Worker |
| Task tray for work that must be completed | BullMQ/Redis |
| Signed daily action register | Transactional outbox/audit records |
| Filing room for images, PDFs, and exports | Object storage |
| Staff ID/security desk | OIDC identity provider |

The cashier cannot walk into the official accounts room and edit the stock book. The cashier submits an authorized operation to the responsible supervisor. In the same way, the POS never writes directly to PostgreSQL; it calls the API.

## 4. Big-Picture Architecture

```text
Users and devices
  |
  +-- Cashier / scanner / printer
  |        |
  |        v
  |   POS Next.js application
  |   + local IndexedDB for approved offline work
  |
  +-- Owner / manager / inventory / finance user
           |
           v
      Back Office Next.js application
           |
           +--------------------+
                                |
                                v
                        NestJS / Fastify API
                        authorization + rules
                                |
                +---------------+---------------+
                |               |               |
                v               v               v
           PostgreSQL       Redis/BullMQ    Object storage
           source of truth  jobs/cache      files/exports
                |
                v
          Transactional outbox
                |
                v
             Worker
                |
       +--------+---------+---------+
       |                  |         |
       v                  v         v
   Email/SMS         Webhooks   Reports/imports
   providers         payments   and integrations
```

### Why these parts are separate

- The POS must remain fast and may need to work offline.
- Back Office pages are larger and contain reports and management forms that cashiers do not need.
- The API must protect one set of business rules for every frontend and integration.
- Workers must continue retrying even when no user has a browser open.
- PostgreSQL must commit related sales, stock, finance, audit, and event data safely.
- Redis makes temporary/queued work faster, but PostgreSQL remains the truth.

---

## 5. Real Example 1 — A Normal Supermarket Sale

The cashier scans two bottles of milk and receives cash.

### Step-by-step flow

```text
1. Scanner enters barcode
   |
2. POS finds the product in its current catalog cache
   |
3. POS shows Milk x 2 and calculates the visible cart
   |
4. Cashier selects Cash and presses Complete
   |
5. POS sends CompleteSale command to the API
   |
6. API authenticates the cashier and verifies:
      - Business
      - Branch
      - terminal and shift
      - prices/tax/discount permissions
      - idempotency key
   |
7. API starts one short PostgreSQL transaction
      - confirms the sale
      - records the cash payment
      - appends stock movement -2
      - creates receipt/invoice state
      - writes audit evidence
      - writes SaleCompleted/outbox event
   |
8. PostgreSQL commits everything together
   |
9. API returns sale number and receipt data
   |
10. POS prints the receipt
   |
11. Worker later updates analytics, loyalty, notifications, and webhooks
```

### Why commit the important records together?

Imagine these records were written separately:

1. sale saved;
2. application crashes;
3. payment not saved;
4. stock not reduced.

Now the system says a sale happened, but money and stock disagree. A database transaction makes the critical records succeed or fail as one unit.

### Why is the worker not inside the checkout transaction?

Sending an email or updating a dashboard can be slow or temporarily unavailable. The customer should not wait because the email provider is down. The transaction records a durable event, and the worker completes those side effects later.

## 6. Real Example 2 — Goods Receiving

The store ordered 100 bottles of milk but receives only 80.

```text
Purchase Order approved: 100
          |
          | no stock change yet
          v
Truck arrives with 80
          |
Inventory user records Goods Receipt: 80
          |
PostgreSQL transaction
  - receipt line = 80
  - stock movement = +80
  - remaining order quantity = 20
  - GoodsReceived outbox event
          |
Worker updates supplier/report projections
```

The Purchase Order is a promise, not a physical movement. Stock increases only when goods physically arrive. This is why Purchasing and Inventory are separate domain owners.

## 7. Real Example 3 — Offline POS Sale

The internet disconnects, but the Business allows cash sales offline.

```text
Cashier completes approved cash sale
          |
POS creates a unique command_id and idempotency_key
          |
Command is saved transactionally in IndexedDB
          |
POS prints an offline-marked receipt if policy permits
          |
Internet returns
          |
POS sends the same command to the API
          |
API verifies policy, terminal, shift, user, catalog version
          |
API accepts, rejects, or sends it for conflict review
          |
POS stores the authoritative sync receipt
```

If the browser sends the command twice, the API uses the idempotency key to return the original result rather than creating two sales.

### Important lesson

Offline does not mean the browser becomes the final database. The browser records a durable request; the server remains the authority.

## 8. Real Example 4 — Payment Timeout

The card provider captures money, but the response to Bizentra is lost.

Wrong approach:

```text
Timeout -> immediately try another capture
```

This may charge the customer twice.

Correct approach:

```text
Create payment attempt with unique reference
          |
Call provider using idempotency/reference key
          |
Timeout occurs: status becomes UNCERTAIN
          |
Worker/API asks provider for the real status
          |
Signed provider callback may also arrive
          |
Unique provider reference confirms only one result
          |
Operator sees unresolved attempts in a reconciliation queue
```

The provider call is not kept inside a long PostgreSQL transaction. Bizentra records intent, performs the external call, and then safely confirms/reconciles the result.

## 9. Real Example 5 — Large Report Export

A manager requests one year of sales data.

If the Next.js page or API tries to generate the whole file during one request:

- the browser waits;
- a serverless/container request may time out;
- database connections remain busy;
- checkout traffic may become slow.

Use asynchronous work:

```text
Back Office requests export
          |
API creates ExportJob and returns 202 + job ID
          |
Worker reads data in safe pages/batches
          |
Worker writes CSV/PDF to object storage
          |
Job becomes COMPLETED with a short-lived signed download link
          |
Back Office notifies the manager
```

---

## 10. What “Modular Monolith” Means

### Monolith

The first core backend is deployed as one API process and one worker process. This is easier to build, test, transact, operate, and debug than many network services.

### Modular

Inside the backend, each business area has clear ownership.

```text
Core backend
  +-- Business and Access
  +-- Catalog
  +-- Pricing, Promotion, Tax
  +-- Sales and Orders
  +-- Payments
  +-- Inventory
  +-- Purchasing
  +-- Finance
  +-- CRM and Loyalty
  +-- Work Tickets / Booking / Traceability
  +-- Integrations
  +-- Reporting
```

This is like one supermarket building with separate departments. The departments are in one building, but the cashier department does not secretly edit the purchasing department's official records.

### Module ownership example

| Question | Owning module |
|---|---|
| What did the customer order? | Sales |
| Did the payment provider capture money? | Payments |
| How much physical stock moved? | Inventory |
| What does the customer owe? | Finance |
| How many loyalty points exist? | CRM/Loyalty ledger |
| What was ordered from the supplier? | Purchasing |

### Why not start with microservices?

If Sales, Payments, Inventory, Finance, and Loyalty are five services on day one, one checkout crosses five networks and five deployments. You must handle partial failure, retries, version mismatches, distributed tracing, and eventual consistency before the product has real usage data.

A modular monolith gives clean boundaries without paying all distributed-system costs immediately.

## 11. When a Module Can Become a Microservice

Example: report generation eventually uses most CPU and slows the worker.

Because Reporting already owns clear jobs/events and does not edit sale tables, it can be extracted:

```text
Before
API + Worker repository
  -> Reporting module

After
Core API publishes committed event
  -> durable broker/outbox
  -> Reporting service
  -> analytics database/object storage
```

Extraction is justified when a module needs different scaling, availability, compliance, technology, team ownership, or deployment timing. “The codebase is large” by itself is not enough.

---

## 12. Micro-Frontend Explained Simply

A micro-frontend is a frontend area developed and deployed independently from other frontend areas.

### What Bizentra uses first

Bizentra begins with two independent frontend applications:

```text
POS application          Back Office application
pos.example.com          app.example.com

cashier workflow         management workflow
offline/device needs     reports/forms/configuration
independent deployment   independent deployment
```

This already gives useful separation.

### What Bizentra does not do

Do not split one checkout screen into remotely loaded micro-frontends:

```text
Remote Cart UI
Remote Customer UI
Remote Payment UI
Remote Inventory UI
```

If the Payment UI remote fails to load, the cashier cannot finish the sale. React/framework versions, authentication, styles, state, and debugging also become harder.

### Business packs are not micro-frontends

Do not create these applications:

```text
apps/grocery
apps/fashion
apps/electronics
apps/restaurant
```

The Business may enable more than one capability, and all packs must reuse the same catalog, customer, sale, payment, stock, and finance engines.

Business packs should be extension packages:

```text
packages/packs/grocery
packages/packs/general-retail
packages/packs/fashion
```

Example: Grocery adds a scale-barcode parser that produces a standard Item/Variant and quantity. The standard Sales and Inventory modules complete the sale.

### When Next.js Multi-Zones may be useful

Later, if separate teams independently own `/reports` and `/integrations`, they may become separate Next.js applications routed under one domain. Make this decision only after team and deployment independence really exist.

---

## 13. Complete Recommended Repository Structure

```text
Bizentra/
  apps/
    pos/
      src/
        app/                         # Next.js routes/layouts
        features/                    # sale, payment, return, shift
        widgets/                     # composed POS screen areas
        shared/                      # POS-only helpers
      public/
      package.json
      next.config.ts

    backoffice/
      src/
        app/                         # Next.js routes/layouts
        features/                    # catalog, inventory, finance, reports
        widgets/
        shared/                      # Back Office-only helpers
      public/
      package.json
      next.config.ts

    api/
      src/
        main.ts                      # starts NestJS/Fastify
        composition/                 # connects modules/adapters
        controllers/                 # HTTP transport only
        guards/                      # auth/Business context
        health/
      package.json

    worker/
      src/
        main.ts                      # starts worker runtime
        processors/                  # queue entry points
        schedules/
        health/
      package.json

  packages/
    domains/
      business-access/
        src/domain/
        src/application/
        src/infrastructure/
        src/index.ts                 # public exports
        package.json
      catalog/
      pricing/
      sales/
      payments/
      inventory/
      purchasing/
      finance/
      crm-loyalty/
      operations/
      integrations/
      reporting/

    packs/
      grocery/
      general-retail/
      fashion/                       # later

    api-client/                      # generated from OpenAPI
    auth/                            # OIDC/session helpers
    contracts/                       # API/event schemas and error types
    database/
      prisma/
        schema.prisma
        migrations/
      src/
        client.ts
        unit-of-work.ts
      package.json
    design-system/
    money/
    ids/
    offline/
    observability/
    testing/
    tooling/

  infrastructure/
    modules/                         # reusable IaC modules
    environments/
      development/
      staging/
      production/

  docs/
    technology/
    01_COMMON_CORE_SRS.md
    02_GROCERY_SUPERMARKET_SRS.md
    03_GENERAL_RETAIL_SRS.md

  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  turbo.json
  tsconfig.json or shared config package
```

### Why `apps` and `packages` are different

| Folder | Meaning | Deployment |
|---|---|---|
| `apps/*` | Runnable products/processes | Built into an image/site and deployed |
| `packages/*` | Reusable code used by apps | Compiled/bundled into an app; normally not deployed alone |
| `infrastructure/*` | Cloud resource definitions | Applied by infrastructure pipeline |
| `docs/*` | Requirements, architecture, guides | Published/read as documentation |

The monorepo is one source repository, not one deployment.

---

## 14. Which Folders May Connect?

### Allowed dependency map

```text
apps/pos
  -> packages/design-system
  -> packages/api-client
  -> packages/contracts
  -> packages/auth
  -> packages/offline
  -> packages/observability

apps/backoffice
  -> packages/design-system
  -> packages/api-client
  -> packages/contracts
  -> packages/auth
  -> packages/observability

apps/api
  -> packages/domains/*
  -> packages/contracts
  -> packages/database
  -> packages/auth
  -> packages/observability

apps/worker
  -> packages/domains/*
  -> packages/contracts
  -> packages/database
  -> packages/observability

packages/packs/*
  -> approved extension interfaces from packages/domains/*
  -> packages/contracts/money/ids as needed
```

### Forbidden connections

```text
apps/pos            -X-> packages/database
apps/backoffice     -X-> Prisma
apps/pos            -X-> apps/backoffice source
apps/backoffice     -X-> apps/pos source
Catalog module      -X-> writes Inventory tables
Grocery pack        -X-> creates a second stock ledger
Worker processor    -X-> bypasses application use case to edit owned tables
```

### Why the frontend never imports Prisma

Prisma types describe database storage, not public API promises. If the frontend imports them:

- database columns become accidentally public;
- sensitive fields may leak;
- a database migration can break the UI;
- the browser may receive server-only code;
- the API can no longer control compatibility.

The frontend imports the generated API client and contract types instead.

---

## 15. How Workspace Packages Connect

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packages/domains/*"
  - "packages/packs/*"
```

The grouping directories `packages/domains` and `packages/packs` do not contain their own `package.json`; their child packages do.

### Example package names

```json
{
  "name": "@bizentra/sales",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

Other packages import only public exports:

```ts
import { CompleteSaleUseCase } from '@bizentra/sales'
```

Do not import a private file:

```ts
// Forbidden
import { SaleRepository } from '../../packages/domains/sales/src/infrastructure/prisma-repository'
```

### Root scripts

```json
{
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e"
  }
}
```

Turborepo understands the package dependency graph and builds prerequisites first. Remote caching can reuse unchanged build/test results in CI.

---

## 16. Inside One Domain Package

Example: `packages/domains/sales`.

```text
sales/
  src/
    domain/
      sale.ts
      sale-line.ts
      sale-policy.ts
      events/
        sale-completed.ts
      ports/
        sale-repository.ts
        pricing-port.ts
        payment-port.ts

    application/
      complete-sale.use-case.ts
      hold-sale.use-case.ts
      return-sale.use-case.ts
      dto/

    infrastructure/
      prisma-sale.repository.ts
      mappers/
      module.ts

    index.ts
  package.json
```

### Domain layer

Contains business meaning and rules:

```text
A completed sale cannot be edited.
A returned quantity cannot exceed the sold quantity.
A discount above the user's limit requires approval.
```

It does not know about HTTP, Next.js, NestJS controllers, Prisma Client, or Redis.

### Application layer

Coordinates a use case:

```text
Load sale/cart
Check permissions and state
Ask Pricing for authoritative calculation
Ask Payments for confirmed tender result
Ask Inventory to append required movement
Write audit and outbox records
Commit transaction
```

### Infrastructure layer

Connects the use case to technology:

- Prisma repository;
- PostgreSQL transaction adapter;
- provider SDK adapter;
- BullMQ publisher/processor;
- external HTTP client.

This separation lets tests replace technology adapters without replacing business rules.

---

## 17. How a Request Connects Across Folders

Example: `Complete Sale`.

```text
apps/pos/src/features/sale
  |
  | calls generated function
  v
packages/api-client
  |
  | POST /api/v1/sales/complete
  v
apps/api/src/controllers/sales.controller.ts
  |
  | maps transport request + BusinessContext
  v
packages/domains/sales/src/application/complete-sale.use-case.ts
  |
  | uses domain policies and ports
  v
packages/domains/sales/src/domain/*
  |
  | repositories/unit of work implemented through
  v
packages/database + sales infrastructure
  |
  v
PostgreSQL transaction
```

The response returns through the same path in reverse.

### Contract ownership

```text
OpenAPI specification / API DTO schemas
          |
          +-> API validates requests/responses
          |
          +-> generated api-client is built
          |
          +-> POS and Back Office compile against the client
          |
          +-> contract compatibility runs in CI
```

The frontend does not manually guess endpoint payloads.

---

## 18. How Business Packs Connect

Example: a supermarket scale barcode `2101234007505` may contain an item code and weight.

```text
Grocery pack ScaleBarcodeParser
          |
          | parses configured format
          v
Standard catalog result
  item_id = MILK-123
  quantity = 0.750 kg
          |
          v
Standard pricing/tax engine
          |
          v
Standard sale/payment engine
          |
          v
Standard inventory movement
```

The Grocery pack may add:

- parser and configuration;
- batch/expiry/FEFO validation;
- grocery promotion rules;
- grocery-specific screens and report filters.

It may not add:

- a second customer table;
- a second sale table;
- a second payment ledger;
- a second stock balance;
- a second finance source of truth.

### Extension interface idea

```ts
export interface BarcodeInterpreter {
  supports(input: string, context: BusinessContext): boolean
  interpret(input: string, context: BusinessContext): Promise<InterpretedBarcode>
}
```

The core application can register approved interpreters. Grocery implements one without replacing the common sale engine.

---

## 19. Database and Prisma Connection

### One authoritative database package

`packages/database` owns:

- Prisma schema;
- generated Prisma client;
- migration history;
- runtime client creation;
- transaction/unit-of-work adapter;
- direct versus pooled connection configuration;
- test database utilities.

### Runtime versus migration connections

```text
API / Worker
  -> pooled PostgreSQL endpoint
  -> handles many concurrent short transactions

Migration job / backup / administration
  -> direct PostgreSQL endpoint
  -> supports session/lock/administrative behavior
```

### Business isolation

Every Business-owned table includes `business_id`.

```text
sale
  id
  business_id
  branch_id
  customer_id
  total
  status

stock_movement
  id
  business_id
  location_id
  item_id
  quantity
  reference_type
  reference_id
```

Every request gets Business context after login membership is verified. Repository queries include the Business. Database constraints and optional proven RLS provide additional protection.

### Prisma rule

Use Prisma for normal type-safe data access, but allow reviewed parameterized SQL for:

- row locks and `SKIP LOCKED`;
- partial/expression indexes;
- RLS;
- window/report queries;
- materialized views;
- performance-critical batch operations.

The ORM supports the database design; it does not replace database knowledge.

---

## 20. Events, Outbox, Queue, and Worker

### The problem

Suppose the API saves a sale and then tries to publish `SaleCompleted` to Redis:

```text
Save sale in PostgreSQL: success
Publish event: process crashes
```

The sale exists, but the event is lost.

### Transactional outbox solution

```text
One PostgreSQL transaction
  - save sale
  - save payment/stock/finance effects
  - save outbox row SaleCompleted
Commit
```

The worker repeatedly reads unpublished outbox rows and queues/processes them. If it crashes, the row remains and can be retried.

### At-least-once means duplicate delivery is possible

Therefore a worker must be idempotent.

```text
Event ID E-100 processed first time -> create receipt notification
Event ID E-100 delivered again      -> detect already processed, do nothing harmful
```

### Worker processor structure

```text
apps/worker/src/processors/
  outbox-dispatch.processor.ts
  notification.processor.ts
  webhook.processor.ts
  export.processor.ts
  import.processor.ts
  reconciliation.processor.ts
```

Processors are entry points. They call application use cases from domain packages; they do not invent business rules.

---

## 21. Local Development Setup

### Services developers normally run

```text
PostgreSQL
Redis-compatible server
S3-compatible local object storage
OIDC provider or approved development identity setup
Mail/webhook test sink
```

Use containers for local stateful dependencies where practical. Applications may run directly with Node.js for fast reload.

### Example local ports

| Service | Example local address |
|---|---|
| POS | `http://localhost:3000` |
| Back Office | `http://localhost:3001` |
| API | `http://localhost:4000` |
| Worker health | `http://localhost:4001` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Object storage API | `http://localhost:9000` |

These are examples, not permanent public contracts.

### Environment variable groups

| App | Needs |
|---|---|
| POS | public API origin, OIDC public client settings, release version, feature-safe public settings |
| Back Office | API origin, OIDC/BFF settings, release version |
| API | database pool URL, OIDC issuer/audience, Redis, object storage, provider secrets, telemetry |
| Worker | database pool URL, Redis, object storage, provider secrets, telemetry |
| Migration job | direct database URL only through deployment secret injection |

Never put server secrets in `NEXT_PUBLIC_*` variables.

### Daily start sequence

```text
1. Start local stateful services
2. Apply development migrations
3. Seed a test Business, Branch, users, items, and policies
4. Start API and Worker
5. Start POS and Back Office
6. Open local telemetry/log view
7. Run the vertical slice being developed
```

---

## 22. Developer Workflow Example

Task: Add a manager-approved manual discount.

### Correct implementation sequence

1. Confirm SRS requirement and acceptance cases.
2. Define/update API contract and error codes.
3. Add domain policy: normal limit, manager threshold, prohibited state.
4. Add application use case/approval validation.
5. Add database migration only if new persistence is required.
6. Implement repository/infrastructure changes.
7. Add API controller/authorization mapping.
8. Regenerate `api-client`.
9. Add POS UI using design-system components.
10. Add audit evidence and event if required.
11. Add unit, integration, isolation, contract, E2E, and retry tests.
12. Add telemetry/dashboard fields without sensitive content.
13. Update documentation and release notes.

### Wrong implementation

```text
Add a discount input in POS
  -> hide it for cashiers with CSS
  -> directly send final total to database
```

The API must calculate/validate the authoritative result. UI hiding is not authorization.

---

## 23. Testing by Architecture Layer

| Layer | Test question | Example |
|---|---|---|
| Domain unit test | Is the rule correct? | return quantity cannot exceed sold quantity |
| Application test | Are owners coordinated correctly? | completed sale requests one stock effect |
| Database integration | Do constraints/transactions/locks work in PostgreSQL? | two requests cannot reserve the same last unit incorrectly |
| API contract | Can clients safely call the endpoint? | request and problem response match OpenAPI |
| Worker integration | Are retries/duplicates safe? | same event delivered twice sends one logical webhook result |
| Frontend component | Can the user understand and perform the action? | cashier sees approval-required message |
| Playwright E2E | Does the complete workflow work? | scan -> pay -> receipt -> stock/report check |
| Performance | Does it work at expected volume? | burst barcode scans and peak checkout concurrency |
| Failure test | Does recovery preserve correctness? | Redis unavailable after sale commit |
| Isolation test | Can another Business see anything? | Business A cannot query Business B sale ID |

Use real PostgreSQL and Redis-compatible services for integration tests. In-memory substitutes cannot prove production transactions, locks, RLS, or queue behavior.

---

## 24. What Is Actually Deployed?

### Build outputs

| Source | Build artifact | Deployment target |
|---|---|---|
| `apps/pos` | Next.js container/site artifact | POS web service/CDN origin |
| `apps/backoffice` | Next.js container/site artifact | Back Office web service/CDN origin |
| `apps/api` | Node.js container image | API managed container service |
| `apps/worker` | Node.js container image | Worker managed container service |
| `packages/*` | Bundled into consuming application | Not normally deployed separately |
| `packages/database/prisma/migrations` | Migration artifact inside controlled job image | One-time deployment job |
| `infrastructure/*` | IaC plan | Cloud platform resources |

### One repository does not mean one release

Turborepo can build only affected apps.

```text
Change design-system button
  -> test/build POS and Back Office

Change inventory domain package
  -> test/build API and Worker
  -> run affected integration/contract tests

Change only POS screen
  -> deploy POS without deploying Back Office
```

Shared package changes trigger all consuming applications, which is correct because those applications include the package code in their own artifacts.

---

## 25. Production Deployment Topology

```text
Internet / stores
       |
       v
DNS + CDN + WAF + TLS
       |
       +--> pos.example.com --> POS service replicas
       |
       +--> app.example.com --> Back Office replicas
       |
       +--> api.example.com --> API load balancer --> API replicas
                                              |
                    +-------------------------+------------------------+
                    |                         |                        |
                    v                         v                        v
             PostgreSQL pool             Redis/BullMQ           Object storage
                    |                         |
                    |                         v
                    |                    Worker replicas
                    |                         |
                    +-------------------------+
                                              |
                                      external providers

Private/admin paths
  -> direct PostgreSQL endpoint for migration/backup tools only
  -> identity provider
  -> telemetry collector and dashboards
  -> secret manager/KMS
```

Applications are stateless at the server-instance level. If one API replica stops, another can serve the next request because correctness does not live only in process memory.

---

## 26. CI/CD Deployment Flow

### Pull request pipeline

```text
Install from locked dependencies
  -> format/lint/typecheck
  -> architecture import checks
  -> unit/component tests
  -> PostgreSQL/Redis integration tests
  -> OpenAPI compatibility check
  -> migration validation
  -> security/dependency/secret scan
  -> build affected deployables
  -> container scan and SBOM
  -> critical Playwright tests
```

### Production pipeline

```text
Merge approved change
  |
Build immutable versioned images
  |
Deploy to staging
  |
Apply staging migration using direct DB connection
  |
Run smoke, E2E, performance, and migration checks
  |
Approve production
  |
Run safe production migration step
  |
Deploy API/Worker canary or rolling revision
  |
Observe errors, latency, outbox, jobs, payments, stock posting
  |
Deploy compatible POS/Back Office versions
  |
Promote or roll back/forward-fix
```

### Why database migration deployment is separate

If every API replica automatically runs migrations on startup, several replicas may compete, an unsafe migration can affect startup, and rollback becomes unclear. Use one controlled migration job.

---

## 27. Safe Database Migration Example

Goal: make `customer.phone_normalized` mandatory.

Unsafe migration:

```text
Add NOT NULL column immediately
```

This may lock/fail because existing rows have no value.

Safe expand-and-contract:

```text
Release A: EXPAND
  - add nullable phone_normalized
  - deploy code that writes both old and new representation

Background job
  - backfill existing customers in small resumable batches
  - report progress and failures

Validation
  - confirm no remaining null/invalid rows

Release B: ENFORCE
  - add validated constraint / make field mandatory safely
  - read from new field

Release C: CONTRACT
  - remove old field/code after all deployed versions no longer need it
```

This lets old and new application versions overlap during rolling deployment.

---

## 28. Rollback and Forward-Fix

### Application-only failure

Deploy the previous immutable image if API/data contracts remain compatible.

### Additive database migration

Usually roll back application code while leaving the unused additive column/table. Remove it later after safety review.

### Data transformation or destructive migration

It may not be safely reversible. Prefer a tested forward-fix, preserved old data, backups, and an explicit recovery plan.

### POS release failure

- stop promotion to more terminals;
- keep the previous compatible POS version available;
- do not activate a service worker update while pending commands could become unreadable;
- preserve IndexedDB schema compatibility or provide a tested migration;
- reconcile commands created during the affected release.

### Payment/stock correctness after incident

Rolling back code is not enough. Run reconciliation:

- provider payment versus Bizentra attempt/result;
- sale versus stock movement;
- sale/refund versus finance/loyalty;
- outbox versus processed event/job;
- offline command versus authoritative sync receipt.

---

## 29. How Each Deployable Scales

| Pressure | Scale action |
|---|---|
| Many cashiers/users | add POS/Back Office web replicas and CDN capacity |
| High API request volume | add stateless API replicas and tune connection pools |
| Many notifications/webhooks/exports | add worker replicas or queue-specific workers |
| Slow reports | use projections/read replica, then analytics store if measured need exists |
| Large search workload | optimize PostgreSQL search, then add search service if required |
| Large event volume after service extraction | add durable broker when outbox/BullMQ no longer fits the topology |
| One very large Business | per-Business limits/routing, then dedicated compute/database tier if justified |

Always find the bottleneck first. Adding microservices, Kubernetes, Kafka, or a search cluster without measured need increases cost and failure modes.

---

## 30. Security in Everyday Architecture

### User request

```text
OIDC proves who the user is
  -> API verifies active Business membership
  -> API verifies Branch and permission
  -> application rule verifies record state and approval limit
  -> repository scopes data by business_id
  -> audit records the action
```

### Important distinctions

- Authentication: “Who are you?”
- Authorization: “May you refund this sale in this Branch for this amount?”
- Business isolation: “Can any request from Business A touch Business B?”
- Approval: “Did the correct manager approve this exceptional action?”
- Audit: “Can we prove who requested, approved, and completed it?”

### Payment data

The certified payment provider/terminal handles sensitive card data. Bizentra stores references, masked values, amounts, statuses, and reconciliation evidence—not raw card details.

---

## 31. Observability — How We Know the System Works

Every important operation carries a correlation ID.

```text
POS request trace_id=T-900
  -> API CompleteSale span
  -> PostgreSQL transaction span
  -> outbox event correlation_id=T-900
  -> Worker notification/webhook spans
```

An operator can answer:

- Did the API receive the sale?
- Which version processed it?
- Did PostgreSQL commit?
- Was the outbox event created?
- Did the worker process it?
- Was the webhook retried?
- Which Business, Branch, terminal, and safe operation ID were involved?

Logs must not include secrets, raw card data, tokens, or unnecessary customer information.

---

## 32. Common Architecture Mistakes

| Mistake | Why it fails | Correct approach |
|---|---|---|
| Put all backend logic in Next.js actions/routes | background jobs, external clients, and transactional modules become coupled to web deployment | Next.js BFF calls the core API/application contract |
| Start with one microservice per module | distributed failure and operations arrive before product evidence | modular monolith with extraction seams |
| Create one frontend per business type | duplicated UI/data logic and hard cross-pack use | POS/Back Office with feature packs |
| Let frontend import Prisma types | database leaks into public contract | OpenAPI-generated client/contracts |
| Store stock total only in Redis | cache loss corrupts truth | PostgreSQL movement ledger + projection |
| Publish event only after DB commit without outbox | process crash loses event | transactional outbox |
| Retry payment blindly after timeout | customer may be charged twice | provider idempotency and reconciliation |
| Generic last-write-wins offline sync | money/stock/approvals become wrong | command-specific conflict rules |
| Run migrations from every app replica | race, startup, and rollback risk | one controlled migration job |
| Hide button and call it security | caller can invoke API directly | server-side authorization |
| Add Kubernetes because the system is “large” | high operational cost without benefit | managed containers until evidence gate |
| One unrestricted `shared` folder | invisible coupling and ownership | narrow named packages and public exports |

---

## 33. Recommended Learning Path

### Lesson 1 — Follow one sale

Draw and explain:

```text
POS -> API -> Sales -> Payment -> Inventory -> PostgreSQL -> Outbox -> Worker
```

Checkpoint: explain which data must commit immediately and which work may happen later.

### Lesson 2 — Learn folder ownership

Choose five files for a `CompleteSale` change and explain why each belongs in its folder.

Checkpoint: frontend never imports database code; controller contains no business rule.

### Lesson 3 — Learn idempotency

Send the same command twice.

Checkpoint: one authoritative sale, payment, stock effect, and event result.

### Lesson 4 — Learn Business isolation

Attempt to load a known sale ID using another Business user.

Checkpoint: no data, counts, names, or cross-Business error details leak.

### Lesson 5 — Learn offline synchronization

Complete an approved offline cash sale, restart the browser, reconnect, and resend.

Checkpoint: command survives and synchronizes once.

### Lesson 6 — Learn deployment

Make a POS-only text change, build affected packages, deploy only POS, and confirm API compatibility.

Checkpoint: understand monorepo versus deployable.

### Lesson 7 — Learn safe migrations

Practice an expand/backfill/enforce/contract change using a realistic test database.

Checkpoint: old and new application versions work during rollout.

### Lesson 8 — Learn recovery

Stop Redis after a sale commits, restart it, and observe outbox recovery.

Checkpoint: sale remains correct and side effects resume without harmful duplication.

---

## 34. Architecture Review Checklist for Every Feature

Before implementation:

- Which SRS requirement and user story does this satisfy?
- Which domain owns the truth?
- Is it common functionality or a business-pack extension?
- Which app presents it?
- What is the API/command/query contract?
- What Business/Branch/permission/approval applies?
- What must be in one transaction?
- What events/outbox work follow the commit?
- What must be idempotent?
- Does it work offline? If yes, what is the conflict policy?
- What database migration is required?
- What data is sensitive?
- What logs, metrics, traces, alerts, and reconciliation are required?
- Which deployables and tests are affected?
- Is the change backward compatible during rolling deployment?

After implementation:

- domain and application tests pass;
- real PostgreSQL integration tests pass;
- Business-isolation tests pass;
- API contract and generated client are updated;
- duplicate/retry/failure cases pass;
- frontend states and accessibility pass;
- worker/event behavior is observable and idempotent;
- migration and rollback/forward-fix are tested;
- documentation and operational runbooks are updated.

---

## 35. Glossary in Simple English

| Term | Simple meaning |
|---|---|
| Monorepo | One repository containing several applications and reusable packages |
| Deployable | A runnable application/process released independently |
| Modular monolith | One main backend deployment separated internally into owned business modules |
| Microservice | An independently deployed service owning a focused capability/data boundary |
| Micro-frontend | An independently developed/deployed frontend area |
| BFF | Backend for Frontend; web-specific session/proxy/response shaping layer |
| Domain | One business responsibility such as Sales or Inventory |
| Application use case | Coordinated operation such as Complete Sale |
| Infrastructure adapter | Code connecting business operations to Prisma, Redis, or a provider |
| Source of truth | Authoritative record used to decide what really happened |
| ACID transaction | Related database changes commit together or roll back together |
| Idempotency | Retrying the same operation does not create another harmful result |
| Outbox | Database table recording events in the same transaction as business state |
| Queue | Durable/managed list of background work to process |
| Worker | Process that completes queued, scheduled, or retryable work |
| Projection | Read-optimized summary built from authoritative data/events |
| OIDC | Standard protocol used for login and identity tokens |
| RLS | PostgreSQL policy that can restrict rows a database role may access |
| IaC | Infrastructure as Code; cloud resources defined and reviewed in files |
| SLO | Measurable reliability/performance objective |
| RPO | Maximum approved amount of data loss during disaster recovery |
| RTO | Maximum approved time to restore service |

---

## 36. Final Mental Model

Remember these seven rules:

1. **The frontend asks; the API decides.**
2. **PostgreSQL stores the confirmed truth.**
3. **A transaction keeps related critical records together.**
4. **The outbox and workers finish slow/retryable work safely.**
5. **Business packs extend common engines; they do not copy them.**
6. **One monorepo can contain many independently deployable applications.**
7. **Split into micro-frontends or microservices only when real team, scale, reliability, or compliance evidence requires it.**

If you can follow a sale from the POS folder to the API contract, domain use case, PostgreSQL transaction, outbox event, worker, and production deployment, you understand the core Bizentra architecture.

## 37. Related Documents

- [`01_ARCHITECTURE_RECOMMENDATION.md`](./01_ARCHITECTURE_RECOMMENDATION.md)
- [`02_FRONTEND_AND_MICRO_FRONTEND.md`](./02_FRONTEND_AND_MICRO_FRONTEND.md)
- [`03_BACKEND_DATABASE_AND_EVENTING.md`](./03_BACKEND_DATABASE_AND_EVENTING.md)
- [`04_PLATFORM_SECURITY_AND_OPERATIONS.md`](./04_PLATFORM_SECURITY_AND_OPERATIONS.md)
- [`05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md`](./05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md)

## 38. Authoritative Technical References

- [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones)
- [NestJS documentation](https://docs.nestjs.com/)
- [Turborepo repository structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [Prisma ORM documentation](https://www.prisma.io/docs/orm)
- [PostgreSQL documentation](https://www.postgresql.org/docs/18/)
- [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- [Dexie documentation](https://dexie.org/docs)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)

