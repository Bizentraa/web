# Backend, Database, API, and Eventing Plan

**Decision:** Use NestJS/Fastify for the core API, PostgreSQL 18 for authoritative state, Prisma ORM 7 GA for most data access, and an outbox-driven worker for reliable asynchronous work.

## 1. Backend Stack

| Area | Default | Reason |
|---|---|---|
| Runtime | Node.js 24 LTS | Supported production LTS with a long maintenance window. |
| Language | TypeScript strict mode | One language across API, worker, clients, schemas, and tests. |
| API framework | NestJS with Fastify adapter | Modules, dependency injection, guards, validation, OpenAPI, WebSockets, workers, and extraction seams. Fastify reduces HTTP overhead. |
| API style | REST/JSON over HTTPS | Predictable for POS, web, mobile/device, providers, and third parties. |
| Contract | OpenAPI 3.1 + generated clients | Versioned source contract, documentation, validation, and consumer compatibility tests. |
| Validation | Zod or JSON-Schema-compatible contract layer | Shared structural validation without using database models as wire contracts. |
| ORM | Prisma ORM 7 GA | Production-supported type-safe queries and migrations. |
| SQL escape hatch | Reviewed parameterized SQL | Required for locks, reporting, window functions, partial/expression indexes, RLS, and performance-critical queries. |
| Database | Managed PostgreSQL 18 current minor | ACID transactions, constraints, JSONB, indexing, RLS, partitioning, replication, and broad tooling. |
| Pool | PgBouncer-compatible transaction pool | Protects PostgreSQL from excessive API/worker/serverless connections. |
| Queue | BullMQ on managed Redis-compatible storage | Retries, delays, concurrency, schedules, and operator-visible jobs. |
| Durable event handoff | PostgreSQL transactional outbox | Prevents the database-committed-but-event-lost gap. |
| Realtime | WebSocket or Server-Sent Events from a dedicated gateway | Status updates only after authoritative commit; not a transaction channel. |
| Files | S3-compatible object storage with signed upload/download | Keeps large files out of API memory and PostgreSQL. |

## 2. Core API Responsibilities

The core API owns:

- authenticated Business and Branch context;
- permissions, approval rules, and audit evidence;
- stable request/response contracts;
- application use cases and domain policy execution;
- transaction and idempotency boundaries;
- stock, finance, payment, loyalty, and other authoritative state transitions;
- offline command synchronization;
- provider callback validation and deduplication;
- integration/webhook registration and status;
- operational health and reconciliation endpoints.

Next.js Route Handlers may call or proxy this API but shall not reimplement these responsibilities.

## 3. API Contract Rules

### 3.1 Versioning

- Prefix public APIs with `/api/v1`.
- Additive response fields are allowed within a version.
- Removing, renaming, changing meaning, or narrowing accepted values requires a new version or an explicit deprecation window.
- POS command contracts include a `contract_version` because offline devices can reconnect after a server release.
- Maintain at least the currently deployed POS version and the immediately previous compatible version during rolling upgrades.

### 3.2 Command requirements

Every state-changing request includes:

- authentication and derived Business membership;
- request/trace ID;
- `Idempotency-Key` for retryable commands;
- entity version or `If-Match` for concurrency-sensitive edits;
- explicit Branch/Location/terminal context where required;
- machine-readable validation errors;
- an audit reason for sensitive actions;
- approval reference when policy requires approval.

### 3.3 Response and error rules

- Use consistent problem-details-style error envelopes.
- Return a stable error code separately from human-readable text.
- Do not expose stack traces, SQL, secrets, provider payloads, or cross-Business identifiers.
- Return the authoritative entity version after a successful command.
- For a repeated idempotent command, return the recorded original status/result.
- Long work returns `202 Accepted` with a job/status resource rather than holding the request open.

### 3.4 Pagination and filtering

- Use cursor pagination for transaction/event/ledger timelines.
- Allow offset pagination only for bounded administration lists.
- Put maximum page sizes on all list APIs.
- Validate sort/filter fields against an allowlist.
- Export large results asynchronously to object storage.

## 4. PostgreSQL Version and Hosting

Use a managed PostgreSQL 18 service at the current minor version when supported by the selected provider. PostgreSQL supports each major for five years and recommends running the current minor release. PostgreSQL 17 current minor is an acceptable temporary provider fallback.

Production requirements:

- multi-zone/high-availability configuration;
- encrypted storage and TLS connections;
- automated backups and point-in-time recovery;
- monitored replication lag, connections, locks, long queries, storage, WAL, and autovacuum;
- a tested restore into an isolated environment;
- separate runtime, migration, read-only reporting, and administrative roles;
- connection pool metrics and limits per workload;
- scheduled minor updates with rollback/failover readiness.

