# Bizentra Architecture Recommendation

**Decision:** Build a domain-modular monolith with separate web, API, and worker deployables. Preserve clean extraction seams for later services.

## 1. Scope Drivers Found in the SRS

The current repository contains 261 unique functional requirements and 59 user stories across Common Core, Grocery / Supermarket, and General Retail. The development plan adds 28 more business packs. The architecture must therefore support more than CRUD screens.

| Driver | Architectural consequence |
|---|---|
| Many Businesses and Branches | Business context must be mandatory at every request, query, event, cache key, job, file, and log boundary. |
| Sales, stock, payments, and finance | ACID transactions, immutable ledgers, idempotency, reversals, and reconciliation are mandatory. |
| Offline POS | The client creates durable commands with globally unique IDs and later synchronizes them to a server-authoritative model. |
| Shared business events | Confirmed facts need versioned event contracts, an outbox, retry-safe consumers, and operator-visible failures. |
| Many business packs | Business-specific behavior must extend common domain modules instead of copying them. |
| Hardware and integrations | Device adapters and third-party providers must sit behind stable ports so they can be replaced. |
| Reporting and migration | Long-running reads/imports must not block checkout or exhaust web/database connections. |
| Security and audit | Identity, permissions, approvals, data isolation, and audit evidence must be designed in, not added later. |

## 2. Why Not Use Only Next.js for Everything?

Next.js is an excellent application framework and provides Route Handlers, Server Actions, server rendering, and BFF capabilities. It remains the correct choice for Bizentra's web applications.

However, the official Next.js BFF guide states that its backend capabilities are not a full backend replacement and notes deployment caveats such as request timeouts, no shared in-memory state between requests, and WebSocket limitations on some serverless hosts.

Bizentra needs:

- long-lived worker processes;
- durable queue consumers;
- payment and webhook processing;
- stock and finance transactions;
- offline synchronization;
- scheduled purchasing/replenishment work;
- imports, exports, and report generation;
- stable APIs for multiple frontends and external systems.

Therefore:

```text
Next.js owns presentation and frontend-specific orchestration.
NestJS owns reusable application and domain operations.
Workers own asynchronous and scheduled execution.
PostgreSQL owns authoritative transactional state.
```

## 3. Deployment Units

| Unit | Responsibility | May access PostgreSQL? |
|---|---|---:|
| `pos` | Cashier UI, local catalog, offline queue, payment/device interaction, sync status | No direct access; API only |
| `backoffice` | Administration, master data, inventory, purchasing, finance, CRM, reports | No direct browser access; server components use the API or approved server-side application client |
| `api` | Authentication enforcement, authorization, validation, transactions, domain workflows, API contracts | Yes |
| `worker` | Outbox dispatch, queued jobs, retries, schedules, imports/exports, provider callbacks, webhooks | Yes |
| `operations` later | KDS, service bay, dispatch, or other real-time operational views | API only |

The API and worker can initially use the same domain packages and database. They are separate processes because their scaling and failure patterns differ.

## 4. Domain Module Boundaries

The Common Core SRS already defines useful boundaries. Implement them as modules with explicit public APIs.

| Domain module | Owns | Does not own |
|---|---|---|
| Identity & Access | User link, Business membership, Branch assignment, roles, permissions, approval policy | Password storage when an OIDC provider is used |
| Business Configuration | Business, Branch, Location, feature pack, numbering, settings | Catalog or stock records |
| Catalog | Item, variant, unit, barcode, brand, category, business-pack attributes | Price calculation or stock balance |
| Pricing, Promotion & Tax | Price lists, promotion rules, tax selection/calculation | Payment capture or ledger posting |
| Sales & Orders | Cart/order lifecycle, lines, holds, fulfillment intent | Payment provider state or stock ledger |
| Payments | Tender attempts, provider references, capture/refund state, settlement evidence | Customer invoice rules or stock movement |
| Inventory | Stock movement ledger, reservation, availability projection, counts, transfers | Purchase-order approval or sales pricing |
| Purchasing | Purchase request/order, supplier terms, receiving intent | Stock increase before physical receipt or payable before bill posting |
| Fulfillment | Picking, packing, pickup, delivery intent/status | Direct stock or payment mutation |
| Finance | Invoice, credit note, AR/AP, expense, settlement, optional journal integration | POS cart state |
| CRM & Loyalty | Customer, groups, preferences, loyalty/store-credit ledger | Sale totals or payment truth |
| Reusable Operations | Workflow, booking, work ticket, customer asset, traceability, warranty, recipe/BOM, route | Separate vertical copies of inventory/finance/customer data |
| Integration | Provider adapters, webhooks, import/export, error queue | Domain decision-making |
| Reporting | Read models, aggregates, exports, KPI definitions | Operational writes |
| Audit & Compliance | Append-only action history, approval evidence, access evidence | Editing source transactions |

