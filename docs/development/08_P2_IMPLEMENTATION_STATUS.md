# Common Core P2 - Implementation Status

- **Started:** 2026-08-26
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **UI/UX status:** [`07_UIUX_IMPLEMENTATION_STATUS.md`](./07_UIUX_IMPLEMENTATION_STATUS.md)
- **POS application:** <http://localhost:3000>
- **Back Office sales view:** <http://localhost:3001/sales>

## Current Delivery Slice

P2 turns the P1 definitions into real money and real documents. The POS application sells; the Back
Office reviews what was sold.

```text
POS terminal
    -> NestJS POS controller
    -> Pricing service (shared calculation)  ->  Commerce service (shift, sale, payment, return)
    -> Business-scoped Prisma transaction
    -> PostgreSQL sales records + audit + Business Events
```

Every step that moves money is idempotent. A sale, a payment and a return each carry an idempotency
key, so a retry after a timeout returns the record that already exists instead of creating a second
one.

## Calculation Order

The same pure function prices the POS cart, the posted sale and the refund, so a receipt, a report
and a return can never disagree:

1. line base = quantity x unit price (resolved from price list, Branch and quantity break)
2. manual line discount
3. best applicable item or category promotion, unless a manual discount is already on the line
4. sale discount: the larger of the manual sale discount and the best sale promotion, spread across
   lines without losing or inventing a cent
5. tax per line on the discounted amount, added on top or split out depending on the price list

## Requirement Status

| Requirement | Status | Current evidence | Remaining P2 work |
|---|---|---|---|
| CC-P2-001 POS Shift | Implemented | Opening float, cash movements, expected cash, counted close with a required reason for any difference, approval hook for large variances, one open shift per register enforced by a partial unique index; the close-shift drawer lists the tickets still open on the shift and offers Resume or Discard, so the server's refusal is shown before the count rather than after it | Cash drawer hardware in P6 |
| CC-P2-002 Sale | Implemented | Scan and search from the P1 catalog, cart lines, price, discount and tax, confirmed sale with a readable document number | Per-cashier favourites (category quick filters and a default catalogue grid are in the POS) |
| CC-P2-003 Customer at Sale | Implemented | A customer can be attached before completing the sale and changes the price list through the customer group | - |
| CC-P2-004 Hold Sale | Implemented | A cart is held with a name, listed, resumed, edited and confirmed; it is discarded from the POS by voiding with a reason, from the held-carts dialog or from the close-shift drawer | - |
| CC-P2-005 Payment | Implemented | Cash, card, transfer, QR/wallet and store credit tenders | A real payment provider integration |
| CC-P2-006 Split Payment | Implemented | Several tenders on one sale, with cash change and a running amount due | - |
| CC-P2-007 Payment Safety | Implemented | Idempotency keys on sale, payment and return; a retried key never posts twice | Provider-side idempotency once a gateway is connected |
| CC-P2-008 Receipt | Implemented | A receipt number is allocated exactly once when the sale becomes fully paid; the receipt shows lines, discounts, tax lines, tenders and change | Connected thermal printing and electronic delivery |
| CC-P2-009 Return | Implemented | Original sale lookup, per-line quantity, proportional refund and tax, stock disposition and a clear reversal trail | - |
| CC-P2-010 Refund | Implemented | Refund to the original method, to cash or to store credit, with approval enforced above the threshold | Refund to a card through a provider |
| CC-P2-011 Exchange | Implemented | The return and the replacement sale happen in one controlled flow, and the returned value is applied to the replacement | Exchange directly from the POS screen; today it is an API flow |
| CC-P2-012 Quotation/Order | Implemented | Back Office can create quotations and sales orders from the current catalogue, convert a quotation to an order and confirm an order into a sale before payment. API routes, contracts and sale statuses persist the document lifecycle. | Broader delivery/invoicing automation after P3 reservations and P4 sale-to-invoice conversion |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-004 Cashier scans items and completes a sale | Implemented | A confirmed sale has a unique number, totals, payment and a receipt |
| CC-US-005 Cashier accepts split payment | Implemented | The sum of successful tenders equals the amount due, and a retry does not duplicate a payment |
| CC-US-006 Manager returns and refunds an original sale | Implemented | The original sale is referenced, stock disposition is recorded and the financial reversal is visible on the sale |

## API Surface

