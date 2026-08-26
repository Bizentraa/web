-- CC-P0-007 approval request lifecycle, CC-P1-011 import apply/rollback lifecycle and the
-- CC-P2-001 to CC-P2-011 commerce records for shifts, sales, payments and returns.

-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE IF NOT EXISTS 'ROLLED_BACK';

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementKind" AS ENUM ('OPENING_FLOAT', 'PAY_IN', 'PAY_OUT', 'SAFE_DROP', 'CLOSING_COUNT');
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'HELD', 'CONFIRMED', 'PARTIALLY_RETURNED', 'RETURNED', 'VOIDED');
CREATE TYPE "SaleChannel" AS ENUM ('POS', 'BACK_OFFICE');
CREATE TYPE "PaymentMethodKind" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'QR_WALLET', 'STORE_CREDIT', 'OTHER');
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'VOIDED');
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'CANCELLED');
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_METHOD', 'CASH', 'STORE_CREDIT');
CREATE TYPE "StockDisposition" AS ENUM ('RESELLABLE', 'DAMAGED', 'QUARANTINE');
CREATE TYPE "StoreCreditEntryKind" AS ENUM ('ISSUE', 'REDEEM', 'ADJUST');

-- AlterTable: import batches gain the validate/preview/apply/rollback lifecycle
ALTER TABLE "import_batches" ADD COLUMN "appliedRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "import_batches" ADD COLUMN "preview" JSONB;
ALTER TABLE "import_batches" ADD COLUMN "createdIds" JSONB;
ALTER TABLE "import_batches" ADD COLUMN "appliedAt" TIMESTAMPTZ(3);
ALTER TABLE "import_batches" ADD COLUMN "rolledBackAt" TIMESTAMPTZ(3);

-- CreateIndex: business-scoped composite keys required by the new relations
CREATE UNIQUE INDEX "approval_policies_id_businessId_key" ON "approval_policies"("id", "businessId");
CREATE UNIQUE INDEX "tax_rates_id_businessId_key" ON "tax_rates"("id", "businessId");
CREATE UNIQUE INDEX "promotions_id_businessId_key" ON "promotions"("id", "businessId");

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "policyId" UUID,
    "actionCode" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(80),
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(19,4),
    "currencyCode" CHAR(3),
    "reason" VARCHAR(500) NOT NULL,
    "context" JSONB,
    "requestedByMembershipId" UUID NOT NULL,
    "decidedByMembershipId" UUID,
    "decisionNote" VARCHAR(500),
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_shifts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "registerCode" VARCHAR(40) NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingFloat" DECIMAL(19,4) NOT NULL,
    "expectedCash" DECIMAL(19,4),
    "countedCash" DECIMAL(19,4),
    "cashVariance" DECIMAL(19,4),
    "varianceReason" VARCHAR(500),
    "openedByMembershipId" UUID NOT NULL,
    "closedByMembershipId" UUID,
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "kind" "CashMovementKind" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "reason" VARCHAR(240) NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "shiftId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "receiptNumber" VARCHAR(60),
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "SaleChannel" NOT NULL DEFAULT 'POS',
    "customerId" UUID,
    "currencyCode" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "paidTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "changeTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "dueTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "refundedTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "offlineRef" VARCHAR(80),
    "holdName" VARCHAR(120),
    "note" VARCHAR(500),
    "voidReason" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "unitId" UUID NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "discountKind" "DiscountKind",
    "discountValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "promotionId" UUID,
    "taxRateId" UUID,
    "taxRatePercent" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineSubtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(19,4),
    "stockTracked" BOOLEAN NOT NULL DEFAULT false,
    "returnedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "returnId" UUID,
    "method" "PaymentMethodKind" NOT NULL,
    "direction" "PaymentDirection" NOT NULL DEFAULT 'IN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(19,4) NOT NULL,
    "tenderedAmount" DECIMAL(19,4),
    "changeAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reference" VARCHAR(120),
    "failureReason" VARCHAR(240),
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "capturedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "shiftId" UUID,
    "exchangeSaleId" UUID,
    "approvalRequestId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" VARCHAR(500) NOT NULL,
    "refundMethod" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL_METHOD',
    "refundTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "storeCreditTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "saleLineId" UUID NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "refundAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "disposition" "StockDisposition" NOT NULL DEFAULT 'RESELLABLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_credit_accounts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_credit_entries" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "kind" "StoreCreditEntryKind" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "balanceAfter" DECIMAL(19,4) NOT NULL,
    "reference" VARCHAR(120),
    "saleId" UUID,
    "returnId" UUID,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_credit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_id_businessId_key" ON "approval_requests"("id", "businessId");
