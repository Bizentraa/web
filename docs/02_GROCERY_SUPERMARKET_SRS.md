# Grocery / Supermarket — Business-Specific SRS & User Stories

**Business family:** Retail & Food Stock  
**File purpose:** Add only the requirements that are specific to **Grocery / Supermarket**.  
**Common foundation:** `01_COMMON_CORE_SRS.md`

> This file does not replace the Common Core. The Common Core is implemented once. This file tells the development team what extra behavior, fields, screens and rules are needed for Grocery / Supermarket.

## 1. Roles

- **Business Owner**
- **Supermarket Manager**
- **Cashier**
- **Inventory User**
- **Purchasing User**
- **Receiving User**
- **Finance User**
- **Price/Promotion Manager**

## 2. Common Core Capabilities This Business Reuses

- POS & payments
- Inventory & purchasing
- Variants/UOM/barcodes
- Pricing/promotion/tax
- Batch/expiry traceability
- Finance/CRM
- Devices/offline

### Reuse rule

Do not create a second:
- User/Role system;
- Customer or Supplier database;
- Product/Item engine;
- Inventory ledger;
- Payment engine;
- Finance/AR/AP engine;
- Booking engine;
- Work Ticket engine;
- Traceability engine;
- Reporting source of truth.

Business-specific names are views/types over the shared engines. Example: a Job Card or Kitchen Order Ticket is a type of **Work Ticket**.

## 3. Business-Specific Feature Scope

- Fast barcode checkout and keyboard/scanner-first POS
- Weighted items and scale barcode parsing
- Multiple units and pack sizes
- Batch/lot and expiry tracking
- FEFO (first-expiry-first-out) picking guidance
- Fresh-food waste, spoilage and markdown handling
- Promotions, mix-and-match and quantity offers
- Shelf/price labels and label printing
- Supplier receiving with shortages/overages
- Replenishment from back store/warehouse to shop floor
- Returns, damaged stock and expired-stock disposal
- High-volume stock count and cycle count

## 4. Recommended Development Sequence

| Phase | Name | Goal |
| --- | --- | --- |
| G0 | Business Setup | Enable supermarket settings, departments, checkout terminals and stock Locations. |
| G1 | Product, Barcode & Price Setup | Configure packaged, weighed and fresh items, units, scale barcodes, prices and promotions. |
| G2 | Fast Checkout | Build scanner-first sale, weighed-item calculation, payment, receipt and return. |
| G3 | Stock, Receiving & Expiry | Add purchase receiving, batch/expiry, FEFO, replenishment, counts, waste and supplier returns. |
| G4 | Finance, Loyalty & Controls | Add cash reconciliation, credit where allowed, loyalty, promotion approvals and margin controls. |
| G5 | Operations & Analytics | Add price labels, low-stock alerts, expiry alerts, waste reports, shrinkage and branch dashboards. |
| G6 | Go-Live Hardening | Stress-test checkout speed, offline mode, scanners/scales/printers, opening stock and day-end reconciliation. |

### Sequence rule

Develop phases in the listed order unless a dependency is already production-ready in the Common Core. Do not start a later phase by creating temporary duplicate logic.

## 5. Functional Requirements

| Requirement ID | Phase | Area | Requirement |
| --- | --- | --- | --- |
| GROC-FR-001 | G0 | Departments | The system shall support grocery departments such as Produce, Dairy, Frozen, Bakery and Household. |
| GROC-FR-002 | G0 | Checkout | Each checkout terminal shall belong to a Branch and support shift/cash reconciliation. |
| GROC-FR-003 | G1 | Weighted Item | An Item may be marked as sold by weight and priced per configured weight unit. |
| GROC-FR-004 | G1 | Scale Barcode | The POS shall parse configured scale barcodes containing item code and weight/price information. |
| GROC-FR-005 | G1 | Pack Size | The system shall support case/pack/each conversions for purchasing and selling. |
| GROC-FR-006 | G1 | Fresh Item | Fresh items shall support short shelf life, batch/expiry and waste tracking. |
| GROC-FR-007 | G1 | Promotion | The pricing engine shall support mix-and-match, multi-buy and quantity offers without a separate grocery pricing engine. |
| GROC-FR-008 | G2 | Checkout Speed | The cashier shall complete common barcode sales without opening unnecessary modal screens. |
| GROC-FR-009 | G2 | Unknown Barcode | Unknown barcodes shall show a clear message and allow authorized item lookup; they shall not create unknown stock records automatically. |
| GROC-FR-010 | G2 | Weight Price | The POS shall calculate weighted-item quantity and price consistently with configured precision. |
| GROC-FR-011 | G2 | Void | Voids after scan and before payment shall require configured approval rules and remain audit logged. |
| GROC-FR-012 | G2 | Return | Returns shall reference the original sale where possible and route stock to resellable, damaged or quarantine Locations. |
| GROC-FR-013 | G3 | Batch Receipt | Receiving shall capture batch/lot and expiry when required by the Item. |
| GROC-FR-014 | G3 | FEFO | Picking/replenishment guidance shall prefer earlier-expiring eligible stock where FEFO is enabled. |
| GROC-FR-015 | G3 | Expiry Block | The POS shall block sale of expired stock and warn on configured near-expiry conditions. |
| GROC-FR-016 | G3 | Waste | Authorized users shall record spoilage/waste with reason, quantity and stock event. |
| GROC-FR-017 | G3 | Markdown | Near-expiry markdown shall use the shared pricing/promotion engine and preserve margin/audit visibility. |
| GROC-FR-018 | G3 | Replenishment | The system shall suggest shop-floor replenishment from back stock based on thresholds. |
| GROC-FR-019 | G3 | Count | Cycle counts shall support barcode scanning and variance approval. |
| GROC-FR-020 | G3 | Supplier Return | Expired/damaged supplier returns shall decrease the correct stock Location and link to the supplier transaction. |
| GROC-FR-021 | G4 | Cash Control | Each cashier shift shall reconcile expected and counted cash with variance reason. |
| GROC-FR-022 | G4 | Loyalty | Loyalty shall use the common customer/loyalty engine and respect promotion exclusions. |
| GROC-FR-023 | G4 | Price Approval | High-value manual price overrides shall require configured permission/approval. |
| GROC-FR-024 | G5 | Expiry Alert | The system shall alert for batches approaching expiry using configurable days. |
| GROC-FR-025 | G5 | Waste Report | Managers shall see waste/spoilage by item, department, reason and value. |
| GROC-FR-026 | G5 | Shrinkage | Managers shall see count/adjustment shrinkage trends without changing the stock ledger. |
| GROC-FR-027 | G5 | Fast/Slow | The system shall report fast-moving, slow-moving and dead stock. |
| GROC-FR-028 | G6 | Offline | Approved cash sales shall continue during short outages and sync idempotently. |
| GROC-FR-029 | G6 | Hardware | Configured scanners, scales and receipt/label printers shall pass end-to-end device tests before go-live. |
| GROC-FR-030 | G6 | Opening Stock | Opening stock import shall reconcile by item, batch, expiry and Location before production cutover. |

