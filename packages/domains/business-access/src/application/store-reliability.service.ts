import type {
  CatalogRecordCreated,
  HeartbeatDeviceInput,
  MarkOfflineQueueItemInput,
  OfflineQueueItemRow,
  QueueOfflineOperationInput,
  RegisterDeviceInput,
  ResolveSyncConflictInput,
  StoreDeviceRow,
  StoreReliabilityOverview,
  SyncConflictRow,
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

export class StoreReliabilityService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<StoreReliabilityOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      await requirePermission(transaction, businessId, actorUserId, "DEVICE_VIEW");

      const [devices, queue, conflicts] = await Promise.all([
        transaction.storeDevice.findMany({
          where: { businessId },
          orderBy: { updatedAt: "desc" },
          take: 25,
          include: deviceInclude,
        }),
        transaction.offlineQueueItem.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        transaction.syncConflict.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

      return {
        counts: {
          devices: devices.length,
          activeDevices: devices.filter((device) => device.status === "ACTIVE").length,
          queuedOfflineItems: queue.filter((item) => item.status === "QUEUED").length,
          openConflicts: conflicts.filter((conflict) => conflict.status === "OPEN").length,
        },
        devices: devices.map(mapDevice),
        queue: queue.map(mapQueueItem),
        conflicts: conflicts.map(mapConflict),
      };
    });
  }

  async registerDevice(
    businessId: string,
    actorUserId: string,
    input: RegisterDeviceInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "DEVICE_MANAGE", async (transaction, actor) => {
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      const device = await transaction.storeDevice.upsert({
        where: { businessId_code: { businessId, code: input.code } },
        update: {
          name: input.name,
          branchId: input.branchId ?? null,
          kind: input.kind,
          hardwareId: input.hardwareId ?? null,
          capabilities: input.capabilities
            ? (input.capabilities as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: "ACTIVE",
          lastSeenAt: new Date(),
        },
        create: {
          businessId,
          branchId: input.branchId ?? null,
          code: input.code,
          name: input.name,
          kind: input.kind,
          hardwareId: input.hardwareId ?? null,
          capabilities: input.capabilities
            ? (input.capabilities as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: "ACTIVE",
          lastSeenAt: new Date(),
          registeredByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "StoreDevice", device.id, {
        code: input.code,
      });
      return { id: device.id };
    });
  }

  async heartbeatDevice(
    businessId: string,
    actorUserId: string,
    deviceId: string,
    input: HeartbeatDeviceInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "DEVICE_VIEW", async (transaction) => {
      const device = await transaction.storeDevice.update({
        where: { id_businessId: { id: deviceId, businessId } },
        data: { lastSeenAt: new Date(), pendingOfflineItems: input.pendingOfflineItems },
      });
      return { id: device.id };
    });
  }

  async queueOfflineOperation(
    businessId: string,
    actorUserId: string,
    input: QueueOfflineOperationInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "OFFLINE_MANAGE", async (transaction, actor) => {
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      if (input.deviceId) await assertDevice(transaction, businessId, input.deviceId);
      const item = await transaction.offlineQueueItem.upsert({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
        update: {},
        create: {
          businessId,
          branchId: input.branchId ?? null,
          deviceId: input.deviceId ?? null,
          idempotencyKey: input.idempotencyKey,
          operationType: input.operationType,
          payload: input.payload as Prisma.InputJsonValue,
          riskLevel: input.riskLevel,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "OfflineQueueItem", item.id, {
        idempotencyKey: input.idempotencyKey,
        operationType: input.operationType,
      });
      return { id: item.id };
    });
  }

  async markOfflineQueueItem(
    businessId: string,
    actorUserId: string,
    queueItemId: string,
    input: MarkOfflineQueueItemInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "OFFLINE_MANAGE", async (transaction, actor) => {
      const item = await transaction.offlineQueueItem.update({
        where: { id_businessId: { id: queueItemId, businessId } },
        data: {
          status: input.status,
          failureReason: input.failureReason ?? null,
          syncedAt: input.status === "SYNCED" ? new Date() : null,
        },
      });
      if (input.status === "CONFLICT") {
        await transaction.syncConflict.create({
          data: {
            businessId,
            queueItemId,
            entityType: item.operationType,
            reason: input.failureReason ?? "Offline item needs manual review.",
            serverSnapshot: Prisma.JsonNull,
            clientSnapshot:
              item.payload === null ? Prisma.JsonNull : (item.payload as Prisma.InputJsonValue),
          },
        });
      }
      await this.record(transaction, businessId, actor.membershipId, "OfflineQueueItem", item.id, {
        status: input.status,
      });
      return { id: item.id };
    });
  }

  async resolveSyncConflict(
    businessId: string,
    actorUserId: string,
    conflictId: string,
    input: ResolveSyncConflictInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "OFFLINE_MANAGE", async (transaction, actor) => {
      const conflict = await transaction.syncConflict.update({
        where: { id_businessId: { id: conflictId, businessId } },
        data: {
          status: input.status,
          resolution: input.resolution,
          resolvedByMembershipId: actor.membershipId,
          resolvedAt: new Date(),
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "SyncConflict", conflict.id, {
        status: input.status,
      });
      return { id: conflict.id };
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
      eventType: `store_reliability.${entityType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}.changed`,
      eventPayload: { entityId, ...after },
    });
  }
}

const deviceInclude = {
  branch: { select: { name: true } },
} satisfies Prisma.StoreDeviceInclude;

function mapDevice(
  row: Prisma.StoreDeviceGetPayload<{ include: typeof deviceInclude }>,
): StoreDeviceRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    branchName: row.branch?.name ?? null,
    kind: row.kind,
    status: row.status,
    hardwareId: row.hardwareId,
    pendingOfflineItems: row.pendingOfflineItems,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
  };
}

function mapQueueItem(
  row: Prisma.OfflineQueueItemGetPayload<Record<string, never>>,
): OfflineQueueItemRow {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    operationType: row.operationType,
    status: row.status,
    riskLevel: row.riskLevel,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    syncedAt: row.syncedAt?.toISOString() ?? null,
  };
}

function mapConflict(row: Prisma.SyncConflictGetPayload<Record<string, never>>): SyncConflictRow {
  return {
    id: row.id,
    queueItemId: row.queueItemId,
    entityType: row.entityType,
    entityId: row.entityId,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

async function assertBranch(
  transaction: DatabaseTransaction,
  businessId: string,
  branchId: string,
) {
  const branch = await transaction.branch.findUnique({
    where: { id_businessId: { id: branchId, businessId } },
  });
  if (!branch) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");
  return branch;
}

async function assertDevice(
  transaction: DatabaseTransaction,
  businessId: string,
  deviceId: string,
) {
  const device = await transaction.storeDevice.findUnique({
    where: { id_businessId: { id: deviceId, businessId } },
  });
  if (!device) throw new BusinessAccessError("NOT_FOUND", "Device was not found.");
  return device;
}
