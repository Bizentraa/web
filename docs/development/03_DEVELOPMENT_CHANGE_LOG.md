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
| 2026-08-26 | Implemented for current P0 management scope | `CC-P0-001` to `CC-P0-010`, `CC-US-001`, `CC-US-002`, `CC-US-018` | `1c8bbce` | Adapted the P0 management layer from `work/bizentra-p0-p1-p2.tgz`: Business/Branch/Location management, user invitation, role permissions, approvals, feature packs, audit search and document-number settings with Back Office screens and API smoke coverage. |

### Common Core P1 Master Data

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | In progress | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `3af4410` | Added the first P1 master-data foundation with database models, Business isolation, permissions, API routes, API client calls and Back Office `/catalog` screen. |
| 2026-08-26 | Implemented for Back Office UI slice | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `ed7fdc4` | Upgraded the Back Office `/catalog` workspace into a responsive operational UI with command center, readiness score, grouped master-data cards, guided item/customer/supplier forms, recent-record panels and mobile-safe layouts. |
| 2026-08-26 | Implemented for UI architecture slice | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `82eb36e` | Refactored the Back Office `/catalog` workspace to use owned shadcn-style design-system primitives and added SRS traceability/pending-work documentation for Common Core. |
| 2026-08-26 | Implemented for current P1 management/import/pricing scope | `CC-P1-001` to `CC-P1-011`, `CC-US-003` | `1c8bbce` | Adapted P1 catalog management from `work/bizentra-p0-p1-p2.tgz`: list/search/detail/edit/deactivate flows, unit/category/brand/tax/price maintenance, variants, identifiers, supplier costs, promotions, CSV validation/apply/rollback and pricing/tax resolution. |

### Common Core P2 Sales, POS and Payments

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | Implemented for current P2 commerce scope | `CC-P2-001` to `CC-P2-012`, `CC-US-004`, `CC-US-005`, `CC-US-006` | `1c8bbce` | Adapted the P2 commerce backend and POS workspace from `work/bizentra-p0-p1-p2.tgz`: shifts, cart pricing, idempotent sales, split/partial tenders, receipts, returns, refunds, exchanges, store credit, offline sale sync and Back Office sales review. |

### Common UI/UX System

