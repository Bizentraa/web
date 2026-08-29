# Common Core SRS — Used by Every Business Type

**Document purpose:** This file contains the requirements that must be developed once and reused by every business type.

> **Simple naming rule:** use **Business** instead of “tenant”. A Business is one customer company using the SaaS. Use **Branch** for a store/outlet/workshop/location. Use technical terms only when they help implementation.

## 1. Why this file exists

Do **not** build a separate customer engine, stock engine, payment engine, booking engine, work-ticket engine or finance engine for each business type.

Each business-specific file in this folder shall:
1. reuse the requirements in this Common Core;
2. add only business-specific rules, screens, fields and workflows;
3. use the shared business events;
4. never create a second source of truth for stock, money, customers or users.

## 2. Simple terms

| Term | Meaning |
| --- | --- |
| Business | One customer company using the SaaS. Use this instead of the technical word “tenant”. |
| Branch | A store, restaurant, workshop, office, outlet, or operating location belonging to the Business. |
| Location | A place where stock or work is managed, such as Main Warehouse, Shop Floor, Kitchen Store, Van 01, Service Bay 02. |
| User | A person who logs in to the system. |
| Role | A named permission set such as Cashier, Manager, Store Keeper, Accountant, Technician. |
| Item | Anything that can be sold, bought, stocked, consumed, assembled, rented, or used as a service. |
| Customer | A person or business buying goods or services. |
| Supplier | A person or company supplying goods or services. |
| Stock Movement | One physical change in stock quantity or stock location. |
| Work Ticket | A common job record. Industry names include Kitchen Order Ticket, Job Card, Repair Ticket, Service Ticket. |
| Booking | A reserved time and resource, such as a stylist, mechanic bay, table, or rental asset. |
| Customer Asset | Something owned or used by the customer that needs history, such as a vehicle or phone. |
| Traceability | Tracking individual serial numbers, IMEI numbers, batches, lots, or expiry dates. |
| Money customers owe us | Accounts Receivable (AR). |
| Money we owe suppliers | Accounts Payable (AP). |
| Business Event | A factual event such as SaleCompleted, GoodsReceived, PaymentReceived, or WorkCompleted. |

## 3. Common Roles

| Role | Main responsibility |
| --- | --- |
| Business Owner | Sets up the business, chooses features, sees overall performance. |
| Business Administrator | Manages users, Branches, settings and permissions. |
| Branch Manager | Runs one Branch, approves sensitive actions and reviews operations. |
| Cashier / Sales User | Creates sales, receives allowed payments and handles permitted returns. |
| Inventory User | Receives, counts, transfers and adjusts stock. |
| Purchasing User | Creates purchase requests/orders and works with suppliers. |
| Finance User | Manages invoices, payments, expenses, balances and reconciliation. |
| Service / Operations User | Works on tickets, bookings, production or delivery depending on the business type. |
| Auditor / Read-only User | Reviews records, audit history and reports without changing business data. |

## 4. Common Development Sequence

| Phase | Name | Goal |
| --- | --- | --- |
| P0 | Project Foundation & Business Setup | Create the safe base every business type will use. |
| P1 | Master Data & Configuration | Build products/services, prices, tax, customers, suppliers and locations. |
| P2 | Sales, POS & Payments | Make reliable sales and payment workflows. |
| P3 | Inventory, Purchasing & Fulfillment | Control stock, purchasing, receiving, transfers and delivery preparation. |
| P4 | Finance, Customer & Management Controls | Add credit, receivables, payables, expenses, loyalty, approvals and audit. |
| P5 | Reusable Business Engines | Build booking, work tickets, traceability, warranty, recipe/BOM, route and workflow engines once. |
| P6 | Offline, Devices & Store Reliability | Make terminals, printers, scanners and offline operation production-ready. |
| P7 | Reporting, Integrations & Data Migration | Support business reporting, APIs, webhooks, imports and integrations. |
| P8 | Security, Operations & Production Readiness | Finish observability, backup, disaster recovery, performance and go-live controls. |

### Dependency rule

