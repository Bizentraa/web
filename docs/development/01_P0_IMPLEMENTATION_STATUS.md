# Common Core P0 — Implementation Status

**Started:** 2026-08-25  
**Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)  
**Local runbook:** [`00_LOCAL_DEVELOPMENT_SETUP.md`](./00_LOCAL_DEVELOPMENT_SETUP.md)

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
| CC-P0-001 Business Setup | In progress | Bootstrap contract/API creates Business details and first Branch | Back Office setup form, update flow and validation UX |
| CC-P0-002 Data Separation | In progress | Scoped tables have `businessId`; the non-superuser API role is protected by forced PostgreSQL RLS; cross-Business API and direct SQL checks were denied | Commit repeatable isolation tests and design the audited platform-support access path |
| CC-P0-003 Branch | In progress | Create first/additional Branch endpoints and status fields | Edit, activate, deactivate and management screens |
| CC-P0-004 Locations | In progress | First Location is created under the correct Branch | Location CRUD/status endpoints and screens |
| CC-P0-005 Users | In progress | Owner User, Business membership and Branch assignment are created | Invite/list/update/suspend users and multi-Branch assignment screens |
| CC-P0-006 Roles | In progress | Owner Role and 26 fine-grained permission definitions are created | Custom Role CRUD, assignment UI and negative permission integration tests |
| CC-P0-007 Approvals | Designed | Approval-policy table and sensitive permission codes exist | Policy CRUD, approval request/decision records and workflow enforcement |
| CC-P0-008 Feature Access | In progress | Feature definitions and Business feature assignment exist; Common Core is enabled | Enable/disable API, dependency validation, Back Office screen and business-pack records |
| CC-P0-009 Audit | In progress | Business/Branch creation and number generation create audit events; a database trigger rejected an attempted audit update | Audit viewer, more action coverage and retention/archival rules |
| CC-P0-010 Numbering | In progress | Atomic Business/Branch/type sequence allocation is implemented and produced `COLA2-SALE-000001` in the live check | Configuration UI, formatting policies and automated concurrency tests |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-001 Business Owner creates Business and first Branch | API slice implemented | One transaction creates Business, Branch, Location, defaults, owner access, audit and outbox event |
| CC-US-002 Administrator creates users and Roles | Started | Data model, permission catalog and owner assignment exist; administrator workflows remain |

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

## Next P0 Slices

1. Convert the proven PostgreSQL RLS and cross-Business checks into repeatable integration tests.
2. Add Back Office Business setup and Branch/Location management forms.
3. Add user invitation, Branch assignment, custom Roles and permission-denial tests.
4. Add approval-policy configuration and approval-request execution records.
5. Add feature-pack management and dependency rules.
6. Add searchable audit UI and database append-only protection.
7. Add concurrency tests for document numbering.
8. Connect OIDC and remove trust in development headers outside local mode.

P0 reaches its exit gate only when both CC-US-001 and CC-US-002 pass through UI, API, database, permission, audit and isolation tests.
