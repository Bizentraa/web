# Common Core P3 - Implementation Status

- **Started:** 2026-08-26
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office inventory workspace:** <http://localhost:3001/inventory>

## Current Delivery Slice

P3 adds the operational layer that controls physical stock and purchasing. P0 defines the Business,
Branches, Locations, users, roles and approvals. P1 defines Items, suppliers, units, prices and tax.
P2 sells. P3 now records where stock exists, how it moves, how it is replenished and how fulfillment
work progresses.

```text
Back Office inventory workspace
    -> API inventory controller
    -> Inventory service
    -> Business-scoped Prisma transaction
    -> PostgreSQL stock, purchasing, receiving and fulfillment records
    -> Audit records + Business Events
```

The important rule is that planning documents do not move stock. A reorder suggestion, purchase
request or purchase order can explain what should happen next, but stock increases only when a goods
receipt is posted. A transfer changes stock through controlled stock movement rows. A fulfillment
order records the pick, pack and dispatch lifecycle without pretending the stock moved twice.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P3 work |
|---|---|---|---|
| CC-P3-001 Stock Ledger | Implemented for current scope | `StockMovement` stores item, optional variant, location, quantity, movement kind, status, reference, reason and posting user. The live smoke test verifies adjustment, transfer and receipt ledger rows. | Add serial/batch/expiry ledger dimensions in P5 where traceability becomes explicit. |
| CC-P3-002 One Movement Rule | Implemented for current scope | Adjustment creates one movement; transfer creates one outbound and one inbound movement; receipt creates receipt movements only when goods are received. | Add stronger reversal/correction workflows for cancelled or corrected warehouse documents. |
| CC-P3-003 Availability | Implemented for current scope | `StockBalance` exposes on-hand, reserved, incoming and calculated available quantities in the inventory overview. | Add reservations from sales orders and fulfillment allocation. |
| CC-P3-004 Receiving | Implemented for current scope | Purchase order approval does not affect stock. Goods receipt creates receipt lines, updates received quantity and increases stock. Over-receiving is refused. | Add barcode receiving, supplier returns and bill matching. |
| CC-P3-005 Transfers | Implemented for current scope | Location-to-location transfer checks source availability, posts transfer-out and transfer-in movement rows, and updates both balances. | Add explicit in-transit receiving workflow for multi-step warehouse transfer. |
| CC-P3-006 Counts | Not started | - | Add stock counts, cycle counts, frozen count sessions, variance review and controlled variance posting. |
| CC-P3-007 Adjustments | Implemented for current scope | Adjustments require a reason and are permission checked; movement and audit records are created. | Connect configurable approval thresholds for high-risk adjustment reasons. |
| CC-P3-008 Reorder | Implemented for current scope | Reorder settings and reorder suggestions compare available stock against configured minimums. | Add demand forecasting and supplier lead-time weighted suggestions. |
| CC-P3-009 Purchase Request | Implemented for current scope | Purchase requests can be created, submitted and approved/rejected with approver identity. | Add richer approval-return-to-task UX and multi-approver purchasing policies. |
| CC-P3-010 Purchase Order | Implemented for current scope | Approved purchase requests can be converted to purchase orders by supplier, item, quantity, cost and expected date. | Add supplier comparison, landed cost and change-order workflow. |
| CC-P3-011 Purchase Variance | Implemented for current scope | Purchase order overview shows ordered and received quantity by line and status changes to partial/received. | Add billed and returned quantity tracking with payables in P4. |
| CC-P3-012 Picking/Packing | Implemented for current scope | Fulfillment orders can be created and moved through picking, packed and dispatched states. | Add sales-order reservations, route/delivery planning and scanner-led picking. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-007 Inventory User receives a purchase order | Implemented for current scope | Goods receipt increases stock only when received and separates ordered from received quantity. |
| CC-US-008 Inventory User transfers stock between Locations | Implemented for current scope | The source balance decreases, destination balance increases and transfer movement rows are visible. |
| CC-US-009 Purchasing User creates and approves purchasing work | Implemented for current scope | Purchase request approval is recorded; purchase order creation alone does not change stock. |

## API Surface

```http
GET    /api/v1/businesses/{businessId}/inventory/overview
POST   /api/v1/businesses/{businessId}/inventory/adjustments
POST   /api/v1/businesses/{businessId}/inventory/transfers
PUT    /api/v1/businesses/{businessId}/inventory/reorder-settings
POST   /api/v1/businesses/{businessId}/inventory/purchase-requests
POST   /api/v1/businesses/{businessId}/inventory/purchase-requests/{requestId}/decision
POST   /api/v1/businesses/{businessId}/inventory/purchase-orders
POST   /api/v1/businesses/{businessId}/inventory/purchase-orders/{purchaseOrderId}/receipts
POST   /api/v1/businesses/{businessId}/inventory/fulfillment-orders
PUT    /api/v1/businesses/{businessId}/inventory/fulfillment-orders/{fulfillmentOrderId}/status
```

## Back Office UI/UX

The `/inventory` workspace follows the common operations workspace style from the UI/UX plan:

- dense KPI cards for stock positions, reorder alerts, purchase orders and fulfillment;
- tabbed work areas for stock ledger, purchasing and fulfillment;
- responsive tables that remain usable on smaller screens;
- modal flows for stock adjustment, transfer, reorder settings, purchase request, purchase order,
  receiving and fulfillment;
- state handling for loading, empty data, errors and retry actions;
- shared design-system components for cards, badges, tabs, tables, dialogs and buttons.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260826090655_p3_inventory_purchasing_fulfillment`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/inventory.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `apps/api/src/controllers/inventory.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/inventory/page.tsx`
- `apps/backoffice/src/app/lib/workspace.tsx`
- `packages/design-system/src/index.tsx`
- `scripts/smoke-common-core.mjs`

## Verification

- Prisma schema formatted and client generated.
- Migration `20260826090655_p3_inventory_purchasing_fulfillment` applied locally with deploy mode.
- Domain, API and Back Office targeted type/build checks passed.
- `scripts/smoke-common-core.mjs` completed 89 live API checks against local PostgreSQL/Redis/API,
  including P3 stock adjustment, reorder suggestion, transfer, purchase request approval, purchase
  order conversion, goods receipt, over-receive refusal, partial receiving, fulfillment status flow
  and audit evidence.

## Next P3 Slices

1. Stock counts and cycle counts with controlled variance posting.
2. Serial, batch, lot and expiry tracking, coordinated with the P5 traceability work.
3. Reservation logic from sales orders and fulfillment allocation.
4. Multi-step in-transit transfer receiving for warehouse-to-store operations.
5. Supplier returns, bill matching and billed/returned quantities once P4 payables starts.
6. Scanner-led mobile receiving, counting, picking and transfer views.