| Date | Status | SRS mapping | Commit | Summary |
|---|---|---|---|---|
| 2026-08-26 | Implemented for common P0/P1/P2 readiness slice | `CC-P0-001` to `CC-P0-010`, `CC-P1-001` to `CC-P1-011`, `CC-P2-001` to `CC-P2-012`, `CC-US-001` to `CC-US-004`, `CC-US-018` | `ebd977a` | Added the UI/UX source docs to project tracking; expanded shared UI primitives; upgraded Back Office home into a P0/P1/P2 status dashboard; upgraded POS home into a P2 readiness workspace preview; added UI/UX implementation status and remaining-work tracking. |
| 2026-08-26 | Implemented for shared frontend architecture slice | `CC-P0-001` to `CC-P0-010`, `CC-P1-001` to `CC-P1-011`, `CC-P2-001` to `CC-P2-012`, `CC-US-001` to `CC-US-004`, `CC-US-018` | `5d71b01` | Added the first reusable app shell/navigation, global command palette, responsive mobile navigation and shared component primitives from the consolidated UI/UX remaining-work register. |
| 2026-08-26 | Implemented for shared component-system scope | `CC-P0-001` to `CC-P0-010`, `CC-P1-001` to `CC-P1-011`, `CC-P2-001` to `CC-P2-012` | `1c8bbce` | Adapted the archive’s shared component system: common stylesheet, server/client entry split, dialogs, drawers, sheets, confirmations, tabs, toasts, scan helpers, controlled filters, responsive tables, form primitives, description lists, skeletons and receipt view. |

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
| Remaining work | P0 backend/API: complete edit/activate/deactivate APIs for Business, Branch and Location; add user invitation/assignment APIs; complete custom Role and permission management; implement approval-rule configuration and approval request lifecycle; complete feature-pack management APIs; add document-number settings and concurrency tests; add production OIDC/session/MFA integration. P0 UI/UX: implement sidebar/topbar app shell, Business/Branch switcher, command palette, setup wizard, Business/Branch/Location management screens, user/role screens, approval UI, feature-pack UI, audit timeline/list and numbering settings. Quality/operations: convert manual cross-Business isolation, RLS, audit immutability and numbering checks into repeatable integration tests; add permission-denial tests, seed/reset scripts, observability dashboards, backup/restore checks and deployment runbook evidence. |

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
| Remaining work | Identity/security: connect production OIDC/session identity and ensure theme read/write uses authenticated Business/User context rather than local development headers. UI/UX: add brand asset/logo upload, theme preview across Back Office/POS/customer display surfaces, not-permitted vs not-enabled states, and accessibility checks for contrast/focus in all presets. Quality/operations: add browser/component regression tests for theme save/load/cache/dark mode behavior, cross-origin cache behavior, stale revision conflict handling, audit/outbox evidence and failure recovery messaging. |

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
| Remaining work | P1 backend/API: add edit/deactivate flows for units, categories, brands, tax categories, price lists, items, variants, identifiers, customers and suppliers; add tag/custom-attribute APIs; add supplier item/cost/lead-time APIs; implement CSV/XLSX import parser, validation preview, apply, rollback and reconciliation; implement promotion rule evaluation; implement pricing/tax resolution services for sale, return and purchase contexts. P1 UI/UX: add item detail/edit screen, category/brand/tag/custom-attribute management, unit conversion UI, variant matrix UI, duplicate barcode resolution, price-list/customer/quantity/Branch price UI, promotion builder, tax rule builder/calculation preview, customer address/group/balance/history views, supplier terms/item/cost/lead-time views and import wizard. Quality: add automated P1 permission denial, RLS, audit/outbox, uniqueness, duplicate identifier, import validation, pricing and tax tests before P2 sale calculation starts. |

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
| Remaining work | Extend the catalog workspace from create-only to full management: list/search/filter records, edit/deactivate items, categories, units, tax, prices, customers and suppliers; add detail pages with `EntityHeader`, tabs, `Timeline`, audit visibility and permission-aware actions; add empty/loading/error/permission/offline states from the UI/UX spec; add browser/component regression tests for desktop, tablet and phone layouts. |

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
| Remaining work | Shared UI architecture: decide whether to perform a dedicated Tailwind/shadcn CLI migration; if adopted, map Business theme CSS variables to shadcn variables without breaking saved themes. Components still required from the UI/UX plan: `DataTable`, `FilterBar`, `CommandPalette`, `EntityHeader`, `Timeline`, `ApprovalDrawer`, `DangerConfirmation`, `PaymentSheet`, `MoneySummary`, `StockBadge`, `SerialPicker`, `BatchExpiryPicker`, `BookingCalendar`, `WorkBoard`, `WorkTicketPanel`, `IntegrationState`, drawer/dialog/sheet patterns, loading skeletons and permission/offline/error states. Quality: add Storybook or equivalent component examples, accessibility tests, visual regression and responsive regression coverage. |

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
| Remaining work | P0: complete real Business/Branch switcher data, users, roles, approvals, feature-pack management, audit UI and numbering UI. P1: edit/deactivate screens, item detail, category/brand/tax/price management, import workflow, promotion builder and pricing/tax preview. P2: open/close shift, live scan/search, cart state, idempotent sale posting, payment sheet, split tenders, receipts, returns/refunds/exchanges, offline queue and conflict review. Shared UI: connect the new primitives to more feature screens; add Storybook/equivalent examples, visual regression, accessibility tests and route-level browser smoke tests. |

### 2026-08-26 - Shared UI/UX Frontend Architecture Foundation

