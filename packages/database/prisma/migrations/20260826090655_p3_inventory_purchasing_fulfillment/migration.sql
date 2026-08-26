-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('OPENING', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RECEIPT', 'PICK', 'PACK', 'DISPATCH', 'RETURN');

-- CreateEnum
CREATE TYPE "StockMovementStatus" AS ENUM ('POSTED', 'IN_TRANSIT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('READY_TO_PICK', 'PICKING', 'PACKED', 'DISPATCHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "onHandQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "incomingQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "kind" "StockMovementKind" NOT NULL,
    "status" "StockMovementStatus" NOT NULL DEFAULT 'POSTED',
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitCost" DECIMAL(19,4),
    "reason" VARCHAR(500) NOT NULL,
    "referenceType" VARCHAR(80),
    "referenceId" VARCHAR(80),
    "relatedMovementId" UUID,
    "createdByMembershipId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_settings" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "minimumQuantity" DECIMAL(19,4) NOT NULL,
    "targetQuantity" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reorder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason" VARCHAR(500) NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "purchaseRequestId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "expectedCost" DECIMAL(19,4),
    "note" VARCHAR(240),

    CONSTRAINT "purchase_request_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "purchaseRequestId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'APPROVED',
    "expectedDate" DATE,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "orderedQuantity" DECIMAL(19,4) NOT NULL,
    "receivedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "billedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "returnedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "supplierDocument" VARCHAR(120),
    "createdByMembershipId" UUID NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "goodsReceiptId" UUID NOT NULL,
    "purchaseOrderLineId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "receivedQuantity" DECIMAL(19,4) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_orders" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'READY_TO_PICK',
    "customerName" VARCHAR(180),
    "sourceType" VARCHAR(80) NOT NULL,
    "sourceId" VARCHAR(80) NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "dispatchedAt" TIMESTAMPTZ(3),

    CONSTRAINT "fulfillment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_lines" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "fulfillmentOrderId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "pickedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "packedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,

    CONSTRAINT "fulfillment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_balances_businessId_itemId_idx" ON "stock_balances"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "stock_balances_businessId_locationId_idx" ON "stock_balances"("businessId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_businessId_locationId_itemId_variantId_key" ON "stock_balances"("businessId", "locationId", "itemId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_id_businessId_key" ON "stock_balances"("id", "businessId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_itemId_occurredAt_idx" ON "stock_movements"("businessId", "itemId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_locationId_occurredAt_idx" ON "stock_movements"("businessId", "locationId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_referenceType_referenceId_idx" ON "stock_movements"("businessId", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_id_businessId_key" ON "stock_movements"("id", "businessId");

-- CreateIndex
CREATE INDEX "reorder_settings_businessId_itemId_idx" ON "reorder_settings"("businessId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "reorder_settings_businessId_locationId_itemId_variantId_key" ON "reorder_settings"("businessId", "locationId", "itemId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "reorder_settings_id_businessId_key" ON "reorder_settings"("id", "businessId");

-- CreateIndex
CREATE INDEX "purchase_requests_businessId_status_createdAt_idx" ON "purchase_requests"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_businessId_number_key" ON "purchase_requests"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_id_businessId_key" ON "purchase_requests"("id", "businessId");

-- CreateIndex
CREATE INDEX "purchase_request_lines_businessId_itemId_idx" ON "purchase_request_lines"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "purchase_orders_businessId_supplierId_status_idx" ON "purchase_orders"("businessId", "supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_businessId_number_key" ON "purchase_orders"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_id_businessId_key" ON "purchase_orders"("id", "businessId");

-- CreateIndex
CREATE INDEX "purchase_order_lines_businessId_itemId_idx" ON "purchase_order_lines"("businessId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_id_businessId_key" ON "purchase_order_lines"("id", "businessId");

-- CreateIndex
CREATE INDEX "goods_receipts_businessId_purchaseOrderId_idx" ON "goods_receipts"("businessId", "purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_businessId_number_key" ON "goods_receipts"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_id_businessId_key" ON "goods_receipts"("id", "businessId");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_businessId_itemId_idx" ON "goods_receipt_lines"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "fulfillment_orders_businessId_status_createdAt_idx" ON "fulfillment_orders"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_orders_businessId_number_key" ON "fulfillment_orders"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_orders_id_businessId_key" ON "fulfillment_orders"("id", "businessId");

-- CreateIndex
CREATE INDEX "fulfillment_lines_businessId_itemId_idx" ON "fulfillment_lines"("businessId", "itemId");

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_settings" ADD CONSTRAINT "reorder_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_settings" ADD CONSTRAINT "reorder_settings_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_settings" ADD CONSTRAINT "reorder_settings_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_settings" ADD CONSTRAINT "reorder_settings_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_purchaseRequestId_businessId_fkey" FOREIGN KEY ("purchaseRequestId", "businessId") REFERENCES "purchase_requests"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_businessId_fkey" FOREIGN KEY ("supplierId", "businessId") REFERENCES "suppliers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchaseRequestId_businessId_fkey" FOREIGN KEY ("purchaseRequestId", "businessId") REFERENCES "purchase_requests"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_businessId_fkey" FOREIGN KEY ("purchaseOrderId", "businessId") REFERENCES "purchase_orders"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchaseOrderId_businessId_fkey" FOREIGN KEY ("purchaseOrderId", "businessId") REFERENCES "purchase_orders"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goodsReceiptId_businessId_fkey" FOREIGN KEY ("goodsReceiptId", "businessId") REFERENCES "goods_receipts"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchaseOrderLineId_businessId_fkey" FOREIGN KEY ("purchaseOrderLineId", "businessId") REFERENCES "purchase_order_lines"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_fulfillmentOrderId_businessId_fkey" FOREIGN KEY ("fulfillmentOrderId", "businessId") REFERENCES "fulfillment_orders"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
