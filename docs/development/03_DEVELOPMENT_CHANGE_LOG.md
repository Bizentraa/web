# Development Change Log

**Purpose:** track what has actually been developed, when it changed, which SRS requirements/user stories it supports, and what evidence proves it.

This file is append-only. Do not delete older entries when the same feature changes again. Add a new dated entry under the same feature or date so the team can see the full history.

## 1. How to Update This File

Update this file whenever code, database schema, API behavior, UI behavior, architecture, deployment setup, or important documentation changes.

Each change entry should include:

| Field | What to write |
|---|---|
| Date | Calendar date of the change in `YYYY-MM-DD` format. |
| Feature / slice | The business capability or technical slice changed. |
| SRS mapping | Requirement IDs and user stories from the SRS, for example `CC-P0-001`, `CC-US-001`. |
| What changed | Short factual list of what was built or changed. |
| Main files | Important files or folders touched. |
| Verification | Tests, builds, browser checks, API checks, migration checks, or manual evidence. |
| Commit | Git commit hash once committed. Use `Uncommitted` while the change is still in progress. |
| Remaining work | Clear follow-up items, if any. |

## 2. Status Meanings

| Status | Meaning |
|---|---|
| Planned | Documented in SRS, not started in code. |
| Started | Data model, API, UI, or workflow has begun but is not complete. |
| In progress | Usable slice exists, but some P0 acceptance or management workflow remains. |
| Implemented | Feature slice is built and verified for its current scope. |
| Blocked | Work cannot continue without a decision, dependency, credential, or external system. |
| Superseded | A later entry replaced the approach. Keep the old entry for history and link the new one. |

## 3. Feature History

### Common Core P0 Foundation

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | In progress | `CC-P0-001` to `CC-P0-010`, `CC-US-001`, `CC-US-002` | `cb07234` | Established the first Common Core P0 foundation with Business, Branch, Location, owner user, roles/permissions, feature access, numbering, audit, outbox, local infrastructure, and app startup. |
| 2026-08-26 | Implemented for appearance slice | `CC-P0-001`, `CC-P0-002`, `CC-P0-006`, `CC-P0-008`, `CC-P0-009`, `CC-US-001`, `CC-US-018` | `be8cd40` | Added Business-selectable colour themes shared by Back Office and POS, saved in PostgreSQL and cached per browser origin. |

## 4. Detailed Change Entries

### 2026-08-26 - Common Core P0 Foundation

| Field | Details |
|---|---|
| Feature / slice | Common Core P0 foundation |
| Status | In progress |
| SRS mapping | `CC-P0-001` Business Setup; `CC-P0-002` Data Separation; `CC-P0-003` Branch; `CC-P0-004` Locations; `CC-P0-005` Users; `CC-P0-006` Roles; `CC-P0-007` Approvals; `CC-P0-008` Feature Access; `CC-P0-009` Audit; `CC-P0-010` Numbering; `CC-US-001`; `CC-US-002` |
| What changed | Created the monorepo P0 implementation foundation; added local infrastructure for PostgreSQL and Redis; created the API, POS, Back Office, Worker, shared contracts, API client, database package, and business-access domain package; implemented Business bootstrap, Branch/Location creation, owner access, permission catalog, feature defaults, audit events, outbox events, and document numbering foundation. |
| Main files | `apps/api`; `apps/backoffice`; `apps/pos`; `apps/worker`; `packages/database`; `packages/domains/business-access`; `packages/contracts`; `packages/api-client`; `infrastructure/local/compose.yaml`; `docs/development/00_LOCAL_DEVELOPMENT_SETUP.md`; `docs/development/01_P0_IMPLEMENTATION_STATUS.md` |
| Verification | Local infrastructure became healthy; migrations applied; API readiness returned `ok`; Worker completed a queue job; two Businesses were created; cross-Business API access returned `403`; direct RLS checks isolated Business data; append-only audit protection rejected update attempts; full lint, type check, tests, and production builds passed. |
| Commit | `cb07234 feat: establish common core P0 foundation` |
| Remaining work | Convert isolation checks into repeatable integration tests; add Back Office setup and management screens; complete users, roles, approvals, feature-pack management, audit UI, numbering concurrency tests, and OIDC. |

### 2026-08-26 - Business-Selectable Colour Themes

| Field | Details |
|---|---|
| Feature / slice | Business appearance and theme selection |
| Status | Implemented for current P0 appearance scope |
| SRS mapping | `CC-P0-001` Business Setup; `CC-P0-002` Data Separation; `CC-P0-006` Roles; `CC-P0-008` Feature Access; `CC-P0-009` Audit; `CC-US-001`; `CC-US-018` |
| What changed | Added 30 controlled business-type theme presets; added shared theme token resolution and validation; saved theme settings in PostgreSQL as Business-scoped data; added permission-checked read/update API with optimistic concurrency; added audit and outbox records for theme changes; added Back Office appearance settings; applied the same saved theme in POS; added versioned browser cache and before-hydration token bootstrap. |
| Main files | `packages/themes`; `packages/design-system/src/theme.tsx`; `packages/database/prisma/schema.prisma`; `packages/database/prisma/migrations/20260825201143_business_theme/migration.sql`; `packages/domains/business-access/src/application/business-access.service.ts`; `apps/api/src/controllers/business-foundation.controller.ts`; `apps/backoffice/src/app/appearance`; `apps/pos/src/app/theme-status-card.tsx`; `docs/development/02_BUSINESS_THEME_SYSTEM.md` |
| Verification | Theme package tests passed; stale revision returned HTTP `409`; cross-Business theme read returned HTTP `403`; RLS allowed only the active Business context; audit and outbox records were created; Back Office saved themes successfully; POS loaded the same saved Business theme; dark mode persisted across reloads; cache applied at document load; full format, lint, type check, tests, and production builds passed. |
| Commit | `be8cd40 feat: add business-selectable colour themes` |
| Remaining work | Connect production OIDC identity; add broader automated UI/integration coverage when the P0 test harness is expanded. |

## 5. Entry Template

Copy this template for the next change and keep older entries unchanged.

```markdown
### YYYY-MM-DD - Feature Name

| Field | Details |
|---|---|
| Feature / slice |  |
| Status | Planned / Started / In progress / Implemented / Blocked / Superseded |
| SRS mapping | `CC-...`, `XX-US-...` |
| What changed |  |
| Main files |  |
| Verification |  |
| Commit | Uncommitted |
| Remaining work |  |
```

## 6. Rules for Same-Feature Changes

When the same feature changes again:

1. Add a new dated detailed entry.
2. Keep the old entry as historical evidence.
3. Update the feature history table with the new date and summary.
4. If a previous approach is replaced, mark the old entry as `Superseded` and mention the newer entry date.
5. If an SRS requirement changes meaning, update the SRS document separately and reference that SRS change here.