## 5. Business Data Model

### 5.1 Required columns

Most Business-owned records include:

```text
id                  UUID/UUIDv7-compatible identifier
business_id         mandatory ownership key
branch_id           when Branch scoped
created_at          UTC timestamp
created_by          User/service identity
updated_at          UTC timestamp
updated_by          User/service identity
version             optimistic concurrency number
```

Append-only records use `occurred_at`/`recorded_at` and normally do not expose an update operation.

### 5.2 Identifier policy

- Use UUIDv7 or ULID-compatible application-generated IDs for offline-created commands/entities needing sortable global identifiers.
- Never use a user-visible document number as the primary key.
- Document numbers are unique in their defined scope, such as `(business_id, branch_id, document_type, number)`.
- Provider identifiers have provider/scoping fields and unique constraints to prevent duplicate callbacks.

### 5.3 Numeric policy

- Never use JavaScript floating-point `number` for authoritative money or measured stock calculations.
- Store currency amounts as PostgreSQL `numeric`, for example `numeric(19,4)`, plus ISO currency code.
- Use Prisma `Decimal`/a decimal library at application boundaries and serialize as decimal strings in APIs.
- Store quantities in a documented precision such as `numeric(20,6)`.
- Store tax rate and calculated tax separately; retain the inputs/rounding policy used at transaction time.
- Store UTC instants and retain Business/Branch time-zone identifiers for display and day-boundary calculations.

### 5.4 Ledger policy

Confirmed stock, loyalty/store-credit, and financial postings are append-only ledgers.

- Corrections use reversal/adjustment records referencing the original.
- A mutable balance/projection may exist for performance but must reconcile to its ledger.
- One physical stock movement creates one authoritative stock movement.
- One confirmed provider payment reference creates one payment result.
- Historical transaction lines keep descriptive, price, tax, and cost snapshots required for audit.

## 6. Business Isolation and Row-Level Security

Application scoping is mandatory even if RLS is enabled.

### 6.1 Application controls

- `BusinessContext` is created only after validating user membership.
- Repository methods require Business context and automatically add `business_id` predicates.
- Composite constraints include Business where natural identifiers are Business-local.
- Foreign references are checked for the same Business.
- background jobs and events carry Business context and revalidate it when loading data;
- cache keys and object paths start with the Business identifier;
- support/admin cross-Business access uses a separate privileged flow with reason and audit.

### 6.2 RLS as defense in depth

PostgreSQL RLS can restrict which rows a database role reads or changes. If adopted:

1. use a runtime role that does not own tables and cannot bypass RLS;
2. force RLS where appropriate;
3. set Business context with transaction-scoped state such as `SET LOCAL` inside the same database transaction as the queries;
4. never assume session state survives transaction pooling;
5. ensure every query participating in an operation uses the same transaction handle;
6. test SELECT, INSERT, UPDATE, DELETE, joins, foreign keys, background jobs, migrations, backups, and admin access;
7. keep policies simple and row-local where possible to avoid races and planner surprises.

RLS adoption is gated by an integration spike because Prisma, transactions, and PgBouncer must be proven together. Do not claim isolation from RLS until automated adversarial tests pass.

## 7. Prisma ORM Rules

### 7.1 Version

Use Prisma ORM 7 GA. Prisma 8 is a Release Candidate on the planning date; it may be evaluated after GA but is not the first production baseline.

### 7.2 Client lifecycle

- create one Prisma client/pool per long-running process, not per request;
- size API and worker pools together against the database maximum;
- use a pooled connection for runtime traffic;
- use a direct connection for `migrate deploy`, introspection, backup/restore, and session-dependent administration;
- set connection, statement, transaction, and lock timeouts explicitly;
- expose pool saturation and timeout metrics.

### 7.3 Repository boundary

- Controllers do not call Prisma directly.
- Domain code does not import Prisma types.
- Infrastructure repositories translate Prisma records to domain/application models.
- Cross-module database writes happen only through the owning module.
- A transaction coordinator provides repositories bound to the same transaction handle.

### 7.4 Migration policy

- Generate migrations in development and review the SQL.
- Commit the complete migration history.
- Never use `db push`, `migrate dev`, or `migrate reset` in production.
- Production uses `prisma migrate deploy` through a single controlled pipeline job and a direct database connection.
- Use expand-and-contract migrations for zero/low-downtime changes:
  1. add nullable/new structures;
  2. deploy compatible application code;
  3. backfill in resumable batches;
  4. validate constraints/indexes;
  5. switch reads/writes;
  6. remove old structures in a later release.