| Field | Details |
|---|---|
| Feature / slice | Shared UI/UX and frontend architecture foundation |
| Status | Implemented for current shared shell/component slice |
| SRS mapping | `CC-P0-001` to `CC-P0-010`; `CC-P1-001` to `CC-P1-011`; `CC-P2-001` to `CC-P2-012`; `CC-US-001`; `CC-US-002`; `CC-US-003`; `CC-US-004`; `CC-US-018` |
| What changed | Reworked the shared `AppShell` into a real Back Office application shell with desktop sidebar, sticky topbar, mobile bottom navigation, active route support, Business/Branch context display and command trigger. Added a client-side global command palette with `Ctrl/Cmd+K`, route/action filtering and mobile floating access. Added shared UI primitives for `FilterBar`, `DataTable`, `EntityHeader`, `Timeline`, `StatePanel`, `MoneySummary`, `StockBadge`, `IntegrationState`, `ApprovalDrawer`, `DangerConfirmation`, `PaymentSheet`, `SerialPicker`, `BatchExpiryPicker`, `BookingCalendar`, `WorkBoard` and `WorkTicketPanel`. Wired the P1 catalog workspace to the shared filter and table primitives. Added responsive component-level styles using saved Business theme CSS variables. |
| Main files | `packages/design-system/src/index.tsx`; `apps/backoffice/src/app/layout.tsx`; `apps/backoffice/src/app/global-command-palette.tsx`; `apps/backoffice/src/app/page.tsx`; `apps/backoffice/src/app/appearance/page.tsx`; `apps/backoffice/src/app/catalog/page.tsx`; `apps/backoffice/src/app/catalog/catalog-workspace.tsx`; `apps/backoffice/src/app/globals.css`; `docs/development/03_DEVELOPMENT_CHANGE_LOG.md` |
| Verification | `pnpm format:check` passed; `pnpm --filter @bizentra/design-system build` passed; `pnpm --filter @bizentra/design-system typecheck` passed; `pnpm --filter @bizentra/design-system lint` passed; `pnpm --filter @bizentra/backoffice typecheck` passed; `pnpm --filter @bizentra/backoffice lint` passed; `pnpm --filter @bizentra/backoffice build` passed. |
| Commit | `5d71b01 feat: add shared frontend architecture foundation` |
| Remaining work | Replace development placeholder Business/Branch context with authenticated context from production identity/session; make the command list permission-aware from the real user permissions/feature packs; connect `EntityHeader`, `Timeline`, approval/danger/payment/drawer/sheet patterns to the relevant P0/P1/P2 feature screens; add Storybook/equivalent component examples; add automated accessibility, visual regression and browser route smoke tests. |

### 2026-08-26 - Common Core P0/P1/P2 Archive Adaptation

| Field | Details |
|---|---|
| Feature / slice | P0 management, P1 catalog/import/pricing and P2 commerce adaptation from `work/bizentra-p0-p1-p2.tgz` |
| Status | Implemented for current P0/P1/P2 scope |
| SRS mapping | `CC-P0-001` to `CC-P0-010`; `CC-P1-001` to `CC-P1-011`; `CC-P2-001` to `CC-P2-012`; `CC-US-001` to `CC-US-006`; `CC-US-018`; partial `CC-P6-005` for offline sale sync |
| What changed | Extended the Prisma model and migration set for approval requests, import preview/apply/rollback and P2 commerce records. Added shared domain helpers for access, approvals, audit, document numbering, CSV parsing and money. Expanded the Business Access domain with Business/Branch/Location updates, user invitation, membership lifecycle, custom Roles, approval policies/requests, feature management, audit search and document-number settings. Expanded P1 catalog with reference data, item list/detail/edit/deactivate, variants, identifiers, prices, supplier items, tax rates, promotions and import lifecycle. Added `@bizentra/domain-commerce` for pricing/tax/promotion calculation, POS shifts, idempotent sale posting, tenders, receipts, returns, refunds, exchanges, store credit and offline sale queue sync. Added API controllers/contracts/API-client methods and Back Office/POS screens for the implemented flows. |
| Main files | `packages/database/prisma/schema.prisma`; `packages/database/prisma/migrations/20260826090000_p0_approvals_p1_import_p2_commerce`; `packages/contracts/src/index.ts`; `packages/api-client/src/index.ts`; `packages/domains/shared`; `packages/domains/business-access`; `packages/domains/commerce`; `apps/api/src/controllers/business-foundation.controller.ts`; `apps/api/src/controllers/catalog.controller.ts`; `apps/api/src/controllers/pos.controller.ts`; `apps/backoffice/src/app/setup`; `apps/backoffice/src/app/access`; `apps/backoffice/src/app/controls`; `apps/backoffice/src/app/catalog`; `apps/backoffice/src/app/customers`; `apps/backoffice/src/app/suppliers`; `apps/backoffice/src/app/import`; `apps/backoffice/src/app/sales`; `apps/pos/src/app`; `scripts/smoke-common-core.mjs` |
| Verification | `pnpm install` completed for all 16 workspace projects; `pnpm db:generate` passed; `pnpm db:migrate:deploy` applied migration `20260826090000_p0_approvals_p1_import_p2_commerce`; `pnpm format:check` passed after excluding local `work/` archive extracts; domain shared, business-access and commerce tests passed; API, Back Office and POS typechecks/lints passed; Back Office and POS production builds passed; `node scripts/smoke-common-core.mjs` passed 74 live API checks against local PostgreSQL/Redis/API. |
| Commit | `1c8bbce feat: adapt common core P0 P1 P2 implementation` |
| Remaining work | Production OIDC/session identity remains. P0: multi-approver strategies beyond the currently enforced approval behavior, audit retention/export and repeatable lower-level integration tests for isolation/audit immutability. P1: bulk variant matrix editing, deeper category hierarchy editing, item media/images, opening-stock import in P3 and richer tax jurisdictions. P2: quotation/order workflow, payment-provider integration, provider-side payment idempotency, direct POS exchange/discard held cart actions, offline payments against an already-posted sale and connected thermal/electronic receipt delivery. |

