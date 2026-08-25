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

### Common Core P1 Master Data

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | In progress | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `3af4410` | Added the first P1 master-data foundation with database models, Business isolation, permissions, API routes, API client calls and Back Office `/catalog` screen. |
| 2026-08-26 | Implemented for Back Office UI slice | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `ed7fdc4` | Upgraded the Back Office `/catalog` workspace into a responsive operational UI with command center, readiness score, grouped master-data cards, guided item/customer/supplier forms, recent-record panels and mobile-safe layouts. |
| 2026-08-26 | Implemented for UI architecture slice | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `82eb36e` | Refactored the Back Office `/catalog` workspace to use owned shadcn-style design-system primitives and added SRS traceability/pending-work documentation for Common Core. |

### Common UI/UX System

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | Implemented for common P0/P1/P2 readiness slice | `CC-P0-001` to `CC-P0-010`, `CC-P1-001` to `CC-P1-011`, `CC-P2-001` to `CC-P2-012`, `CC-US-001` to `CC-US-004`, `CC-US-018` | `ebd977a` | Added the UI/UX source docs to project tracking; expanded shared UI primitives; upgraded Back Office home into a P0/P1/P2 status dashboard; upgraded POS home into a P2 readiness workspace preview; added UI/UX implementation status and remaining-work tracking. |

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

### 2026-08-26 - Common Core P1 Master Data Foundation

| Field | Details |
|---|---|
| Feature / slice | Common Core P1 master data and configuration |
| Status | In progress |
| SRS mapping | `CC-P1-001` Item; `CC-P1-002` Categories; `CC-P1-003` Variants; `CC-P1-004` Units; `CC-P1-005` Barcodes; `CC-P1-006` Prices; `CC-P1-007` Promotions; `CC-P1-008` Tax; `CC-P1-009` Customers; `CC-P1-010` Suppliers; `CC-P1-011` Import; `CC-US-003` |
| What changed | Added P1 master-data schema for units, conversions, categories, brands, tags, custom attributes, tax categories/rates, price lists, items, variants, identifiers, prices, promotions, customer groups, customers, suppliers, supplier items, item attributes and import batches. Added forced Business RLS, P1 permissions, owner-role backfill, P1 API contracts, catalog service, catalog controller, API client methods and Back Office `/catalog` workspace. |
| Main files | `packages/database/prisma/schema.prisma`; `packages/database/prisma/migrations/20260825204733_p1_master_data/migration.sql`; `packages/database/prisma/migrations/20260825205500_p1_master_data_security/migration.sql`; `packages/contracts/src/index.ts`; `packages/api-client/src/index.ts`; `packages/domains/business-access/src/application/catalog.service.ts`; `apps/api/src/controllers/catalog.controller.ts`; `apps/backoffice/src/app/catalog`; `docs/development/04_P1_IMPLEMENTATION_STATUS.md` |
| Verification | Prisma generation passed; P1 migrations applied locally; contracts, API client, domain service, API and Back Office type checks passed; full `pnpm check` passed; Back Office production build generated `/catalog`; runtime API smoke test created defaults, item, customer and supplier; direct PostgreSQL check as `bizentra_app` returned zero P1 item rows without Business context and one row with the active Business context. |
| Commit | `3af4410 feat: add common core P1 master data` |
| Remaining work | Add edit/deactivate screens, promotion rule builder, CSV/XLSX import processing, automated P1 integration tests, and pricing/tax resolution tests before P2 POS sale calculation. |

### 2026-08-26 - Common Core P1 Catalog Workspace UI Upgrade

| Field | Details |
|---|---|
| Feature / slice | Back Office P1 catalog workspace UI and responsive UX |
| Status | Implemented for current P1 UI slice |
| SRS mapping | `CC-P1-001` Item; `CC-P1-002` Categories; `CC-P1-003` Variants; `CC-P1-004` Units; `CC-P1-005` Barcodes; `CC-P1-006` Prices; `CC-P1-007` Promotions; `CC-P1-008` Tax; `CC-P1-009` Customers; `CC-P1-010` Suppliers; `CC-P1-011` Import; `CC-US-003` |
| What changed | Reworked the Back Office `/catalog` screen into a professional P1 operating workspace. Added a command center with Business context, refresh/default setup actions and status pill; added readiness score and progress bar; grouped raw counts into setup, catalog, party and import score cards; added a P1 completion checklist; improved item, customer and supplier forms with operational hints; upgraded recent lists; added responsive desktop/tablet/mobile layouts with no horizontal overflow at phone width. |
| Main files | `apps/backoffice/src/app/catalog/catalog-workspace.tsx`; `apps/backoffice/src/app/globals.css`; `docs/development/03_DEVELOPMENT_CHANGE_LOG.md`; `docs/development/04_P1_IMPLEMENTATION_STATUS.md` |
| Verification | `pnpm --filter @bizentra/backoffice typecheck` passed; `pnpm --filter @bizentra/backoffice lint` passed; `pnpm --filter @bizentra/backoffice build` passed; browser inspection confirmed `/catalog` renders the command center, 4 score cards, 3 forms and 3 recent lists; desktop and 390px mobile viewport checks had no horizontal overflow. |
| Commit | `ed7fdc4 feat: upgrade P1 catalog workspace UI` |
| Remaining work | Add management screens for editing/deactivating P1 records and add automated browser/component regression tests when the UI test harness is introduced. |