```text
P0 Foundation
    ↓
P1 Master Data
    ↓
P2 POS / Sales / Payments
    ↓
P3 Inventory / Purchasing / Fulfillment
    ↓
P4 Finance / CRM / Controls
    ↓
P5 Reusable Business Engines
    ↓
P6 Offline / Devices
    ↓
P7 Reports / Integrations / Migration
    ↓
P8 Security / Operations / Production
```

A business-specific phase may start only when the Common Core features it depends on are stable enough for that business workflow.

Implementation evidence is tracked separately from this SRS. The `Status` column in section 6 and
section 8 is a summary of these documents, not a second source of truth:

- P0: [`development/01_P0_IMPLEMENTATION_STATUS.md`](./development/01_P0_IMPLEMENTATION_STATUS.md)
- P1: [`development/04_P1_IMPLEMENTATION_STATUS.md`](./development/04_P1_IMPLEMENTATION_STATUS.md)
- P2: [`development/08_P2_IMPLEMENTATION_STATUS.md`](./development/08_P2_IMPLEMENTATION_STATUS.md)
- P3: [`development/09_P3_IMPLEMENTATION_STATUS.md`](./development/09_P3_IMPLEMENTATION_STATUS.md)
- P4: [`development/10_P4_IMPLEMENTATION_STATUS.md`](./development/10_P4_IMPLEMENTATION_STATUS.md)
- P5: [`development/11_P5_IMPLEMENTATION_STATUS.md`](./development/11_P5_IMPLEMENTATION_STATUS.md)
- P6: [`development/12_P6_IMPLEMENTATION_STATUS.md`](./development/12_P6_IMPLEMENTATION_STATUS.md)
- P7: [`development/13_P7_IMPLEMENTATION_STATUS.md`](./development/13_P7_IMPLEMENTATION_STATUS.md)
- P8: [`development/14_P8_IMPLEMENTATION_STATUS.md`](./development/14_P8_IMPLEMENTATION_STATUS.md)
- Per-requirement traceability and pending work: [`development/05_COMMON_CORE_SRS_TRACEABILITY.md`](./development/05_COMMON_CORE_SRS_TRACEABILITY.md)
- UI/UX status: [`development/07_UIUX_IMPLEMENTATION_STATUS.md`](./development/07_UIUX_IMPLEMENTATION_STATUS.md)
- Dated change history: [`development/03_DEVELOPMENT_CHANGE_LOG.md`](./development/03_DEVELOPMENT_CHANGE_LOG.md)

## 5. Shared Business Events

| Event | Meaning |
| --- | --- |
| OrderConfirmed | A valid order/sale has been confirmed. |
| PaymentReceived | A payment was successfully received. |
| StockSaleCommitted | A stocked item physically left stock because of a sale. |
| CustomerInvoicePosted | A customer invoice is officially posted. |
| ReturnAccepted | A return is approved and accepted. |
| CreditNotePosted | A customer credit note is officially posted. |
| RefundCompleted | Money was successfully refunded. |
| PurchaseOrderApproved | A purchase order is approved; it does not change stock or payables. |
| GoodsReceived | Goods physically arrived and stock must increase. |
| SupplierBillPosted | A supplier bill is officially posted and creates money owed. |
| SupplierPaymentMade | A supplier payment was completed. |
| StockReserved | Stock is reserved for an order. |
| StockTransferred | Stock physically moved between Locations. |
| MaterialConsumed | Materials/ingredients/parts were actually consumed. |
| WorkTicketCreated | A reusable work ticket was created. |
| WorkStarted | Execution started. |
| WorkCompleted | The work was completed. |
| BookingConfirmed | A time/resource reservation was confirmed. |
| SerialAssigned | A serial/IMEI was assigned to a customer/asset. |
| WarrantyActivated | A warranty period started. |
| DeliveryCompleted | Delivery was completed. |
| CollectionReceived | Money was collected from a customer. |

### Important event rules

- A **definition** does not change stock or money. Examples: Purchase Order, Recipe/BOM, Route Plan, Booking definition.
- Only a real physical/financial action creates the related event.
- One physical stock movement = one stock event.
- Payment retries must never create duplicate successful payments.
- Reporting reads confirmed records/events; reports do not change operational data.

## 6. Functional Requirements

