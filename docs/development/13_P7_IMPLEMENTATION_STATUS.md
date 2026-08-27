# Common Core P7 - Implementation Status

- **Started:** 2026-08-27
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office reporting workspace:** <http://localhost:3001/reporting-operations>

## Current Delivery Slice

P7 adds the first reporting, integration and migration-control foundation. It does not implement a
full BI warehouse or external connector runtime yet. Instead, it reads from existing operational
records and stores the control records needed for reports, exports, webhooks and migration
validation:

```text
Back Office reporting-operations workspace
    -> API reporting-operations controller
    -> Reporting Operations service
    -> Business-scoped Prisma transaction
    -> PostgreSQL saved report view, export, webhook, webhook delivery and migration validation records
    -> Audit records + Business Events
```

The key business rule is read-only reporting. Reports and dashboards summarize source records; they
must not directly change sales, stock, finance or customer records.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P7 work |
|---|---|---|---|
| CC-P7-001 Sales Reports | Started | Reporting overview summarizes confirmed sale count, sales revenue, tax and currency from source sale records. | Add date/Branch/user/channel drill-down, saved report rendering and sale-line analytics. |
| CC-P7-002 Stock Reports | Started | Reporting overview summarizes stock balance count, on-hand quantity, available quantity and low/empty stock rows. | Add valuation, dead stock, reorder analysis and movement drill-down. |
| CC-P7-003 Finance Reports | Started | Reporting overview summarizes receivables, payables, expenses and cash/bank from finance source records. | Add margin, tax summaries, ageing and finance statement output. |
| CC-P7-004 Customer Reports | Started | Reporting overview includes customer count and supports saved customer report views. | Add top customers, frequency, loyalty and credit exposure reports. |
| CC-P7-005 Workforce Reports | Not started | - | Add sales/service performance, commissions and configurable workforce metrics. |
| CC-P7-006 API | Started | New authenticated P7 API routes use existing Business identity and permission checks. | Add public API key/OAuth model, rate limits and external API documentation. |
| CC-P7-007 Webhooks | Implemented for current scope | Webhook subscriptions store endpoint, event types, status and secret hint. | Add signing secret storage, worker delivery runtime and subscription test action. |
| CC-P7-008 Integration Failure | Implemented for current scope | Webhook delivery records store event id, status, attempts, last error and retry/dead-letter state. | Add automatic retry scheduler, exponential backoff and operator retry/skip actions. |
| CC-P7-009 Data Export | Implemented for current scope | Authorized export requests are queued with type, format, filters and status. | Add actual file generation, secure download URLs and expiry cleanup. |
| CC-P7-010 Migration Validation | Implemented for current scope | Migration validation records store source, entity kind, totals, warnings, errors, preview and reconciliation. | Add guided wizard, approval step and final commit/rollback linkage to import batches. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-016 Manager sees sales, stock and cash reports | Partially implemented | The `/reporting-operations` workspace shows sales, stock and finance summaries from source records. Drill-down reports remain pending. |
| CC-US-017 Integrator subscribes to business-event webhooks | Implemented for current scope | Webhook subscription and delivery records are available through API, client and Back Office. |

## API Surface

```http
GET  /api/v1/businesses/{businessId}/reporting-operations/overview
POST /api/v1/businesses/{businessId}/reporting-operations/report-views
POST /api/v1/businesses/{businessId}/reporting-operations/exports
POST /api/v1/businesses/{businessId}/reporting-operations/webhooks
POST /api/v1/businesses/{businessId}/reporting-operations/webhook-deliveries
POST /api/v1/businesses/{businessId}/reporting-operations/migration-validations
```

## Role and Permission Sync

P7 follows the additive sync rule:

- new P7 permission codes are part of the shared permission catalogue;
- Business Owner and Business Administrator receive P7 permissions automatically;
- the Reporting / Integration User template receives report, export, integration and migration
  permissions;
- Branch Manager receives current reporting and integration-management access for operational
  review;
- Finance User and Auditor receive report/export visibility;
- runtime sync updates existing Businesses without removing custom Role choices.

## Back Office UI/UX

The `/reporting-operations` workspace follows the common UI/UX pattern:

- KPI cards for sales revenue, stock availability, queued exports and webhook failures;
- tabs for reports, exports, webhooks and migration;
- responsive tables with internal scroll panels;
- quick-create forms for saved report views, export requests, webhook subscriptions and migration
  validation evidence;
- loading, permission, error and empty states through the shared `ResourceState` wrapper.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260827100101_p7_p8_reporting_readiness/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/reporting-operations.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `packages/domains/business-access/src/application/access-sync.ts`
- `apps/api/src/controllers/reporting-operations.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/reporting-operations/page.tsx`
- `apps/backoffice/src/app/lib/workspace.tsx`
- `packages/design-system/src/index.tsx`
- `scripts/smoke-common-core.mjs`

## Verification

- Prisma schema formatted and client generated.
- Migration `20260827100101_p7_p8_reporting_readiness` applied locally with deploy mode.
- `pnpm --filter @bizentra/contracts build` passed.
- `pnpm --filter @bizentra/database build` passed.
- `pnpm --filter @bizentra/domain-business-access typecheck` passed.
- `pnpm --filter @bizentra/domain-business-access build` passed.
- `pnpm --filter @bizentra/api-client build` passed.
- `pnpm --filter @bizentra/api build` passed.
- `pnpm --filter @bizentra/backoffice typecheck` passed.

## Next P7 Slices

1. Real report drill-down pages for sales, stock, finance, customer and workforce reports.
2. Export file generation with secure download links and retention cleanup.
3. Webhook signing secret management and worker-based delivery.
4. Retry/dead-letter operations UI for failed integration messages.
5. Migration validation wizard with approval, final commit and rollback linkage.
6. Saved filters, date ranges, Branch/user/channel selectors and data-freshness labels.
