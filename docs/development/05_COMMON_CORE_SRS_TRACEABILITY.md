# Common Core SRS Traceability and Pending Work

**Date:** 2026-08-26  
**Source SRS:** [`../01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)  
**Change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)

This file compares the Common Core SRS against the implementation evidence currently recorded in the development change log. It is used to decide what can move forward and what must still be completed.

## Status Summary

| Phase | SRS scope | Current status | Evidence |
|---|---|---|---|
| P0 | Business setup, isolation, branches, locations, users, roles, approvals, feature access, audit and numbering | Implemented for P0 scope | Management APIs and Back Office screens exist for every requirement; production identity is the remaining gap |
| P1 | Items, categories, variants, units, barcodes, prices, promotions, tax, customers, suppliers and imports | Implemented for P1 scope | Full management screens, promotion and tax rules, pricing resolution and a validated import with rollback |
| P2 | POS sales and payments | Implemented for P2 scope | Shifts, idempotent sales, split tenders, receipts, returns, exchanges and store credit, with the POS workspace |
| P3 | Inventory, purchasing and fulfillment | Not started | P2 already publishes the stock events the ledger will consume |
| P4 | Finance, customer controls, loyalty and audit controls | Not started | Store credit exists as part of P2 refunds; receivables and payables remain |
| P5 | Reusable business engines | Not started | - |
| P6 | Offline, devices and store reliability | Started inside P2 | Offline sale queue with idempotent replay and a visible pending count; devices and printers remain |
| P7 | Reporting, integrations and migration | Started inside P1 | CSV import with validation, preview, apply and rollback; reports and webhooks remain |
| P8 | Security, operations and production readiness | Not started | Business isolation and append-only audit exist; identity, backup, DR and observability remain |

## P0 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P0-001` Business Setup | Implemented | Bootstrap plus `/setup` editing of details, currency, time zone and country | First-run wizard |
| `CC-P0-002` Data Separation | Implemented | Forced RLS on every scoped table; cross-Business access refused in the smoke run | CI integration tests |
| `CC-P0-003` Branch | Implemented | Create, edit, activate and deactivate with guards | Branch switcher |
| `CC-P0-004` Locations | Implemented | Create, edit and deactivate with the seven types | P3 stock rules |
| `CC-P0-005` Users | Implemented | Invite, activate, suspend, assign Roles and Branches | Production sign-in |
| `CC-P0-006` Roles | Implemented | Templates, custom Roles, permission matrix, 52 permissions | Separation-of-duties rules |
| `CC-P0-007` Approvals | Implemented for `ANY_APPROVER` | Policies, requests, decisions and enforcement on four sensitive actions | Multi-approver strategies |
| `CC-P0-008` Feature Access | Implemented | Feature packs with dependency validation | Per-feature settings |
| `CC-P0-009` Audit | Implemented | Append-only records with search and before/after detail | Retention and export |
| `CC-P0-010` Numbering | Implemented | Atomic allocation, forward-only settings, next-number preview | Concurrency tests |

## P1 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P1-001` Item | Implemented | One item model with list, detail, edit and deactivate | Item images |
| `CC-P1-002` Categories | Implemented | Categories, brands, tags and custom attributes | Category tree editing |
| `CC-P1-003` Variants | Implemented | Variants with attributes, identifiers and prices | Bulk matrix |
| `CC-P1-004` Units | Implemented | Units, precision and conversions | - |
| `CC-P1-005` Barcodes | Implemented | Unique identifiers with duplicate refusal and POS scan resolution | Scanner profiles in P6 |
| `CC-P1-006` Prices | Implemented | Price lists, tax mode, Branch prices, quantity breaks, customer pricing | - |
| `CC-P1-007` Promotions | Implemented | Percentage, fixed, coupon, buy-X-get-Y with overlap detection | Cross-item bundles |
| `CC-P1-008` Tax | Implemented | Categories, date-effective rates, inclusive and exclusive handling | Jurisdictions |
| `CC-P1-009` Customers | Implemented | Contacts, groups, history and store credit | Credit limits in P4 |
| `CC-P1-010` Suppliers | Implemented | Terms, lead time and supplier items | Purchase history in P3 |
| `CC-P1-011` Import | Implemented | Validate, preview, apply and roll back | Opening stock in P3 |

## P2 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P2-001` POS Shift | Implemented | Float, cash movements, expected cash and counted close | Drawer hardware |
| `CC-P2-002` Sale | Implemented | Scan, search, cart, price, discount and tax | Favourites grid |
| `CC-P2-003` Customer at Sale | Implemented | Customer attach changes pricing through the group | - |
| `CC-P2-004` Hold Sale | Implemented | Hold, list, resume, edit and confirm | Discard a hold |
| `CC-P2-005` Payment | Implemented | Five tender methods | Provider integration |
| `CC-P2-006` Split Payment | Implemented | Several tenders with change and running due | - |
| `CC-P2-007` Payment Safety | Implemented | Idempotency on sale, payment and return | Provider idempotency |
| `CC-P2-008` Receipt | Implemented | Allocated once, with tax lines and tenders | Thermal printing |
| `CC-P2-009` Return | Implemented | Proportional refund, tax and stock disposition | - |
| `CC-P2-010` Refund | Implemented | Original method, cash or store credit | Card refunds |
| `CC-P2-011` Exchange | Implemented | Return plus replacement sale in one flow | POS screen for it |
| `CC-P2-012` Quotation/Order | Not started | - | Quotations and sales orders |

## Immediate Pending Work Before P3

1. Connect production identity so invitations, approvals and audit actors are real users.
2. Turn the smoke run into automated integration tests that run in CI.
3. Decide the stock ledger design that will consume `StockSaleCommitted`, `StockReturned` and
   `StockAdjusted`, since P2 already publishes them.
4. Add quotations and sales orders if the first vertical needs non-instant sales before P3.

## UI/UX Traceability

UI/UX implementation status is tracked separately in [`07_UIUX_IMPLEMENTATION_STATUS.md`](./07_UIUX_IMPLEMENTATION_STATUS.md). The current UI/UX implementation covers one shared component system used by both applications, ten Back Office screens for P0, P1 and P2, and a working POS selling workspace with shift, cart, payment sheet, receipt and returns.

## Implementation Rule

Do not mark a requirement as implemented only because its database table exists. A requirement becomes implemented only when the user workflow, permission behavior, validation, audit evidence, documentation and verification evidence are complete for the current phase scope.
