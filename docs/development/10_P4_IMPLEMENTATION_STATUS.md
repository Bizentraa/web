# Common Core P4 - Implementation Status

- **Started:** 2026-08-27
- **Requirements:** [`01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)
- **UI/UX plan:** [`01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)
- **Development change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)
- **Back Office finance workspace:** <http://localhost:3001/finance>

## Current Delivery Slice

P4 adds the first operational finance foundation. It does not try to become a full accounting
ledger yet. Instead, it records the finance documents that the rest of the platform needs:

```text
Back Office finance workspace
    -> API finance controller
    -> Finance service
    -> Business-scoped Prisma transaction
    -> PostgreSQL receivables, payables, expenses, bank, loyalty and accounting-event records
    -> Audit records + Business Events
```

The key business rule is that balances are explainable. Customer collections are allocated to
customer invoices. Supplier payments are allocated to supplier bills. Cash and bank transactions
change account balances through posted transaction rows. Loyalty changes write an entry and keep the
customer point balance from going below zero.

## Requirement Status

| Requirement | Status | Current evidence | Remaining P4 work |
|---|---|---|---|
| CC-P4-001 Customer Invoice | Implemented for current scope | Customer invoices have document numbers, customer, optional Branch, lines, tax, totals, paid amount and balance. Smoke verifies invoice creation and partial balance. | Add invoice edit/void/statement workflows and sale-to-invoice conversion where needed. |
| CC-P4-002 Customer Credit | Implemented for current scope through store credit + receivable balance visibility | Store credit already exists in P2; P4 overview shows customer receivable balances. | Add explicit credit limits, ageing, credit holds and statement output. |
| CC-P4-003 Collections | Implemented for current scope | Customer collections allocate to invoices and refuse over-allocation. | Add unallocated receipt application UI and reconciliation reports. |
| CC-P4-004 Supplier Bill | Implemented for current scope | Supplier bills have document numbers, supplier, optional Branch/purchase order, lines and payable balance. | Add purchase order/goods receipt bill matching and variance workflows. |
| CC-P4-005 Supplier Payment | Implemented for current scope | Supplier payments allocate to supplier bills and refuse over-payment allocation. | Add payment batch approval and bank reconciliation matching. |
| CC-P4-006 Expenses | Implemented for current scope | Expense categories and posted expenses are stored with payment method, tax, supplier text and audit. | Add receipt attachment management and recurring expenses. |
| CC-P4-007 Cash/Bank | Implemented for current scope | Cash/bank accounts and posted transactions maintain current balance. | Add transfers between two accounts and cash-up reconciliation screens. |
| CC-P4-008 Reconciliation | Started | Bank/cash records and accounting events exist as reconciliation inputs. | Add formal reconciliation session, statement import, matching and variance approval. |
| CC-P4-009 Loyalty | Implemented for current scope | Loyalty earn/redeem/adjust/expire entries update customer points and prevent negative balances. | Add automated earn/redeem rules from POS sales and expiry jobs. |
| CC-P4-010 Store Credit | Implemented for current scope from P2, visible in customer detail | P2 return/store-credit flow is smoke-tested and customer history shows store credit. | Add finance-facing store-credit ageing/liability reports. |
| CC-P4-011 Margins | Not started | - | Add sales/cost/gross margin reporting after inventory valuation policy is defined. |
| CC-P4-012 Accounting Events | Implemented for current scope | Posted invoice, collection, supplier bill, payment, expense and bank transaction create pending accounting events. | Add accounting export, retry, failure state and external integration connectors. |

## User Story Status

| Story | Status | Evidence |
|---|---|---|
| CC-US-010 Finance User reviews sales, credit and cash | Implemented for current scope | Finance overview shows receivables, payables, expenses, cash/bank, loyalty and accounting queue totals. |
| CC-US-011 Business Owner reviews margins and money position | Partially implemented | Owner can open finance overview and see money owed, money payable, cash/bank and accounting queue. Margin reporting remains pending. |

## API Surface

```http
GET  /api/v1/businesses/{businessId}/finance/overview
POST /api/v1/businesses/{businessId}/finance/customer-invoices
POST /api/v1/businesses/{businessId}/finance/customer-collections
POST /api/v1/businesses/{businessId}/finance/supplier-bills
POST /api/v1/businesses/{businessId}/finance/supplier-payments
POST /api/v1/businesses/{businessId}/finance/expense-categories
POST /api/v1/businesses/{businessId}/finance/expenses
POST /api/v1/businesses/{businessId}/finance/bank-accounts
POST /api/v1/businesses/{businessId}/finance/bank-transactions
POST /api/v1/businesses/{businessId}/finance/loyalty-adjustments
```

## Role and Permission Sync

P4 follows the same additive sync rule introduced for P3:

- new P4 permission codes are part of the shared permission catalogue;
- Business Owner and Business Administrator receive P4 permissions automatically;
- the new Finance User template receives receivables, payables, expenses, cash/bank, loyalty and
  accounting-event permissions;
- Branch Manager receives the current operational finance permissions;
- Auditor receives read-only P4 permissions;
- runtime sync updates existing Businesses without removing custom Role choices.

## Back Office UI/UX

The `/finance` workspace follows the common UI/UX pattern:

- KPI cards for receivables, payables, cash/bank and accounting queue;
- tabs for receivables, payables, expenses, cash/bank, loyalty and accounting events;
- dense responsive table layout with internal scroll panels;
- quick-create forms for invoice, supplier bill, expense category, expense, cash/bank account and
  loyalty adjustment;
- loading, permission, error and empty states through the shared `ResourceState` wrapper.

## Main Implementation Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260826200839_p4_finance_foundation/migration.sql`
- `packages/contracts/src/index.ts`
- `packages/api-client/src/index.ts`
- `packages/domains/business-access/src/application/finance.service.ts`
- `packages/domains/business-access/src/domain/permissions.ts`
- `packages/domains/business-access/src/application/access-sync.ts`
- `apps/api/src/controllers/finance.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/composition/providers.ts`
- `apps/backoffice/src/app/finance/page.tsx`
- `apps/backoffice/src/app/lib/workspace.tsx`
- `packages/design-system/src/index.tsx`
- `scripts/smoke-common-core.mjs`

## Verification

- Prisma schema formatted and client generated.
- Migration `20260826200839_p4_finance_foundation` applied locally with deploy mode.
- `pnpm --filter @bizentra/contracts build` passed.
- `pnpm --filter @bizentra/database build` passed.
- `pnpm --filter @bizentra/domain-business-access typecheck` passed.
- `pnpm --filter @bizentra/domain-business-access build` passed.
- `pnpm --filter @bizentra/api-client build` passed.
- `pnpm --filter @bizentra/api build` passed.
- `pnpm --filter @bizentra/backoffice typecheck` passed.
- `node scripts/smoke-common-core.mjs` passed 111 live API checks when run against
  `http://localhost:4010/api/v1`, including explicit P4 permission catalogue and Role checks,
  invoice/collection, supplier bill/payment, expense, bank account/transaction, loyalty and audit
  evidence.

## Next P4 Slices

1. Customer credit limits, ageing, statements and credit-hold behavior.
2. Formal cash-up and bank reconciliation sessions.
3. Purchase order / goods receipt / supplier bill matching.
4. Sales, cost and gross-margin reporting.
5. Accounting export with retry/failure states and integration status.
6. More finance-safe reversal/void workflows with approval hooks.