```http
POST   /api/v1/businesses/{businessId}/pos/shifts
GET    /api/v1/businesses/{businessId}/pos/shifts
GET    /api/v1/businesses/{businessId}/pos/shifts/current
POST   /api/v1/businesses/{businessId}/pos/shifts/{shiftId}/cash-movements
POST   /api/v1/businesses/{businessId}/pos/shifts/{shiftId}/close
GET    /api/v1/businesses/{businessId}/pos/catalog
POST   /api/v1/businesses/{businessId}/pos/quote
POST   /api/v1/businesses/{businessId}/pos/sales
POST   /api/v1/businesses/{businessId}/pos/quotations
POST   /api/v1/businesses/{businessId}/pos/quotations/{saleId}/convert-to-order
POST   /api/v1/businesses/{businessId}/pos/sales-orders
GET    /api/v1/businesses/{businessId}/pos/sales
GET    /api/v1/businesses/{businessId}/pos/sales/{saleId}
PUT    /api/v1/businesses/{businessId}/pos/sales/{saleId}
POST   /api/v1/businesses/{businessId}/pos/sales/{saleId}/confirm
POST   /api/v1/businesses/{businessId}/pos/sales-orders/{saleId}/confirm
POST   /api/v1/businesses/{businessId}/pos/sales/{saleId}/void
POST   /api/v1/businesses/{businessId}/pos/sales/{saleId}/payments
POST   /api/v1/businesses/{businessId}/pos/payments/{paymentId}/resolve
GET    /api/v1/businesses/{businessId}/pos/sales/{saleId}/receipt
POST   /api/v1/businesses/{businessId}/pos/sales/{saleId}/returns
POST   /api/v1/businesses/{businessId}/pos/sales/{saleId}/exchange
POST   /api/v1/businesses/{businessId}/pos/sync
```

## Business Events

| Event | When it is published |
|---|---|
| `ShiftOpened` / `ShiftClosed` | A shift opens, or closes with its counted cash and difference |
| `QuotationCreated` | A quotation is saved from a priced cart without reserving stock or taking payment |
| `SalesOrderCreated` | A sales order is created directly or by converting a quotation |
| `OrderConfirmed` | A sale is confirmed, including a held cart that is later confirmed |
| `PaymentReceived` | A tender succeeds |
| `StockSaleCommitted` | A sale becomes fully paid, for its stock-tracked lines only |
| `CustomerInvoicePosted` | A sale becomes fully paid |
| `ReturnAccepted` / `CreditNotePosted` | A return is accepted |
| `RefundCompleted` | Money actually leaves, not when store credit is issued |
| `StockReturned` / `StockAdjusted` | Returned stock is resellable, or damaged/quarantined |
| `SaleVoided` | An unpaid sale is voided with a reason |

P3 will consume the stock events to maintain the stock ledger. Until then, quantities on hand are
not maintained, which is why the SRS keeps the ledger in P3 rather than P2.

## Main Implementation Files

- `packages/domains/commerce/src/domain/pricing.ts`
- `packages/domains/commerce/src/application/pricing.service.ts`
- `packages/domains/commerce/src/application/pos.service.ts`
- `packages/domains/shared/src/approvals.ts`
- `apps/api/src/controllers/pos.controller.ts`
- `packages/database/prisma/migrations/20260829123000_p2_quotations_sales_orders`
- `apps/pos/src/app/page.tsx`
- `apps/pos/src/app/returns/page.tsx`
- `apps/backoffice/src/app/sales/page.tsx`
- `packages/database/prisma/migrations/20260826090000_p0_approvals_p1_import_p2_commerce`

## Verification

- 17 pricing unit tests cover inclusive and exclusive tax, manual and promotion discounts,
  buy-X-get-Y, coupons, minimums, proportional spreading with no lost cents and total reconciliation.
- `scripts/smoke-common-core.mjs` completed 74 checks against a live database and API, including
  two shifts on one register being refused, an idempotency retry returning the same sale, a retried
  payment not double charging, split payment with change, a receipt number allocated once, a partial
  return refunding the exact share, over-returning being refused, store credit issued and then spent,
  and a shift refusing to close on a cash difference without a reason.
- A browser run of the real POS opened a shift, added an item, changed its quantity, opened the
  payment sheet, took a cash tender and produced a receipt with change, with no console errors and no
  horizontal overflow at 1440px or 390px.
- Focused checks for the quotation/order slice passed: contracts build, database build, commerce
  typecheck/build, API client build, API typecheck/build and Back Office typecheck.

## Next P2 Slices

1. P3 reservations and fulfillment allocation from sales orders.
2. P4 sale-to-invoice conversion for confirmed sales orders.
3. A payment provider integration so card and wallet tenders resolve themselves.
4. Exchange directly from the POS screen.
5. Offline payments against an already-posted sale, plus conflict comparison in business language.
6. Connected receipt printing, which belongs with the P6 device work.
