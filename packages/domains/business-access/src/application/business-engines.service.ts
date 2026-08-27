import type {
  AttachBusinessDocumentInput,
  BomRow,
  BookingRow,
  BusinessEnginesOverview,
  BusinessDocumentRow,
  CatalogRecordCreated,
  CreateBomInput,
  CreateBookingInput,
  CreateCustomerAssetInput,
  CreateDeliveryRouteInput,
  CreateNotificationEventInput,
  CreateTraceableUnitInput,
  CreateWarrantyClaimInput,
  CreateWorkflowStatusInput,
  CreateWorkflowTransitionInput,
  CreateWorkTicketInput,
  DeliveryRouteRow,
  NotificationEventRow,
  PostMaterialConsumptionInput,
  TraceableUnitRow,
  UpdateDeliveryStopInput,
  UpdateWorkTicketStatusInput,
  WarrantyClaimRow,
  WorkTicketRow,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  Prisma,
  withBusinessContext,
} from "@bizentra/database";
import {
  allocateDocumentNumber,
  BusinessAccessError,
  loadMembershipContext,
  moneyToDb,
  recordChange,
  requirePermission,
  toNumber,
} from "@bizentra/domain-shared";

import { ensureAccessCatalogSync } from "./access-sync.js";

export class BusinessEnginesService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<BusinessEnginesOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      await requirePermission(transaction, businessId, actorUserId, "WORK_TICKET_VIEW");

      const [
        workflowStatuses,
        workTickets,
        bookings,
        traceableUnits,
        warrantyClaims,
        boms,
        deliveryRoutes,
        notifications,
        documents,
      ] = await Promise.all([
        transaction.workflowStatus.count({ where: { businessId } }),
        transaction.workTicket.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: workTicketInclude,
        }),
        transaction.booking.findMany({
          where: { businessId },
          orderBy: { startsAt: "desc" },
          take: 25,
          include: bookingInclude,
        }),
        transaction.traceableUnit.findMany({
          where: { businessId },
          orderBy: { updatedAt: "desc" },
          take: 25,
          include: traceableUnitInclude,
        }),
        transaction.warrantyClaim.findMany({
          where: { businessId },
          orderBy: { openedAt: "desc" },
          take: 25,
          include: warrantyClaimInclude,
        }),
        transaction.bom.findMany({
          where: { businessId },
          orderBy: { updatedAt: "desc" },
          take: 25,
          include: bomInclude,
        }),
        transaction.deliveryRoute.findMany({
          where: { businessId },
          orderBy: { plannedDate: "desc" },
          take: 25,
          include: deliveryRouteInclude,
        }),
        transaction.notificationEvent.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        transaction.businessDocument.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

      return {
        counts: {
          workflowStatuses,
          workTickets: workTickets.length,
          bookings: bookings.length,
          traceableUnits: traceableUnits.length,
          warrantyClaims: warrantyClaims.length,
          boms: boms.length,
          deliveryRoutes: deliveryRoutes.length,
          notifications: notifications.length,
          documents: documents.length,
        },
        workTickets: workTickets.map(mapWorkTicket),
        bookings: bookings.map(mapBooking),
        traceableUnits: traceableUnits.map(mapTraceableUnit),
        warrantyClaims: warrantyClaims.map(mapWarrantyClaim),
        boms: boms.map(mapBom),
        deliveryRoutes: deliveryRoutes.map(mapDeliveryRoute),
        notifications: notifications.map(mapNotification),
        documents: documents.map(mapDocument),
      };
    });
  }

  async createWorkflowStatus(
    businessId: string,
    actorUserId: string,
    input: CreateWorkflowStatusInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WORKFLOW_MANAGE", async (transaction, actor) => {
      const status = await transaction.workflowStatus.create({
        data: {
          businessId,
          appliesTo: input.appliesTo,
          code: input.code,
          name: input.name,
          sortOrder: input.sortOrder,
          isFinal: input.isFinal,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "WorkflowStatus", status.id, {
        code: input.code,
      });
      return { id: status.id };
    });
  }

  async createWorkflowTransition(
    businessId: string,
    actorUserId: string,
    input: CreateWorkflowTransitionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WORKFLOW_MANAGE", async (transaction, actor) => {
      const transition = await transaction.workflowTransition.create({
        data: {
          businessId,
          appliesTo: input.appliesTo,
          fromStatusCode: input.fromStatusCode,
          toStatusCode: input.toStatusCode,
          requiredPermission: input.requiredPermission ?? null,
          requiresApproval: input.requiresApproval,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "WorkflowTransition",
        transition.id,
        {
          appliesTo: input.appliesTo,
        },
      );
      return { id: transition.id };
    });
  }

  async createWorkTicket(
    businessId: string,
    actorUserId: string,
    input: CreateWorkTicketInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WORK_TICKET_MANAGE", async (transaction, actor) => {
      const branch = input.branchId
        ? await assertBranch(transaction, businessId, input.branchId)
        : null;
      if (input.assigneeMembershipId) {
        await assertMembership(transaction, businessId, input.assigneeMembershipId);
      }
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId ?? null,
        documentType: "WT",
        ...(branch ? { branchCode: branch.code } : {}),
      });
      const ticket = await transaction.workTicket.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          number,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          assigneeMembershipId: input.assigneeMembershipId ?? null,
          checklist: input.checklist ? (input.checklist as Prisma.InputJsonValue) : Prisma.JsonNull,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "WorkTicket", ticket.id, {
        number,
      });
      return { id: ticket.id };
    });
  }

  async updateWorkTicketStatus(
    businessId: string,
    actorUserId: string,
    ticketId: string,
    input: UpdateWorkTicketStatusInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WORK_TICKET_MANAGE", async (transaction, actor) => {
      const ticket = await transaction.workTicket.update({
        where: { id_businessId: { id: ticketId, businessId } },
        data: {
          status: input.status,
          completedAt: input.status === "COMPLETED" ? new Date() : null,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "WorkTicket", ticket.id, {
        status: input.status,
      });
      return { id: ticket.id };
    });
  }

  async createBooking(
    businessId: string,
    actorUserId: string,
    input: CreateBookingInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BOOKING_MANAGE", async (transaction, actor) => {
      const branch = await assertBranch(transaction, businessId, input.branchId);
      if (input.customerId) await assertCustomer(transaction, businessId, input.customerId);
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (endsAt <= startsAt)
        throw new BusinessAccessError(
          "INVALID_INPUT",
          "Booking end time must be after start time.",
        );
      const overlap = await transaction.booking.findFirst({
        where: {
          businessId,
          branchId: input.branchId,
          resourceCode: input.resourceCode,
          status: { in: ["REQUESTED", "CONFIRMED"] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (overlap)
        throw new BusinessAccessError(
          "CONFLICT",
          "The selected resource already has a booking in this time range.",
        );
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId,
        documentType: "BK",
        branchCode: branch.code,
      });
      const booking = await transaction.booking.create({
        data: {
          businessId,
          branchId: input.branchId,
          customerId: input.customerId ?? null,
          number,
          resourceCode: input.resourceCode,
          title: input.title,
          startsAt,
          endsAt,
          capacityUsed: input.capacityUsed,
          depositAmount: moneyToDb(input.depositAmount),
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "Booking", booking.id, {
        number,
      });
      return { id: booking.id };
    });
  }

  async createCustomerAsset(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerAssetInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WORK_TICKET_MANAGE", async (transaction, actor) => {
      await assertCustomer(transaction, businessId, input.customerId);
      const asset = await transaction.customerAsset.create({
        data: {
          businessId,
          customerId: input.customerId,
          code: input.code,
          name: input.name,
          assetType: input.assetType,
          identifier: input.identifier ?? null,
          attributes: input.attributes
            ? (input.attributes as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "CustomerAsset", asset.id, {
        code: input.code,
      });
      return { id: asset.id };
    });
  }

  async createTraceableUnit(
    businessId: string,
    actorUserId: string,
    input: CreateTraceableUnitInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(
      businessId,
      actorUserId,
      "TRACEABILITY_MANAGE",
      async (transaction, actor) => {
        await assertItem(transaction, businessId, input.itemId);
        if (input.locationId) await assertLocation(transaction, businessId, input.locationId);
        const unit = await transaction.traceableUnit.create({
          data: {
            businessId,
            itemId: input.itemId,
            variantId: input.variantId ?? null,
            locationId: input.locationId ?? null,
            serialNumber: input.serialNumber ?? null,
            batchNumber: input.batchNumber ?? null,
            lotNumber: input.lotNumber ?? null,
            imei: input.imei ?? null,
            manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
          },
        });
        await this.record(transaction, businessId, actor.membershipId, "TraceableUnit", unit.id, {
          serialNumber: input.serialNumber,
          batchNumber: input.batchNumber,
        });
        return { id: unit.id };
      },
    );
  }

  async createWarrantyClaim(
    businessId: string,
    actorUserId: string,
    input: CreateWarrantyClaimInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "WARRANTY_MANAGE", async (transaction, actor) => {
      if (input.customerId) await assertCustomer(transaction, businessId, input.customerId);
      const number = await allocateDocumentNumber(transaction, { businessId, documentType: "RMA" });
      const claim = await transaction.warrantyClaim.create({
        data: {
          businessId,
          customerId: input.customerId ?? null,
          number,
          itemDescription: input.itemDescription,
          serialReference: input.serialReference ?? null,
          issue: input.issue,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "WarrantyClaim", claim.id, {
        number,
      });
      return { id: claim.id };
    });
  }

  async createBom(
    businessId: string,
    actorUserId: string,
    input: CreateBomInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BOM_MANAGE", async (transaction, actor) => {
      await assertItem(transaction, businessId, input.outputItemId);
      for (const component of input.components)
        await assertItem(transaction, businessId, component.itemId);
      const bom = await transaction.bom.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          outputItemId: input.outputItemId,
          outputQuantity: moneyToDb(input.outputQuantity),
          notes: input.notes ?? null,
        },
      });
      await transaction.bomComponent.createMany({
        data: input.components.map((component) => ({
          businessId,
          bomId: bom.id,
          itemId: component.itemId,
          variantId: component.variantId ?? null,
          quantity: moneyToDb(component.quantity),
          wastagePercent: moneyToDb(component.wastagePercent),
        })),
      });
      await this.record(transaction, businessId, actor.membershipId, "Bom", bom.id, {
        code: input.code,
      });
      return { id: bom.id };
    });
  }

  async postMaterialConsumption(
    businessId: string,
    actorUserId: string,
    input: PostMaterialConsumptionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BOM_MANAGE", async (transaction, actor) => {
      await assertItem(transaction, businessId, input.itemId);
      const consumption = await transaction.materialConsumption.create({
        data: {
          businessId,
          itemId: input.itemId,
          variantId: input.variantId ?? null,
          quantity: moneyToDb(input.quantity),
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "MaterialConsumption",
        consumption.id,
        {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      );
      return { id: consumption.id };
    });
  }

  async createDeliveryRoute(
    businessId: string,
    actorUserId: string,
    input: CreateDeliveryRouteInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "ROUTE_MANAGE", async (transaction, actor) => {
      await assertBranch(transaction, businessId, input.branchId);
      const route = await transaction.deliveryRoute.create({
        data: {
          businessId,
          branchId: input.branchId,
          code: input.code,
          name: input.name,
          vehicleReference: input.vehicleReference ?? null,
          driverName: input.driverName ?? null,
          plannedDate: new Date(input.plannedDate),
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.deliveryStop.createMany({
        data: input.stops.map((stop) => ({
          businessId,
          routeId: route.id,
          branchId: input.branchId,
          sequence: stop.sequence,
          customerName: stop.customerName,
          address: stop.address ? (stop.address as Prisma.InputJsonValue) : Prisma.JsonNull,
          sourceType: stop.sourceType ?? null,
          sourceId: stop.sourceId ?? null,
        })),
      });
      await this.record(transaction, businessId, actor.membershipId, "DeliveryRoute", route.id, {
        code: input.code,
      });
      return { id: route.id };
    });
  }

  async updateDeliveryStop(
    businessId: string,
    actorUserId: string,
    stopId: string,
    input: UpdateDeliveryStopInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "ROUTE_MANAGE", async (transaction, actor) => {
      const stop = await transaction.deliveryStop.update({
        where: { id_businessId: { id: stopId, businessId } },
        data: {
          status: input.status,
          proofReference: input.proofReference ?? null,
          failedReason: input.failedReason ?? null,
          completedAt:
            input.status === "DELIVERED" || input.status === "FAILED" ? new Date() : null,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "DeliveryStop", stop.id, {
        status: input.status,
      });
      return { id: stop.id };
    });
  }

  async createNotificationEvent(
    businessId: string,
    actorUserId: string,
    input: CreateNotificationEventInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(
      businessId,
      actorUserId,
      "NOTIFICATION_MANAGE",
      async (transaction, actor) => {
        const notification = await transaction.notificationEvent.create({
          data: {
            businessId,
            channel: input.channel,
            recipient: input.recipient,
            subject: input.subject,
            body: input.body,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
            createdByMembershipId: actor.membershipId,
          },
        });
        await this.record(
          transaction,
          businessId,
          actor.membershipId,
          "NotificationEvent",
          notification.id,
          {
            channel: input.channel,
          },
        );
        return { id: notification.id };
      },
    );
  }

  async attachDocument(
    businessId: string,
    actorUserId: string,
    input: AttachBusinessDocumentInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "DOCUMENT_MANAGE", async (transaction, actor) => {
      const document = await transaction.businessDocument.create({
        data: {
          businessId,
          entityType: input.entityType,
          entityId: input.entityId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          url: input.url,
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "BusinessDocument",
        document.id,
        {
          entityType: input.entityType,
          entityId: input.entityId,
        },
      );
      return { id: document.id };
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
      eventType: `business_engine.${entityType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}.changed`,
      eventPayload: { entityId, ...after },
    });
  }
}

const workTicketInclude = {
  branch: { select: { name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
} satisfies Prisma.WorkTicketInclude;

const bookingInclude = {
  branch: { select: { name: true } },
  customer: { select: { name: true } },
} satisfies Prisma.BookingInclude;

const traceableUnitInclude = {
  item: { select: { name: true } },
  location: { select: { name: true } },
} satisfies Prisma.TraceableUnitInclude;

const warrantyClaimInclude = {
  customer: { select: { name: true } },
} satisfies Prisma.WarrantyClaimInclude;

const bomInclude = {
  outputItem: { select: { name: true } },
  components: { select: { id: true } },
} satisfies Prisma.BomInclude;

const deliveryRouteInclude = {
  branch: { select: { name: true } },
  stops: { select: { id: true } },
} satisfies Prisma.DeliveryRouteInclude;

function mapWorkTicket(
  row: Prisma.WorkTicketGetPayload<{ include: typeof workTicketInclude }>,
): WorkTicketRow {
  return {
    id: row.id,
    number: row.number,
    branchName: row.branch?.name ?? null,
    title: row.title,
    status: row.status,
    priority: row.priority,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    createdBy: row.createdBy.user.displayName,
    createdAt: row.createdAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
  };
}

function mapBooking(row: Prisma.BookingGetPayload<{ include: typeof bookingInclude }>): BookingRow {
  return {
    id: row.id,
    number: row.number,
    branchName: row.branch.name,
    customerName: row.customer?.name ?? null,
    resourceCode: row.resourceCode,
    title: row.title,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    depositAmount: toNumber(row.depositAmount),
  };
}

function mapTraceableUnit(
  row: Prisma.TraceableUnitGetPayload<{ include: typeof traceableUnitInclude }>,
): TraceableUnitRow {
  return {
    id: row.id,
    itemName: row.item.name,
    locationName: row.location?.name ?? null,
    serialNumber: row.serialNumber,
    batchNumber: row.batchNumber,
    imei: row.imei,
    expiryDate: row.expiryDate?.toISOString().slice(0, 10) ?? null,
    status: row.status,
  };
}

function mapWarrantyClaim(
  row: Prisma.WarrantyClaimGetPayload<{ include: typeof warrantyClaimInclude }>,
): WarrantyClaimRow {
  return {
    id: row.id,
    number: row.number,
    customerName: row.customer?.name ?? null,
    status: row.status,
    itemDescription: row.itemDescription,
    serialReference: row.serialReference,
    issue: row.issue,
    openedAt: row.openedAt.toISOString(),
  };
}

function mapBom(row: Prisma.BomGetPayload<{ include: typeof bomInclude }>): BomRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    outputItemName: row.outputItem.name,
    outputQuantity: toNumber(row.outputQuantity),
    status: row.status,
    componentCount: row.components.length,
  };
}

function mapDeliveryRoute(
  row: Prisma.DeliveryRouteGetPayload<{ include: typeof deliveryRouteInclude }>,
): DeliveryRouteRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    branchName: row.branch.name,
    plannedDate: row.plannedDate.toISOString().slice(0, 10),
    vehicleReference: row.vehicleReference,
    driverName: row.driverName,
    stopCount: row.stops.length,
  };
}

function mapNotification(
  row: Prisma.NotificationEventGetPayload<Record<string, never>>,
): NotificationEventRow {
  return {
    id: row.id,
    channel: row.channel,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDocument(
  row: Prisma.BusinessDocumentGetPayload<Record<string, never>>,
): BusinessDocumentRow {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
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

async function assertLocation(
  transaction: DatabaseTransaction,
  businessId: string,
  locationId: string,
) {
  const location = await transaction.location.findUnique({
    where: { id_businessId: { id: locationId, businessId } },
  });
  if (!location) throw new BusinessAccessError("NOT_FOUND", "Location was not found.");
  return location;
}

async function assertCustomer(
  transaction: DatabaseTransaction,
  businessId: string,
  customerId: string,
) {
  const customer = await transaction.customer.findUnique({
    where: { id_businessId: { id: customerId, businessId } },
  });
  if (!customer) throw new BusinessAccessError("NOT_FOUND", "Customer was not found.");
  return customer;
}

async function assertItem(transaction: DatabaseTransaction, businessId: string, itemId: string) {
  const item = await transaction.item.findUnique({
    where: { id_businessId: { id: itemId, businessId } },
  });
  if (!item) throw new BusinessAccessError("NOT_FOUND", "Item was not found.");
  return item;
}

async function assertMembership(
  transaction: DatabaseTransaction,
  businessId: string,
  membershipId: string,
) {
  const membership = await transaction.businessMembership.findUnique({
    where: { id_businessId: { id: membershipId, businessId } },
  });
  if (!membership) throw new BusinessAccessError("NOT_FOUND", "Assignee was not found.");
  return membership;
}
