# Technology Implementation Roadmap and Decision Gates

**Purpose:** Turn the architecture into an executable delivery sequence aligned with Common Core phases P0–P8 and the first Grocery / General Retail packs.

## 1. Delivery Strategy

Use vertical slices that prove business invariants early. Do not build the entire infrastructure, database model, UI framework, or event platform before completing a real end-to-end sale.

```text
Foundation
  -> Business-isolated master data
  -> online sale and payment
  -> stock/purchasing
  -> finance/customer controls
  -> reusable vertical engines
  -> offline/devices
  -> reports/integrations/migration
  -> production hardening
```

For every slice, complete UI, API contract, authorization, database constraints, transaction, audit, events, tests, telemetry, migration impact, and operational runbook together.

## 2. Technology Phases

| Tech phase | SRS alignment | Outcome |
|---|---|---|
| T0 | Before / Common P0 | Architecture baseline, monorepo, environments, CI, identity spike, database conventions |
| T1 | Common P0 | Secure Business/Branch/User foundation and data-isolation proof |
| T2 | Common P1 | Catalog, customer, supplier, pricing, tax, and import foundations |
| T3 | Common P2 | Online POS sale, payment, receipt, return, and idempotency |
| T4 | Common P3 | Inventory ledger, purchasing, receiving, transfer, reservation, fulfillment |
| T5 | Common P4 | Finance, credit, loyalty, approvals, audit, reconciliation |
| T6 | Common P5 | Reusable workflow, booking, work ticket, traceability, recipe/BOM, route engines |
| T7 | Common P6 | Offline POS, terminal management, sync protocol, printers/scanners/scales |
| T8 | Common P7 | Reports, APIs, webhooks, imports/exports, migration, projections |
| T9 | Common P8 | Security hardening, SLOs, load, HA, backup/restore, DR, production readiness |
| T10 | Grocery/General Retail | First vertical production releases using only shared engines and extension points |

## 3. Phase T0 — Architecture and Workspace Foundation

### Scope

- create pnpm/Turborepo workspace;
- establish `apps/pos`, `apps/backoffice`, `apps/api`, and `apps/worker`;
- create shared `contracts`, `database`, `design-system`, `auth`, `observability`, `offline`, and `testing` packages;
- pin Node.js 24 LTS and exact package-manager/tool versions;
- select the patched Next.js 16.3 release available after the scheduled 2026-08-26 security release;
- select Prisma ORM 7 GA and PostgreSQL 18/current provider minor;
- create local PostgreSQL/Redis/object-storage development setup;
- define OpenAPI, error, event-envelope, ID, decimal, timestamp, and naming conventions;
- configure formatting, lint, strict TypeScript, architecture-boundary checks, unit/integration/E2E test runners;
- create CI build/test/security/container pipeline;
- draft ADRs and threat model.

### Required spikes

1. NestJS/Fastify + Prisma 7 + PostgreSQL transaction and connection-pool behavior.
2. Business context and optional PostgreSQL RLS through Prisma transaction + PgBouncer transaction pooling.
3. POS IndexedDB schema upgrade while pending commands exist.
4. One representative scanner and receipt printer adapter.
5. OIDC login, token/session renewal, logout, and service-to-service validation.
6. Outbox row + worker dispatch + duplicate job processing.

### Exit gate

- all spike findings are recorded in ADRs;
- a minimal request flows from both Next.js apps through the generated API client to NestJS and PostgreSQL;
- trace/log correlation works across web, API, and worker;
- a pull request cannot bypass type, test, architecture, migration, and security checks;
- no unresolved framework-version or identity choice blocks T1.

## 4. Phase T1 — Business-Isolated Platform Foundation

### Scope

- OIDC integration and Bizentra user profile link;
- Business, Branch, Location, User membership, role, permission, and feature-pack model;
- Business-context middleware/guard and repository scoping;
- runtime/migration database roles;
- document numbering service;
- approval-policy foundation;
- append-only audit event foundation;
- support/admin access model;
- Business switch UI and access checks;
- isolation tests across API, jobs, caches, events, and object paths.

### Architecture fitness tests

- a repository method cannot run without Business context unless explicitly marked platform-level;
- cross-Business foreign references fail;
- Business A cannot infer Business B through IDs, uniqueness errors, counts, search, exports, or timing-sensitive bulk endpoints;
- support access requires privileged identity, reason, expiry, and audit;
- runtime database role cannot bypass intended isolation controls.

### Exit gate