The `Status` column records what is built today, in the same three words the per-phase
implementation-status documents use. It is a reading of those documents, re-checked against the
API surface; the evidence and the remaining work for each row live there.

| Status | Meaning |
| --- | --- |
| Implemented | The workflow, permission behaviour, validation and audit evidence are complete for the current phase scope. A row may still carry named work belonging to a later phase. |
| Started | The data model and the API exist and are exercised, but the workflow a user would follow is not finished. |
| Not started | No implementation exists. |

A requirement is not marked Implemented because its database table exists. It is marked
Implemented when the user workflow, permission behaviour, validation, audit evidence and
verification evidence are complete for the current phase scope.

**Current count:** 88 Implemented, 23 Started, 4 Not started, of 115 rows across sections 6 and 8.
Last reviewed 2026-08-29.

| ID | Phase | Area | Requirement | Status |
| --- | --- | --- | --- | --- |
| CC-P0-001 | P0 | Business Setup | The system shall create a Business account with business name, contact details, default currency, time zone and country. | Implemented |
| CC-P0-002 | P0 | Data Separation | The system shall keep each Business's data separate from every other Business. | Implemented |
| CC-P0-003 | P0 | Branch | The system shall allow a Business to create, edit, activate and deactivate Branches. | Implemented |
| CC-P0-004 | P0 | Locations | The system shall allow stock/work Locations under a Branch, such as Shop Floor, Warehouse, Kitchen, Van or Service Bay. | Implemented |
| CC-P0-005 | P0 | Users | The system shall create Users and assign them to one or more Branches. | Implemented |
| CC-P0-006 | P0 | Roles | The system shall support Roles and fine-grained permissions for view, create, edit, approve, void, refund, stock adjustment and financial access. | Implemented |
| CC-P0-007 | P0 | Approvals | The system shall support approval rules for sensitive actions such as large discounts, refunds, stock adjustments and purchase approvals. | Implemented |
| CC-P0-008 | P0 | Feature Access | The system shall turn features and business-type packs on or off for each Business without changing shared data. | Implemented |
| CC-P0-009 | P0 | Audit | The system shall record who created, changed, approved, cancelled or deleted important business records. | Implemented |
| CC-P0-010 | P0 | Numbering | The system shall generate readable document numbers by Business/Branch and document type. | Implemented |
| CC-P1-001 | P1 | Item | The system shall maintain one Item model for products, services, ingredients, parts, bundles, fees and rental items. | Implemented |
| CC-P1-002 | P1 | Categories | The system shall support item categories, brands, tags and custom attributes. | Implemented |
| CC-P1-003 | P1 | Variants | The system shall support item variants such as size, colour, storage, style and pack size. | Implemented |
| CC-P1-004 | P1 | Units | The system shall support units such as each, box, pack, kg, gram, litre, metre and business-defined conversions. | Implemented |
| CC-P1-005 | P1 | Barcodes | The system shall support SKU, barcode, QR and multiple identifiers for an Item/Variant. | Implemented |
| CC-P1-006 | P1 | Prices | The system shall support base price, cost, price lists, customer price, quantity price and Branch-specific price. | Implemented |
| CC-P1-007 | P1 | Promotions | The system shall support percentage discounts, fixed discounts, coupons, bundles and buy-X-get-Y offers. | Implemented |
| CC-P1-008 | P1 | Tax | The system shall calculate configured tax rules consistently across sales, returns and purchasing. | Implemented |
| CC-P1-009 | P1 | Customers | The system shall maintain customer contact, addresses, groups, notes, purchase history and balances. | Implemented |
| CC-P1-010 | P1 | Suppliers | The system shall maintain supplier contact, prices, lead time, terms and purchase history. | Implemented |
| CC-P1-011 | P1 | Import | The system shall import items, customers, suppliers and opening data from validated CSV/XLSX templates. | Implemented |
| CC-P2-001 | P2 | POS Shift | The system shall open and close a POS shift with opening cash and closing reconciliation. | Implemented |
| CC-P2-002 | P2 | Sale | The POS shall scan/search items and services, calculate price, discount and tax, and create a sale. | Implemented |
| CC-P2-003 | P2 | Customer at Sale | The cashier shall optionally attach a customer before completing a sale. | Implemented |
| CC-P2-004 | P2 | Hold Sale | The POS shall hold and resume an unfinished sale. | Implemented |
| CC-P2-005 | P2 | Payment | The system shall support cash, card, transfer, QR/wallet, store credit and configurable payment methods. | Implemented |
| CC-P2-006 | P2 | Split Payment | The system shall allow one sale to be paid using multiple payment methods. | Implemented |
| CC-P2-007 | P2 | Payment Safety | The system shall use idempotency so retries do not create duplicate payments or sales. | Implemented |
| CC-P2-008 | P2 | Receipt | The system shall generate printable and electronic receipts/invoices. | Implemented |
| CC-P2-009 | P2 | Return | The system shall return items against the original sale and preserve a clear reversal trail. | Implemented |
| CC-P2-010 | P2 | Refund | The system shall refund to allowed payment methods or store credit according to policy. | Implemented |
| CC-P2-011 | P2 | Exchange | The system shall support exchange by returning the old item and selling the replacement in one controlled flow. | Implemented |
| CC-P2-012 | P2 | Quotation/Order | The system shall support quotations and sales orders for non-instant sales. | Implemented |
| CC-P3-001 | P3 | Stock Ledger | The system shall keep an auditable stock ledger for every Item, Location and movement. | Implemented |
| CC-P3-002 | P3 | One Movement Rule | One physical stock movement shall create one authoritative stock movement event only. | Implemented |
| CC-P3-003 | P3 | Availability | The system shall show on-hand, reserved, available and incoming quantities. | Implemented |
| CC-P3-004 | P3 | Receiving | Goods receipt shall increase stock; purchase order approval alone shall not increase stock. | Implemented |
| CC-P3-005 | P3 | Transfers | The system shall transfer stock between Locations with in-transit and received states where needed. | Implemented |
| CC-P3-006 | P3 | Counts | The system shall support stock counts/cycle counts and controlled variance posting. | Implemented |
| CC-P3-007 | P3 | Adjustments | Stock adjustments shall require reason, user, time and approval when configured. | Implemented |
| CC-P3-008 | P3 | Reorder | The system shall suggest replenishment from reorder level, availability and demand settings. | Implemented |
| CC-P3-009 | P3 | Purchase Request | The system shall support purchase requests and approvals before purchase order creation. | Implemented |
| CC-P3-010 | P3 | Purchase Order | The system shall create purchase orders by supplier, item, quantity, cost and expected date. | Implemented |
| CC-P3-011 | P3 | Purchase Variance | The system shall show ordered, received, billed and returned quantities separately. | Implemented |
| CC-P3-012 | P3 | Picking/Packing | The system shall support pick, pack and dispatch for orders that require fulfillment. | Implemented |
| CC-P4-001 | P4 | Customer Invoice | Posting a customer invoice shall create money owed by the customer when unpaid. | Implemented |
| CC-P4-002 | P4 | Customer Credit | The system shall enforce customer credit limit and payment terms. | Implemented |
| CC-P4-003 | P4 | Collections | Payments shall be allocatable to one or more outstanding customer invoices. | Implemented |
| CC-P4-004 | P4 | Supplier Bill | Posting a supplier bill shall create money owed to the supplier. | Implemented |
| CC-P4-005 | P4 | Supplier Payment | Supplier payments shall reduce the related payable balance. | Implemented |
| CC-P4-006 | P4 | Expenses | The system shall record expenses by category, Branch, payment method, date and attachment. | Implemented |
| CC-P4-007 | P4 | Cash/Bank | The system shall track cash movements, bank accounts, deposits and transfers. | Implemented |
| CC-P4-008 | P4 | Reconciliation | The system shall reconcile POS shift cash, gateway settlements and bank transactions. | Started |
| CC-P4-009 | P4 | Loyalty | The system shall support loyalty points, tiers, earn/redeem rules and expiry. | Implemented |
| CC-P4-010 | P4 | Store Credit | The system shall maintain store-credit balances with issue/redemption history. | Implemented |
| CC-P4-011 | P4 | Margins | The system shall report sales, cost and gross margin without allowing reports to mutate operational data. | Not started |
| CC-P4-012 | P4 | Accounting Events | Posted invoices, bills, payments, refunds and stock valuation changes shall emit accounting events for an optional accounting layer. | Implemented |
| CC-P5-001 | P5 | Workflow | The system shall support configurable statuses, transitions and role approvals. | Implemented |
| CC-P5-002 | P5 | Work Ticket | The system shall provide one reusable Work Ticket engine with assignee, status, priority, checklist, time, material usage and attachments. | Implemented |
| CC-P5-003 | P5 | Booking | The system shall provide one reusable Booking engine with calendar, time slots, resources, capacity, deposits, cancellation and no-show handling. | Implemented |
| CC-P5-004 | P5 | Customer Asset | The system shall store customer-owned assets such as vehicles or devices with service/history links. | Implemented |
| CC-P5-005 | P5 | Traceability | The system shall support serial, IMEI, batch, lot, manufacture date and expiry tracking. | Implemented |
| CC-P5-006 | P5 | Warranty | The system shall support warranty policy, activation, claim, inspection, approval, repair/replacement and RMA closure. | Started |
| CC-P5-007 | P5 | Recipe/BOM | The system shall store recipe/BOM definitions without changing stock until a real consumption/production event occurs. | Implemented |
| CC-P5-008 | P5 | Consumption | The system shall post material consumption once against the executing work/production record. | Implemented |
| CC-P5-009 | P5 | Route | The system shall store territories, routes, stops, vehicles and drivers without moving stock until load/delivery events occur. | Implemented |
| CC-P5-010 | P5 | Proof of Delivery | The system shall support delivery completion, signature/photo/reference and failed-delivery reason. | Started |
| CC-P5-011 | P5 | Notifications | The system shall send configurable notifications for low stock, overdue balances, booking reminders, order readiness and approvals. | Started |
| CC-P5-012 | P5 | Documents | The system shall attach files/photos to orders, tickets, purchases, warranties and deliveries. | Started |
| CC-P6-001 | P6 | Devices | The system shall register POS terminals and supported connected devices. | Implemented |
| CC-P6-002 | P6 | Printer | The POS shall print receipts and supported kitchen/label documents. | Started |
| CC-P6-003 | P6 | Scanner | The POS shall accept barcode/QR scanning through supported scanners or camera integrations. | Started |
| CC-P6-004 | P6 | Offline Sale | The POS shall support approved offline operations when the internet is temporarily unavailable. | Started |
| CC-P6-005 | P6 | Offline Queue | Offline changes shall be queued with unique IDs and synchronized safely when connectivity returns. | Implemented |
| CC-P6-006 | P6 | Conflict | The sync process shall detect conflicts and apply defined rules instead of silently overwriting data. | Implemented |
| CC-P6-007 | P6 | Payment Offline Safety | Offline payment methods shall be restricted according to risk and provider capability. | Started |
| CC-P6-008 | P6 | Device Health | The system shall show terminal sync status, last online time and pending transactions. | Implemented |
| CC-P7-001 | P7 | Sales Reports | The system shall report sales by date, Branch, Item, category, user and channel. | Started |
| CC-P7-002 | P7 | Stock Reports | The system shall report stock on hand, valuation, movement, shortage, dead stock and reorder needs. | Started |
| CC-P7-003 | P7 | Finance Reports | The system shall report receivables, payables, expenses, cash movement, margin and tax summaries. | Started |
| CC-P7-004 | P7 | Customer Reports | The system shall report top customers, frequency, loyalty and credit exposure. | Started |
| CC-P7-005 | P7 | Workforce Reports | The system shall report sales/service performance and configurable commissions. | Not started |
| CC-P7-006 | P7 | API | The platform shall expose authenticated APIs for approved business operations. | Started |
| CC-P7-007 | P7 | Webhooks | The platform shall publish signed/idempotent business-event webhooks. | Implemented |
| CC-P7-008 | P7 | Integration Failure | Failed integrations shall retry safely and move unrecoverable messages to an operator-visible error queue. | Implemented |
| CC-P7-009 | P7 | Data Export | Authorized users shall export supported operational/report data. | Implemented |
| CC-P7-010 | P7 | Migration Validation | Imports shall provide validation errors, preview, totals and reconciliation before final commit. | Implemented |
| CC-P8-001 | P8 | Security | The platform shall encrypt data in transit and protect stored secrets and sensitive information. | Started |
| CC-P8-002 | P8 | Authentication | The platform shall support secure login, password policy, session controls and optional MFA for privileged users. | Not started |
| CC-P8-003 | P8 | Audit Integrity | Audit records for critical financial/stock actions shall not be editable by normal business users. | Started |
| CC-P8-004 | P8 | Backup | The platform shall perform monitored backups with tested restore procedures. | Implemented |
| CC-P8-005 | P8 | Disaster Recovery | The platform shall define and test recovery targets for critical services and data. | Started |
| CC-P8-006 | P8 | Observability | The platform shall collect application logs, error traces, metrics and business-operation health signals. | Started |
| CC-P8-007 | P8 | Performance | Core POS actions shall have defined response-time targets under expected load. | Started |
| CC-P8-008 | P8 | Scalability | The platform shall support growth in Businesses, Branches, users, transactions and stock records without redesigning business logic. | Started |
| CC-P8-009 | P8 | Privacy | The platform shall support appropriate customer-data access, export and deletion/retention controls. | Implemented |
| CC-P8-010 | P8 | Release | Each production release shall pass automated tests, security checks, migration checks, backup readiness and rollback planning. | Implemented |

