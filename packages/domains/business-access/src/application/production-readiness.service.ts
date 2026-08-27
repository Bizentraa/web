import type {
  BackupRunRow,
  CatalogRecordCreated,
  CreatePrivacyRequestInput,
  CreateReleaseReadinessInput,
  PrivacyRequestRow,
  ProductionReadinessOverview,
  ReadinessCheckRow,
  RecordBackupRunInput,
  RecordSecurityEventInput,
  ReleaseReadinessRow,
  ResolvePrivacyRequestInput,
  SecurityEventRow,
  UpsertReadinessCheckInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  Prisma,
  withBusinessContext,
} from "@bizentra/database";
import {
  BusinessAccessError,
  loadMembershipContext,
  recordChange,
  requirePermission,
} from "@bizentra/domain-shared";

import { ensureAccessCatalogSync } from "./access-sync.js";

export class ProductionReadinessService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<ProductionReadinessOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      await requirePermission(transaction, businessId, actorUserId, "OPERATIONS_VIEW");

      const [securityEvents, backupRuns, readinessChecks, privacyRequests, releases, auditCount] =
        await Promise.all([
          transaction.securityEvent.findMany({
            where: { businessId },
            orderBy: { occurredAt: "desc" },
            take: 25,
          }),
          transaction.backupRun.findMany({
            where: { businessId },
            orderBy: { startedAt: "desc" },
            take: 25,
          }),
          transaction.readinessCheck.findMany({
            where: { businessId },
            orderBy: { checkedAt: "desc" },
            take: 25,
          }),
          transaction.privacyRequest.findMany({
            where: { businessId },
            orderBy: { createdAt: "desc" },
            take: 25,
            include: { customer: { select: { name: true } } },
          }),
          transaction.releaseReadiness.findMany({
            where: { businessId },
            orderBy: { createdAt: "desc" },
            take: 25,
          }),
          transaction.auditEvent.count({ where: { businessId } }),
        ]);

      return {
        counts: {
          criticalSecurityEvents: securityEvents.filter((row) => row.severity === "CRITICAL")
            .length,
          failedBackups: backupRuns.filter((row) => row.status === "FAILED").length,
          failedReadinessChecks: readinessChecks.filter((row) => row.status === "FAIL").length,
          openPrivacyRequests: privacyRequests.filter((row) => row.status === "OPEN").length,
          blockedReleases: releases.filter((row) => row.status === "BLOCKED").length,
          auditEvents: auditCount,
        },
        securityEvents: securityEvents.map(mapSecurityEvent),
        backupRuns: backupRuns.map(mapBackupRun),
        readinessChecks: readinessChecks.map(mapReadinessCheck),
        privacyRequests: privacyRequests.map(mapPrivacyRequest),
        releases: releases.map(mapRelease),
      };
    });
  }

  async recordSecurityEvent(
    businessId: string,
    actorUserId: string,
    input: RecordSecurityEventInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "SECURITY_MANAGE", async (transaction, actor) => {
      const event = await transaction.securityEvent.create({
        data: {
          businessId,
          eventType: input.eventType,
          severity: input.severity,
          subjectType: input.subjectType ?? null,
          subjectId: input.subjectId ?? null,
          detail: input.detail,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          recordedByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "SecurityEvent", event.id, {
        eventType: input.eventType,
        severity: input.severity,
      });
      return { id: event.id };
    });
  }

  async recordBackupRun(
    businessId: string,
    actorUserId: string,
    input: RecordBackupRunInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "OPERATIONS_MANAGE", async (transaction, actor) => {
      const backup = await transaction.backupRun.create({
        data: {
          businessId,
          scope: input.scope,
          status: input.restoreTested ? "RESTORE_TESTED" : input.status,
          storageReference: input.storageReference ?? null,
          sizeBytes: input.sizeBytes === undefined ? null : BigInt(input.sizeBytes),
          recoveryPointObjective: input.recoveryPointObjective ?? null,
          recoveryTimeObjective: input.recoveryTimeObjective ?? null,
          restoreTestedAt: input.restoreTested ? new Date() : null,
          failureReason: input.failureReason ?? null,
          recordedByMembershipId: actor.membershipId,
          completedAt:
            input.status === "COMPLETED" || input.status === "FAILED" || input.restoreTested
              ? new Date()
              : null,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "BackupRun", backup.id, {
        scope: input.scope,
        status: backup.status,
      });
      return { id: backup.id };
    });
  }

  async upsertReadinessCheck(
    businessId: string,
    actorUserId: string,
    input: UpsertReadinessCheckInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "OPERATIONS_MANAGE", async (transaction, actor) => {
      const check = await transaction.readinessCheck.upsert({
        where: { businessId_area_name: { businessId, area: input.area, name: input.name } },
        update: {
          status: input.status,
          target: input.target ?? null,
          measuredValue: input.measuredValue ?? null,
          notes: input.notes ?? null,
          recordedByMembershipId: actor.membershipId,
          checkedAt: new Date(),
        },
        create: {
          businessId,
          area: input.area,
          name: input.name,
          status: input.status,
          target: input.target ?? null,
          measuredValue: input.measuredValue ?? null,
          notes: input.notes ?? null,
          recordedByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "ReadinessCheck", check.id, {
        area: input.area,
        name: input.name,
        status: input.status,
      });
      return { id: check.id };
    });
  }

  async createPrivacyRequest(
    businessId: string,
    actorUserId: string,
    input: CreatePrivacyRequestInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PRIVACY_MANAGE", async (transaction, actor) => {
      if (input.customerId) {
        const customer = await transaction.customer.findUnique({
          where: { id_businessId: { id: input.customerId, businessId } },
        });
        if (!customer) throw new BusinessAccessError("NOT_FOUND", "Customer was not found.");
      }
      const privacy = await transaction.privacyRequest.create({
        data: {
          businessId,
          customerId: input.customerId ?? null,
          requestType: input.requestType,
          requester: input.requester,
          dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "PrivacyRequest", privacy.id, {
        requestType: input.requestType,
        requester: input.requester,
      });
      return { id: privacy.id };
    });
  }

  async resolvePrivacyRequest(
    businessId: string,
    actorUserId: string,
    privacyRequestId: string,
    input: ResolvePrivacyRequestInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PRIVACY_MANAGE", async (transaction, actor) => {
      const privacy = await transaction.privacyRequest.update({
        where: { id_businessId: { id: privacyRequestId, businessId } },
        data: {
          status: input.status,
          resolution: input.resolution,
          resolvedByMembershipId: actor.membershipId,
          resolvedAt: new Date(),
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "PrivacyRequest", privacy.id, {
        status: input.status,
      });
      return { id: privacy.id };
    });
  }

  async createReleaseReadiness(
    businessId: string,
    actorUserId: string,
    input: CreateReleaseReadinessInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "RELEASE_MANAGE", async (transaction, actor) => {
      const release = await transaction.releaseReadiness.upsert({
        where: { businessId_version: { businessId, version: input.version } },
        update: {
          status: input.status,
          checklist: input.checklist as Prisma.InputJsonValue,
          rollbackPlan: input.rollbackPlan,
          migrationPlan: input.migrationPlan ?? null,
          releasedAt: input.status === "RELEASED" ? new Date() : null,
        },
        create: {
          businessId,
          version: input.version,
          status: input.status,
          checklist: input.checklist as Prisma.InputJsonValue,
          rollbackPlan: input.rollbackPlan,
          migrationPlan: input.migrationPlan ?? null,
          createdByMembershipId: actor.membershipId,
          releasedAt: input.status === "RELEASED" ? new Date() : null,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "ReleaseReadiness",
        release.id,
        {
          version: input.version,
          status: input.status,
        },
      );
      return { id: release.id };
    });
  }

  private async write<T>(
    businessId: string,
    actorUserId: string,
    permission: string,
    work: (transaction: DatabaseTransaction, actor: { membershipId: string }) => Promise<T>,
  ): Promise<T> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      actor.require(permission);
      return work(transaction, { membershipId: actor.membershipId });
    });
  }

  private async record(
    transaction: DatabaseTransaction,
    businessId: string,
    actorMembershipId: string,
    entityType: string,
    entityId: string,
    after: Record<string, unknown>,
  ) {
    await recordChange(transaction, {
      businessId,
      actorMembershipId,
      action: "CREATE",
      entityType,
      entityId,
      after,
      eventType: `production_readiness.${entityType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}.changed`,
      eventPayload: { entityId, ...after },
    });
  }
}

