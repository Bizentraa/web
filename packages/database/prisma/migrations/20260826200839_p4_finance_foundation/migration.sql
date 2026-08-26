-- CreateEnum
CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('POSTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "SupplierBillStatus" AS ENUM ('POSTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CASH', 'BANK', 'GATEWAY', 'WALLET');

-- CreateEnum
CREATE TYPE "BankTransactionKind" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'COLLECTION', 'SUPPLIER_PAYMENT', 'EXPENSE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LoyaltyEntryKind" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE');

-- CreateEnum
CREATE TYPE "AccountingEventStatus" AS ENUM ('PENDING', 'EXPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "customer_invoices" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "status" "CustomerInvoiceStatus" NOT NULL DEFAULT 'POSTED',
    "currencyCode" CHAR(3) NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "paidAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(19,4) NOT NULL,
    "dueDate" DATE,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "postedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_invoice_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "itemId" UUID,
    "description" VARCHAR(240) NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "customer_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_collections" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "unallocatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currencyCode" CHAR(3) NOT NULL,
    "method" VARCHAR(60) NOT NULL,
    "reference" VARCHAR(120),
    "collectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_collection_allocations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "customer_collection_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bills" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "supplierId" UUID NOT NULL,
    "purchaseOrderId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "supplierDocument" VARCHAR(120),
    "status" "SupplierBillStatus" NOT NULL DEFAULT 'POSTED',
    "currencyCode" CHAR(3) NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "paidAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(19,4) NOT NULL,
    "dueDate" DATE,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "postedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "supplier_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bill_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "itemId" UUID,
    "description" VARCHAR(240) NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "supplier_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "supplierId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "unallocatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currencyCode" CHAR(3) NOT NULL,
    "method" VARCHAR(60) NOT NULL,
    "reference" VARCHAR(120),
    "paidAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment_allocations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "categoryId" UUID NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'POSTED',
    "amount" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currencyCode" CHAR(3) NOT NULL,
    "paymentMethod" VARCHAR(60) NOT NULL,
    "spentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierName" VARCHAR(180),
    "description" VARCHAR(240) NOT NULL,
    "attachmentUrl" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "BankAccountType" NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "openingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "accountId" UUID NOT NULL,
    "kind" "BankTransactionKind" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "reference" VARCHAR(120),
    "description" VARCHAR(240) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "pointsBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tier" VARCHAR(80) NOT NULL DEFAULT 'STANDARD',
    "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_entries" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "kind" "LoyaltyEntryKind" NOT NULL,
    "points" DECIMAL(19,4) NOT NULL,
    "resultingBalance" DECIMAL(19,4) NOT NULL,
    "reference" VARCHAR(120),
    "reason" VARCHAR(240) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_events" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "sourceType" VARCHAR(80) NOT NULL,
    "sourceId" VARCHAR(80) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(19,4),
    "currencyCode" CHAR(3),
    "payload" JSONB NOT NULL,
    "status" "AccountingEventStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt" TIMESTAMPTZ(3),

    CONSTRAINT "accounting_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_invoices_businessId_customerId_status_idx" ON "customer_invoices"("businessId", "customerId", "status");

-- CreateIndex
CREATE INDEX "customer_invoices_businessId_dueDate_idx" ON "customer_invoices"("businessId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_businessId_number_key" ON "customer_invoices"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_id_businessId_key" ON "customer_invoices"("id", "businessId");

-- CreateIndex
CREATE INDEX "customer_invoice_lines_businessId_itemId_idx" ON "customer_invoice_lines"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "customer_collections_businessId_customerId_collectedAt_idx" ON "customer_collections"("businessId", "customerId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_collections_id_businessId_key" ON "customer_collections"("id", "businessId");

-- CreateIndex
CREATE INDEX "customer_collection_allocations_businessId_invoiceId_idx" ON "customer_collection_allocations"("businessId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_collection_allocations_businessId_collectionId_inv_key" ON "customer_collection_allocations"("businessId", "collectionId", "invoiceId");

-- CreateIndex
CREATE INDEX "supplier_bills_businessId_supplierId_status_idx" ON "supplier_bills"("businessId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "supplier_bills_businessId_dueDate_idx" ON "supplier_bills"("businessId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bills_businessId_number_key" ON "supplier_bills"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bills_id_businessId_key" ON "supplier_bills"("id", "businessId");

-- CreateIndex
CREATE INDEX "supplier_bill_lines_businessId_itemId_idx" ON "supplier_bill_lines"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "supplier_payments_businessId_supplierId_paidAt_idx" ON "supplier_payments"("businessId", "supplierId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_id_businessId_key" ON "supplier_payments"("id", "businessId");

-- CreateIndex
CREATE INDEX "supplier_payment_allocations_businessId_billId_idx" ON "supplier_payment_allocations"("businessId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_allocations_businessId_paymentId_billId_key" ON "supplier_payment_allocations"("businessId", "paymentId", "billId");

-- CreateIndex
CREATE INDEX "expense_categories_businessId_status_idx" ON "expense_categories"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_businessId_code_key" ON "expense_categories"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_id_businessId_key" ON "expense_categories"("id", "businessId");

-- CreateIndex
CREATE INDEX "expenses_businessId_categoryId_spentAt_idx" ON "expenses"("businessId", "categoryId", "spentAt");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_id_businessId_key" ON "expenses"("id", "businessId");

-- CreateIndex
CREATE INDEX "bank_accounts_businessId_status_idx" ON "bank_accounts"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_businessId_code_key" ON "bank_accounts"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_id_businessId_key" ON "bank_accounts"("id", "businessId");

-- CreateIndex
CREATE INDEX "bank_transactions_businessId_accountId_occurredAt_idx" ON "bank_transactions"("businessId", "accountId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_id_businessId_key" ON "bank_transactions"("id", "businessId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_businessId_tier_idx" ON "loyalty_accounts"("businessId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_customerId_businessId_key" ON "loyalty_accounts"("customerId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_id_businessId_key" ON "loyalty_accounts"("id", "businessId");

-- CreateIndex
CREATE INDEX "loyalty_entries_businessId_customerId_createdAt_idx" ON "loyalty_entries"("businessId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "accounting_events_businessId_status_createdAt_idx" ON "accounting_events"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_events_businessId_sourceType_sourceId_eventType_key" ON "accounting_events"("businessId", "sourceType", "sourceId", "eventType");

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_invoiceId_businessId_fkey" FOREIGN KEY ("invoiceId", "businessId") REFERENCES "customer_invoices"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collections" ADD CONSTRAINT "customer_collections_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collections" ADD CONSTRAINT "customer_collections_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collections" ADD CONSTRAINT "customer_collections_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collections" ADD CONSTRAINT "customer_collections_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collection_allocations" ADD CONSTRAINT "customer_collection_allocations_collectionId_businessId_fkey" FOREIGN KEY ("collectionId", "businessId") REFERENCES "customer_collections"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collection_allocations" ADD CONSTRAINT "customer_collection_allocations_invoiceId_businessId_fkey" FOREIGN KEY ("invoiceId", "businessId") REFERENCES "customer_invoices"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_supplierId_businessId_fkey" FOREIGN KEY ("supplierId", "businessId") REFERENCES "suppliers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_purchaseOrderId_businessId_fkey" FOREIGN KEY ("purchaseOrderId", "businessId") REFERENCES "purchase_orders"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bill_lines" ADD CONSTRAINT "supplier_bill_lines_billId_businessId_fkey" FOREIGN KEY ("billId", "businessId") REFERENCES "supplier_bills"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bill_lines" ADD CONSTRAINT "supplier_bill_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_businessId_fkey" FOREIGN KEY ("supplierId", "businessId") REFERENCES "suppliers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_paymentId_businessId_fkey" FOREIGN KEY ("paymentId", "businessId") REFERENCES "supplier_payments"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_billId_businessId_fkey" FOREIGN KEY ("billId", "businessId") REFERENCES "supplier_bills"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_businessId_fkey" FOREIGN KEY ("categoryId", "businessId") REFERENCES "expense_categories"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_accountId_businessId_fkey" FOREIGN KEY ("accountId", "businessId") REFERENCES "bank_accounts"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_accountId_businessId_fkey" FOREIGN KEY ("accountId", "businessId") REFERENCES "loyalty_accounts"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_entries" ADD CONSTRAINT "loyalty_entries_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_events" ADD CONSTRAINT "accounting_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep existing Businesses aligned with P4 finance permissions.
-- This is additive: custom Role choices are preserved, while Owner/Admin and
-- the default operational Roles receive the permissions required by the new phase.
INSERT INTO "permissions" ("id", "code", "name", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'AR_VIEW', 'View customer invoices and collections', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AR_MANAGE', 'Create invoices and collect customer payments', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AP_VIEW', 'View supplier bills and payments', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AP_MANAGE', 'Create supplier bills and record supplier payments', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EXPENSE_VIEW', 'View expenses', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EXPENSE_MANAGE', 'Create expense categories and expenses', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'BANK_VIEW', 'View cash and bank accounts', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'BANK_MANAGE', 'Post cash and bank transactions', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LOYALTY_VIEW', 'View loyalty balances', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LOYALTY_MANAGE', 'Adjust loyalty balances', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ACCOUNTING_EVENT_VIEW', 'View accounting event queue', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", 'FINANCE_USER', 'Finance User', 'Manages customer invoices, supplier bills, expenses, cash and finance reviews.', false, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("businessId", "code") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE (
    (r."isSystem" = true AND r."code" = 'OWNER')
    OR (r."isSystem" = false AND r."code" = 'ADMINISTRATOR')
  )
  AND p."code" IN (
    'AR_VIEW',
    'AR_MANAGE',
    'AP_VIEW',
    'AP_MANAGE',
    'EXPENSE_VIEW',
    'EXPENSE_MANAGE',
    'BANK_VIEW',
    'BANK_MANAGE',
    'LOYALTY_VIEW',
    'LOYALTY_MANAGE',
    'ACCOUNTING_EVENT_VIEW'
  )
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'FINANCE_VIEW',
  'AR_VIEW',
  'AR_MANAGE',
  'AP_VIEW',
  'AP_MANAGE',
  'EXPENSE_VIEW',
  'EXPENSE_MANAGE',
  'BANK_VIEW',
  'BANK_MANAGE',
  'LOYALTY_VIEW',
  'LOYALTY_MANAGE',
  'ACCOUNTING_EVENT_VIEW'
)
WHERE r."isSystem" = false
  AND r."code" IN ('BRANCH_MANAGER', 'FINANCE_USER')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'AR_VIEW',
  'AP_VIEW',
  'EXPENSE_VIEW',
  'BANK_VIEW',
  'LOYALTY_VIEW',
  'ACCOUNTING_EVENT_VIEW'
)
WHERE r."isSystem" = false
  AND r."code" = 'AUDITOR'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;