Common P0 user stories and Must requirements pass. A security review approves the isolation model before transactional business modules begin.

## 5. Phase T2 — Master Data and Contract Foundation

### Scope

- Item, Variant, Unit, Barcode, Category, Brand;
- customer and supplier;
- price list, promotion, tax rule, and Business/Branch configuration;
- exact decimal and rounding policies;
- search and pagination conventions;
- import staging, validation, preview, commit, and error report;
- object-storage signed uploads and file scanning;
- cache namespace/invalidation conventions;
- public API/client generation.

### Key rules

- Business-scoped uniqueness for SKU/barcode/customer/supplier identifiers;
- snapshot/version master data used by later transactions;
- imports are resumable, bounded, auditable, and do not partially commit silently;
- cache failure degrades to authoritative reads;
- no vertical-specific duplicate Item or Customer table.

### Exit gate

Representative catalog and customer volumes meet list/search/import budgets; cross-Business and malformed-file tests pass.

## 6. Phase T3 — Online Sale and Payment Slice

### Scope

- POS application shell and design-system cashier components;
- terminal registration and shift opening;
- cart, hold/resume, price/tax/discount calculation;
- completed sale command with idempotency;
- cash and one sandbox electronic payment provider;
- receipt data and print adapter;
- void, partial/full return, credit note/refund foundation;
- sale/payment/audit/outbox transaction;
- provider webhook signature/deduplication/reconciliation;
- sale/payment operational dashboards and alerts.

### Critical tests

- duplicate click/request/callback;
- payment succeeds but response times out;
- payment fails after sale intent;
- process crashes before/after provider call;
- API crashes before/after database commit;
- outbox/Redis unavailable after committed sale;
- manager approval expires or is reused;
- decimal/tax rounding boundary cases;
- Business/Branch/terminal/user mismatch.

### Exit gate

A sale and return reconcile across order, payment, receipt/credit, audit, provider state, and outbox with no duplicate result under retries.

## 7. Phase T4 — Inventory and Purchasing Slice

### Scope

- append-only stock movement ledger and balance projection;
- Locations, availability, reservation, release, and fulfillment state;
- purchase order, goods receipt, supplier bill handoff;
- partial/over/under receipt policy;
- transfer ship/receive and stock-in-transit state;
- count, variance, adjustment, damage, and reason/approval;
- reorder inputs and scheduled suggestion job;
- concurrency handling and reconciliation reports.

### Critical tests

- simultaneous sale/reservation of the last quantity;
- goods receipt retried after timeout;
- transfer shipped but not received;
- stock count while movements occur;
- adjustment without required approval;
- one physical movement producing multiple events;
- ledger/balance projection mismatch and rebuild;
- high-volume movement query/index plan.

### Exit gate

Sale, receipt, return, transfer, reservation, count, and adjustment each produce exactly one correct authoritative stock effect and reconcile by Item/Variant/Location.

## 8. Phase T5 — Finance, Customer, and Control Slice

### Scope

- invoice/credit note, receivable/payable, collection/payment allocation;
- expense and cash shift/reconciliation;
- customer credit limit/hold;
- loyalty and store-credit ledgers;
- approval thresholds and separation of duties;
- optional accounting event contracts;
- immutable financial audit and financial reports;
- provider settlement reconciliation.

### Critical tests

- partial payment/allocation and reversal;
- refund to original tender/store credit;
- duplicate collection/payment import;
- expired approval and requester approving own work;
- sale/customer/finance/loyalty posting mismatch;
- cash over/short with approval;
- decimal precision and exchange/currency policy;
- financial report as-of reconciliation.

### Exit gate

Money movements, balances, cash, provider settlement, and ledger projections reconcile. Finance authorization receives focused review.

## 9. Phase T6 — Reusable Operations Engines

Build the generic engines one at a time only when a vertical slice needs them:

- workflow/state machine;
- work ticket;
- booking/resource;
- customer asset;
- serial/IMEI/batch/expiry traceability;
- warranty/RMA;
- recipe/BOM and material consumption;
- route/delivery;
- notification template/preference.

### Extension contract

Each engine defines:

- owning data and states;
- allowed commands and permissions;
- emitted events;
- configuration and custom attributes;
- vertical UI extension points;
- report/audit behavior;
- offline applicability;
- prohibited direct stock/finance mutations.

### Exit gate

At least two different business use cases reuse an engine without copying its source of truth where reuse is claimed.

## 10. Phase T7 — Offline and Devices

### Scope

