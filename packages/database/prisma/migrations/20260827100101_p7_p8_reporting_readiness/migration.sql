-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('QUEUED', 'READY', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WebhookSubscriptionStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "MigrationValidationStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'FAILED', 'APPROVED');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BackupRunStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'RESTORE_TESTED');

-- CreateEnum
CREATE TYPE "ReadinessCheckStatus" AS ENUM ('PASS', 'WARNING', 'FAIL', 'NOT_RUN');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReleaseReadinessStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'RELEASED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "saved_report_views" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "reportType" VARCHAR(80) NOT NULL,
    "filters" JSONB NOT NULL,
    "columns" JSONB,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_report_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "exportType" VARCHAR(80) NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "filters" JSONB,
    "status" "DataExportStatus" NOT NULL DEFAULT 'QUEUED',
    "fileUrl" VARCHAR(1000),
    "failureReason" VARCHAR(500),
    "requestedByMembershipId" UUID NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "endpointUrl" VARCHAR(1000) NOT NULL,
    "eventTypes" JSONB NOT NULL,
    "secretHint" VARCHAR(120),
    "status" "WebhookSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "eventId" VARCHAR(120) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMPTZ(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_validations" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "sourceName" VARCHAR(180) NOT NULL,
    "entityKind" "ImportEntityKind" NOT NULL,
    "status" "MigrationValidationStatus" NOT NULL DEFAULT 'RECEIVED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "preview" JSONB,
    "reconciliation" JSONB,
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "migration_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
    "subjectType" VARCHAR(80),
    "subjectId" VARCHAR(80),
    "detail" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "recordedByMembershipId" UUID,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_runs" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "scope" VARCHAR(120) NOT NULL,
    "status" "BackupRunStatus" NOT NULL DEFAULT 'SCHEDULED',
    "storageReference" VARCHAR(500),
    "sizeBytes" BIGINT,
    "recoveryPointObjective" VARCHAR(80),
    "recoveryTimeObjective" VARCHAR(80),
    "restoreTestedAt" TIMESTAMPTZ(3),
    "failureReason" VARCHAR(500),
    "recordedByMembershipId" UUID,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_checks" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "area" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "ReadinessCheckStatus" NOT NULL DEFAULT 'NOT_RUN',
    "target" VARCHAR(120),
    "measuredValue" VARCHAR(120),
    "notes" VARCHAR(500),
    "recordedByMembershipId" UUID,
    "checkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_requests" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID,
    "requestType" VARCHAR(80) NOT NULL,
    "requester" VARCHAR(180) NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE,
    "resolution" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "resolvedByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_readiness" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "version" VARCHAR(80) NOT NULL,
    "status" "ReleaseReadinessStatus" NOT NULL DEFAULT 'DRAFT',
    "checklist" JSONB NOT NULL,
    "rollbackPlan" VARCHAR(1000) NOT NULL,
    "migrationPlan" VARCHAR(1000),
    "createdByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(3),

    CONSTRAINT "release_readiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_report_views_businessId_reportType_idx" ON "saved_report_views"("businessId", "reportType");

-- CreateIndex
CREATE UNIQUE INDEX "saved_report_views_businessId_code_key" ON "saved_report_views"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "saved_report_views_id_businessId_key" ON "saved_report_views"("id", "businessId");

-- CreateIndex
CREATE INDEX "data_export_requests_businessId_exportType_status_idx" ON "data_export_requests"("businessId", "exportType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "data_export_requests_id_businessId_key" ON "data_export_requests"("id", "businessId");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_businessId_status_idx" ON "webhook_subscriptions"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_subscriptions_id_businessId_key" ON "webhook_subscriptions"("id", "businessId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_businessId_status_nextAttemptAt_idx" ON "webhook_deliveries"("businessId", "status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_businessId_subscriptionId_eventId_key" ON "webhook_deliveries"("businessId", "subscriptionId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_id_businessId_key" ON "webhook_deliveries"("id", "businessId");

-- CreateIndex
CREATE INDEX "migration_validations_businessId_entityKind_status_idx" ON "migration_validations"("businessId", "entityKind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "migration_validations_id_businessId_key" ON "migration_validations"("id", "businessId");

-- CreateIndex
CREATE INDEX "security_events_businessId_severity_occurredAt_idx" ON "security_events"("businessId", "severity", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "security_events_id_businessId_key" ON "security_events"("id", "businessId");

-- CreateIndex
CREATE INDEX "backup_runs_businessId_status_startedAt_idx" ON "backup_runs"("businessId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "backup_runs_id_businessId_key" ON "backup_runs"("id", "businessId");

-- CreateIndex
CREATE INDEX "readiness_checks_businessId_status_checkedAt_idx" ON "readiness_checks"("businessId", "status", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_checks_businessId_area_name_key" ON "readiness_checks"("businessId", "area", "name");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_checks_id_businessId_key" ON "readiness_checks"("id", "businessId");

-- CreateIndex
CREATE INDEX "privacy_requests_businessId_status_dueDate_idx" ON "privacy_requests"("businessId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_requests_id_businessId_key" ON "privacy_requests"("id", "businessId");

-- CreateIndex
CREATE INDEX "release_readiness_businessId_status_createdAt_idx" ON "release_readiness"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "release_readiness_businessId_version_key" ON "release_readiness"("businessId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "release_readiness_id_businessId_key" ON "release_readiness"("id", "businessId");

-- AddForeignKey
ALTER TABLE "saved_report_views" ADD CONSTRAINT "saved_report_views_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_report_views" ADD CONSTRAINT "saved_report_views_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_requestedByMembershipId_businessId_fkey" FOREIGN KEY ("requestedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscriptionId_businessId_fkey" FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "webhook_subscriptions"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_validations" ADD CONSTRAINT "migration_validations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_validations" ADD CONSTRAINT "migration_validations_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_recordedByMembershipId_businessId_fkey" FOREIGN KEY ("recordedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_recordedByMembershipId_businessId_fkey" FOREIGN KEY ("recordedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_checks" ADD CONSTRAINT "readiness_checks_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_checks" ADD CONSTRAINT "readiness_checks_recordedByMembershipId_businessId_fkey" FOREIGN KEY ("recordedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "customers"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_resolvedByMembershipId_businessId_fkey" FOREIGN KEY ("resolvedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_readiness" ADD CONSTRAINT "release_readiness_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_readiness" ADD CONSTRAINT "release_readiness_createdByMembershipId_businessId_fkey" FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- P7/P8 permission catalogue and existing-role backfill.
INSERT INTO "permissions" ("id", "code", "name", "description")
VALUES
  (gen_random_uuid(), 'REPORT_VIEW', 'View reports', 'View sales, stock, finance, customer and workforce reports.'),
  (gen_random_uuid(), 'REPORT_EXPORT', 'Export report data', 'Request approved exports of report and operational data.'),
  (gen_random_uuid(), 'INTEGRATION_VIEW', 'View integrations', 'View API, webhook and integration delivery state.'),
  (gen_random_uuid(), 'INTEGRATION_MANAGE', 'Manage integrations', 'Manage webhook subscriptions and integration retry records.'),
  (gen_random_uuid(), 'MIGRATION_VIEW', 'View migration validation', 'View migration validation, preview and reconciliation evidence.'),
  (gen_random_uuid(), 'MIGRATION_MANAGE', 'Manage migration validation', 'Create and approve migration validation runs.'),
  (gen_random_uuid(), 'SECURITY_VIEW', 'View security events', 'View security events and sensitive operational activity.'),
  (gen_random_uuid(), 'SECURITY_MANAGE', 'Manage security controls', 'Record and manage security-control evidence.'),
  (gen_random_uuid(), 'OPERATIONS_VIEW', 'View operations readiness', 'View backup, disaster recovery, observability and performance readiness.'),
  (gen_random_uuid(), 'OPERATIONS_MANAGE', 'Manage operations readiness', 'Record backup, readiness and release evidence.'),
  (gen_random_uuid(), 'PRIVACY_VIEW', 'View privacy requests', 'View customer-data access, export, deletion and retention requests.'),
  (gen_random_uuid(), 'PRIVACY_MANAGE', 'Manage privacy requests', 'Create and resolve customer-data privacy requests.'),
  (gen_random_uuid(), 'RELEASE_VIEW', 'View release readiness', 'View production release checklist and rollback evidence.'),
  (gen_random_uuid(), 'RELEASE_MANAGE', 'Manage release readiness', 'Create and update production release checklist evidence.')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description";

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", 'REPORTING_USER', 'Reporting / Integration User', 'Reviews reports, exports data and manages integration evidence.', true, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("businessId", "code") DO NOTHING;

INSERT INTO "roles" ("id", "businessId", "code", "name", "description", "isSystem", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", 'OPERATIONS_ADMIN', 'Security / Operations Admin', 'Manages security, backup, privacy and release-readiness evidence.', true, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses" b
ON CONFLICT ("businessId", "code") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'REPORT_VIEW', 'REPORT_EXPORT', 'INTEGRATION_VIEW', 'INTEGRATION_MANAGE',
  'MIGRATION_VIEW', 'MIGRATION_MANAGE', 'SECURITY_VIEW', 'SECURITY_MANAGE',
  'OPERATIONS_VIEW', 'OPERATIONS_MANAGE', 'PRIVACY_VIEW', 'PRIVACY_MANAGE',
  'RELEASE_VIEW', 'RELEASE_MANAGE'
)
WHERE r."isSystem" = true AND r."code" IN ('OWNER', 'ADMINISTRATOR')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'REPORT_VIEW', 'REPORT_EXPORT', 'INTEGRATION_VIEW', 'INTEGRATION_MANAGE',
  'MIGRATION_VIEW', 'MIGRATION_MANAGE'
)
WHERE r."isSystem" = true AND r."code" IN ('REPORTING_USER', 'BRANCH_MANAGER')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'REPORT_VIEW', 'REPORT_EXPORT', 'INTEGRATION_VIEW', 'INTEGRATION_MANAGE',
  'MIGRATION_VIEW', 'MIGRATION_MANAGE', 'SECURITY_VIEW', 'SECURITY_MANAGE',
  'OPERATIONS_VIEW', 'OPERATIONS_MANAGE', 'PRIVACY_VIEW', 'PRIVACY_MANAGE',
  'RELEASE_VIEW', 'RELEASE_MANAGE'
)
WHERE r."isSystem" = true AND r."code" = 'OPERATIONS_ADMIN'
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId")
SELECT gen_random_uuid(), r."businessId", r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'REPORT_VIEW', 'REPORT_EXPORT', 'SECURITY_VIEW', 'OPERATIONS_VIEW', 'PRIVACY_VIEW', 'RELEASE_VIEW'
)
WHERE r."isSystem" = true AND r."code" IN ('FINANCE_USER', 'AUDITOR')
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;