### Dependency direction

```text
Presentation / Transport
          |
          v
Application use cases
          |
          v
Domain rules and ports
          |
          v
Infrastructure adapters
PostgreSQL / Prisma / Redis / providers
```

Domain code shall not import Next.js, HTTP request objects, Prisma Client, Redis clients, or provider SDKs. Infrastructure implements domain ports.

## 5. Modular Monolith Rules

1. Each domain module has a documented owner, public application API, events, database tables, and tests.
2. One module does not write another module's tables directly.
3. Cross-module synchronous work uses an application service/port.
4. Cross-module asynchronous work uses a committed domain event.
5. Shared database access does not grant shared ownership.
6. Cross-module foreign keys are allowed only when they preserve integrity without causing ownership leakage; otherwise use immutable identifiers and validation.
7. Cyclic module dependencies fail the architecture test.
8. Vertical packs register policies, attributes, workflows, and UI extensions; they do not fork the Common Core modules.

## 6. Command, Transaction, and Event Flow

Example: completed sale.

```text
POS command: CompleteSale
  idempotency_key, business_id, branch_id, device_id, cart_version
                         |
                         v
API authorization + validation
                         |
                         v
One short PostgreSQL transaction
  - confirm sale/order
  - record tender result or payment reference
  - append required stock movement(s)
  - append invoice/receipt state
  - write audit evidence
  - write outbox event(s)
                         |
                         v
Commit and return authoritative result
                         |
                         v
Worker publishes/processes outbox
  - customer history
  - loyalty projection
  - analytics projection
  - receipt notification
  - external webhooks
```

Critical invariants that must be visible immediately belong in the same database transaction. Slow or retryable side effects happen after commit.

## 7. Business Data Isolation

### Default model: shared schema, shared tables

Every Business-owned row includes `business_id NOT NULL`. Branch-scoped rows also include `branch_id` where applicable.

Required controls:

- derive Business membership from the authenticated identity, never trust an arbitrary browser-supplied `business_id`;
- require a `BusinessContext` at application service entry points;
- include `business_id` in repository filters and composite uniqueness constraints;
- include Business in cache keys, idempotency keys, job payloads, event envelopes, object-storage paths, and telemetry;
- reject cross-Business references in database constraints or application validation;
- run automated isolation tests for every repository and API resource;
- use a non-owner database role for runtime access;
- evaluate PostgreSQL Row-Level Security as a second control, not as the only control.

### Enterprise isolation option

A later enterprise tier may use a dedicated database or cluster for regulatory, residency, very large volume, or contractual isolation. The domain APIs must remain the same so this is a routing/provisioning decision, not a product rewrite.

### Why not schema-per-Business by default?

Schema-per-Business makes migrations, connection pools, cross-Business operations, monitoring, and thousands of Business accounts more complex. A shared schema with strong scoping is the better default for the planned SaaS model.

## 8. Scalability Model

Scale independently by workload before splitting business services.

| Pressure | First response | Later response |
|---|---|---|
| More web traffic | Add stateless Next.js instances/CDN caching | Split unrelated route zones if teams/releases require it |
| More API traffic | Add stateless API replicas; tune queries/pools | Extract a hot domain service only after profiling |
| More background work | Add workers by queue/concurrency | Dedicated worker pools or service extraction |
| Read-heavy reports | Precomputed projections/materialized views; read replica | Analytics store/warehouse |
| Large append-only tables | Index review, retention, archiving | Time partitioning based on evidence |
| Search demand | PostgreSQL trigram/full-text indexes | OpenSearch only when relevance/scale requires it |
| Event consumers | Outbox + BullMQ | Durable broker such as NATS JetStream/Kafka after service split |
| Large Business | Per-Business throttles and workload routing | Dedicated database/compute tier |