## 6. Reused Business Events

- `OrderConfirmed`
- `PaymentReceived`
- `StockSaleCommitted`
- `GoodsReceived`
- `StockTransferred`
- `ReturnAccepted`
- `StockReturned`
- `StockAdjusted`
- `CustomerInvoicePosted`

These events must use the same event contracts as the Common Core. A business type may add event metadata, but must not redefine what the shared event means.

## 7. End-to-End Development View

```text
Common Core ready
    ↓
Business-specific setup
    ↓
Business-specific master data
    ↓
Primary daily workflow
    ↓
Stock / work / booking execution
    ↓
Finance and customer effects
    ↓
Exceptions / reversals
    ↓
Reports
    ↓
Go-live validation
```

## 8. Role-Based User Stories

| Story ID | Role | I want to… | So that… | Acceptance check |
| --- | --- | --- | --- | --- |
| GROC-US-001 | Cashier | scan packaged items continuously | I can serve a queue quickly | Each scan adds the correct item/quantity/price; no duplicate line is created from one scan. |
| GROC-US-002 | Cashier | scan a scale barcode | the correct weighed quantity and price are added automatically | Configured scale format is parsed and totals match the pricing rule. |
| GROC-US-003 | Inventory User | receive milk with batch and expiry | we can trace and prevent expired sales | Batch/expiry is mandatory for configured items and stock increases once. |
| GROC-US-004 | Inventory User | record damaged vegetables as waste | stock and waste value stay accurate | A waste reason is required and one stock adjustment is posted. |
| GROC-US-005 | Manager | see products expiring soon | we can markdown or remove them before loss | The alert shows batch, quantity, location and expiry date. |
| GROC-US-006 | Purchasing User | reorder low-stock products | important shelves do not run out | Suggestion uses available/incoming stock and configured reorder settings. |
| GROC-US-007 | Cashier | return a grocery item | stock goes to the correct condition/location | Return references the sale and follows configured resellable/damaged rules. |
| GROC-US-008 | Manager | close a cashier shift | I can detect cash differences | Expected vs counted cash and variance reason are stored. |

## 9. Important Exception / Edge Cases

- expired batch at POS
- scale barcode cannot be parsed
- negative stock attempt
- purchase over/short receipt
- duplicate offline sale retry
- promotion overlaps another promotion
- count variance exceeds approval limit
- refund provider is temporarily unavailable

Each edge case shall have:
1. a clear user message;
2. a deterministic state;
3. no duplicate stock or money posting;
4. an audit trail for manual/approved correction;
5. a retry/recovery path where an external or offline operation is involved.

## 10. Data Additions for This Business Type

Use shared tables/entities first. Add only fields/entities that cannot be represented safely by Common Core.

Recommended approach:
- keep **Business**, Branch, User, Customer, Supplier, Item, Order, Payment, Stock Movement and Invoice shared;
- represent industry objects as extensions/types;
- link business-specific records back to their source order/customer/item/work record;
- never copy balances or stock totals into business-specific tables as a second source of truth.

## 11. Reports / KPIs

At minimum provide:
- sales/revenue by Branch, user and date;
- stock or resource availability where applicable;
- exceptions and reversals;
- business-specific operational KPI from this file;
- finance/receivable information using Common Core;
- audit/export support for manager review.

## 12. Phase Exit Checklist

For each phase:
- all requirement IDs assigned to the phase are implemented;
- permissions are tested by role;
- positive and negative paths pass;
- shared-event contracts are verified;
- no duplicate inventory/payment/finance posting exists;
- audit and error handling are verified;
- migration impact is documented;
- user stories for the phase pass UAT.

## 13. Business Go-Live Definition of Done

The Grocery / Supermarket pack is production-ready only when:
- Common Core dependencies are production-ready;
- all business-specific requirements in this file pass UAT;
- opening/master data are reconciled;
- relevant hardware/integrations are tested;
- offline/retry cases are tested when applicable;
- roles/approvals are reviewed with the Business;
- day-end stock/money/work states reconcile;
- reports reconcile to source records;
- backup/monitoring/support runbooks cover the enabled features.