**Approval implementation note:** CC-P0-007 now supports `ANY_APPROVER`, `MINIMUM_APPROVERS` and
`ALL_APPROVERS`. Each approver decision is retained, the requester cannot approve their own
request, and the user posting the sensitive action cannot be one of the approvers used to release
it.

## 7. Common End-to-End Workflows

### 7.1 Sale

```text
Open Shift
→ Select/Scan Item or Service
→ Optional Customer
→ Price + Discount + Tax
→ Confirm Order          [OrderConfirmed]
→ Receive Payment        [PaymentReceived]
→ Move Sold Stock        [StockSaleCommitted] only for stock-tracked lines
→ Post Invoice/Receipt   [CustomerInvoicePosted when applicable]
→ Update Customer/Loyalty
→ Reporting
```

### 7.2 Purchase-to-Pay

```text
Need / Reorder
→ Purchase Request
→ Approval
→ Purchase Order         [PurchaseOrderApproved]
→ Receive Goods          [GoodsReceived]
→ Supplier Bill          [SupplierBillPosted]
→ Supplier Payment       [SupplierPaymentMade]
```

### 7.3 Return-to-Refund

```text
Original Sale
→ Policy / Approval Check
→ Accept Return          [ReturnAccepted]
→ Choose Stock Disposition
   ├─ Resellable → StockReturned
   └─ Damaged/Quarantine → StockAdjusted
→ Credit Note            [CreditNotePosted]
→ Refund / Store Credit  [RefundCompleted when money moves]
```

