# Common Core P1 - Implementation Status

- **Started:** 2026-08-26
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **SRS traceability:** [`05_COMMON_CORE_SRS_TRACEABILITY.md`](./05_COMMON_CORE_SRS_TRACEABILITY.md)
- **UI component system:** [`06_UI_COMPONENT_SYSTEM.md`](./06_UI_COMPONENT_SYSTEM.md)
- **UI/UX implementation status:** [`07_UIUX_IMPLEMENTATION_STATUS.md`](./07_UIUX_IMPLEMENTATION_STATUS.md)
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

The screen now composes owned shadcn-style primitives from the design system (`Card`, `Button`, `Badge`, `Progress`, `Field` and related helpers) while preserving the existing Business theme CSS variables.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P1 work |
|---|---|---|---|
| CC-P1-001 Item | Implemented | One item model for products, services, ingredients, parts, bundles, fees and rental items, with list, search, detail, edit, activate/deactivate and an audit timeline | Item images |
| CC-P1-002 Categories | Implemented | Categories, brands, tags and custom attributes with create, update and assignment screens | Multi-level category tree editing |
| CC-P1-003 Variants | Implemented | Variants with attributes, variant-level identifiers and variant prices | Bulk variant matrix generation |
| CC-P1-004 Units | Implemented | Units with precision, unit conversions and a guard that stops a unit in use being deactivated | - |
| CC-P1-005 Barcodes | Implemented | SKU, barcode, QR and supplier codes; a duplicate is refused and names the item that already owns it; the POS resolves a scan to the item | Scanner hardware profiles in P6 |
| CC-P1-006 Prices | Implemented | Price lists with a tax-inclusive flag, Branch prices, quantity breaks, cost price, customer-group price lists and a preview that uses the POS calculation | - |
| CC-P1-007 Promotions | Implemented | Percentage, fixed, coupon and buy-X-get-Y offers with scope, minimums, dates, priority and overlap detection, applied by the POS with an explanation of what it skipped | Bundle offers across different items |
| CC-P1-008 Tax | Implemented | Tax categories, date-effective rates, sales/purchase applicability, inclusive and exclusive handling and a preview | Jurisdiction rules beyond the category |
| CC-P1-009 Customers | Implemented | Contacts, groups, addresses, notes, purchase history and store-credit balance | Credit limit and terms, which belong to P4 |
| CC-P1-010 Suppliers | Implemented | Contacts, payment terms, lead time and supplier items with their own code and cost | Purchase history, which arrives with P3 |
| CC-P1-011 Import | Implemented | Template download, validation with a reason per row, stored preview, apply and rollback for items, customers and suppliers | Opening stock, which needs the P3 inventory phase |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-003 Manager configures products, prices and tax | Implemented | The same item, price and tax setup created in `/catalog` is what the POS quote, the sale, the receipt and the return all use |

## API Surface

All routes are Business-scoped and require the same development identity headers as P0 until OIDC is
connected.

```http
POST   /api/v1/businesses/{businessId}/catalog/defaults
GET    /api/v1/businesses/{businessId}/catalog/summary
GET    /api/v1/businesses/{businessId}/catalog/reference
POST   /api/v1/businesses/{businessId}/catalog/units
PATCH  /api/v1/businesses/{businessId}/catalog/units/{unitId}
POST   /api/v1/businesses/{businessId}/catalog/unit-conversions
POST   /api/v1/businesses/{businessId}/catalog/categories
PATCH  /api/v1/businesses/{businessId}/catalog/categories/{categoryId}
POST   /api/v1/businesses/{businessId}/catalog/brands
PATCH  /api/v1/businesses/{businessId}/catalog/brands/{brandId}
POST   /api/v1/businesses/{businessId}/catalog/tags
POST   /api/v1/businesses/{businessId}/catalog/attributes
POST   /api/v1/businesses/{businessId}/catalog/tax-categories
PATCH  /api/v1/businesses/{businessId}/catalog/tax-categories/{taxCategoryId}
POST   /api/v1/businesses/{businessId}/catalog/tax-rates
PATCH  /api/v1/businesses/{businessId}/catalog/tax-rates/{taxRateId}
POST   /api/v1/businesses/{businessId}/catalog/price-lists
PATCH  /api/v1/businesses/{businessId}/catalog/price-lists/{priceListId}
GET    /api/v1/businesses/{businessId}/catalog/items
GET    /api/v1/businesses/{businessId}/catalog/items/{itemId}
POST   /api/v1/businesses/{businessId}/catalog/items
PATCH  /api/v1/businesses/{businessId}/catalog/items/{itemId}
POST   /api/v1/businesses/{businessId}/catalog/items/{itemId}/variants
POST   /api/v1/businesses/{businessId}/catalog/items/{itemId}/identifiers
PUT    /api/v1/businesses/{businessId}/catalog/items/{itemId}/prices
PUT    /api/v1/businesses/{businessId}/catalog/items/{itemId}/tags
PUT    /api/v1/businesses/{businessId}/catalog/items/{itemId}/attributes
GET    /api/v1/businesses/{businessId}/catalog/promotions
POST   /api/v1/businesses/{businessId}/catalog/promotions
PATCH  /api/v1/businesses/{businessId}/catalog/promotions/{promotionId}
GET    /api/v1/businesses/{businessId}/catalog/customers
GET    /api/v1/businesses/{businessId}/catalog/customers/{customerId}
POST   /api/v1/businesses/{businessId}/catalog/customers
PATCH  /api/v1/businesses/{businessId}/catalog/customers/{customerId}
POST   /api/v1/businesses/{businessId}/catalog/customer-groups
GET    /api/v1/businesses/{businessId}/catalog/suppliers
GET    /api/v1/businesses/{businessId}/catalog/suppliers/{supplierId}
POST   /api/v1/businesses/{businessId}/catalog/suppliers
PATCH  /api/v1/businesses/{businessId}/catalog/suppliers/{supplierId}
PUT    /api/v1/businesses/{businessId}/catalog/suppliers/{supplierId}/items
GET    /api/v1/businesses/{businessId}/imports
GET    /api/v1/businesses/{businessId}/imports/template
POST   /api/v1/businesses/{businessId}/imports/validate
GET    /api/v1/businesses/{businessId}/imports/{batchId}
POST   /api/v1/businesses/{businessId}/imports/{batchId}/apply
POST   /api/v1/businesses/{businessId}/imports/{batchId}/rollback
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
- Modular component browser check confirmed `/catalog` renders shared design-system cards, badges, buttons and fields after the refactor.
- Runtime API smoke test created P1 defaults, one item with barcode/price, one customer and one supplier.
- Direct PostgreSQL check as `bizentra_app` returned zero item rows without Business context and one item row with the active Business context.

## Next P1 Slices

1. Bulk variant generation and item images.
2. Multi-level category tree editing and tax jurisdiction rules.
3. Opening-stock import, once the P3 stock ledger exists.
4. Automated integration tests in CI for permission denial, RLS, audit/outbox and import validation,
   replacing the current manual smoke run.