- POS local catalog/policy snapshot;
- Dexie schema and durable command queue;
- terminal/device identity and update status;
- foreground sync, retry/backoff, receipts, and conflict review;
- offline policy for cash sale and explicitly supported actions;
- service worker asset/update strategy;
- scanner, printer, drawer, scale, and payment-terminal adapters required by the first release;
- manager/admin terminal health screen;
- local-data minimization and remote revoke behavior.

### Rollout plan

1. shadow local queue while always online;
2. controlled network interruption in test stores;
3. limited cash-only offline operation;
4. restart/browser update/schema-upgrade exercises;
5. pilot terminal cohort;
6. monitored broader rollout.

### Exit gate

An approved offline sale survives browser/app restart, reconnects, synchronizes exactly once, prints/recovers evidence, and reconciles sale/payment/stock/shift. Rejected/conflicting work is visible and recoverable.

## 11. Phase T8 — Reporting, Integrations, and Migration

### Scope

- versioned report definitions and read projections;
- asynchronous exports to object storage;
- signed/idempotent webhooks and retry/dead-letter console;
- integration credentials/secrets and per-provider adapters;
- import staging and migration reconciliation;
- public integration API scopes/rate limits;
- projection lag/freshness indicators;
- optional read replica after load evidence.

### Exit gate

Reports reconcile with source ledgers; webhooks retry without duplicates; failed integrations are visible; migrated totals/counts/balances have signed approval evidence.

## 12. Phase T9 — Production Hardening

### Scope

- threat model and OWASP ASVS verification;
- dependency/container/SBOM review;
- performance and soak tests on production-like volume;
- failure injection for database failover, Redis outage, provider timeout, and worker restart;
- SLO dashboards and burn-rate/actionable alerts;
- backup, PITR, and full restore exercise;
- DR and payment/offline reconciliation exercise;
- canary/rollback/forward-fix release validation;
- data retention/privacy/export/deletion controls;
- on-call, support, incident, and change procedures;
- cost and capacity model.

### Exit gate

All production Definition of Done items in the SRS and technology documents pass with recorded evidence and named operational owners.

## 13. Phase T10 — First Business Packs

### Grocery / Supermarket

Add only:

- weighted/scale barcode behavior;
- batch, expiry, FEFO, and waste workflows;
- grocery promotions and high-speed checkout adaptations;
- grocery hardware/performance tests;
- grocery KPIs and exceptions.

### General Retail

Add only:

- retail quick layouts, variants, labels;
- exchange and pickup workflows;
- retail replenishment/loss-control views;
- retail reports and device combinations.

### Exit gate

The vertical code uses Common Core Item, Customer, Sale, Payment, Inventory, Purchasing, Finance, Loyalty, Offline, Audit, and Reporting owners. Architecture tests detect prohibited duplicated persistence.

## 14. Micro-Frontend Decision Gate

Review quarterly after Back Office grows. Do not approve a split based only on source line count.

| Evidence | Threshold/guidance |
|---|---|
| Team ownership | at least two autonomous frontend teams with different release cadences |
| Build/deploy pain | sustained material impact after Turborepo caching and route code-splitting are optimized |
| Route independence | candidate routes are functionally unrelated and can tolerate zone navigation behavior |
| Contract maturity | shared API/design/auth packages have stable versioning and compatibility tests |
| Operational ownership | gateway routing, asset paths, zone versions, and incident response have owners |
| User impact | split improves reliability/deployment without breaking workflow continuity |

If approved, use Next.js Multi-Zones or separate subdomains. Runtime Module Federation remains rejected unless a future ADR proves first-party framework support, App Router compatibility, security, observability, and rollback.

## 15. Microservice Decision Gate

For a proposed service, complete this checklist:

- measured scaling/reliability/compliance/team need;
- stable module ownership and API/event contracts;
- independent data ownership and migration plan;
- timeout, retry, idempotency, and reconciliation design;
- distributed tracing and SLOs;
- deployment/on-call/cost owner;
- failure-mode and load test;
- strangler migration and rollback plan.

Do not split a service merely because a NestJS module exists.

## 16. Database Evolution Gates

| Decision | Adopt when | Do not adopt because |
|---|---|---|
| PostgreSQL RLS | Prisma/pool transaction spike and isolation tests pass | it sounds safer without verifying runtime roles/pooling |
| Read replica | measured read pressure and tolerated lag | reports exist |
| Partitioning | table size/query/retention evidence and automation exist | future data may be large |
| Dedicated Business database | regulatory/residency/contract/large-volume need | every Business is a SaaS customer |
| Search engine | Postgres search misses measured relevance/latency needs | search is a separate category |
| Analytics warehouse | OLTP/report contention or BI scale is measured | dashboards exist |
| Prisma 8 | GA, compatibility/load/migration tests, canary success | it is newer or currently RC |