### 2026-08-26 - Common Core P1 Modular UI Components and Traceability

| Field | Details |
|---|---|
| Feature / slice | Shadcn-style owned UI primitives, catalog composition and Common Core traceability |
| Status | Implemented for current UI architecture slice |
| SRS mapping | `CC-P1-001` Item; `CC-P1-002` Categories; `CC-P1-003` Variants; `CC-P1-004` Units; `CC-P1-005` Barcodes; `CC-P1-006` Prices; `CC-P1-007` Promotions; `CC-P1-008` Tax; `CC-P1-009` Customers; `CC-P1-010` Suppliers; `CC-P1-011` Import; `CC-US-003` |
| What changed | Added owned design-system primitives following the shadcn copy-and-own approach: `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `Kicker`, `Button`, `Badge`, `Progress` and `Field`. Refactored Back Office `/catalog` to compose these primitives instead of local page-only UI elements. Added shared primitive styles using existing Business theme CSS variables. Added Common Core SRS traceability and UI component-system documentation. |
| Main files | `packages/design-system/src/index.tsx`; `apps/backoffice/src/app/catalog/catalog-workspace.tsx`; `apps/backoffice/src/app/globals.css`; `docs/development/05_COMMON_CORE_SRS_TRACEABILITY.md`; `docs/development/06_UI_COMPONENT_SYSTEM.md` |
| Verification | `pnpm --filter @bizentra/design-system build` passed; `pnpm --filter @bizentra/design-system typecheck` passed; `pnpm --filter @bizentra/design-system lint` passed; `pnpm --filter @bizentra/backoffice typecheck` passed; `pnpm --filter @bizentra/backoffice lint` passed; `pnpm --filter @bizentra/backoffice build` passed; browser checks confirmed `/catalog` renders 12 modular cards, 8 badges, 5 buttons and 8 fields with no horizontal overflow on desktop and 390px mobile viewport. |
| Commit | `82eb36e feat: add modular catalog UI primitives` |
| Remaining work | Decide later whether to perform a full Tailwind/shadcn CLI migration. Current implementation intentionally avoids that migration until it is planned as a dedicated design-system phase. |

### 2026-08-26 - Common UI/UX P0-P1-P2 Readiness Surface

| Field | Details |
|---|---|
| Feature / slice | Common UI/UX source tracking, shared components, Back Office dashboard and POS readiness surface |
| Status | Implemented for common P0/P1/P2 readiness slice |
| SRS mapping | `CC-P0-001` to `CC-P0-010`; `CC-P1-001` to `CC-P1-011`; `CC-P2-001` to `CC-P2-012`; `CC-US-001`; `CC-US-002`; `CC-US-003`; `CC-US-004`; `CC-US-018` |
| What changed | Added `docs/ui-ux` specifications to the repository tracking scope. Expanded the shared design system with `PageHeader`, `KpiCard`, `StatusChip`, `OfflineBanner` and `EmptyState`. Updated Back Office home to show P0/P1/P2 state, API readiness, KPIs and next actions using common UI components. Updated POS home into a P2 readiness preview that shows online state, product/search area, cart summary and explicit "selling not enabled" state. Added UI/UX implementation status and updated SRS traceability to distinguish developed backend, developed UI, preview-only UI and remaining transactional work. |
| Main files | `docs/ui-ux`; `packages/design-system/src/index.tsx`; `apps/backoffice/src/app/page.tsx`; `apps/backoffice/src/app/globals.css`; `apps/pos/src/app/page.tsx`; `apps/pos/src/app/globals.css`; `docs/development/05_COMMON_CORE_SRS_TRACEABILITY.md`; `docs/development/07_UIUX_IMPLEMENTATION_STATUS.md` |
| Verification | `pnpm format:check` passed; design-system typecheck/lint/build passed; Back Office typecheck/lint/build passed; POS typecheck/lint/build passed; browser checks confirmed Back Office home renders 1 page header, 4 KPI cards, 5 status chips, 1 offline banner and 1 empty state with no desktop or 390px mobile overflow; browser checks confirmed POS home renders 1 page header, 3 KPI cards, 6 status chips, 1 offline banner and 1 empty state with no desktop or 390px mobile overflow. |
| Commit | `ebd977a feat: add common UIUX readiness surfaces` |
| Remaining work | P0: sidebar/topbar navigation, Business/Branch switcher, command palette, users, roles, approvals, feature-pack management, audit UI and numbering UI. P1: edit/deactivate screens, item detail, category/brand/tax/price management, import workflow, promotion builder and pricing/tax preview. P2: open/close shift, live scan/search, cart state, idempotent sale posting, payment sheet, split tenders, receipts, returns/refunds/exchanges, offline queue and conflict review. Shared UI: DataTable, FilterBar, EntityHeader, Timeline, ApprovalDrawer, DangerConfirmation, PaymentSheet, MoneySummary, StockBadge and IntegrationState. |

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