- Build large indexes concurrently through reviewed SQL where supported.
- Treat data backfills as observable jobs with checkpoints and throttling.
- Test every production migration against a recent anonymized-size copy and verify rollback/forward-fix steps.

### 7.5 SQL policy

Prisma is the default, not a restriction against PostgreSQL.

Approved reviewed SQL use cases include:

- `SELECT ... FOR UPDATE` and `SKIP LOCKED`;
- partial, expression, GIN/GiST, and specialized indexes;
- window functions and reporting aggregates;
- materialized views;
- RLS policies;
- bulk operations where ORM row loops are unsafe;
- PostgreSQL extensions approved by ADR;
- query plans/performance-critical projections.

All SQL is parameterized, tested, checked into source control, Business-scoped, and observable.

## 8. Transaction and Concurrency Rules

### 8.1 General rules

- Keep transactions short and do not call external providers while holding database locks.
- Enforce invariants with database constraints as well as application validation.
- Use optimistic concurrency for editable master data.
- Use row locks or atomic conditional updates for contested stock/reservation/numbering operations.
- Use higher isolation only for the smallest critical section that requires it.
- Retry serialization/deadlock failures with a bounded policy and the same idempotency key.
- Record provider intent before external calls and reconcile uncertain outcomes by querying the provider.

### 8.2 Idempotency model

Suggested uniqueness:

```text
(business_id, operation_scope, idempotency_key)
```

The idempotency record stores:

- request hash;
- status (`IN_PROGRESS`, `SUCCEEDED`, `FAILED_FINAL`);
- result resource/status;
- created/expiry times;
- caller/device identity.

Reusing a key with a different request hash is rejected. Concurrent requests with the same key result in one execution.

### 8.3 External payment sequence

```text
Create payment attempt in DB
Commit
   |
Call provider with Bizentra/provider idempotency key
   |
Receive response or uncertain timeout
   |
Verify/callback/reconcile provider state
   |
Short DB transaction confirms one result and outbox events
```

Never hold an inventory/finance transaction open while waiting for a card terminal or gateway.

## 9. Event Architecture

### 9.1 Event types

| Type | Purpose | Example |
|---|---|---|
| Domain event | Internal fact from a committed domain change | `SaleCompleted` |
| Integration event | Stable versioned event exposed outside a module/service | `StockSaleCommitted.v1` |
| Command | Request for one owner to perform work | `GenerateReceipt` |
| Audit event | Evidence that a user/service attempted or completed an action | refund approval |

Do not call a draft record or configuration definition a physical/financial event.

### 9.2 Event envelope

```text
event_id
event_type
event_version
occurred_at
recorded_at
business_id
branch_id
aggregate_type
aggregate_id
aggregate_version
correlation_id
causation_id
actor_type
actor_id
source
payload
```

Sensitive fields are excluded or minimized. Consumers load authorized details from the owning API/store when needed.

### 9.3 Transactional outbox

The application writes domain state and `outbox_event` rows in the same PostgreSQL transaction.

Worker flow:

1. claim unpublished rows in bounded batches using safe locking;
2. publish/enqueue using `event_id` as the idempotent job/message key;
3. record delivery attempt and result;
4. retry transient failures with backoff and jitter;
5. move exhausted failures to an operator-visible state;
6. alert by age, count, and critical event type;
7. reconcile source records against expected events.

Outbox delivery is at least once. Every consumer must be idempotent.

### 9.4 BullMQ use

Use BullMQ for:

- outbox dispatch and consumers;
- receipt/email/SMS notifications;
- webhooks;
- imports, exports, and report files;
- replenishment and scheduled work;
- provider reconciliation;
- search/report projection updates;
- safe batch migrations.

Rules:

- job ID derives from the event/operation ID where duplication is harmful;
- job handlers are small and idempotent;
- business writes remain in PostgreSQL;
- queue retention and dead-letter policy are defined;
- concurrency, rate, and Business fairness limits are configured;
- do not use Redis Pub/Sub for events that require replay or guaranteed processing.

BullMQ itself recommends idempotent jobs so retries do not alter the final outcome.

## 10. Cache Rules

Redis is appropriate for:

- rate limits;
- short-lived authorization/session support where required;
- catalog/price read cache with versioned invalidation;
- distributed coordination with safe expiry/fencing semantics;
- real-time fan-out hints;
- BullMQ storage.

Redis is not appropriate as the only copy of:

- stock quantity;
- payment status;
- invoice/customer/supplier balance;
- loyalty/store-credit balance;
- audit history;
- an offline command after the server accepted it.

