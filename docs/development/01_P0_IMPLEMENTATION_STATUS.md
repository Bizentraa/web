# Common Core P0 — Implementation Status

- **Started:** 2026-08-25
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **Local runbook:** [`00_LOCAL_DEVELOPMENT_SETUP.md`](./00_LOCAL_DEVELOPMENT_SETUP.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)

## Current Delivery Slice

The first slice proves the complete connection from a web/API contract to a Business-scoped PostgreSQL transaction and background-worker infrastructure.

```text
Back Office / API client
        -> NestJS/Fastify controller
        -> Business Access application service
        -> Business-scoped Prisma transaction
        -> PostgreSQL foundation records + audit + outbox

Worker -> Redis/BullMQ
```

## Requirement Status

| Requirement | Status | Current evidence | Remaining P0 work |
|---|---|---|---|
| CC-P0-001 Business Setup | Implemented | Bootstrap creates the Business, first Branch, Location and owner access; `/setup` edits name, legal name, contact, currency, time zone and country | First-run setup wizard for a brand-new Business |
| CC-P0-002 Data Separation | Implemented | Every scoped table has `businessId` and forced PostgreSQL RLS; a user from another Business receives `403` in the smoke run | Turn the smoke checks into CI integration tests |
| CC-P0-003 Branch | Implemented | Create, edit, activate and deactivate with an open-shift guard and a last-active-Branch guard, plus the `/setup` screen and persisted Back Office Branch switcher | - |
| CC-P0-004 Locations | Implemented | Create, edit and deactivate under a Branch with the seven Location types | Location rules that P3 inventory will need |
| CC-P0-005 Users | Implemented | Invitation, activation, suspension, Role and Branch assignment through `/access`, with a last-Owner guard | Production sign-in so an invitation becomes a real login |
| CC-P0-006 Roles | Implemented | Five Role templates, custom Roles, a permission matrix grouped by area and 52 permission definitions across P0, P1 and P2 | Separation-of-duties rules beyond the approver check |
| CC-P0-007 Approvals | Implemented | Policies with thresholds, `ANY_APPROVER`, `MINIMUM_APPROVERS` and `ALL_APPROVERS` strategies, individual decision history, approver identity, reason capture and enforcement on discount, refund, void and shift variance | Return-to-task UX polish |
| CC-P0-008 Feature Access | Implemented | Seven feature definitions, dependency validation, enable/disable with audit and outbox events, and the `/controls` screen | Per-feature settings and business-pack content |
| CC-P0-009 Audit | Implemented | Every management and commerce action writes an append-only audit record; `/controls` searches by record, action, actor, Branch and date with before/after detail | Retention, archival and an auditor export |
| CC-P0-010 Numbering | Implemented | Atomic allocation per Business/Branch/document type, forward-only settings and a next-number preview | Automated concurrency tests |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-001 Business Owner creates Business and first Branch | API slice implemented | One transaction creates Business, Branch, Location, defaults, owner access, audit and outbox event |
| CC-US-002 Administrator creates users and Roles | Implemented | A user is invited, activated, given Roles and Branches, and a blocked action is refused with the missing permission named |

## Deliberate Security Boundary

`AUTH_MODE=development` accepts `x-business-id` and `x-user-id` so the first slice can be exercised locally. This mode is not production authentication. Shared environments must use OIDC token verification, and startup must reject development mode there.

## Verified Foundation — 2026-08-26

- PostgreSQL 18 and Redis 8 started healthy through Docker Compose.
- Both P0 migrations applied successfully using the migration-owner database account.
- POS, Back Office, API and Worker all started; the API readiness check returned `ok`, and the Worker completed a BullMQ job.
- Two independent Businesses were created. A user from the first Business received HTTP `403` when requesting the second Business through the API.
- Direct queries through the non-superuser application role saw zero Businesses without a Business context, exactly the first Business with its context, and zero rows when that context queried the second Business ID.
- An attempted update to an audit event was rejected by PostgreSQL with `Audit events are append-only`.
- Lint, type checking, unit tests and production builds passed for the full monorepo.

## Business Theme Slice — 2026-08-26

- Added 30 controlled business-type theme presets using one shared neutral and semantic design system.
- Added a row-isolated `BusinessTheme` record with preset, default mode, per-device permission, optional brand colours, revision and timestamps.
- Business owners use the existing `BUSINESS_UPDATE` permission; every saved change creates an append-only audit event and an outbox event.
- The API supports permission-checked theme read/update with optimistic concurrency. A stale revision returned HTTP `409`, and a cross-Business read returned HTTP `403`.
- Back Office provides the appearance-management screen. POS and Back Office both resolve the same saved Business theme.
- Each browser origin validates and caches its copy. A before-hydration bootstrap applies cached tokens immediately, then the application refreshes them from PostgreSQL.
- Light, dark, system and allowed per-device modes were verified, including persistence across reloads.

## Verified Management Layer - 2026-08-26

`scripts/smoke-common-core.mjs` runs the whole P0 surface against a live database and API. In the
recorded run it confirmed that Role templates are created with the Business, a cashier is denied the
access screen, an unknown permission is refused, the Common Core cannot be disabled, an optional
feature can be enabled, a cashier cannot approve their own request, a manager can, an approved
request releases the blocked action, a Branch can be deactivated and activated, and a user from
another Business is refused. Browser checks confirmed `/setup`, `/access` and `/controls` render
with no console errors and no horizontal overflow at 1440px or 390px.

## Next P0 Slices

1. Connect production OIDC/session identity and remove the development header fallback.
2. Add a first-run setup wizard.
3. Convert the smoke checks into automated integration tests that run in CI.
4. Add document-number concurrency tests and audit retention rules.

P0 reaches its exit gate when CC-US-001 and CC-US-002 pass through UI, API, database, permission,
audit and isolation tests that run automatically, not only through the manual smoke run.