### 2026-08-26 - Shared Component System and Product Stylesheet

| Field | Details |
|---|---|
| Feature / slice | Shared component system, common stylesheet and app screens |
| Status | Implemented for current shared component scope |
| SRS mapping | `CC-P0-001` to `CC-P0-010`; `CC-P1-001` to `CC-P1-011`; `CC-P2-001` to `CC-P2-012` |
| What changed | Moved shared component styling into `@bizentra/design-system/styles.css` and imported it in Back Office and POS. Split the design-system package into server-safe and client entries. Added `Dialog`, `Drawer`, `Sheet`, `ConfirmDialog`, `Tabs`, `ToastProvider`, `NumberPad`, `useScanFocus`, `useOnlineState`, `useDebouncedValue` and `createIdempotencyKey`. Rebuilt `DataTable` with alignment, row selection, footer and phone-card fallback; made `FilterBar` controlled with active filter chips; added form layout primitives, description lists, skeletons and receipt rendering. |
| Main files | `packages/design-system/package.json`; `packages/design-system/src/index.tsx`; `packages/design-system/src/client.tsx`; `packages/design-system/styles.css`; `apps/backoffice/src/app/lib/workspace.tsx`; `apps/backoffice/src/app/globals.css`; `apps/pos/src/app/globals.css`; `apps/pos/src/app/page.tsx` |
| Verification | `pnpm --filter @bizentra/design-system build` passed; `pnpm --filter @bizentra/design-system typecheck` passed; Back Office and POS typechecks/lints/builds passed as part of the archive adaptation verification. |
| Commit | `1c8bbce feat: adapt common core P0 P1 P2 implementation` |
| Remaining work | Add Storybook or equivalent component examples, automated accessibility assertions, visual-regression snapshots, saved views/column selector for `DataTable` and density options for management lists. |

## 5. Consolidated Remaining Work Register

This section lists remaining work that must be considered before a phase or UI/UX capability is treated as complete. It combines gaps from the SRS, UI/UX plan and the detailed change entries above.

### P0 - Foundation, Business Setup and Access Control

| Area | Remaining work |
|---|---|
| Business / Branch / Location | Implemented for current scope: edit/activate/deactivate APIs and Back Office setup screen. Remaining: production-grade Business/Branch switcher and broader Location type rules as later vertical packs require. |
| Users / Roles / Permissions | Implemented for current scope: user invitation, Branch assignment, Role editor, permission catalogue and denied-action behavior. Remaining: production OIDC/session identity and deeper separation-of-duties policy tests. |
| Approvals | Implemented for current scope: approval policies, request lifecycle, approver identity and self-approval prevention. Remaining: multi-approver strategies beyond the currently enforced behavior and return-to-task UX polish. |
| Feature access | Implemented for current scope: feature-pack list/update, dependency validation and Core-protection rule. Remaining: business-type pack marketplace/configuration UX. |
| Audit | Implemented for current scope: audit search/list and audit evidence for P0/P1/P2 actions. Remaining: retention/archive/export rules and lower-level immutable-audit integration tests. |
| Numbering | Implemented for current scope: document-number settings, next-number preview/allocation and smoke-tested sequences. Remaining: heavier concurrency test suite and operational collision dashboards. |
| Identity/security | Remaining: production OIDC/session integration, optional MFA for privileged users, protected secrets and secure local-development fallback removal plan. |
| Operations | Implemented for current local scope: migration deploy, health checks and smoke script. Remaining: deployment/rollback runbooks, backup/restore verification, metrics/traces and production observability dashboards. |

### P1 - Master Data and Configuration