CREATE INDEX "approval_requests_businessId_status_requestedAt_idx" ON "approval_requests"("businessId", "status", "requestedAt");
CREATE INDEX "approval_requests_businessId_actionCode_status_idx" ON "approval_requests"("businessId", "actionCode", "status");

CREATE UNIQUE INDEX "pos_shifts_businessId_number_key" ON "pos_shifts"("businessId", "number");
CREATE UNIQUE INDEX "pos_shifts_id_businessId_key" ON "pos_shifts"("id", "businessId");
CREATE INDEX "pos_shifts_businessId_branchId_status_idx" ON "pos_shifts"("businessId", "branchId", "status");

-- CC-P2-001: only one shift may stay open for a Business, Branch and register at a time.
CREATE UNIQUE INDEX "pos_shifts_open_register_key" ON "pos_shifts"("businessId", "branchId", "registerCode")
  WHERE "status" = 'OPEN';

CREATE INDEX "cash_movements_businessId_shiftId_idx" ON "cash_movements"("businessId", "shiftId");

CREATE UNIQUE INDEX "sales_businessId_number_key" ON "sales"("businessId", "number");
CREATE UNIQUE INDEX "sales_businessId_idempotencyKey_key" ON "sales"("businessId", "idempotencyKey");
CREATE UNIQUE INDEX "sales_id_businessId_key" ON "sales"("id", "businessId");
CREATE INDEX "sales_businessId_branchId_status_createdAt_idx" ON "sales"("businessId", "branchId", "status", "createdAt");
CREATE INDEX "sales_businessId_customerId_idx" ON "sales"("businessId", "customerId");

CREATE UNIQUE INDEX "sale_lines_businessId_saleId_lineNo_key" ON "sale_lines"("businessId", "saleId", "lineNo");
CREATE UNIQUE INDEX "sale_lines_id_businessId_key" ON "sale_lines"("id", "businessId");
CREATE INDEX "sale_lines_businessId_itemId_idx" ON "sale_lines"("businessId", "itemId");

CREATE UNIQUE INDEX "sale_payments_businessId_idempotencyKey_key" ON "sale_payments"("businessId", "idempotencyKey");
CREATE INDEX "sale_payments_businessId_saleId_status_idx" ON "sale_payments"("businessId", "saleId", "status");

CREATE UNIQUE INDEX "sale_returns_businessId_number_key" ON "sale_returns"("businessId", "number");
CREATE UNIQUE INDEX "sale_returns_businessId_idempotencyKey_key" ON "sale_returns"("businessId", "idempotencyKey");
CREATE UNIQUE INDEX "sale_returns_id_businessId_key" ON "sale_returns"("id", "businessId");
CREATE INDEX "sale_returns_businessId_saleId_idx" ON "sale_returns"("businessId", "saleId");

CREATE UNIQUE INDEX "sale_return_lines_businessId_returnId_saleLineId_key" ON "sale_return_lines"("businessId", "returnId", "saleLineId");
CREATE INDEX "sale_return_lines_businessId_saleLineId_idx" ON "sale_return_lines"("businessId", "saleLineId");

CREATE UNIQUE INDEX "store_credit_accounts_customerId_businessId_key" ON "store_credit_accounts"("customerId", "businessId");
CREATE UNIQUE INDEX "store_credit_accounts_id_businessId_key" ON "store_credit_accounts"("id", "businessId");
CREATE INDEX "store_credit_accounts_businessId_idx" ON "store_credit_accounts"("businessId");