### Stateless does not mean state-free

API and web instances must not rely on process memory for correctness. Durable state lives in PostgreSQL, the approved queue store, object storage, or the POS device database.

## 9. When a Module May Become a Microservice

Extraction is approved only when at least one measurable condition exists:

- it requires an independent availability or disaster-recovery target;
- it must scale at least 5–10 times differently from the rest of the API;
- it needs a different data technology for demonstrated reasons;
- a dedicated team owns and releases it independently;
- regulatory or payment scope requires network/data isolation;
- deployment coupling causes repeated incidents or release blocking;
- its background workload materially harms core checkout latency;
- the module boundary and event contracts have already remained stable.

Before extraction, prove:

1. the module owns its data;
2. callers use its public API rather than its tables;
3. its events are versioned and idempotent;
4. distributed failure, timeout, retry, and reconciliation behavior is defined;
5. observability can trace work across the new boundary;
6. the operational cost is funded and owned.

Likely future candidates are Notifications, Integration/Webhooks, Reporting/Exports, Search, and very high-volume Payment processing. Inventory and Finance should not be split early because their invariants are central and tightly coordinated with sales.

## 10. Repository Boundary Enforcement

Use:

- package `exports` to expose only public entry points;
- lint rules to block forbidden imports;
- dependency graph checks in CI;
- separate Prisma repository implementations behind domain ports;
- contract tests between apps and the API;
- architecture tests that fail on cyclic domain imports;
- code ownership rules for domain and infrastructure packages.

Suggested package pattern:

```text
packages/
  sales-domain/             # entities, policies, ports, events
  sales-application/        # use cases
  sales-infrastructure/     # Prisma repositories, provider adapters
  inventory-domain/
  inventory-application/
  inventory-infrastructure/
```

Do not create a single unrestricted `shared` package. Use narrowly named packages such as `money`, `ids`, `contracts`, and `observability`.

## 11. Architectural Risks and Controls

| Risk | Control |
|---|---|
| Next.js becomes the hidden core backend | Core write use cases exist only in the API/application packages. |
| Modular monolith becomes a big ball of mud | Enforced package boundaries, public APIs, ownership, and architecture tests. |
| Business data leaks | Mandatory context, composite constraints, repository tests, non-owner DB role, optional RLS. |
| Duplicate sale/payment/stock effects | Idempotency table, unique provider references, transactional ledgers, outbox, idempotent consumers. |
| Event loss between DB and queue | Transactional outbox written with business state. |
| Queue becomes source of truth | Rebuild queue work from PostgreSQL state/outbox; reconciliation jobs detect gaps. |
| Reporting harms checkout | Separate workers, projections, resource limits, read replicas/warehouse later. |
| Premature microservices slow delivery | Extraction gates require measured evidence and operational ownership. |
| Vertical packs copy common logic | Extension points and shared domain services are mandatory in acceptance review. |

## 12. Architecture Acceptance Criteria

- A sale retry with the same idempotency key returns the original result and creates no duplicate payment, stock, finance, loyalty, or outbox effects.
- A User from Business A cannot read, infer, reference, update, enqueue, export, or subscribe to Business B data.
- A queue outage does not roll back a committed sale; outbox work resumes after recovery.
- A report or export failure cannot prevent checkout.
- Vertical pack code can add fields/rules/workflows without creating a second Customer, Item, Payment, Inventory, or Finance source of truth.
- POS and Back Office deploy independently while using compatible versioned API contracts.
- API and worker instances scale horizontally without correctness depending on local process memory.

## 13. References

- [Next.js Backend for Frontend guidance](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [NestJS application and microservice capabilities](https://docs.nestjs.com/)
- [NestJS Fastify adapter](https://docs.nestjs.com/techniques/performance)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [PostgreSQL table partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)

