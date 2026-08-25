# Bizentra Technology Stack — Decision Index

**Status:** Proposed implementation baseline  
**Planning date:** 2026-08-25  
**Applies to:** Common Core, Grocery / Supermarket, General Retail, and all later business packs  
**Technical language note:** Product requirements use **Business**. Technical tables and code use `business_id` for data ownership.

## 1. Decision Summary

The proposed Next.js + PostgreSQL + Prisma direction is good, with one important change: **Next.js should not be the only backend for the complete platform**.

Bizentra already plans:

- multi-business data separation;
- POS, payments, refunds, shifts, and offline operation;
- inventory, purchasing, stock ledgers, finance, and customer balances;
- background synchronization and retry-safe integrations;
- shared business events and many industry-specific packs;
- device integration, reporting, migration, security, backup, and disaster recovery.

These responsibilities need a durable application API and worker runtime in addition to the web applications. Next.js itself documents its backend features as a Backend-for-Frontend layer rather than a complete backend replacement.

### Approved baseline

| Layer | Selected approach | Decision |
|---|---|---|
| Language | TypeScript in strict mode | Use across browser, server, workers, contracts, and tests. |
| Runtime | Node.js 24 LTS | Production runtime; do not use Node.js 26 Current until it reaches LTS and dependencies are verified. |
| Workspace | pnpm workspaces + Turborepo | One monorepo with explicit app/package boundaries and cached CI tasks. |
| POS frontend | Next.js 16 Active LTS + React | Separate, offline-capable application optimized for cashier and devices. |
| Back-office frontend | Next.js 16 Active LTS + React | Administration, catalog, inventory, purchasing, finance, CRM, and reports. |
| Frontend BFF | Next.js Route Handlers | Session-aware proxying and frontend-specific response shaping only. |
| Core backend | NestJS + Fastify on Node.js | Versioned REST API, authorization, workflows, transactions, and integration entry points. |
| Background work | NestJS worker + BullMQ | Retries, scheduled work, event dispatch, imports, exports, and webhooks. |
| Primary database | Managed PostgreSQL 18, current minor | Authoritative transactional store. PostgreSQL 17 is an acceptable provider fallback. |
| ORM | Prisma ORM 7 GA | Type-safe access and migrations. Prisma 8 is still RC on the planning date and is not the production baseline. |
| Pooling | PgBouncer-compatible transaction pooling | Pooled runtime connection; separate direct connection for migrations and administration. |
| Cache / queue store | Managed Redis-compatible service | Disposable cache, rate limiting, locks with fencing where needed, and BullMQ storage; never the financial or stock source of truth. |
| Offline local data | IndexedDB through Dexie | Durable local command queue, approved catalog subset, and visible synchronization state. |
| API contracts | REST + OpenAPI; AsyncAPI-style event catalog | Stable external/device contracts and generated TypeScript clients. |
| Authentication | OpenID Connect; Keycloak default self-hosted option | Standards-based login, MFA, passkeys, and federation. Business/Branch authorization remains in Bizentra. |
| Object storage | S3-compatible object storage | Receipts, exports, images, attachments, and import files. |
| Observability | OpenTelemetry + metrics/logs/traces + error tracking | Correlate request, job, event, Business, Branch, and device operations. |
| Delivery | Docker containers on a managed container platform | Avoid Kubernetes until its operational benefits exceed its cost. |
| Infrastructure | OpenTofu/Terraform-compatible IaC | Repeatable environments, secrets, networking, databases, storage, and monitoring. |
| Testing | Vitest, Testing Library, Playwright, Testcontainers, k6, axe | Unit, integration, contract, end-to-end, performance, accessibility, and failure tests. |

## 2. Recommended Architecture

```text
                         CDN / WAF / TLS
                               |
              +----------------+----------------+
              |                                 |
       pos.example.com                   app.example.com
       Next.js POS PWA                   Next.js Back Office
       IndexedDB + devices               Server + Client UI
              |                                 |
              +------------- HTTPS -------------+
                               |
                    NestJS / Fastify Core API
                               |
          +--------------------+--------------------+
          |                    |                    |
     PostgreSQL             Redis / BullMQ      Object Storage
     source of truth        cache + jobs        files / exports
          |                    |
          |               Worker processes
          |                    |
          +----- transactional outbox -----------+
                               |
                   Webhooks / payments / email /
                   accounting / marketplaces
```

### Architectural style

1. **Modular monolith first:** deploy one core API and one worker, but isolate code and tables by business domain.
2. **Multiple frontend applications, not runtime micro-frontends:** POS and Back Office are separate deployables in one monorepo because their offline, security, device, and release needs differ.
3. **Events for reliable side effects:** write business data and an outbox record in the same PostgreSQL transaction; process the event asynchronously and idempotently.
4. **One source of truth:** PostgreSQL owns confirmed sales, payments, stock movements, invoices, balances, and audit records.
5. **Extract services only when evidence demands it:** a module becomes a microservice only after clear scaling, reliability, compliance, or team-ownership pressure exists.

## 3. Micro-Frontend Answer

Do **not** begin with fine-grained micro-frontends or Module Federation.

Use this sequence:

```text
Stage 1
One monorepo
  +-- POS Next.js app
  +-- Back Office Next.js app
  +-- shared design system and contracts

Stage 2
Independent deployments for POS and Back Office

Stage 3, only when justified
Split unrelated Back Office route groups into Next.js Multi-Zones
```

This retains independent deployment where it is valuable without introducing runtime version conflicts, duplicate React runtimes, cross-application state coupling, and difficult end-to-end debugging. The community Next.js Module Federation integration currently says Next.js support is ending; it is not the baseline for a new App Router platform.

## 4. Planned Repository Shape

```text
Bizentra/
  apps/
    api/                    # NestJS/Fastify core API
    worker/                 # queues, outbox, integrations, scheduled work
    pos/                    # Next.js POS application
    backoffice/             # Next.js administration application
    operations/             # later: KDS/service/dispatch UI if justified
  packages/
    api-client/             # generated OpenAPI client
    auth/                   # shared OIDC/session helpers
    contracts/              # commands, events, schemas, problem types
    database/               # Prisma schema/client and migration utilities
    design-system/          # accessible UI primitives and tokens
    observability/          # logging, tracing, metrics helpers
    offline/                # POS local queue and synchronization protocol
    testing/                # fixtures, builders, test containers
    tooling/                # shared lint, TypeScript, formatting config
  docs/
    technology/
  infrastructure/
    environments/
    modules/
```

Applications may import public package entry points. They shall not reach into another application's source tree.

## 5. Document Set

| File | Purpose |
|---|---|
| [01_ARCHITECTURE_RECOMMENDATION.md](./01_ARCHITECTURE_RECOMMENDATION.md) | System shape, domain boundaries, scalability model, and service-extraction rules. |
| [02_FRONTEND_AND_MICRO_FRONTEND.md](./02_FRONTEND_AND_MICRO_FRONTEND.md) | Next.js applications, UI stack, offline POS, device access, and micro-frontend decision. |
| [03_BACKEND_DATABASE_AND_EVENTING.md](./03_BACKEND_DATABASE_AND_EVENTING.md) | NestJS backend, PostgreSQL/Prisma rules, API contracts, transactions, events, queues, and reporting. |
| [04_PLATFORM_SECURITY_AND_OPERATIONS.md](./04_PLATFORM_SECURITY_AND_OPERATIONS.md) | Deployment, identity, security, observability, CI/CD, backup, DR, and operations. |
| [05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md](./05_IMPLEMENTATION_ROADMAP_AND_DECISION_GATES.md) | Delivery phases, architecture gates, quality gates, risks, and Definition of Done. |

## 6. Fixed, Conditional, and Deferred Decisions

### Fixed for the first production release

- TypeScript, Node.js LTS, pnpm, and a monorepo;
- Next.js App Router for POS and Back Office;
- dedicated NestJS/Fastify API and worker;
- PostgreSQL as the authoritative database;
- Prisma ORM 7 GA with reviewed SQL migrations;
- REST/OpenAPI for client and integration APIs;
- business-scoped data model using `business_id`;
- transactional outbox and idempotent consumers;
- OIDC authentication and application-owned authorization;
- container deployment, managed data services, and OpenTelemetry.

### Conditional decisions

- PostgreSQL Row-Level Security as defense in depth after the transaction/pooling implementation passes isolation tests;
- read replicas after measured reporting or read pressure;
- table partitioning after data volume and query evidence identifies a benefit;
- Next.js Multi-Zones after independent frontend teams/releases exist;
- NATS JetStream or Kafka after durable cross-service event distribution is required;
- OpenSearch after PostgreSQL text/trigram search no longer meets measured needs;
- ClickHouse or a cloud warehouse after operational reporting affects OLTP performance;
- Kubernetes after multiple services and operational requirements justify a cluster platform.

### Explicitly deferred

- runtime Module Federation;
- microservices per business module;
- database per Business as the default model;
- GraphQL as the primary API;
- event sourcing as the primary persistence model;
- storing cardholder data in Bizentra;
- using Redis as a durable stock, payment, or financial ledger.

## 7. Version Policy

- Use supported LTS or GA releases in production.
- Pin exact dependency versions in the lockfile and container image.
- Apply security patches promptly through automated dependency pull requests.
- Next.js announced a security release for 2026-08-26 affecting supported 16.3 and 15.5 lines. Bootstrap or upgrade to the patched release when published rather than freezing an earlier patch.
- Use PostgreSQL 18 at its current minor release; if the chosen managed provider has not approved 18, use PostgreSQL 17 at its current minor release.
- Use Prisma ORM 7 GA for production. Reconsider Prisma 8 only after GA, migration compatibility testing, load testing, and at least one production canary.
- Record every major change to framework, database, identity, queue, or deployment strategy as an Architecture Decision Record (ADR).

## 8. Authoritative References

- [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones)
- [Next.js release news](https://nextjs.org/blog)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [Prisma ORM documentation](https://www.prisma.io/docs/orm)
- [Prisma connection pooling](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [NestJS Fastify adapter](https://docs.nestjs.com/techniques/performance)
- [Turborepo repository structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [Module Federation Next.js integration status](https://module-federation.io/integrations/framework/nextjs/)

