# Common Core SRS Traceability and Pending Work

**Date:** 2026-08-26  
**Source SRS:** [`../01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)  
**Change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)

This file compares the Common Core SRS against the implementation evidence currently recorded in the development change log. It is used to decide what can move forward and what must still be completed.

## Status Summary

| Phase | SRS scope | Current status | Evidence |
|---|---|---|---|
| P0 | Business setup, isolation, branches, locations, users, roles, approvals, feature access, audit and numbering | In progress | Foundation exists; appearance slice implemented; management UI and stronger automated tests remain |
| P1 | Items, categories, variants, units, barcodes, prices, promotions, tax, customers, suppliers and imports | In progress | Database/API/client/catalog UI exist; edit/deactivate, rule builders, import processing and calculation tests remain |
| P2 | POS sales and payments | Planned with UI preview | POS deployable and readiness workspace exist; transactional sales/payment backend is not started |
| P3 | Inventory, purchasing and fulfillment | Planned | Not started |
| P4 | Finance, customer controls, loyalty and audit controls | Planned | Not started |
| P5 | Reusable business engines | Planned | Not started |
| P6 | Offline, devices and store reliability | Planned | Not started |
| P7 | Reporting, integrations and migration | Planned | Not started |
| P8 | Security, operations and production readiness | Planned | Not started |

## P0 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P0-001` Business Setup | In progress | Business bootstrap exists; Business theme can be saved | Full Back Office business setup/edit screens |
| `CC-P0-002` Data Separation | In progress | Business-scoped Prisma access and RLS checks exist | Repeatable integration tests for every new domain |
| `CC-P0-003` Branch | Started | Initial Branch can be created by bootstrap | Branch edit/activate/deactivate UI and APIs |
| `CC-P0-004` Locations | Started | Initial Location can be created by bootstrap | Location management UI and stock/work location rules |
| `CC-P0-005` Users | Started | Owner user foundation exists | User invitation, assignment and branch access screens |
| `CC-P0-006` Roles | In progress | Permission catalog and owner-role backfill exist | Role management UI, custom roles and SoD checks |
| `CC-P0-007` Approvals | Planned | Requirement documented | Approval rules engine and approval workflow UI |
| `CC-P0-008` Feature Access | In progress | Feature defaults and appearance feature behavior exist | Feature-pack management UI |
| `CC-P0-009` Audit | In progress | Audit records are written for implemented slices | Audit review UI and broader immutable audit tests |
| `CC-P0-010` Numbering | Started | Numbering foundation exists | Concurrency tests and document-number settings UI |

## P1 Requirement Traceability

| Requirement | Status | Developed evidence | Pending work |
|---|---|---|---|
| `CC-P1-001` Item | In progress | Item schema, create API and guided Back Office form exist | Edit/deactivate UI and richer item detail screen |
| `CC-P1-002` Categories | In progress | Category, brand, tag and attribute schema exist; category and brand APIs exist | Category/brand/tag/custom-attribute management UI |
| `CC-P1-003` Variants | In progress | Variant schema and create payload support exist | Matrix editing UI and variant-level management |
| `CC-P1-004` Units | In progress | Unit and conversion schema exist; default unit setup exists | Unit conversion UI and validation tests |
| `CC-P1-005` Barcodes | In progress | Item identifiers support SKU/barcode/QR/supplier code | Duplicate-resolution UI and scanner validation in P2 |
| `CC-P1-006` Prices | In progress | Price-list and item-price schema/API exist | Branch/customer/quantity price UI and pricing engine tests |
| `CC-P1-007` Promotions | Started | Promotion schema and create API exist | Promotion rule builder and POS application engine |
| `CC-P1-008` Tax | In progress | Tax category/rate schema and default tax setup exist | Tax rule UI and calculation tests |
| `CC-P1-009` Customers | In progress | Customer schema/API and guided Back Office form exist | Address/group/balance/history views |
| `CC-P1-010` Suppliers | In progress | Supplier schema/API and guided Back Office form exist | Supplier item, cost and lead-time screens |
| `CC-P1-011` Import | Started | Import-batch schema and API exist | CSV/XLSX parser, preview, validation, apply and rollback evidence |

## Immediate Pending Work to Complete Before P2

1. P1 edit/deactivate management for item, unit, category, brand, tax category, price list, customer and supplier records.
2. Category, brand, tax and price-list Back Office management screens.
3. Promotion rule builder with clear conditions and effective dates.
4. CSV/XLSX import workflow with template validation, preview, apply and rollback evidence.
5. Automated integration tests for P1 permission denial, audit/outbox creation and cross-Business RLS.
6. Pricing and tax resolution tests before POS sales calculation starts.

## UI/UX Traceability

UI/UX implementation status is tracked separately in [`07_UIUX_IMPLEMENTATION_STATUS.md`](./07_UIUX_IMPLEMENTATION_STATUS.md). The current UI/UX implementation covers shared primitives, Back Office P0/P1 status surfaces, P1 catalog composition and a POS P2 readiness preview. It does not complete P2 sale posting, shift handling, payments, returns or offline synchronization.

## Implementation Rule

Do not mark a requirement as implemented only because its database table exists. A requirement becomes implemented only when the user workflow, permission behavior, validation, audit evidence, documentation and verification evidence are complete for the current phase scope.
