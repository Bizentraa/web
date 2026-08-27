# Common Core P5 - Implementation Status

- **Started:** 2026-08-27
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office business-engines workspace:** <http://localhost:3001/business-engines>

## Current Delivery Slice

P5 adds the first reusable business-engine foundation. These engines are shared by future business
types such as service repair, restaurant production, delivery, rental and regulated-item workflows.
The current slice creates the operational records and guard rules that later vertical screens can
reuse:

```text
Back Office business-engines workspace
    -> API business-engines controller
    -> Business Engines service
    -> Business-scoped Prisma transaction
    -> PostgreSQL workflow, ticket, booking, traceability, warranty, BOM, route, notification and document records
    -> Audit records + Business Events
```

The key business rule is separation of responsibility. Work tickets, bookings, warranty claims,
routes and BOM definitions do not directly mutate stock or finance. Stock and finance still change
only through real posted operational events such as sales, receiving, transfers, adjustments,
expenses or explicit material consumption.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P5 work |
|---|---|---|---|
| CC-P5-001 Workflow | Implemented for current scope | Workflow status and transition records are stored per Business and can be created through API/client contracts. | Add visual workflow designer, transition editing UI and transition enforcement against every supported entity type. |
| CC-P5-002 Work Ticket | Implemented for current scope | Work tickets have number, Branch, source link, assignee field, checklist, due date, priority and status update. | Add WorkBoard, ticket detail, timers, assignment queues, checklist editing and per-ticket attachments. |
| CC-P5-003 Booking | Implemented for current scope | Bookings store Branch, resource code, optional Customer, time range, status and deposit amount; overlapping resource bookings are refused. | Add full calendar UI, capacity rules, cancellation, no-show, reminders and payment-linked deposits. |
| CC-P5-004 Customer Asset | Implemented for current scope | Customer assets store customer-owned vehicles, devices or equipment with identifier and attributes. | Add asset history timeline and direct links to service tickets, sales and warranties. |
| CC-P5-005 Traceable Unit | Implemented for current scope | Traceable units store serial, IMEI, batch, lot, expiry and location/item links. | Link traceability movements to receipt, sale, return, transfer and warranty events. |
| CC-P5-006 Warranty/RMA | Started | Warranty/RMA claim opening is stored with claim number, customer, item/unit references, status and issue text. | Add policy activation, inspection, approval, repair/replacement and RMA closure workflows. |
| CC-P5-007 Recipe/BOM | Implemented for current scope | BOM header and component lines are stored without changing stock. | Add production/assembly posting and cost roll-up. |
| CC-P5-008 Material Consumption | Implemented for current scope | Material consumption records are posted against a source type/source id and audited. | Add automated stock consumption from production/service execution when business rules are finalized. |
| CC-P5-009 Route Plan | Implemented for current scope | Delivery routes and stops can be planned with Branch, scheduled date, driver name and stop sequence. | Add dispatch workflow, failed-delivery retry and route optimization support. |
| CC-P5-010 Proof of Delivery | Started | Delivery stops include proof fields and failure reason fields in the data model. | Add mobile signature/photo capture and customer-facing proof links. |
| CC-P5-011 Notifications | Started | Notification event queue records can be created with channel, recipient, subject/body and status. | Add templates, provider integrations, retry, dead-letter handling and failure dashboard. |
| CC-P5-012 Documents | Started | Business document metadata can be attached to entity type/id with file name, MIME type and URL. | Add secure file storage, virus scanning, permissioned download and per-record document panels. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-012 Service User manages work tickets | Implemented for current scope | The `/business-engines` workspace and API can create and update work tickets. |
| CC-US-013 Scheduler manages bookings | Implemented for current scope | Booking creation validates time range and refuses overlapping resource bookings. |
| CC-US-014 Operations User handles warranty, traceability and route work | Partially implemented | Warranty claim, traceable unit and delivery route records exist; end-to-end execution workflows remain pending. |

## API Surface

```http
GET   /api/v1/businesses/{businessId}/business-engines/overview
POST  /api/v1/businesses/{businessId}/business-engines/workflow-statuses
POST  /api/v1/businesses/{businessId}/business-engines/workflow-transitions
POST  /api/v1/businesses/{businessId}/business-engines/work-tickets
PATCH /api/v1/businesses/{businessId}/business-engines/work-tickets/{ticketId}/status
POST  /api/v1/businesses/{businessId}/business-engines/bookings
POST  /api/v1/businesses/{businessId}/business-engines/customer-assets
POST  /api/v1/businesses/{businessId}/business-engines/traceable-units
POST  /api/v1/businesses/{businessId}/business-engines/warranty-claims
POST  /api/v1/businesses/{businessId}/business-engines/boms
POST  /api/v1/businesses/{businessId}/business-engines/material-consumptions
POST  /api/v1/businesses/{businessId}/business-engines/delivery-routes
PATCH /api/v1/businesses/{businessId}/business-engines/delivery-stops/{stopId}
POST  /api/v1/businesses/{businessId}/business-engines/notifications
POST  /api/v1/businesses/{businessId}/business-engines/documents
```

## Role and Permission Sync

P5 follows the additive sync rule:

- new P5 permission codes are part of the shared permission catalogue;
- Business Owner and Business Administrator receive P5 permissions automatically;
- the Operations User template receives workflow, work-ticket, booking, traceability, warranty,
  BOM, route, notification and document access;
- Branch Manager receives operational P5 permissions;
- Inventory User receives traceability and BOM permissions;
- Cashier receives read access where POS/service workflows need it;
- Auditor receives read-only P5 permissions;
- runtime sync updates existing Businesses without removing custom Role choices.

## Back Office UI/UX

The `/business-engines` workspace follows the common UI/UX pattern:

- KPI cards for tickets, bookings, traceable units and warranties;
- tabs for tickets, bookings, traceability, warranty, recipe/BOM, routes and messages/documents;
- responsive tables with internal scroll panels;
- quick-create forms for tickets, bookings and traceable units;
- read-oriented panels for warranty, BOM, route, notification and document records in this slice;
- loading, permission, error and empty states through the shared `ResourceState` wrapper.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260826205021_p5_p6_engines_devices/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/business-engines.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `packages/domains/business-access/src/application/access-sync.ts`
- `apps/api/src/controllers/business-engines.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/business-engines/page.tsx`
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
  including P5 permission catalogue and Role checks, workflow status, work ticket, booking overlap
  refusal, asset, traceability, warranty, BOM, material consumption, route, notification, document
  and audit evidence.

## Next P5 Slices

1. Visual workflow designer, transition editor and transition enforcement.
2. WorkBoard and ticket detail with timers, assignment queues, editable checklists and attachments.
3. Booking calendar with capacity, cancellation, no-show and reminder workflows.
4. Warranty policy activation, inspection, approval, repair/replacement and RMA closure.
5. Traceability movement linkage to receipt, sale, return, transfer and warranty events.
6. BOM production/assembly posting with stock consumption and output posting.
7. Mobile proof-of-delivery capture with signature/photo evidence.
8. Notification templates, providers, retry and failure management.
