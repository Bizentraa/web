# Common Core P6 - Implementation Status

- **Started:** 2026-08-27
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office store-reliability workspace:** <http://localhost:3001/store-reliability>

## Current Delivery Slice

P6 adds the first store-reliability foundation. It does not yet implement real browser offline
storage or hardware integration. Instead, it creates the device and sync records that POS, Back
Office and later hardware adapters can use:

```text
Back Office store-reliability workspace
    -> API store-reliability controller
    -> Store Reliability service
    -> Business-scoped Prisma transaction
    -> PostgreSQL device, offline queue and sync conflict records
    -> Audit records + Business Events
```

The key business rule is idempotent recovery. Offline work must be replayable without double-posting
business actions. Each offline queue item has a stable idempotency key, status and conflict path.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P6 work |
|---|---|---|---|
| CC-P6-001 Store Devices | Implemented for current scope | Store devices can be registered/upserted per Business and code with Branch, kind, hardware id, capabilities and status. | Add pairing, revocation, lost-device lockout and device assignment policy. |
| CC-P6-002 Printers | Started | Printer device kinds are represented in the device registry. | Add receipt/label/kitchen printer adapters, print job queue and printer health checks. |
| CC-P6-003 Scanners | Started | Barcode scanner device kind is represented in the device registry. | Add scanner adapter events, scanner-led receiving/counting/picking flows and device diagnostics. |
| CC-P6-004 Offline Sale | Started | Offline queue records can hold sale-like payloads with risk level and idempotency key. | Add POS IndexedDB storage, automatic replay, offline tender restrictions and visible offline sale confirmation state. |
| CC-P6-005 Offline Queue | Implemented for current scope | Offline queue items can be created idempotently and moved through queued/synced/conflict/failed/cancelled states. | Add browser queue drawer, retry backoff, background sync and replay ordering. |
| CC-P6-006 Sync Conflict | Implemented for current scope | Marking an offline queue item as conflict creates a conflict record; conflicts can be resolved with resolver and note. | Add server/client diff UI and guided conflict decisions by entity type. |
| CC-P6-007 Payment Offline Safety | Started | Offline queue has a risk-level field for review. | Add provider-specific offline payment limits, unknown-payment handling and forced review for high-risk tenders. |
| CC-P6-008 Device Health | Implemented for current scope | Device heartbeat updates last-seen time and pending offline item count; overview reports active devices and open conflicts. | Add health thresholds, alerts, device status automation and operations dashboard signals. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-015 Cashier continues work during internet loss | Partially implemented | The API and Back Office can store offline queue items and resolve sync conflicts. Real POS browser offline storage/replay remains pending. |

## API Surface

```http
GET   /api/v1/businesses/{businessId}/store-reliability/overview
POST  /api/v1/businesses/{businessId}/store-reliability/devices
PATCH /api/v1/businesses/{businessId}/store-reliability/devices/{deviceId}/heartbeat
POST  /api/v1/businesses/{businessId}/store-reliability/offline-queue
PATCH /api/v1/businesses/{businessId}/store-reliability/offline-queue/{queueItemId}
PATCH /api/v1/businesses/{businessId}/store-reliability/sync-conflicts/{conflictId}
```

## Role and Permission Sync

P6 follows the additive sync rule:

- new P6 permission codes are part of the shared permission catalogue;
- Business Owner and Business Administrator receive P6 permissions automatically;
- the Device / Offline User template receives device and offline queue access;
- Branch Manager receives read-only store reliability visibility;
- Cashier receives device/offline access needed for POS sync operations;
- Auditor receives read-only P6 permissions;
- runtime sync updates existing Businesses without removing custom Role choices.

## Back Office UI/UX

The `/store-reliability` workspace follows the common UI/UX pattern:

- KPI cards for devices, active devices, queued offline items and open conflicts;
- tabs for devices, offline queue and conflicts;
- responsive tables with internal scroll panels;
- quick-create form for device registration;
- queue test action and conflict resolution controls for the current foundation slice;
- loading, permission, error and empty states through the shared `ResourceState` wrapper.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260826205021_p5_p6_engines_devices/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/store-reliability.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `packages/domains/business-access/src/application/access-sync.ts`
- `apps/api/src/controllers/store-reliability.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/store-reliability/page.tsx`
- `apps/backoffice/src/app/lib/workspace.tsx`
- `packages/design-system/src/index.tsx`
- `scripts/smoke-common-core.mjs`

## Verification

- Prisma schema formatted and client generated.
- Migration `20260826205021_p5_p6_engines_devices` applied locally with deploy mode.
- `pnpm --filter @bizentra/contracts build` passed.
- `pnpm --filter @bizentra/database build` passed.
- `pnpm --filter @bizentra/domain-business-access typecheck` passed.
- `pnpm --filter @bizentra/domain-business-access build` passed.
- `pnpm --filter @bizentra/api-client build` passed.
- `pnpm --filter @bizentra/api build` passed.
- `pnpm --filter @bizentra/backoffice typecheck` passed.
- `pnpm check` passed.
- `node scripts/smoke-common-core.mjs` passed 139 live API checks when run against the local API,
  including P6 permission catalogue and Role checks, device registration, heartbeat, offline queue
  idempotency, conflict marking, conflict visibility, conflict resolution and audit evidence.

## Next P6 Slices

1. Real POS browser offline storage/replay using IndexedDB or an equivalent local durable queue.
2. Always-visible POS offline banner and sync queue drawer.
3. Payment-provider-specific offline risk restrictions and unknown-payment review handling.
4. Printer, scanner, cash-drawer, payment-terminal and customer-display adapters.
5. Server/client conflict comparison UI with guided decisions.
6. Device pairing, revocation and lost-device lockout.
7. Route-level browser smoke tests for offline and device states.
