-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('SHOP_FLOOR', 'WAREHOUSE', 'KITCHEN', 'VAN', 'SERVICE_BAY', 'QUARANTINE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeatureKind" AS ENUM ('CORE', 'BUSINESS_PACK', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "ApprovalStrategy" AS ENUM ('ANY_APPROVER', 'ALL_APPROVERS', 'MINIMUM_APPROVERS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'APPROVE', 'REJECT', 'CANCEL', 'DELETE', 'ASSIGN', 'ENABLE', 'DISABLE', 'GENERATE');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "legalName" VARCHAR(200),
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "defaultCurrency" CHAR(3) NOT NULL,
    "timeZone" VARCHAR(80) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "LocationType" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "externalSubject" VARCHAR(200) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_assignments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(240),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(240),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policies" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "actionCode" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "strategy" "ApprovalStrategy" NOT NULL DEFAULT 'ANY_APPROVER',
    "minimumApprovers" INTEGER NOT NULL DEFAULT 1,
    "thresholdAmount" DECIMAL(19,4),
    "currencyCode" CHAR(3),
    "conditions" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(240),
    "kind" "FeatureKind" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_features" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "actorMembershipId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(80) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "scopeKey" VARCHAR(80) NOT NULL,
    "documentType" VARCHAR(50) NOT NULL,
    "prefix" VARCHAR(24) NOT NULL,
    "nextValue" BIGINT NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "aggregateType" VARCHAR(80) NOT NULL,
    "aggregateId" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "branches_businessId_status_idx" ON "branches"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_businessId_code_key" ON "branches"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_id_businessId_key" ON "branches"("id", "businessId");

-- CreateIndex
CREATE INDEX "locations_businessId_branchId_status_idx" ON "locations"("businessId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "locations_businessId_branchId_code_key" ON "locations"("businessId", "branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_businessId_key" ON "locations"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "users_externalSubject_key" ON "users"("externalSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "business_memberships_businessId_status_idx" ON "business_memberships"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_businessId_userId_key" ON "business_memberships"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_memberships_id_businessId_key" ON "business_memberships"("id", "businessId");

-- CreateIndex
CREATE INDEX "branch_assignments_businessId_branchId_idx" ON "branch_assignments"("businessId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_assignments_businessId_membershipId_branchId_key" ON "branch_assignments"("businessId", "membershipId", "branchId");

-- CreateIndex
CREATE INDEX "roles_businessId_status_idx" ON "roles"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_businessId_code_key" ON "roles"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_businessId_key" ON "roles"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_businessId_roleId_idx" ON "role_permissions"("businessId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_businessId_roleId_permissionId_key" ON "role_permissions"("businessId", "roleId", "permissionId");

-- CreateIndex
CREATE INDEX "membership_roles_businessId_membershipId_idx" ON "membership_roles"("businessId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_roles_businessId_membershipId_roleId_key" ON "membership_roles"("businessId", "membershipId", "roleId");

-- CreateIndex
CREATE INDEX "approval_policies_businessId_enabled_idx" ON "approval_policies"("businessId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "approval_policies_businessId_actionCode_key" ON "approval_policies"("businessId", "actionCode");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_key_key" ON "feature_definitions"("key");

-- CreateIndex
CREATE INDEX "business_features_businessId_enabled_idx" ON "business_features"("businessId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "business_features_businessId_featureId_key" ON "business_features"("businessId", "featureId");

-- CreateIndex
CREATE INDEX "audit_events_businessId_occurredAt_idx" ON "audit_events"("businessId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_businessId_entityType_entityId_idx" ON "audit_events"("businessId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "document_sequences_businessId_branchId_idx" ON "document_sequences"("businessId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_businessId_scopeKey_documentType_key" ON "document_sequences"("businessId", "scopeKey", "documentType");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_occurredAt_idx" ON "outbox_events"("publishedAt", "occurredAt");

-- CreateIndex
CREATE INDEX "outbox_events_businessId_aggregateType_aggregateId_idx" ON "outbox_events"("businessId", "aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_assignments" ADD CONSTRAINT "branch_assignments_membershipId_businessId_fkey" FOREIGN KEY ("membershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_assignments" ADD CONSTRAINT "branch_assignments_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_businessId_fkey" FOREIGN KEY ("roleId", "businessId") REFERENCES "roles"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membershipId_businessId_fkey" FOREIGN KEY ("membershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_roleId_businessId_fkey" FOREIGN KEY ("roleId", "businessId") REFERENCES "roles"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_features" ADD CONSTRAINT "business_features_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_features" ADD CONSTRAINT "business_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorMembershipId_fkey" FOREIGN KEY ("actorMembershipId") REFERENCES "business_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