| Area | Remaining work |
|---|---|
| Items | Implemented for current scope: list/search/detail/edit/deactivate, variants, identifiers, prices, attributes, audit timeline and POS search readiness. Remaining: item media/images and bulk variant matrix editing. |
| Categories / brands / tags / attributes | Implemented for current scope: management APIs/screens, custom attributes and duplicate validation. Remaining: deeper category hierarchy editing. |
| Variants / identifiers | Implemented for current scope: variant creation, barcode/SKU/supplier identifiers and duplicate-barcode refusal. Remaining: matrix bulk editor for size/colour/style-heavy verticals. |
| Units | Implemented for current scope: unit management and conversions. Remaining: extra vertical-specific unit rules where required. |
| Prices | Implemented for current scope: price lists, Branch/customer/quantity price rules, costs and pricing resolution tests. Remaining: advanced price simulation/reporting. |
| Promotions | Implemented for current scope: promotion builder, percentage/fixed/coupon/buy-X-get-Y, minimums, overlap visibility and POS application engine. Remaining: campaign analytics and richer stacking rules. |
| Tax | Implemented for current scope: tax categories/rates, tax preview/resolution and sale/return tests. Remaining: richer tax jurisdictions beyond category/date-effective rates. |
| Customers | Implemented for current scope: customer list/detail/edit, groups, balances, store credit and sale history. Remaining: richer CRM notes/tasks if required. |
| Suppliers | Implemented for current scope: supplier list/detail/edit, contacts, terms, supplier items, cost and lead time. Remaining: supplier scorecards and purchasing history after P3/P4. |
| Import | Implemented for current scope: CSV template, validation, preview, apply, rollback and audit evidence. Remaining: opening-stock import after P3 inventory exists. |
| P1 quality | Implemented for current scope: unit tests and live smoke coverage for duplicates, import lifecycle, pricing/tax and permissions. Remaining: broader automated integration test suite. |

### P2 - Sales, POS and Payments

| Area | Remaining work |
|---|---|
| Shift | Implemented for current scope: open shift, opening cash, cash movements, close shift, reconciliation, variance reason and approval hook. Remaining: cash drawer hardware in P6. |
| Sale/cart | Implemented for current scope: live scan/search, cart lines, quantity/discount/tax calculation, customer attachment and hold/resume/confirm. Remaining: favourites and department grids. |
| Idempotent posting | Implemented for current scope: idempotent sales, payments, returns and offline sale sync. Remaining: provider-side idempotency after gateway integration. |
| Payments | Implemented for current scope: cash/card/transfer/QR/wallet/store credit methods, split/partial tenders, unknown payment resolution and reconciliation references. Remaining: real card/wallet provider integration. |
| Receipts/invoices | Implemented for current scope: receipt allocation once, printable receipt view, tax/discount/tender visibility and reprint path. Remaining: connected thermal printing and electronic delivery. |
| Returns/refunds/exchanges | Implemented for current scope: original sale lookup, return/refund/store-credit/exchange flows and reversal trail. Remaining: direct POS exchange UX and provider refunds. |
| POS UI/UX | Implemented for current scope: POS selling workspace, scan focus, persistent cart, payment sheet, tender buttons and receipt dialog. Remaining: more keyboard/touch shortcuts and customer display. |
| POS offline | Implemented for current scope: offline sale queue and sync endpoint. Remaining: offline payments against already-posted sales and conflict comparison UI. |

### P3 - Inventory, Purchasing and Fulfillment

| Area | Remaining work |
|---|---|
| Stock ledger | Auditable stock ledger by Item/Location/movement; on-hand/reserved/available/incoming quantities; one physical movement equals one event. |
| Receiving | Purchase order receiving; variance handling; batch/expiry/serial capture; goods receipt increases stock only once. |
| Transfers/counts/adjustments | Transfer lifecycle with in-transit state; stock count/cycle count; variance posting; adjustment reasons and approvals. |
| Replenishment/purchasing | Reorder settings and suggestions; purchase requests; purchase orders; supplier variance view. |
| Fulfillment | Picking, packing and dispatch for orders requiring fulfillment; delivery preparation. |
| UI/UX | Stock table, receiving workspace, transfer/count screens, purchasing screens, `StockBadge`, dense operational layouts and mobile scan views. |

### P4 - Finance, Customer Controls and Management

| Area | Remaining work |
|---|---|
| Receivables/payables | Customer invoice posting, credit limits, collections allocation, supplier bills and supplier payments. |
| Cash/bank/expenses | Expense entry, cash/bank accounts, deposits, transfers and reconciliation. |
| Loyalty/store credit | Loyalty earn/redeem/expiry; store-credit issue/redemption history. |
| Margins/accounting | Sales/cost/gross margin reporting; accounting event emission for posted financial/stock valuation changes. |
| UI/UX | AR/AP screens, cash dashboard, customer 360, statements, approvals, `MoneySummary` and finance-safe reversal workflows. |