### 7.4 Credit Sale / Collection

```text
Order / Sale
→ Post Invoice
→ Customer Outstanding Balance
→ Due Date / Credit Limit
→ Collection             [CollectionReceived]
→ Allocate to Invoice(s)
→ Updated Customer Balance
```

## 8. Common Role-Based User Stories

Status uses the same three words as section 6, and is judged against the story's own acceptance
check rather than against the requirements it draws on.

| Story ID | Role | I want to… | So that… | Acceptance check | Phase | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CC-US-001 | Business Owner | create my Business and first Branch | I can start using the system without technical setup. | A Business and Branch exist; default currency/time zone are set; data is separated from other Businesses. | P0 | Implemented |
| CC-US-002 | Business Administrator | create users and assign Roles | each employee sees only the actions needed for their job. | A user cannot access a blocked action; allowed actions are audit logged. | P0 | Implemented |
| CC-US-003 | Manager | configure products, prices and tax | the POS calculates a correct selling total. | The same Item/price/tax setup is used by POS, orders and returns. | P1 | Implemented |
| CC-US-004 | Cashier | scan items and complete a sale | I can serve customers quickly. | A confirmed sale has a unique number, totals, payment and receipt. | P2 | Implemented |
| CC-US-005 | Cashier | accept split payment | a customer can use more than one payment method. | The sum of successful tenders equals the amount due; retries do not duplicate payment. | P2 | Implemented |
| CC-US-006 | Manager | return and refund an original sale | stock and money are reversed correctly. | Original sale is referenced; stock disposition and financial reversal are visible. | P2 | Implemented |
| CC-US-007 | Inventory User | receive a purchase order | stock increases only when goods are physically received. | Ordered and received quantities remain separate; a GoodsReceived event updates stock once. | P3 | Implemented |
| CC-US-008 | Inventory User | transfer stock between Locations | the system shows where stock actually is. | Source decreases and destination/in-transit state increases exactly once. | P3 | Implemented |
| CC-US-009 | Purchasing User | create and approve a purchase order | we can control purchasing before goods arrive. | Approval is recorded; approving the PO alone does not change stock or payables. | P3 | Implemented |
| CC-US-010 | Finance User | post an unpaid customer invoice | I can track what the customer still owes. | The unpaid amount appears in the customer's outstanding balance. | P4 | Implemented |
| CC-US-011 | Finance User | allocate a collection to invoices | the customer balance becomes accurate. | Allocation cannot exceed allowed amount and the remaining balance is recalculated. | P4 | Implemented |
| CC-US-012 | Operations User | create a Work Ticket from an approved business process | work can be assigned and tracked without creating a different job engine for every industry. | Ticket has source record, status, assignee and history. | P5 | Implemented |
| CC-US-013 | Scheduler | book an available resource | two customers are not given the same unavailable slot. | Availability is checked before confirmation; cancellation releases capacity. | P5 | Implemented |
| CC-US-014 | Inventory User | track a serial/batch item | I can trace where the exact unit came from and went. | Receipt, movement, sale/customer assignment and current status are visible. | P5 | Started |
| CC-US-015 | Cashier | continue approved operations while the connection is down | the store can keep working during short outages. | Offline actions are uniquely queued and synchronize without duplicates. | P6 | Implemented |
| CC-US-016 | Manager | see sales, stock and cash reports | I can make daily decisions from the same source records. | Reports reconcile to underlying operational records and do not modify them. | P7 | Started |
| CC-US-017 | Integrator | subscribe to business-event webhooks | external systems can react to confirmed changes. | Webhook is signed, retryable and has a stable event ID. | P7 | Started |
| CC-US-018 | Auditor | review sensitive changes | I can see who performed and approved each important action. | Audit log includes actor, time, record and before/after or action details. | P8 | Implemented |