## 17. Suggested Initial Engineering Epics

1. Workspace and quality pipeline.
2. OIDC identity and application authorization.
3. Business isolation and audit foundation.
4. PostgreSQL/Prisma conventions and migration pipeline.
5. OpenAPI contracts and generated client.
6. Design system and POS shell.
7. Catalog/customer/supplier vertical slice.
8. Sale/payment/idempotency vertical slice.
9. Transactional outbox and worker operations.
10. Stock movement and purchasing vertical slice.
11. Finance/loyalty/approval reconciliation.
12. Offline command queue and terminal health.
13. Device adapter framework and first hardware certification.
14. Reports, exports, webhooks, and migration framework.
15. Observability, SLOs, backup/restore, and production hardening.
16. Grocery first release.
17. General Retail release.

## 18. Architecture Decision Record Backlog

Create ADRs for:

- ADR-001 modular monolith and extraction strategy;
- ADR-002 Next.js frontend/BFF versus core NestJS API;
- ADR-003 POS and Back Office application split;
- ADR-004 PostgreSQL shared-schema Business isolation;
- ADR-005 RLS adoption result;
- ADR-006 Prisma 7 baseline and SQL escape-hatch policy;
- ADR-007 REST/OpenAPI and event contract versioning;
- ADR-008 transactional outbox and BullMQ;
- ADR-009 OIDC provider and authorization ownership;
- ADR-010 offline command/conflict protocol;
- ADR-011 device bridge and certified hardware approach;
- ADR-012 container platform and cloud provider;
- ADR-013 observability backend and retention;
- ADR-014 backup/DR objectives;
- ADR-015 payment provider and PCI scope;
- ADR-016 analytics/search adoption gates;
- ADR-017 micro-frontend decision and future review criteria.

## 19. Principal Risks

| Risk | Likelihood/impact | Planned response |
|---|---|---|
| Scope expands across 31 business types before Common Core stabilizes | High / High | release Common Core + Grocery + General Retail first; gate later packs on reusable engines |
| Next.js becomes duplicate business backend | Medium / High | all core write use cases live in NestJS/application modules; BFF reviewed separately |
| Cross-Business data leak | Medium / Critical | mandatory context, constraints, tests, runtime role, optional proven RLS, audit |
| Offline complexity causes duplicate/corrupt sales | High / Critical | narrow offline scope, command log, idempotency, server authority, pilot rollout, reconciliation |
| Payment timeout creates uncertainty | High / Critical | provider idempotency, intent state, callbacks/query reconciliation, operator queue |
| Prisma hides necessary database behavior | Medium / High | repository boundary, reviewed SQL, real PostgreSQL tests, query-plan observability |
| Premature microservices/micro-frontends slow delivery | High / Medium | explicit evidence gates and modular monorepo |
| Reporting harms OLTP | Medium / High | projections, asynchronous exports, limits, replica/warehouse gates |
| Device variability delays go-live | High / Medium | certified hardware matrix, adapters, simulator, early store tests |
| Platform complexity exceeds team capacity | Medium / High | managed services, no initial Kubernetes/Kafka, documented ownership |

## 20. Technology Definition of Done

The platform baseline is complete only when:

- the selected stack and all major alternatives are recorded in ADRs;
- POS, Back Office, API, and Worker build and deploy independently from one monorepo;
- exact versions are pinned and supported;
- Next.js is not the sole core backend;
- Business isolation passes adversarial API/database/job/cache/export tests;
- money, quantity, time, ID, and document-number conventions are implemented consistently;
- sale/payment/stock/finance retries create no duplicate effect;
- authoritative changes and outbox records commit together;
- queue/provider failures are recoverable and reconciled;
- offline POS survives interruption, restart, upgrade, duplicate sync, and rejection;
- hardware required by the release is certified on a maintained matrix;
- API and event contracts are versioned and compatibility-tested;
- logs/metrics/traces and business-operation health are available without leaking sensitive data;
- releases include migration, canary, rollback/forward-fix, security, and reconciliation evidence;
- backups restore within approved objectives;
- Common Core modules are reused by first business packs without duplicate sources of truth;
- micro-frontend, microservice, search, warehouse, partitioning, and Kubernetes decisions remain evidence-driven.

