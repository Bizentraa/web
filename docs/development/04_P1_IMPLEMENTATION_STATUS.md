# Common Core P1 - Implementation Status

- **Started:** 2026-08-26
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office screen:** <http://localhost:3001/catalog>

## Current Delivery Slice

The first P1 slice creates the shared master-data foundation that later POS, inventory, purchasing and finance phases will consume.

```text
Back Office / API client
        -> NestJS catalog controller
        -> Catalog application service
        -> Business-scoped Prisma transaction
        -> PostgreSQL P1 master-data records + audit + outbox
```

P1 records are definitions. They do not create sales, stock movements, payments, invoices or supplier bills.

The Back Office `/catalog` screen has also been upgraded into the current P1 operating workspace. It now shows the active Business context, setup actions, readiness score, grouped master-data cards, guided forms for item/customer/supplier creation, a P1 completion checklist and recent-record panels. The layout is responsive across desktop, tablet and phone widths.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P1 work |
|---|---|---|---|
| CC-P1-001 Item | In progress | Shared `items` table and API create flow support products, services, ingredients, parts, bundles, fees and rental item kinds | Edit/deactivate UI, richer item detail screen and business-specific pack fields |
| CC-P1-002 Categories | In progress | Category, brand, tag and custom-attribute tables exist; category and brand create APIs exist | Tag/custom-attribute APIs and Back Office management UI |
| CC-P1-003 Variants | In progress | Item creation can create variant rows with JSON attributes | Matrix editing UI and variant-level price/identifier forms |
| CC-P1-004 Units | In progress | Unit and unit-conversion tables exist; default `EA` setup and unit create API exist | Unit conversion UI and validation tests for conversion rules |
| CC-P1-005 Barcodes | In progress | SKU/barcode/QR/supplier-code identifier model exists; item creation can save barcodes | Duplicate-resolution UI and scanner validation in POS P2 |
| CC-P1-006 Prices | In progress | Price-list and item-price tables exist; default price list and item price save are implemented | Customer/quantity/branch price management UI and pricing resolution engine |
| CC-P1-007 Promotions | Started | Promotion model and create API support percentage/fixed discounts with conditions JSON | Rule builder UI and promotion application engine in POS P2/P4 |
| CC-P1-008 Tax | In progress | Tax category and tax rate tables exist; default tax setup and create API exist | Jurisdiction/rule UI and tax calculation tests across sale/return/purchase flows |
| CC-P1-009 Customers | In progress | Customer group and customer models exist; Back Office can create basic customers | Address/group/balance/history views |
| CC-P1-010 Suppliers | In progress | Supplier and supplier-item models exist; Back Office can create basic suppliers | Supplier item/cost/lead-time UI and purchasing integration |
| CC-P1-011 Import | Started | Import-batch table and create API exist for items, customers, suppliers and opening data tracking | CSV/XLSX template parser, row validation, preview, apply and rollback evidence |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-003 Manager configures products, prices and tax | In progress | Back Office `/catalog` can initialize P1 defaults and create a basic item with barcode, tax category and selling price |

## API Surface

All routes are Business-scoped and require the same development identity headers as P0 until OIDC is connected.

```http
POST /api/v1/businesses/{businessId}/catalog/defaults
GET  /api/v1/businesses/{businessId}/catalog/summary
POST /api/v1/businesses/{businessId}/catalog/units
POST /api/v1/businesses/{businessId}/catalog/categories
POST /api/v1/businesses/{businessId}/catalog/brands
POST /api/v1/businesses/{businessId}/catalog/tax-categories
POST /api/v1/businesses/{businessId}/catalog/price-lists
POST /api/v1/businesses/{businessId}/catalog/items
POST /api/v1/businesses/{businessId}/catalog/promotions
POST /api/v1/businesses/{businessId}/catalog/customer-groups
POST /api/v1/businesses/{businessId}/catalog/customers
POST /api/v1/businesses/{businessId}/catalog/suppliers
POST /api/v1/businesses/{businessId}/catalog/import-batches
```

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260825204733_p1_master_data/migration.sql`
- `packages/database/prisma/migrations/20260825205500_p1_master_data_security/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/catalog.service.ts`
- `apps/api/src/controllers/catalog.controller.ts`
- `apps/backoffice/src/app/catalog`

## Verification

- Prisma client generation passed.
- P1 migrations applied to local PostgreSQL.
- Contract, API client, domain service, API and Back Office type checks passed.
- Back Office production build passed and includes `/catalog`.
- Back Office `/catalog` UI browser check confirmed the command center, 4 score cards, 3 forms and 3 recent lists render.
- Desktop and 390px mobile browser checks completed with no horizontal overflow.
- Runtime API smoke test created P1 defaults, one item with barcode/price, one customer and one supplier.
- Direct PostgreSQL check as `bizentra_app` returned zero item rows without Business context and one item row with the active Business context.

## Next P1 Slices

1. Add edit/deactivate flows for units, categories, brands, tax categories, price lists, items, customers and suppliers.
2. Add Back Office category, brand, tax, price-list, promotion and import-management screens.
3. Add CSV/XLSX import template validation with preview and apply evidence.
4. Add automated integration tests for P1 permission denial, audit/outbox creation and cross-Business RLS.
5. Add pricing/tax resolution tests before P2 POS sale calculation starts.