function mapSecurityEvent(
  row: Prisma.SecurityEventGetPayload<Record<string, never>>,
): SecurityEventRow {
  return {
    id: row.id,
    eventType: row.eventType,
    severity: row.severity,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    detail: row.detail,
    occurredAt: row.occurredAt.toISOString(),
  };
}

function mapBackupRun(row: Prisma.BackupRunGetPayload<Record<string, never>>): BackupRunRow {
  return {
    id: row.id,
    scope: row.scope,
    status: row.status,
    storageReference: row.storageReference,
    sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    recoveryPointObjective: row.recoveryPointObjective,
    recoveryTimeObjective: row.recoveryTimeObjective,
    restoreTestedAt: row.restoreTestedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function mapReadinessCheck(
  row: Prisma.ReadinessCheckGetPayload<Record<string, never>>,
): ReadinessCheckRow {
  return {
    id: row.id,
    area: row.area,
    name: row.name,
    status: row.status,
    target: row.target,
    measuredValue: row.measuredValue,
    notes: row.notes,
    checkedAt: row.checkedAt.toISOString(),
  };
}

function mapPrivacyRequest(
  row: Prisma.PrivacyRequestGetPayload<{ include: { customer: { select: { name: true } } } }>,
): PrivacyRequestRow {
  return {
    id: row.id,
    customerName: row.customer?.name ?? null,
    requestType: row.requestType,
    requester: row.requester,
    status: row.status,
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

function mapRelease(
  row: Prisma.ReleaseReadinessGetPayload<Record<string, never>>,
): ReleaseReadinessRow {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    rollbackPlan: row.rollbackPlan,
    migrationPlan: row.migrationPlan,
    createdAt: row.createdAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null,
  };
}
