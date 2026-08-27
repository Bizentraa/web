-- CreateEnum
CREATE TYPE "WorkflowTransitionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TraceableUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'CONSUMED', 'RETURNED', 'DAMAGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WarrantyClaimStatus" AS ENUM ('OPEN', 'INSPECTING', 'APPROVED', 'REJECTED', 'REPAIRED', 'REPLACED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BomStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PLANNED', 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('POS_TERMINAL', 'RECEIPT_PRINTER', 'LABEL_PRINTER', 'KITCHEN_PRINTER', 'BARCODE_SCANNER', 'CASH_DRAWER', 'PAYMENT_TERMINAL', 'CUSTOMER_DISPLAY', 'CAMERA', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'DISABLED', 'LOST');

-- CreateEnum
CREATE TYPE "OfflineQueueStatus" AS ENUM ('QUEUED', 'SYNCED', 'CONFLICT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SyncConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "workflow_statuses" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "appliesTo" VARCHAR(80) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "appliesTo" VARCHAR(80) NOT NULL,
    "fromStatusCode" VARCHAR(50) NOT NULL,
    "toStatusCode" VARCHAR(50) NOT NULL,
    "requiredPermission" VARCHAR(80),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkflowTransitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_tickets" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(1000),
    "status" "WorkTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "WorkTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "sourceType" VARCHAR(80),
    "sourceId" VARCHAR(80),
    "assigneeMembershipId" UUID,
    "checklist" JSONB,
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "resourceCode" VARCHAR(80) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "capacityUsed" INTEGER NOT NULL DEFAULT 1,
    "depositAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_assets" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "assetType" VARCHAR(80) NOT NULL,
    "identifier" VARCHAR(120),
    "attributes" JSONB,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traceable_units" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "locationId" UUID,
    "serialNumber" VARCHAR(120),
    "batchNumber" VARCHAR(120),
    "lotNumber" VARCHAR(120),
    "imei" VARCHAR(120),
    "manufactureDate" DATE,
    "expiryDate" DATE,
    "status" "TraceableUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "sourceType" VARCHAR(80),
    "sourceId" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "traceable_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_policies" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "terms" VARCHAR(1000),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "warranty_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID,
    "number" VARCHAR(60) NOT NULL,
    "status" "WarrantyClaimStatus" NOT NULL DEFAULT 'OPEN',
    "itemDescription" VARCHAR(240) NOT NULL,
    "serialReference" VARCHAR(120),
    "issue" VARCHAR(1000) NOT NULL,
    "resolution" VARCHAR(1000),
    "createdByMembershipId" UUID NOT NULL,
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boms" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "outputItemId" UUID NOT NULL,
    "outputQuantity" DECIMAL(19,4) NOT NULL,
    "status" "BomStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "boms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_components" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "bomId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "wastagePercent" DECIMAL(9,4) NOT NULL DEFAULT 0,

    CONSTRAINT "bom_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "sourceType" VARCHAR(80) NOT NULL,
    "sourceId" VARCHAR(80) NOT NULL,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "consumedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_routes" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "vehicleReference" VARCHAR(120),
    "driverName" VARCHAR(120),
    "plannedDate" DATE NOT NULL,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_stops" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "customerName" VARCHAR(180) NOT NULL,
    "address" JSONB,
    "sourceType" VARCHAR(80),
    "sourceId" VARCHAR(80),
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PLANNED',
    "proofReference" VARCHAR(240),
    "failedReason" VARCHAR(240),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "delivery_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "channel" VARCHAR(40) NOT NULL,
    "recipient" VARCHAR(254) NOT NULL,
    "subject" VARCHAR(180) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" VARCHAR(80),
    "sourceId" VARCHAR(80),
    "createdByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_documents" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(80) NOT NULL,
    "fileName" VARCHAR(240) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "notes" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_devices" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'REGISTERED',
    "hardwareId" VARCHAR(160),
    "capabilities" JSONB,
    "lastSeenAt" TIMESTAMPTZ(3),
    "pendingOfflineItems" INTEGER NOT NULL DEFAULT 0,
    "registeredByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_queue_items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "deviceId" UUID,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "operationType" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OfflineQueueStatus" NOT NULL DEFAULT 'QUEUED',
    "riskLevel" VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
    "failureReason" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMPTZ(3),

    CONSTRAINT "offline_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "queueItemId" UUID NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(80),
    "reason" VARCHAR(500) NOT NULL,
    "serverSnapshot" JSONB,
    "clientSnapshot" JSONB,
    "status" "SyncConflictStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" VARCHAR(500),
    "resolvedByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_statuses_businessId_appliesTo_status_idx" ON "workflow_statuses"("businessId", "appliesTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_statuses_businessId_appliesTo_code_key" ON "workflow_statuses"("businessId", "appliesTo", "code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_statuses_id_businessId_key" ON "workflow_statuses"("id", "businessId");

-- CreateIndex
CREATE INDEX "workflow_transitions_businessId_appliesTo_status_idx" ON "workflow_transitions"("businessId", "appliesTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_businessId_appliesTo_fromStatusCode_to_key" ON "workflow_transitions"("businessId", "appliesTo", "fromStatusCode", "toStatusCode");

-- CreateIndex
CREATE INDEX "work_tickets_businessId_status_priority_idx" ON "work_tickets"("businessId", "status", "priority");

-- CreateIndex
CREATE INDEX "work_tickets_businessId_sourceType_sourceId_idx" ON "work_tickets"("businessId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "work_tickets_businessId_number_key" ON "work_tickets"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "work_tickets_id_businessId_key" ON "work_tickets"("id", "businessId");

-- CreateIndex
CREATE INDEX "bookings_businessId_branchId_resourceCode_startsAt_endsAt_idx" ON "bookings"("businessId", "branchId", "resourceCode", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "bookings_businessId_status_startsAt_idx" ON "bookings"("businessId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_businessId_number_key" ON "bookings"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_id_businessId_key" ON "bookings"("id", "businessId");

-- CreateIndex
CREATE INDEX "customer_assets_businessId_customerId_idx" ON "customer_assets"("businessId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_assets_businessId_code_key" ON "customer_assets"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_assets_id_businessId_key" ON "customer_assets"("id", "businessId");

-- CreateIndex
CREATE INDEX "traceable_units_businessId_itemId_status_idx" ON "traceable_units"("businessId", "itemId", "status");

-- CreateIndex
CREATE INDEX "traceable_units_businessId_batchNumber_idx" ON "traceable_units"("businessId", "batchNumber");

-- CreateIndex
CREATE INDEX "traceable_units_businessId_expiryDate_idx" ON "traceable_units"("businessId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "traceable_units_businessId_serialNumber_key" ON "traceable_units"("businessId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "traceable_units_businessId_imei_key" ON "traceable_units"("businessId", "imei");

-- CreateIndex
CREATE UNIQUE INDEX "traceable_units_id_businessId_key" ON "traceable_units"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_policies_businessId_code_key" ON "warranty_policies"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_policies_id_businessId_key" ON "warranty_policies"("id", "businessId");

-- CreateIndex
CREATE INDEX "warranty_claims_businessId_status_openedAt_idx" ON "warranty_claims"("businessId", "status", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_claims_businessId_number_key" ON "warranty_claims"("businessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_claims_id_businessId_key" ON "warranty_claims"("id", "businessId");

-- CreateIndex
CREATE INDEX "boms_businessId_status_idx" ON "boms"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "boms_businessId_code_key" ON "boms"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "boms_id_businessId_key" ON "boms"("id", "businessId");

-- CreateIndex
CREATE INDEX "bom_components_businessId_itemId_idx" ON "bom_components"("businessId", "itemId");

-- CreateIndex
CREATE INDEX "material_consumptions_businessId_itemId_consumedAt_idx" ON "material_consumptions"("businessId", "itemId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "material_consumptions_businessId_sourceType_sourceId_itemId_key" ON "material_consumptions"("businessId", "sourceType", "sourceId", "itemId", "variantId");

-- CreateIndex
CREATE INDEX "delivery_routes_businessId_branchId_plannedDate_idx" ON "delivery_routes"("businessId", "branchId", "plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_routes_businessId_code_key" ON "delivery_routes"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_routes_id_businessId_key" ON "delivery_routes"("id", "businessId");

-- CreateIndex
CREATE INDEX "delivery_stops_businessId_status_createdAt_idx" ON "delivery_stops"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_stops_businessId_routeId_sequence_key" ON "delivery_stops"("businessId", "routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_stops_id_businessId_key" ON "delivery_stops"("id", "businessId");

-- CreateIndex
CREATE INDEX "notification_events_businessId_status_createdAt_idx" ON "notification_events"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notification_events_businessId_sourceType_sourceId_idx" ON "notification_events"("businessId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "business_documents_businessId_entityType_entityId_idx" ON "business_documents"("businessId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "store_devices_businessId_branchId_status_idx" ON "store_devices"("businessId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "store_devices_businessId_code_key" ON "store_devices"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "store_devices_id_businessId_key" ON "store_devices"("id", "businessId");

-- CreateIndex
CREATE INDEX "offline_queue_items_businessId_status_createdAt_idx" ON "offline_queue_items"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "offline_queue_items_businessId_deviceId_status_idx" ON "offline_queue_items"("businessId", "deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offline_queue_items_businessId_idempotencyKey_key" ON "offline_queue_items"("businessId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "offline_queue_items_id_businessId_key" ON "offline_queue_items"("id", "businessId");

-- CreateIndex
CREATE INDEX "sync_conflicts_businessId_status_createdAt_idx" ON "sync_conflicts"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sync_conflicts_id_businessId_key" ON "sync_conflicts"("id", "businessId");

-- AddForeignKey
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tickets" ADD CONSTRAINT "work_tickets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tickets" ADD CONSTRAINT "work_tickets_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tickets" ADD CONSTRAINT "work_tickets_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_assets" ADD CONSTRAINT "customer_assets_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_units" ADD CONSTRAINT "traceable_units_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_units" ADD CONSTRAINT "traceable_units_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_units" ADD CONSTRAINT "traceable_units_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_units" ADD CONSTRAINT "traceable_units_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_policies" ADD CONSTRAINT "warranty_policies_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_outputItemId_businessId_fkey" FOREIGN KEY ("outputItemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_bomId_businessId_fkey" FOREIGN KEY ("bomId", "businessId") REFERENCES "boms"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_routeId_businessId_fkey" FOREIGN KEY ("routeId", "businessId") REFERENCES "delivery_routes"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_devices" ADD CONSTRAINT "store_devices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_devices" ADD CONSTRAINT "store_devices_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_devices" ADD CONSTRAINT "store_devices_registeredByMembershipId_businessId_fkey" FOREIGN KEY ("registeredByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_queue_items" ADD CONSTRAINT "offline_queue_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_queue_items" ADD CONSTRAINT "offline_queue_items_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_queue_items" ADD CONSTRAINT "offline_queue_items_deviceId_businessId_fkey" FOREIGN KEY ("deviceId", "businessId") REFERENCES "store_devices"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_queue_items" ADD CONSTRAINT "offline_queue_items_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_queueItemId_businessId_fkey" FOREIGN KEY ("queueItemId", "businessId") REFERENCES "offline_queue_items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_resolvedByMembershipId_businessId_fkey" FOREIGN KEY ("resolvedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- P5/P6 permission catalogue and existing-role backfill.
INSERT INTO "permissions" ("id", "code", "name", "description")
VALUES
  (gen_random_uuid(), 'WORKFLOW_VIEW', 'View workflow setup', 'View workflow statuses and transitions.'),
  (gen_random_uuid(), 'WORKFLOW_MANAGE', 'Manage workflow setup', 'Create and update workflow statuses and transitions.'),
  (gen_random_uuid(), 'WORK_TICKET_VIEW', 'View work tickets', 'View operational work tickets.'),
  (gen_random_uuid(), 'WORK_TICKET_MANAGE', 'Manage work tickets', 'Create and update operational work tickets.'),
  (gen_random_uuid(), 'BOOKING_VIEW', 'View bookings', 'View bookings and resource calendars.'),
  (gen_random_uuid(), 'BOOKING_MANAGE', 'Manage bookings', 'Create and update bookings.'),
  (gen_random_uuid(), 'TRACEABILITY_VIEW', 'View traceability', 'View serial, IMEI, batch and expiry records.'),
  (gen_random_uuid(), 'TRACEABILITY_MANAGE', 'Manage traceability', 'Create and update serial, IMEI, batch and expiry records.'),
  (gen_random_uuid(), 'WARRANTY_VIEW', 'View warranties', 'View warranty policies and claims.'),
  (gen_random_uuid(), 'WARRANTY_MANAGE', 'Manage warranties', 'Create and update warranty policies and claims.'),
  (gen_random_uuid(), 'BOM_VIEW', 'View recipes and BOMs', 'View reusable recipes and BOM definitions.'),
  (gen_random_uuid(), 'BOM_MANAGE', 'Manage recipes and BOMs', 'Create BOMs and post material consumption.'),
  (gen_random_uuid(), 'ROUTE_VIEW', 'View routes and deliveries', 'View delivery routes and proof of delivery.'),
  (gen_random_uuid(), 'ROUTE_MANAGE', 'Manage routes and deliveries', 'Create routes and update delivery stops.'),
  (gen_random_uuid(), 'NOTIFICATION_VIEW', 'View notifications', 'View queued notifications.'),
  (gen_random_uuid(), 'NOTIFICATION_MANAGE', 'Manage notifications', 'Create notification events.'),
  (gen_random_uuid(), 'DOCUMENT_VIEW', 'View documents', 'View document and photo attachments.'),
  (gen_random_uuid(), 'DOCUMENT_MANAGE', 'Manage documents', 'Attach documents and photos to records.'),
  (gen_random_uuid(), 'DEVICE_VIEW', 'View devices', 'View store devices and terminal health.'),
  (gen_random_uuid(), 'DEVICE_MANAGE', 'Manage devices', 'Register and update store devices.'),
  (gen_random_uuid(), 'OFFLINE_VIEW', 'View offline queue', 'View offline queue and sync conflicts.'),
  (gen_random_uuid(), 'OFFLINE_MANAGE', 'Manage offline queue', 'Queue, sync and resolve offline work.')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description";

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", 'OPERATIONS_USER', 'Operations User', 'Manages workflows, work tickets, bookings, traceability, warranties and delivery execution.', true, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("businessId", "code") DO NOTHING;

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", 'DEVICE_USER', 'Device / Offline User', 'Manages store devices, offline queue review and sync conflict resolution.', true, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("businessId", "code") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'WORKFLOW_VIEW', 'WORKFLOW_MANAGE', 'WORK_TICKET_VIEW', 'WORK_TICKET_MANAGE',
  'BOOKING_VIEW', 'BOOKING_MANAGE', 'TRACEABILITY_VIEW', 'TRACEABILITY_MANAGE',
  'WARRANTY_VIEW', 'WARRANTY_MANAGE', 'BOM_VIEW', 'BOM_MANAGE',
  'ROUTE_VIEW', 'ROUTE_MANAGE', 'NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE',
  'DOCUMENT_VIEW', 'DOCUMENT_MANAGE', 'DEVICE_VIEW', 'DEVICE_MANAGE',
  'OFFLINE_VIEW', 'OFFLINE_MANAGE'
)
WHERE r."isSystem" = true AND r."code" IN ('OWNER', 'ADMINISTRATOR')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'WORKFLOW_VIEW', 'WORK_TICKET_VIEW', 'WORK_TICKET_MANAGE',
  'BOOKING_VIEW', 'BOOKING_MANAGE', 'TRACEABILITY_VIEW', 'TRACEABILITY_MANAGE',
  'WARRANTY_VIEW', 'WARRANTY_MANAGE', 'BOM_VIEW', 'BOM_MANAGE',
  'ROUTE_VIEW', 'ROUTE_MANAGE', 'NOTIFICATION_VIEW', 'DOCUMENT_VIEW', 'DOCUMENT_MANAGE',
  'DEVICE_VIEW', 'OFFLINE_VIEW'
)
WHERE r."isSystem" = true AND r."code" IN ('BRANCH_MANAGER', 'OPERATIONS_USER')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN ('TRACEABILITY_VIEW', 'TRACEABILITY_MANAGE', 'BOM_VIEW', 'BOM_MANAGE')
WHERE r."isSystem" = true AND r."code" = 'INVENTORY_USER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN ('DEVICE_VIEW', 'DEVICE_MANAGE', 'OFFLINE_VIEW', 'OFFLINE_MANAGE')
WHERE r."isSystem" = true AND r."code" = 'DEVICE_USER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'DEVICE_VIEW', 'OFFLINE_VIEW', 'OFFLINE_MANAGE', 'WORK_TICKET_VIEW',
  'BOOKING_VIEW', 'DOCUMENT_VIEW'
)
WHERE r."isSystem" = true AND r."code" = 'CASHIER'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'WORKFLOW_VIEW', 'WORK_TICKET_VIEW', 'BOOKING_VIEW', 'TRACEABILITY_VIEW',
  'WARRANTY_VIEW', 'BOM_VIEW', 'ROUTE_VIEW', 'NOTIFICATION_VIEW',
  'DOCUMENT_VIEW', 'DEVICE_VIEW', 'OFFLINE_VIEW'
)
WHERE r."isSystem" = true AND r."code" = 'AUDITOR'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;
