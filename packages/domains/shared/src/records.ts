import type { AuditAction, ListQuery, TimelineEntry } from "@bizentra/contracts";
import type { DatabaseTransaction, Prisma } from "@bizentra/database";

import { BusinessAccessError } from "./errors.js";

export interface AuditInput {
  businessId: string;
  actorMembershipId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

/** CC-P0-009: one place that writes the append-only audit record for a change. */
export async function recordAudit(
  transaction: DatabaseTransaction,
  input: AuditInput,
): Promise<void> {
  await transaction.auditEvent.create({
    data: {
      businessId: input.businessId,
      branchId: input.branchId ?? null,
      actorMembershipId: input.actorMembershipId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.before === undefined ? {} : { before: input.before as Prisma.InputJsonValue }),
      ...(input.after === undefined ? {} : { after: input.after as Prisma.InputJsonValue }),
      ...(input.metadata === undefined
        ? {}
        : { metadata: input.metadata as Prisma.InputJsonValue }),
    },
  });
}

/** Publishes one shared Business Event through the outbox so retries stay idempotent. */
export async function publishEvent(
  transaction: DatabaseTransaction,
  input: {
    businessId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await transaction.outboxEvent.create({
    data: {
      businessId: input.businessId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonObject,
    },
  });
}

/** Writes the audit record and the matching Business Event in one call. */
export async function recordChange(
  transaction: DatabaseTransaction,
  input: AuditInput & { eventType?: string; eventPayload?: Record<string, unknown> },
): Promise<void> {
  await recordAudit(transaction, input);
  if (input.eventType) {
    await publishEvent(transaction, {
      businessId: input.businessId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      payload: input.eventPayload ?? { entityId: input.entityId },
    });
  }
}

export function pagination(query: Pick<ListQuery, "page" | "pageSize">): {
  skip: number;
  take: number;
} {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function asJsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function readTimeline(
  transaction: DatabaseTransaction,
  businessId: string,
  entityType: string,
  entityId: string,
  take = 20,
): Promise<TimelineEntry[]> {
  const events = await transaction.auditEvent.findMany({
    where: { businessId, entityType, entityId },
    orderBy: { occurredAt: "desc" },
    take,
    include: { actorMembership: { include: { user: { select: { displayName: true } } } } },
  });

  return events.map((event) => ({
    id: event.id,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    actor: event.actorMembership?.user.displayName ?? "System",
    occurredAt: event.occurredAt.toISOString(),
    summary: describeAudit(event.action, event.entityType),
  }));
}

export function describeAudit(action: AuditAction, entityType: string): string {
  const readable = entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const verbs: Record<AuditAction, string> = {
    CREATE: "created",
    UPDATE: "updated",
    ACTIVATE: "activated",
    DEACTIVATE: "deactivated",
    APPROVE: "approved",
    REJECT: "rejected",
    CANCEL: "cancelled",
    DELETE: "deleted",
    ASSIGN: "assigned",
    ENABLE: "enabled",
    DISABLE: "disabled",
    GENERATE: "generated",
  };
  return `${readable.charAt(0).toUpperCase()}${readable.slice(1)} ${verbs[action]}`;
}

/**
 * CC-P0-010: allocates the next readable document number for a Business/Branch/type.
 *
 * The update is a single atomic increment so two terminals can never receive the same number.
 */
export async function allocateDocumentNumber(
  transaction: DatabaseTransaction,
  input: {
    businessId: string;
    documentType: string;
    branchId?: string | null;
    branchCode?: string;
  },
): Promise<string> {
  const documentType = input.documentType.toUpperCase();
  const scopeKey = input.branchId ? `BRANCH:${input.branchId}` : "BUSINESS";
  const prefix = input.branchCode ? `${input.branchCode}-${documentType}` : documentType;

  const sequence = await transaction.documentSequence.upsert({
    where: {
      businessId_scopeKey_documentType: { businessId: input.businessId, scopeKey, documentType },
    },
    update: { nextValue: { increment: 1 } },
    create: {
      businessId: input.businessId,
      branchId: input.branchId ?? null,
      scopeKey,
      documentType,
      prefix,
      nextValue: 2,
      padding: 6,
    },
  });

  const allocated = sequence.nextValue - 1n;
  return `${sequence.prefix}-${allocated.toString().padStart(sequence.padding, "0")}`;
}

export async function findBusinessRecord<T>(
  finder: () => Promise<T | null>,
  label: string,
): Promise<T> {
  const record = await finder();
  if (!record) throw new BusinessAccessError("NOT_FOUND", `${label} was not found.`);
  return record;
}