### P5 - Reusable Business Engines

| Area | Remaining work |
|---|---|
| Workflow/work tickets | Configurable statuses/transitions; reusable Work Ticket engine; assignment, checklist, timer, materials, attachments and history. |
| Booking | Calendar, resources, capacity, deposits, cancellation, no-show and conflict prevention. |
| Customer assets | Vehicle/device/customer asset history and links to sales, services and warranties. |
| Traceability/warranty | Serial/IMEI/batch/lot/expiry tracking; warranty activation, claim, inspection, approval, repair/replacement and RMA closure. |
| Recipe/BOM/route/POD | BOM/recipe definitions; material consumption events; routes/stops/vehicles/drivers; proof of delivery. |
| Notifications/documents | Configurable notifications and file/photo attachments for supported records. |
| UI/UX | `BookingCalendar`, `WorkBoard`, `WorkTicketPanel`, `SerialPicker`, `BatchExpiryPicker`, warranty UI, route/POD UI and document panels. |

### P6 - Offline, Devices and Store Reliability

| Area | Remaining work |
|---|---|
| Devices | POS terminal registration, printer support, scanner support and device health/status. |
| Offline | Approved offline operation rules, offline queue, unique offline IDs, sync, conflict handling and visible pending count. |
| Payment safety | Restrict offline payment methods by provider/risk; payment unknown and needs-review states. |
| UI/UX | Always-visible offline banner for operational surfaces, sync queue drawer, conflict comparison and mobile/device-first states. |

### P7 - Reporting, Integrations and Migration

| Area | Remaining work |
|---|---|
| Reports | Sales, stock, finance, customer and workforce reports with drill-down to source records and no mutation from reports. |
| APIs/webhooks | Authenticated APIs; signed/idempotent event webhooks; retry and dead-letter/error queue. |
| Export/migration | Authorized data export; migration/import validation, preview, totals and reconciliation. |
| UI/UX | Reporting dashboards, saved views, filters, export controls, data-freshness labels, integration state and migration workflow UI. |

### P8 - Security, Operations and Production Readiness

| Area | Remaining work |
|---|---|
| Security/privacy | Encrypted transport, protected secrets, session controls, optional MFA, customer-data access/export/deletion/retention controls. |
| Audit integrity | Broader immutable audit protection for critical financial/stock actions and auditor workflows. |
| Backup/DR | Monitored backups, restore testing and defined recovery targets. |
| Observability/performance | Logs, metrics, traces, business operation health, POS response-time targets and load testing. |
| Release readiness | Automated tests, security checks, migration checks, backup readiness, rollback plan, accessibility QA and visual regression. |

### Shared UI/UX and Frontend Architecture

| Area | Remaining work |
|---|---|
| App shell/navigation | Implemented for current scope: shared Back Office workspace shell, grouped sidebar, topbar context and mobile nav. Remaining: permission-filtered navigation and unsaved-change guard. |
| Search/commands | Implemented for current scope: command palette foundation. Remaining: permission-aware commands from real feature packs and record-level global search. |
| Shared components | Implemented for current scope: shared stylesheet, server/client entries, tables, filters, forms, tabs, dialogs, drawers, sheets, confirmations, state panels, skeletons, receipt view, scan helpers and idempotency helpers. Remaining: saved views, column selector and density switch. |
| State patterns | Implemented for current scope across new screens: loading, empty, error, permission, offline/sync and needs-review states. Remaining: expand to every future vertical screen. |
| Accessibility/responsive | Implemented for current component scope: labels, visible focus, non-colour-only state labels, mobile table fallback and touch-safe layouts. Remaining: automated accessibility assertions. |
| Quality tooling | Unit tests, typechecks, lints, builds and live smoke script exist. Remaining: Storybook/equivalent examples, visual regression and route-level browser smoke automation. |
| Vertical UI/UX | Grocery/Supermarket is documented but not implemented; future vertical files must reuse common components and add only business-specific fields/workflows. |

## 6. Entry Template

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

## 7. Rules for Same-Feature Changes

When the same feature changes again:

1. Add a new dated detailed entry.
2. Keep the old entry as historical evidence.
3. Update the feature history table with the new date and summary.
4. If a previous approach is replaced, mark the old entry as `Superseded` and mention the newer entry date.
5. If an SRS requirement changes meaning, update the SRS document separately and reference that SRS change here.