All cache entries have a namespace, Business scope where applicable, TTL/invalidation policy, and a safe cache-miss path.

## 11. Reporting and Search

### Phase 1

- use PostgreSQL transactional tables for bounded operational queries;
- add purpose-built read models/materialized views for manager reports;
- refresh/update projections asynchronously from committed events;
- export large reports through workers;
- use PostgreSQL full-text/trigram search for catalog/customer lookup;
- enforce query/page/date limits.

### Growth phase

Add a read replica when measured read load justifies it and screens tolerate replica lag. Add an analytics store/warehouse when heavy aggregation, long history, or BI concurrency affects OLTP. Add OpenSearch only when required search relevance, faceting, or scale cannot be met by PostgreSQL.

Reports must publish their calculation definitions. Financial/stock reports include an `as_of` time and reconciliation status.

## 12. Database Growth and Maintenance

- index all important Business-scoped access paths beginning with the selectivity needed by real queries;
- remove duplicate/unused indexes after measurement;
- monitor slow queries and query plans;
- tune autovacuum on high-churn tables such as carts, reservations, jobs, outbox, and projections;
- archive or summarize old operational data according to retention policy;
- consider time partitioning only for proven large append-only tables;
- manually `ANALYZE` partitioned parents when required because PostgreSQL autovacuum processes partitions but not the partitioned parent statistics in the same way;
- prevent unbounded JSONB fields from replacing a designed relational model;
- apply retention to job/event payloads while preserving mandatory audit/business records.

## 13. Backup, Restore, and Disaster Recovery

Minimum production design:

- automated base backups and continuous WAL/PITR;
- multi-zone standby or provider-equivalent high availability;
- encrypted backup storage with retention policy;
- quarterly restore exercises at minimum before critical maturity, increasing by risk;
- a documented RPO and RTO per production tier;
- validation of row counts, ledgers, migration history, application health, and object references after restore;
- separate backup credentials and deletion protection;
- a tested process to recover outbox/queue work after database restoration;
- reconciliation of provider payments occurring near the recovery point.

Suggested initial targets for paid production tiers, subject to business approval:

- critical OLTP RPO: 5 minutes or better;
- critical OLTP RTO: 60 minutes or better;
- noncritical report/export regeneration rather than backup dependence.

## 14. Backend Test Strategy

| Test | Required behavior |
|---|---|
| Unit | domain policies, state machines, calculations, rounding, permission decisions |
| Database integration | real PostgreSQL constraints, transactions, locks, RLS, migrations, query behavior |
| API contract | OpenAPI validation, compatibility, auth/errors, idempotency |
| Queue integration | retry, duplicate delivery, backoff, dead-letter, worker restart |
| Provider contract | payment/webhook signatures, timeout, duplicate callback, uncertain state, reconciliation |
| Isolation | adversarial cross-Business reads/writes/references/jobs/exports/cache keys |
| Concurrency | simultaneous sale/reservation/stock/approval/payment callbacks |
| Migration | production-sized upgrade, backfill, mixed-version rollout, restore |
| Performance | POS commands, catalog lookup, stock movement, reporting, queue backlog recovery |
| Failure | DB failover, Redis outage, provider outage, worker crash, partial network failure |
| Reconciliation | ledger/projection, DB/queue, provider/payment, sale/stock/finance |

Use Testcontainers or equivalent real services for integration tests. SQLite and in-memory mocks do not validate PostgreSQL transactions, constraints, RLS, or query plans.

## 15. Backend Definition of Done

- Core mutations are exposed through application use cases and versioned API contracts.
- Business isolation tests pass for every owned table/resource.
- Database constraints protect core invariants.
- Money and quantity precision rules are consistent end to end.
- Idempotent retries create exactly one authoritative result.
- Domain state and outbox commit atomically.
- Every event/job consumer handles duplicate delivery safely.
- Prisma migrations are reviewed, tested, and use a direct production connection.
- Pools, locks, slow queries, autovacuum, outbox age, job failures, and reconciliation are observable.
- Restore and provider reconciliation procedures are tested.
- Redis/queue loss cannot erase authoritative business state.
- Reports reconcile to source data and cannot block checkout.

## 16. References

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [NestJS Fastify performance guidance](https://docs.nestjs.com/techniques/performance)
- [Prisma ORM documentation](https://www.prisma.io/docs/orm)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma connection pooling](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma development and production migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [PostgreSQL routine vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)
- [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- [Redis production guidance for Node.js](https://redis.io/docs/latest/develop/clients/nodejs/produsage/)