## 9. Common Non-Functional Requirements

- **Security:** least-privilege access, secure sessions, protected secrets and encrypted transport.
- **Auditability:** critical stock and financial actions must have immutable operational history.
- **Reliability:** retries must be idempotent; duplicate event/payment/stock posting must be prevented.
- **Offline safety:** offline records must use unique IDs, safe queues, conflict rules and visible sync status.
- **Performance:** common POS actions must remain responsive under expected peak load.
- **Scalability:** adding Businesses, Branches and transactions must not require rewriting domain logic.
- **Availability:** production services must have monitored uptime and recovery procedures.
- **Backup/Recovery:** backups must be monitored and restores tested.
- **Observability:** logs, metrics, traces and business-operation health must be available to operators.
- **Privacy:** customer and employee data must be accessible only to approved users and integrations.
- **Localization:** currency, tax, time zone, receipt format and language must be configurable.
- **Accessibility:** web/admin screens should support keyboard navigation, readable contrast and clear labels.
- **Maintainability:** business-specific modules shall extend shared contracts instead of copying shared code.

## 10. Common Definition of Done

A Common Core feature is done only when:
- requirements are implemented and reviewed;
- positive, negative and permission tests pass;
- event/idempotency tests pass where applicable;
- audit records are verified;
- migration/backfill impact is reviewed;
- monitoring/error handling exists;
- user-facing messages use simple business language;
- documentation and API/event contracts are updated;
- no business-specific code has become a duplicate source of truth.
