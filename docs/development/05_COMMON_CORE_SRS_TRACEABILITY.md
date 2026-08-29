# Common Core SRS Traceability and Pending Work

- **Last reviewed:** 2026-08-28
- **Source SRS:** [`../01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **Change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)

This file compares the Common Core SRS against the implementation evidence recorded in the per-phase
status documents, re-checked against the API surface. The `Status` column in section 6 and section 8
of the SRS is a summary of this file; this file and the phase documents are the evidence.

## How a status is decided

| Status | Meaning |
|---|---|
| Implemented | The workflow, permission behaviour, validation, audit evidence and verification evidence are complete for the current phase scope. A row may still carry named work belonging to a later phase. |
| Started | The data model and the API exist and are exercised, but the workflow a user would follow is not finished. |
| Not started | No implementation exists. |

A requirement is never marked Implemented only because its database table exists.

## Status Summary

| Phase | SRS scope | Implemented | Started | Not started | Evidence |
|---|---|---|---|---|---|
| P0 | Business setup, isolation, branches, locations, users, roles, approvals, feature access, audit, numbering | 10 | 0 | 0 | [`01_P0`](./01_P0_IMPLEMENTATION_STATUS.md) |
| P1 | Items, categories, variants, units, barcodes, prices, promotions, tax, customers, suppliers, imports | 11 | 0 | 0 | [`04_P1`](./04_P1_IMPLEMENTATION_STATUS.md) |
| P2 | POS sales, tenders, receipts, returns and exchanges | 11 | 0 | 1 | [`08_P2`](./08_P2_IMPLEMENTATION_STATUS.md) |
| P3 | Inventory, purchasing and fulfillment | 11 | 0 | 1 | [`09_P3`](./09_P3_IMPLEMENTATION_STATUS.md) |
| P4 | Finance, customer controls, loyalty and accounting events | 10 | 1 | 1 | [`10_P4`](./10_P4_IMPLEMENTATION_STATUS.md) |
| P5 | Reusable business engines | 8 | 4 | 0 | [`11_P5`](./11_P5_IMPLEMENTATION_STATUS.md) |
| P6 | Offline, devices and store reliability | 4 | 4 | 0 | [`12_P6`](./12_P6_IMPLEMENTATION_STATUS.md) |
| P7 | Reporting, integrations and migration | 4 | 5 | 1 | [`13_P7`](./13_P7_IMPLEMENTATION_STATUS.md) |
| P8 | Security, operations and production readiness | 3 | 6 | 1 | [`14_P8`](./14_P8_IMPLEMENTATION_STATUS.md) |
| **Functional total** | 97 requirements | **72** | **20** | **5** | |
| **User stories** | 18 stories | **15** | **3** | **0** | section 8 below |

Every phase now has running code. P0 to P3 are complete except for stock counts and
quotations/orders; P4 and P5 carry the working money and engine surfaces with named gaps; P6, P7
and P8 have their records, endpoints and contracts but not yet the operator-facing workflows.

## P0 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P0-001` Business Setup | Implemented | Bootstrap plus `/setup` editing of details, currency, time zone and country | First-run wizard |
| `CC-P0-002` Data Separation | Implemented | Forced RLS on every scoped table; cross-Business access refused in the smoke run | CI integration tests |
| `CC-P0-003` Branch | Implemented | Create, edit, activate and deactivate with guards; Back Office Branch switcher | - |
| `CC-P0-004` Locations | Implemented | Create, edit and deactivate with the seven types | - |
| `CC-P0-005` Users | Implemented | Invite, activate, suspend, assign Roles and Branches; owner cannot change their own access | Production sign-in |
| `CC-P0-006` Roles | Implemented | Templates, custom Roles, permission matrix, 52 permissions | Separation-of-duties rules |
| `CC-P0-007` Approvals | Implemented | Policies, requests, per-approver decision rows, `ANY_APPROVER`, `MINIMUM_APPROVERS`, `ALL_APPROVERS` and enforcement on sensitive actions | Return-to-task UX polish |
| `CC-P0-008` Feature Access | Implemented | Feature packs with dependency validation | Per-feature settings |
| `CC-P0-009` Audit | Implemented | Append-only records with search and before/after detail | Retention and export |
| `CC-P0-010` Numbering | Implemented | Atomic allocation, forward-only settings, next-number preview | Concurrency tests |

## P1 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P1-001` Item | Implemented | One item model with list, detail, edit and deactivate | Item images |
| `CC-P1-002` Categories | Implemented | Categories, brands, tags and custom attributes; categories drive the POS quick filters | Category tree editing |
| `CC-P1-003` Variants | Implemented | Variants with attributes, identifiers and prices | Bulk matrix |
| `CC-P1-004` Units | Implemented | Units, precision and conversions | - |
| `CC-P1-005` Barcodes | Implemented | Unique identifiers with duplicate refusal and POS scan resolution | Scanner profiles in P6 |
| `CC-P1-006` Prices | Implemented | Price lists, tax mode, Branch prices, quantity breaks, customer pricing | - |
| `CC-P1-007` Promotions | Implemented | Percentage, fixed, coupon, buy-X-get-Y with overlap detection | Cross-item bundles |
| `CC-P1-008` Tax | Implemented | Categories, date-effective rates, inclusive and exclusive handling | Jurisdictions |
| `CC-P1-009` Customers | Implemented | Contacts, groups, history and store credit | Credit limits in P4 |
| `CC-P1-010` Suppliers | Implemented | Terms, lead time and supplier items | - |
| `CC-P1-011` Import | Implemented | Validate, preview, apply and roll back, on Import and History tabs | Opening stock |

## P2 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P2-001` POS Shift | Implemented | Float, cash movements, expected cash, counted close with a required reason for any difference; the drawer lists the tickets still open on the shift and offers Resume or Discard instead of failing on submit | Cash-drawer hardware |
| `CC-P2-002` Sale | Implemented | Scan, search, category quick filters, default catalogue grid, cart, price, discount and tax | Per-cashier favourites |
| `CC-P2-003` Customer at Sale | Implemented | Customer attach changes pricing through the group | - |
| `CC-P2-004` Hold Sale | Implemented | Hold, list, resume, edit, confirm, and discard from the POS by voiding with a reason | - |
| `CC-P2-005` Payment | Implemented | Five tender methods, chosen as tiles with cash denomination shortcuts | A real payment provider |
| `CC-P2-006` Split Payment | Implemented | Several tenders with live change and running due | - |
| `CC-P2-007` Payment Safety | Implemented | Idempotency on sale, payment and return | Provider idempotency |
| `CC-P2-008` Receipt | Implemented | Allocated once, with tax lines and tenders | Thermal printing |
| `CC-P2-009` Return | Implemented | Original sale lookup, per-line stepper, proportional refund estimate, stock disposition | - |
| `CC-P2-010` Refund | Implemented | Original method, cash or store credit, with approval above the threshold | Card refunds |
| `CC-P2-011` Exchange | Implemented | Return plus replacement sale in one flow | A POS screen for it |
| `CC-P2-012` Quotation/Order | Not started | - | Quotations and sales orders for non-instant sales |

## P3 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P3-001` Stock Ledger | Implemented | `StockMovement` with item, variant, location, quantity, kind, status, reference, reason and posting user | Valuation layers |
| `CC-P3-002` One Movement Rule | Implemented | Adjustment posts one movement; a transfer posts one out and one in; receipt posts receipt movements | - |
| `CC-P3-003` Availability | Implemented | `StockBalance` exposes on-hand, reserved, incoming and available | Reservation from sales orders |
| `CC-P3-004` Receiving | Implemented | Approval alone does not move stock; goods receipt increases it | Landed cost |
| `CC-P3-005` Transfers | Implemented | Source availability checked, both balances updated | In-transit states |
| `CC-P3-006` Counts | Implemented | Frozen count sessions, counted quantities, variance calculation and controlled variance posting through stock adjustment movements | Mobile scanner-led counting and high-risk variance approval thresholds |
| `CC-P3-007` Adjustments | Implemented | Reason required, permission checked, movement and audit written | Configurable approval thresholds |
| `CC-P3-008` Reorder | Implemented | Reorder settings and suggestions compare available stock against minimums | Demand forecasting |
| `CC-P3-009` Purchase Request | Implemented | Create, submit and approve/reject with approver identity | Return-to-taker flow |
| `CC-P3-010` Purchase Order | Implemented | Approved requests convert to orders by supplier, item, quantity, cost and date | Supplier price history |
| `CC-P3-011` Purchase Variance | Implemented | Ordered and received quantity by line, partial/received states | Billed and returned columns |
| `CC-P3-012` Picking/Packing | Implemented | Fulfillment orders move through picking, packed and dispatched | Route and carrier integration |

## P4 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P4-001` Customer Invoice | Implemented | Numbered invoices with customer, lines, tax, totals, paid amount and balance | Invoice from sales order |
| `CC-P4-002` Customer Credit | Implemented for current scope | Store credit from P2 plus receivable balance visibility | Enforced credit limit and terms |
| `CC-P4-003` Collections | Implemented | Allocation to invoices with over-allocation refused | Unallocated receipt application |
| `CC-P4-004` Supplier Bill | Implemented | Numbered bills with supplier, optional purchase order, lines and payable balance | Three-way match |
| `CC-P4-005` Supplier Payment | Implemented | Allocation to bills with over-payment refused | Payment batches |
| `CC-P4-006` Expenses | Implemented | Categories and posted expenses with payment method, tax and audit | Receipt attachments |
| `CC-P4-007` Cash/Bank | Implemented | Accounts and posted transactions maintaining balance | Account-to-account transfers |
| `CC-P4-008` Reconciliation | Started | Bank/cash records and accounting events exist as inputs | Reconciliation session, statement import, matching, variance |
| `CC-P4-009` Loyalty | Implemented | Earn, redeem, adjust and expire entries; negative balances refused | Automated rules from sales |
| `CC-P4-010` Store Credit | Implemented | P2 issue and redemption, visible in customer history | Expiry policy |
| `CC-P4-011` Margins | Not started | - | Sales, cost and gross margin reporting after a valuation policy exists |
| `CC-P4-012` Accounting Events | Implemented | Posted invoice, collection, bill, payment, expense and bank transaction emit pending events | An accounting consumer |

## P5 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P5-001` Workflow | Implemented | Status and transition records per Business through API and client contracts | Visual workflow editing |
| `CC-P5-002` Work Ticket | Implemented | Number, Branch, source link, assignee, checklist, due date, priority, status update | Work board UI |
| `CC-P5-003` Booking | Implemented | Branch, resource, customer, time range, status, deposit; overlapping bookings refused | Calendar UI and no-show handling |
| `CC-P5-004` Customer Asset | Implemented | Customer-owned vehicles, devices and equipment with identifier and attributes | Asset history timeline |
| `CC-P5-005` Traceability | Implemented | Serial, IMEI, batch, lot, expiry and location/item links | Movements linked to receipt and sale |
| `CC-P5-006` Warranty | Started | Claim opening with number, customer, item/unit, status and issue text | Policy activation, inspection, approval, RMA closure |
| `CC-P5-007` Recipe/BOM | Implemented | Header and component lines stored without moving stock | Production posting and cost roll-up |
| `CC-P5-008` Consumption | Implemented | Consumption posted against a source type and id, audited | Automatic consumption from tickets |
| `CC-P5-009` Route | Implemented | Routes and stops with Branch, date, driver and sequence | Dispatch workflow |
| `CC-P5-010` Proof of Delivery | Started | Proof and failure fields exist in the model | Signature and photo capture |
| `CC-P5-011` Notifications | Started | Queue records with channel, recipient, subject, body and status | Templates, providers, retry, dead-letter |
| `CC-P5-012` Documents | Started | Document metadata attached to entity type and id | Secure storage, scanning, permissioned download |

## P6 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P6-001` Devices | Implemented | Devices registered per Business and code with Branch, kind, hardware id, capabilities and status | Provisioning UI |
| `CC-P6-002` Printer | Started | Printer kinds exist in the device registry | Adapters, print queue, health checks |
| `CC-P6-003` Scanner | Started | Scanner kind exists in the device registry; the POS resolves scanned codes through the catalogue | Adapter events and scanner-led flows |
| `CC-P6-004` Offline Sale | Started | The POS queues a sale locally when the connection is down and replays it through the sync endpoint | Durable browser storage, automatic replay, offline tender limits |
| `CC-P6-005` Offline Queue | Implemented | Items created idempotently and moved through queued, synced, conflict, failed and cancelled | - |
| `CC-P6-006` Conflict | Implemented | A conflict record is created and resolved with resolver and note | Server-side merge rules |
| `CC-P6-007` Payment Offline Safety | Started | A risk level is recorded on queued items | Provider limits and forced review |
| `CC-P6-008` Device Health | Implemented | Heartbeat updates last-seen and pending count; the POS shows online state and pending sales | Alerting |

## P7 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P7-001` Sales Reports | Started | Overview summarises confirmed sale count, revenue, tax and currency | Date, Branch, user and channel drill-down |
| `CC-P7-002` Stock Reports | Started | Overview summarises balances, on-hand, available and low/empty rows | Valuation, dead stock, reorder reports |
| `CC-P7-003` Finance Reports | Started | Overview summarises receivables, payables, expenses and cash | Margin, tax summaries, ageing |
| `CC-P7-004` Customer Reports | Started | Customer count and saved report views | Top customers, frequency, loyalty, credit exposure |
| `CC-P7-005` Workforce Reports | Not started | - | Sales and service performance, commissions |
| `CC-P7-006` API | Started | Authenticated routes reuse Business identity and permission checks | Public key/OAuth model, rate limits, published docs |
| `CC-P7-007` Webhooks | Implemented | Subscriptions with endpoint, event types, status and secret hint | Signing secret storage and delivery runtime |
| `CC-P7-008` Integration Failure | Implemented | Delivery records with event id, status, attempts, last error, retry and dead-letter | Automatic retry scheduling |
| `CC-P7-009` Data Export | Implemented | Export requests queued with type, format, filters and status | File generation and secure download |
| `CC-P7-010` Migration Validation | Implemented | Records with source, entity kind, totals, warnings, errors, preview and reconciliation | Guided migration UI |

## P8 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P8-001` Security | Started | Security events capture severity, subject, details and metadata | Transport headers, secret vault, dependency scanning |
| `CC-P8-002` Authentication | Not started | - | Production OIDC, sessions, password policy, MFA for privileged users |
| `CC-P8-003` Audit Integrity | Started | P0 append-only audit records; P8 counts audit and security events | Database-level immutability proven by migration tests |
| `CC-P8-004` Backup | Implemented | Backup runs with scope, status, storage reference, size and failure reason | Scheduler and failure alerting |
| `CC-P8-005` Disaster Recovery | Started | RPO/RTO fields and restore-tested evidence on backup runs | DR scenario tests and restore verification |
| `CC-P8-006` Observability | Started | Readiness checks record observability status and measured values | Logs, metrics, traces and dashboards |
| `CC-P8-007` Performance | Started | Readiness checks store targets and measured values | Load tests and POS response-time thresholds |
| `CC-P8-008` Scalability | Started | Readiness checks track scalability without changing business logic | Volume tests |
| `CC-P8-009` Privacy | Implemented | Requests track requester, type, customer, due date, resolution and status | Export and delete execution, retention |
| `CC-P8-010` Release | Implemented | Release readiness with version, status, checklist, migration and rollback plan | Pipeline gate and rollback automation |

## User Story Traceability

Fifteen of the eighteen Common Core user stories pass their own acceptance check today. The three
that do not:

| Story | Status | Why not yet | Blocking requirement |
|---|---|---|---|
| `CC-US-014` track a serial/batch item | Started | Traceable units are stored, but receipt, movement, sale and customer assignment are not yet linked into one visible history | `CC-P5-005` |
| `CC-US-016` see sales, stock and cash reports | Started | The overviews summarise from source records; the reports a manager would read daily do not exist | `CC-P7-001` to `CC-P7-003` |
| `CC-US-017` subscribe to business-event webhooks | Started | Subscriptions and delivery records exist; the signature the story requires does not | `CC-P7-007` |

## Immediate Pending Work

1. Connect production identity so invitations, approvals and audit actors are real users
   (`CC-P8-002`); it is the last thing standing between P0 and a production Business.
2. Turn the smoke runs into automated integration tests in CI.
3. Mobile scanner-led counting and high-risk variance approval thresholds for stock counts.
4. Quotations and sales orders (`CC-P2-012`) if the first vertical needs non-instant sales.
5. Margin reporting (`CC-P4-011`), which needs an inventory valuation policy decided first.
6. Webhook signing (`CC-P7-007`) before any external system is allowed to subscribe.

## Business-Type SRS Traceability

No business-type pack has been built. Every requirement in
[`../02_GROCERY_SUPERMARKET_SRS.md`](../02_GROCERY_SUPERMARKET_SRS.md) and
[`../03_GENERAL_RETAIL_SRS.md`](../03_GENERAL_RETAIL_SRS.md) reads `Not started`, and those files
state the evidence: no weighted-item or scale-barcode handling, no FEFO, no expiry blocking, no
click-and-collect, no business-type pack switch. P0 to P5 are ready to build a pack on.

## UI/UX Traceability

UI/UX implementation status is tracked in
[`07_UIUX_IMPLEMENTATION_STATUS.md`](./07_UIUX_IMPLEMENTATION_STATUS.md), the Back Office shell in
[`15_BACKOFFICE_SIDEBAR_SHADCN.md`](./15_BACKOFFICE_SIDEBAR_SHADCN.md), and the shared component
system in [`06_UI_COMPONENT_SYSTEM.md`](./06_UI_COMPONENT_SYSTEM.md).

## Implementation Rule

Do not mark a requirement as implemented only because its database table exists. A requirement
becomes implemented only when the user workflow, permission behaviour, validation, audit evidence
and verification evidence are complete for the current phase scope. When a requirement's status
changes, change it here, in the phase status document and in the SRS `Status` column in the same
commit.