CREATE INDEX "store_credit_entries_businessId_accountId_createdAt_idx" ON "store_credit_entries"("businessId", "accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_policyId_businessId_fkey" FOREIGN KEY ("policyId", "businessId") REFERENCES "approval_policies"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedByMembershipId_businessId_fkey" FOREIGN KEY ("requestedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decidedByMembershipId_businessId_fkey" FOREIGN KEY ("decidedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_openedByMembershipId_businessId_fkey" FOREIGN KEY ("openedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_closedByMembershipId_businessId_fkey" FOREIGN KEY ("closedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shiftId_businessId_fkey" FOREIGN KEY ("shiftId", "businessId") REFERENCES "pos_shifts"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD CONSTRAINT "sales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_shiftId_businessId_fkey" FOREIGN KEY ("shiftId", "businessId") REFERENCES "pos_shifts"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_saleId_businessId_fkey" FOREIGN KEY ("saleId", "businessId") REFERENCES "sales"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_unitId_businessId_fkey" FOREIGN KEY ("unitId", "businessId") REFERENCES "units"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_promotionId_businessId_fkey" FOREIGN KEY ("promotionId", "businessId") REFERENCES "promotions"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_taxRateId_businessId_fkey" FOREIGN KEY ("taxRateId", "businessId") REFERENCES "tax_rates"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_businessId_fkey" FOREIGN KEY ("saleId", "businessId") REFERENCES "sales"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_returnId_businessId_fkey" FOREIGN KEY ("returnId", "businessId") REFERENCES "sale_returns"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_saleId_businessId_fkey" FOREIGN KEY ("saleId", "businessId") REFERENCES "sales"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_shiftId_businessId_fkey" FOREIGN KEY ("shiftId", "businessId") REFERENCES "pos_shifts"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_approvalRequestId_businessId_fkey" FOREIGN KEY ("approvalRequestId", "businessId") REFERENCES "approval_requests"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_returnId_businessId_fkey" FOREIGN KEY ("returnId", "businessId") REFERENCES "sale_returns"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_return_lines" ADD CONSTRAINT "sale_return_lines_saleLineId_businessId_fkey" FOREIGN KEY ("saleLineId", "businessId") REFERENCES "sale_lines"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_credit_accounts" ADD CONSTRAINT "store_credit_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_credit_accounts" ADD CONSTRAINT "store_credit_accounts_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_credit_entries" ADD CONSTRAINT "store_credit_entries_accountId_businessId_fkey" FOREIGN KEY ("accountId", "businessId") REFERENCES "store_credit_accounts"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_credit_entries" ADD CONSTRAINT "store_credit_entries_saleId_businessId_fkey" FOREIGN KEY ("saleId", "businessId") REFERENCES "sales"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_credit_entries" ADD CONSTRAINT "store_credit_entries_returnId_businessId_fkey" FOREIGN KEY ("returnId", "businessId") REFERENCES "sale_returns"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_credit_entries" ADD CONSTRAINT "store_credit_entries_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CC-P0-002: every new table uses the same forced Business isolation boundary.
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "approval_requests"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "pos_shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_shifts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "pos_shifts"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_movements" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "cash_movements"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "sales"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "sale_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "sale_lines"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "sale_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "sale_payments"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "sale_returns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_returns" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "sale_returns"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "sale_return_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_return_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "sale_return_lines"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "store_credit_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_credit_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "store_credit_accounts"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "store_credit_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_credit_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "store_credit_entries"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

-- CC-P0-006: register the new P0 management and P2 commerce permissions.
INSERT INTO "permissions" ("id", "code", "name", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'USER_UPDATE', 'Update users', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'APPROVAL_DECIDE', 'Approve or reject approval requests', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SHIFT_VIEW', 'View POS shifts', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SHIFT_MANAGE', 'Open, adjust and close POS shifts', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SALE_VIEW', 'View sales', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SALE_CREATE', 'Create and confirm sales', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PAYMENT_ACCEPT', 'Accept payments', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RECEIPT_PRINT', 'Print and reprint receipts', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RETURN_CREATE', 'Create returns', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REFUND_ISSUE', 'Issue refunds and store credit', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'STORE_CREDIT_VIEW', 'View store credit', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'STORE_CREDIT_MANAGE', 'Manage store credit', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

-- Existing owner roles keep full access to the Common Core.
INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."isSystem" = true
  AND r."code" = 'OWNER'
  AND p."code" IN (
    'USER_UPDATE',
    'APPROVAL_DECIDE',
    'SHIFT_VIEW',
    'SHIFT_MANAGE',
    'SALE_VIEW',
    'SALE_CREATE',
    'PAYMENT_ACCEPT',
    'RECEIPT_PRINT',
    'RETURN_CREATE',
    'REFUND_ISSUE',
    'STORE_CREDIT_VIEW',
    'STORE_CREDIT_MANAGE'
  )
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

-- CC-P1-006: a price list states whether its prices already include tax, and a customer group
-- can point at the price list that its customers should be charged from.
ALTER TABLE "price_lists" ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customer_groups" ADD COLUMN "priceListId" UUID;
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_priceListId_businessId_fkey" FOREIGN KEY ("priceListId", "businessId") REFERENCES "price_lists"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "customer_groups_businessId_priceListId_idx" ON "customer_groups"("businessId", "priceListId");
