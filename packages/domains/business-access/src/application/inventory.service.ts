import type {
  CatalogRecordCreated,
  CreateFulfillmentOrderInput,
  CreatePurchaseOrderInput,
  CreatePurchaseRequestInput,
  DecidePurchaseRequestInput,
  FulfillmentOrderRow,
  GoodsReceiptRow,
  InventoryOverview,
  PurchaseOrderRow,
  PurchaseRequestRow,
  ReceivePurchaseOrderInput,
  ReorderSettingInput,
  ReorderSuggestionRow,
  StockAdjustmentInput,
  StockAvailabilityRow,
  StockMovementRow,
  StockTransferInput,
  UpdateFulfillmentStatusInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  withBusinessContext,
} from "@bizentra/database";
import {
  allocateDocumentNumber,
  BusinessAccessError,
  type MembershipContext,
  moneyToDb,
  quantityToDb,
  recordChange,
  requirePermission,
  toNumber,
  toOptionalNumber,
} from "@bizentra/domain-shared";
import { createId } from "@bizentra/ids";

export class InventoryService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<InventoryOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "INVENTORY_VIEW");
      const [
        balances,
        movements,
        reorderSettings,
        purchaseRequests,
        purchaseOrders,
        receipts,
        fulfillmentOrders,
        movementCount,
      ] = await Promise.all([
        transaction.stockBalance.findMany({
          where: { businessId },
          orderBy: [{ location: { code: "asc" } }, { item: { code: "asc" } }],
          take: 50,
          include: { location: true, item: true, variant: true },
        }),
        transaction.stockMovement.findMany({
          where: { businessId },
          orderBy: { occurredAt: "desc" },
          take: 25,
          include: {
            branch: true,
            location: true,
            item: true,
            variant: true,
            createdBy: { include: { user: { select: { displayName: true } } } },
          },
        }),
        transaction.reorderSetting.findMany({
          where: { businessId },
          include: { location: true, item: true },
          orderBy: { createdAt: "desc" },
        }),
        transaction.purchaseRequest.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            branch: true,
            createdBy: { include: { user: { select: { displayName: true } } } },
            lines: true,
          },
        }),
        transaction.purchaseOrder.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            branch: true,
            supplier: true,
            createdBy: { include: { user: { select: { displayName: true } } } },
            lines: { include: { item: true } },
          },
        }),
        transaction.goodsReceipt.findMany({
          where: { businessId },
          orderBy: { receivedAt: "desc" },
          take: 20,
          include: {
            branch: true,
            location: true,
            order: true,
            createdBy: { include: { user: { select: { displayName: true } } } },
            lines: true,
          },
        }),
        transaction.fulfillmentOrder.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            branch: true,
            createdBy: { include: { user: { select: { displayName: true } } } },
            lines: true,
          },
        }),
        transaction.stockMovement.count({ where: { businessId } }),
      ]);

      const availability = balances.map(mapAvailability);
      const reorderSuggestions = buildReorderSuggestions(reorderSettings, availability);

      return {
        counts: {
          balances: balances.length,
          movements: movementCount,
          reorderSuggestions: reorderSuggestions.length,
          purchaseRequests: purchaseRequests.length,
          purchaseOrders: purchaseOrders.length,
          receipts: receipts.length,
          fulfillmentOrders: fulfillmentOrders.length,
        },
        availability,
        movements: movements.map(mapMovement),
        reorderSuggestions,
        purchaseRequests: purchaseRequests.map(mapPurchaseRequest),
        purchaseOrders: purchaseOrders.map(mapPurchaseOrder),
        receipts: receipts.map(mapGoodsReceipt),
        fulfillmentOrders: fulfillmentOrders.map(mapFulfillment),
      };
    });
  }

  async adjustStock(
    businessId: string,
    actorUserId: string,
    input: StockAdjustmentInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "INVENTORY_ADJUST", async (transaction, actor) => {
      await this.assertStockReferences(transaction, businessId, input.locationId, input.itemId);
      const movement = await this.createMovement(transaction, businessId, actor, {
        branchId: input.branchId,
        locationId: input.locationId,
        itemId: input.itemId,
        variantId: input.variantId ?? null,
        kind: input.quantityChange > 0 ? "OPENING" : "ADJUSTMENT",
        quantity: input.quantityChange,
        unitCost: input.unitCost ?? null,
        reason: input.reason,
        referenceType: input.approvalRequestId ? "ApprovalRequest" : "StockAdjustment",
        referenceId: input.approvalRequestId ?? null,
      });
      await this.applyBalanceChange(transaction, businessId, input.locationId, input.itemId, {
        variantId: input.variantId ?? null,
        onHandDelta: input.quantityChange,
      });
      return { id: movement.id };
    });
  }

  async transferStock(
    businessId: string,
    actorUserId: string,
    input: StockTransferInput,
  ): Promise<{ outMovementId: string; inMovementId: string }> {
    return this.write(businessId, actorUserId, "INVENTORY_MOVE", async (transaction, actor) => {
      if (input.fromLocationId === input.toLocationId) {
        throw new BusinessAccessError("INVALID_INPUT", "Transfer needs two different Locations.");
      }
      await this.assertStockReferences(transaction, businessId, input.fromLocationId, input.itemId);
      await this.assertStockReferences(transaction, businessId, input.toLocationId, input.itemId);
      const available = await this.getAvailableQuantity(
        transaction,
        businessId,
        input.fromLocationId,
        input.itemId,
        input.variantId ?? null,
      );
      if (available < input.quantity) {
        throw new BusinessAccessError(
          "CONFLICT",
          `Only ${available} is available at the source Location.`,
        );
      }
      const transferId = createId();
      const outMovement = await this.createMovement(transaction, businessId, actor, {
        branchId: input.branchId,
        locationId: input.fromLocationId,
        itemId: input.itemId,
        variantId: input.variantId ?? null,
        kind: "TRANSFER_OUT",
        quantity: -input.quantity,
        unitCost: null,
        reason: input.reason,
        referenceType: "StockTransfer",
        referenceId: transferId,
      });
      const inMovement = await this.createMovement(transaction, businessId, actor, {
        branchId: input.branchId,
        locationId: input.toLocationId,
        itemId: input.itemId,
        variantId: input.variantId ?? null,
        kind: "TRANSFER_IN",
        quantity: input.quantity,
        unitCost: null,
        reason: input.reason,
        referenceType: "StockTransfer",
        referenceId: transferId,
        relatedMovementId: outMovement.id,
      });
      await this.applyBalanceChange(transaction, businessId, input.fromLocationId, input.itemId, {
        variantId: input.variantId ?? null,
        onHandDelta: -input.quantity,
      });
      await this.applyBalanceChange(transaction, businessId, input.toLocationId, input.itemId, {
        variantId: input.variantId ?? null,
        onHandDelta: input.quantity,
      });
      return { outMovementId: outMovement.id, inMovementId: inMovement.id };
    });
  }

  async upsertReorderSetting(
    businessId: string,
    actorUserId: string,
    input: ReorderSettingInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "REORDER_MANAGE", async (transaction, actor) => {
      await this.assertStockReferences(transaction, businessId, input.locationId, input.itemId);
      const existing = await transaction.reorderSetting.findFirst({
        where: {
          businessId,
          locationId: input.locationId,
          itemId: input.itemId,
          variantId: input.variantId ?? null,
        },
      });
      const data = {
        minimumQuantity: quantityToDb(input.minimumQuantity),
        targetQuantity: quantityToDb(input.targetQuantity),
      };
      const setting = existing
        ? await transaction.reorderSetting.update({ where: { id: existing.id }, data })
        : await transaction.reorderSetting.create({
            data: {
              businessId,
              locationId: input.locationId,
              itemId: input.itemId,
              variantId: input.variantId ?? null,
              ...data,
            },
          });
      await this.audit(transaction, businessId, actor, "UPDATE", "ReorderSetting", setting.id, {
        ...input,
      });
      return { id: setting.id };
    });
  }

  async createPurchaseRequest(
    businessId: string,
    actorUserId: string,
    input: CreatePurchaseRequestInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PURCHASE_MANAGE", async (transaction, actor) => {
      const branch = await this.mustFind(transaction.branch, businessId, input.branchId, "Branch");
      await this.assertLines(
        transaction,
        businessId,
        input.lines.map((line) => line.itemId),
      );
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId,
        branchCode: branch.code,
        documentType: "PR",
      });
      const request = await transaction.purchaseRequest.create({
        data: {
          businessId,
          branchId: input.branchId,
          number,
          reason: input.reason,
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.purchaseRequestLine.createMany({
        data: input.lines.map((line) => ({
          businessId,
          purchaseRequestId: request.id,
          itemId: line.itemId,
          variantId: line.variantId ?? null,
          quantity: quantityToDb(line.quantity),
          expectedCost: line.unitCost === undefined ? null : moneyToDb(line.unitCost),
          note: line.note ?? null,
        })),
      });
      await this.audit(transaction, businessId, actor, "CREATE", "PurchaseRequest", request.id, {
        number,
        ...input,
      });
      return { id: request.id };
    });
  }

  async decidePurchaseRequest(
    businessId: string,
    actorUserId: string,
    requestId: string,
    input: DecidePurchaseRequestInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PURCHASE_APPROVE", async (transaction, actor) => {
      const request = await this.mustFind(
        transaction.purchaseRequest,
        businessId,
        requestId,
        "Purchase request",
      );
      if (!["SUBMITTED", "DRAFT"].includes(request.status)) {
        throw new BusinessAccessError(
          "CONFLICT",
          "Only submitted purchase requests can be decided.",
        );
      }
      await transaction.purchaseRequest.update({
        where: { id: requestId },
        data: {
          status: input.decision,
          approvedAt: input.decision === "APPROVED" ? new Date() : null,
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        input.decision === "APPROVED" ? "APPROVE" : "REJECT",
        "PurchaseRequest",
        requestId,
        input,
        { status: request.status },
      );
      return { id: requestId };
    });
  }

  async createPurchaseOrder(
    businessId: string,
    actorUserId: string,
    input: CreatePurchaseOrderInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PURCHASE_MANAGE", async (transaction, actor) => {
      const branch = await this.mustFind(transaction.branch, businessId, input.branchId, "Branch");
      await this.mustFind(transaction.supplier, businessId, input.supplierId, "Supplier");
      if (input.purchaseRequestId) {
        const request = await this.mustFind(
          transaction.purchaseRequest,
          businessId,
          input.purchaseRequestId,
          "Purchase request",
        );
        if (request.status !== "APPROVED") {
          throw new BusinessAccessError(
            "CONFLICT",
            "Only an approved purchase request can become a purchase order.",
          );
        }
      }
      await this.assertLines(
        transaction,
        businessId,
        input.lines.map((line) => line.itemId),
      );
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId,
        branchCode: branch.code,
        documentType: "PO",
      });
      const order = await transaction.purchaseOrder.create({
        data: {
          businessId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseRequestId: input.purchaseRequestId ?? null,
          number,
          status: "APPROVED",
          expectedDate: input.expectedDate ? new Date(`${input.expectedDate}T00:00:00.000Z`) : null,
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
          approvedAt: new Date(),
        },
      });
      await transaction.purchaseOrderLine.createMany({
        data: input.lines.map((line) => ({
          businessId,
          purchaseOrderId: order.id,
          itemId: line.itemId,
          variantId: line.variantId ?? null,
          orderedQuantity: quantityToDb(line.quantity),
          unitCost: moneyToDb(line.unitCost),
        })),
      });
      if (input.purchaseRequestId) {
        await transaction.purchaseRequest.update({
          where: { id: input.purchaseRequestId },
          data: { status: "CONVERTED" },
        });
      }
      await this.audit(transaction, businessId, actor, "CREATE", "PurchaseOrder", order.id, {
        number,
        ...input,
      });
      return { id: order.id };
    });
  }

  async receivePurchaseOrder(
    businessId: string,
    actorUserId: string,
    purchaseOrderId: string,
    input: ReceivePurchaseOrderInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PURCHASE_RECEIVE", async (transaction, actor) => {
      const order = await transaction.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, businessId },
        include: { branch: true, lines: true },
      });
      if (!order) throw new BusinessAccessError("NOT_FOUND", "Purchase order was not found.");
      if (order.status === "CANCELLED" || order.status === "RECEIVED") {
        throw new BusinessAccessError("CONFLICT", "This purchase order cannot be received.");
      }
      await this.mustFind(transaction.location, businessId, input.locationId, "Location");

      const lineMap = new Map(order.lines.map((line) => [line.id, line]));
      for (const line of input.lines) {
        const orderLine = lineMap.get(line.purchaseOrderLineId);
        if (!orderLine)
          throw new BusinessAccessError("NOT_FOUND", "Purchase order line was not found.");
        const nextReceived = toNumber(orderLine.receivedQuantity) + line.quantity;
        if (nextReceived > toNumber(orderLine.orderedQuantity)) {
          throw new BusinessAccessError(
            "CONFLICT",
            "Received quantity cannot be greater than ordered quantity.",
          );
        }
      }

      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: order.branchId,
        branchCode: order.branch.code,
        documentType: "GRN",
      });
      const receipt = await transaction.goodsReceipt.create({
        data: {
          businessId,
          branchId: order.branchId,
          locationId: input.locationId,
          purchaseOrderId,
          number,
          supplierDocument: input.supplierDocument ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.goodsReceiptLine.createMany({
        data: input.lines.map((line) => {
          const orderLine = lineMap.get(line.purchaseOrderLineId);
          if (!orderLine) throw new Error("Validated line missing.");
          return {
            businessId,
            goodsReceiptId: receipt.id,
            purchaseOrderLineId: line.purchaseOrderLineId,
            itemId: orderLine.itemId,
            variantId: orderLine.variantId,
            receivedQuantity: quantityToDb(line.quantity),
            unitCost: moneyToDb(line.unitCost ?? toNumber(orderLine.unitCost)),
          };
        }),
      });

      for (const line of input.lines) {
        const orderLine = lineMap.get(line.purchaseOrderLineId);
        if (!orderLine) throw new Error("Validated line missing.");
        await transaction.purchaseOrderLine.update({
          where: { id: orderLine.id },
          data: { receivedQuantity: { increment: quantityToDb(line.quantity) } },
        });
        await this.createMovement(transaction, businessId, actor, {
          branchId: order.branchId,
          locationId: input.locationId,
          itemId: orderLine.itemId,
          variantId: orderLine.variantId,
          kind: "RECEIPT",
          quantity: line.quantity,
          unitCost: line.unitCost ?? toNumber(orderLine.unitCost),
          reason: `Goods receipt ${number}`,
          referenceType: "GoodsReceipt",
          referenceId: receipt.id,
        });
        await this.applyBalanceChange(transaction, businessId, input.locationId, orderLine.itemId, {
          variantId: orderLine.variantId,
          onHandDelta: line.quantity,
        });
      }

      const refreshedLines = await transaction.purchaseOrderLine.findMany({
        where: { businessId, purchaseOrderId },
      });
      const fullyReceived = refreshedLines.every(
        (line) => toNumber(line.receivedQuantity) >= toNumber(line.orderedQuantity),
      );
      await transaction.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "GoodsReceipt", receipt.id, {
        number,
        purchaseOrderId,
        ...input,
      });
      return { id: receipt.id };
    });
  }

  async createFulfillmentOrder(
    businessId: string,
    actorUserId: string,
    input: CreateFulfillmentOrderInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "FULFILLMENT_MANAGE", async (transaction, actor) => {
      const branch = await this.mustFind(transaction.branch, businessId, input.branchId, "Branch");
      await this.assertLines(
        transaction,
        businessId,
        input.lines.map((line) => line.itemId),
      );
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId,
        branchCode: branch.code,
        documentType: "FUL",
      });
      const fulfillment = await transaction.fulfillmentOrder.create({
        data: {
          businessId,
          branchId: input.branchId,
          number,
          customerName: input.customerName ?? null,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.fulfillmentLine.createMany({
        data: input.lines.map((line) => ({
          businessId,
          fulfillmentOrderId: fulfillment.id,
          itemId: line.itemId,
          variantId: line.variantId ?? null,
          quantity: quantityToDb(line.quantity),
        })),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        "CREATE",
        "FulfillmentOrder",
        fulfillment.id,
        { number, ...input },
      );
      return { id: fulfillment.id };
    });
  }

  async updateFulfillmentStatus(
    businessId: string,
    actorUserId: string,
    fulfillmentOrderId: string,
    input: UpdateFulfillmentStatusInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "FULFILLMENT_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(
        transaction.fulfillmentOrder,
        businessId,
        fulfillmentOrderId,
        "Fulfillment order",
      );
      const updated = await transaction.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data: {
          status: input.status,
          dispatchedAt: input.status === "DISPATCHED" ? new Date() : null,
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        input.status === "CANCELLED" ? "CANCEL" : "UPDATE",
        "FulfillmentOrder",
        fulfillmentOrderId,
        { status: updated.status },
        { status: before.status },
      );
      return { id: fulfillmentOrderId };
    });
  }

  private async write<T>(
    businessId: string,
    actorUserId: string,
    permissionCode: string,
    work: (transaction: DatabaseTransaction, actor: MembershipContext) => Promise<T>,
  ): Promise<T> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, permissionCode);
      return work(transaction, actor);
    });
  }

  private async createMovement(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    input: {
      branchId: string;
      locationId: string;
      itemId: string;
      variantId: string | null;
      kind: "OPENING" | "ADJUSTMENT" | "TRANSFER_OUT" | "TRANSFER_IN" | "RECEIPT";
      quantity: number;
      unitCost: number | null;
      reason: string;
      referenceType: string | null;
      referenceId: string | null;
      relatedMovementId?: string;
    },
  ) {
    const movement = await transaction.stockMovement.create({
      data: {
        businessId,
        branchId: input.branchId,
        locationId: input.locationId,
        itemId: input.itemId,
        variantId: input.variantId,
        kind: input.kind,
        quantity: quantityToDb(input.quantity),
        unitCost: input.unitCost === null ? null : moneyToDb(input.unitCost),
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        relatedMovementId: input.relatedMovementId ?? null,
        createdByMembershipId: actor.membershipId,
      },
    });
    await this.audit(transaction, businessId, actor, "CREATE", "StockMovement", movement.id, {
      kind: input.kind,
      quantity: input.quantity,
      locationId: input.locationId,
      itemId: input.itemId,
    });
    return movement;
  }

  private async applyBalanceChange(
    transaction: DatabaseTransaction,
    businessId: string,
    locationId: string,
    itemId: string,
    input: { variantId: string | null; onHandDelta: number },
  ): Promise<void> {
    const existing = await transaction.stockBalance.findFirst({
      where: { businessId, locationId, itemId, variantId: input.variantId },
    });
    if (existing) {
      const onHand = toNumber(existing.onHandQuantity) + input.onHandDelta;
      const available = onHand - toNumber(existing.reservedQuantity);
      await transaction.stockBalance.update({
        where: { id: existing.id },
        data: {
          onHandQuantity: quantityToDb(onHand),
          availableQuantity: quantityToDb(available),
        },
      });
      return;
    }
    await transaction.stockBalance.create({
      data: {
        businessId,
        locationId,
        itemId,
        variantId: input.variantId,
        onHandQuantity: quantityToDb(input.onHandDelta),
        availableQuantity: quantityToDb(input.onHandDelta),
      },
    });
  }

  private async getAvailableQuantity(
    transaction: DatabaseTransaction,
    businessId: string,
    locationId: string,
    itemId: string,
    variantId: string | null,
  ): Promise<number> {
    const balance = await transaction.stockBalance.findFirst({
      where: { businessId, locationId, itemId, variantId },
    });
    return toNumber(balance?.availableQuantity ?? 0);
  }

  private async assertStockReferences(
    transaction: DatabaseTransaction,
    businessId: string,
    locationId: string,
    itemId: string,
  ): Promise<void> {
    await this.mustFind(transaction.location, businessId, locationId, "Location");
    const item = await this.mustFind(transaction.item, businessId, itemId, "Item");
    if (!item.stockTracked) {
      throw new BusinessAccessError("CONFLICT", "Only stock-tracked Items can move stock.");
    }
  }

  private async assertLines(
    transaction: DatabaseTransaction,
    businessId: string,
    itemIds: string[],
  ): Promise<void> {
    const found = await transaction.item.findMany({
      where: { businessId, id: { in: itemIds } },
      select: { id: true },
    });
    if (found.length !== new Set(itemIds).size) {
      throw new BusinessAccessError("NOT_FOUND", "One or more Items were not found.");
    }
  }

  private async audit(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    action: "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "CANCEL",
    entityType: string,
    entityId: string,
    after: unknown,
    before?: unknown,
  ): Promise<void> {
    await recordChange(transaction, {
      businessId,
      actorMembershipId: actor.membershipId,
      action,
      entityType,
      entityId,
      after,
      ...(before === undefined ? {} : { before }),
      eventType: `${entityType}${action === "CREATE" ? "Created" : "Changed"}`,
      eventPayload: { businessId, entityId },
    });
  }

  private async mustFind<T extends { id: string }>(
    delegate: {
      findFirst: (args: { where: { businessId: string; id: string } }) => Promise<T | null>;
    },
    businessId: string,
    id: string,
    label: string,
  ): Promise<T> {
    const record = await delegate.findFirst({ where: { businessId, id } });
    if (!record) throw new BusinessAccessError("NOT_FOUND", `${label} was not found.`);
    return record;
  }
}

function mapAvailability(balance: {
  id: string;
  locationId: string;
  itemId: string;
  variantId: string | null;
  onHandQuantity: unknown;
  reservedQuantity: unknown;
  incomingQuantity: unknown;
  availableQuantity: unknown;
  updatedAt: Date;
  location: { code: string; name: string };
  item: { code: string; name: string };
  variant: { name: string } | null;
}): StockAvailabilityRow {
  return {
    id: balance.id,
    locationId: balance.locationId,
    locationCode: balance.location.code,
    locationName: balance.location.name,
    itemId: balance.itemId,
    itemCode: balance.item.code,
    itemName: balance.item.name,
    variantId: balance.variantId,
    variantName: balance.variant?.name ?? null,
    onHandQuantity: toNumber(balance.onHandQuantity),
    reservedQuantity: toNumber(balance.reservedQuantity),
    incomingQuantity: toNumber(balance.incomingQuantity),
    availableQuantity: toNumber(balance.availableQuantity),
    updatedAt: balance.updatedAt.toISOString(),
  };
}

function mapMovement(movement: {
  id: string;
  kind: StockMovementRow["kind"];
  status: StockMovementRow["status"];
  quantity: unknown;
  unitCost: unknown;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  occurredAt: Date;
  branch: { name: string };
  location: { name: string };
  item: { code: string; name: string };
  variant: { name: string } | null;
  createdBy: { user: { displayName: string } };
}): StockMovementRow {
  return {
    id: movement.id,
    branchName: movement.branch.name,
    locationName: movement.location.name,
    itemCode: movement.item.code,
    itemName: movement.item.name,
    variantName: movement.variant?.name ?? null,
    kind: movement.kind,
    status: movement.status,
    quantity: toNumber(movement.quantity),
    unitCost: toOptionalNumber(movement.unitCost),
    reason: movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    actor: movement.createdBy.user.displayName,
    occurredAt: movement.occurredAt.toISOString(),
  };
}

function buildReorderSuggestions(
  settings: Array<{
    id: string;
    locationId: string;
    itemId: string;
    minimumQuantity: unknown;
    targetQuantity: unknown;
    location: { name: string };
    item: { code: string; name: string };
  }>,
  availability: StockAvailabilityRow[],
): ReorderSuggestionRow[] {
  return settings
    .map((setting) => {
      const balance = availability.find(
        (row) => row.locationId === setting.locationId && row.itemId === setting.itemId,
      );
      const availableQuantity = balance?.availableQuantity ?? 0;
      const incomingQuantity = balance?.incomingQuantity ?? 0;
      const minimumQuantity = toNumber(setting.minimumQuantity);
      const targetQuantity = toNumber(setting.targetQuantity);
      const suggestedQuantity = Math.max(targetQuantity - availableQuantity - incomingQuantity, 0);
      return {
        id: setting.id,
        locationId: setting.locationId,
        locationName: setting.location.name,
        itemId: setting.itemId,
        itemCode: setting.item.code,
        itemName: setting.item.name,
        availableQuantity,
        incomingQuantity,
        minimumQuantity,
        targetQuantity,
        suggestedQuantity,
      };
    })
    .filter(
      (suggestion) =>
        suggestion.availableQuantity + suggestion.incomingQuantity <= suggestion.minimumQuantity &&
        suggestion.suggestedQuantity > 0,
    );
}

function mapPurchaseRequest(request: {
  id: string;
  number: string;
  status: PurchaseRequestRow["status"];
  reason: string;
  createdAt: Date;
  approvedAt: Date | null;
  branch: { name: string };
  createdBy: { user: { displayName: string } };
  lines: Array<{ quantity: unknown }>;
}): PurchaseRequestRow {
  return {
    id: request.id,
    number: request.number,
    branchName: request.branch.name,
    status: request.status,
    reason: request.reason,
    lineCount: request.lines.length,
    totalQuantity: request.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
    createdBy: request.createdBy.user.displayName,
    createdAt: request.createdAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString() ?? null,
  };
}

function mapPurchaseOrder(order: {
  id: string;
  number: string;
  status: PurchaseOrderRow["status"];
  expectedDate: Date | null;
  createdAt: Date;
  branch: { name: string };
  supplier: { name: string };
  createdBy: { user: { displayName: string } };
  lines: Array<{
    id: string;
    itemId: string;
    orderedQuantity: unknown;
    receivedQuantity: unknown;
    unitCost: unknown;
    item: { code: string; name: string };
  }>;
}): PurchaseOrderRow {
  const orderedQuantity = order.lines.reduce(
    (sum, line) => sum + toNumber(line.orderedQuantity),
    0,
  );
  const receivedQuantity = order.lines.reduce(
    (sum, line) => sum + toNumber(line.receivedQuantity),
    0,
  );
  return {
    id: order.id,
    number: order.number,
    branchName: order.branch.name,
    supplierName: order.supplier.name,
    status: order.status,
    expectedDate: order.expectedDate?.toISOString().slice(0, 10) ?? null,
    lineCount: order.lines.length,
    orderedQuantity,
    receivedQuantity,
    varianceQuantity: orderedQuantity - receivedQuantity,
    lines: order.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      orderedQuantity: toNumber(line.orderedQuantity),
      receivedQuantity: toNumber(line.receivedQuantity),
      unitCost: toNumber(line.unitCost),
    })),
    createdBy: order.createdBy.user.displayName,
    createdAt: order.createdAt.toISOString(),
  };
}

function mapGoodsReceipt(receipt: {
  id: string;
  number: string;
  purchaseOrderId: string;
  supplierDocument: string | null;
  receivedAt: Date;
  branch: { name: string };
  location: { name: string };
  order: { number: string };
  createdBy: { user: { displayName: string } };
  lines: Array<{ receivedQuantity: unknown }>;
}): GoodsReceiptRow {
  return {
    id: receipt.id,
    number: receipt.number,
    purchaseOrderId: receipt.purchaseOrderId,
    purchaseOrderNumber: receipt.order.number,
    branchName: receipt.branch.name,
    locationName: receipt.location.name,
    supplierDocument: receipt.supplierDocument,
    lineCount: receipt.lines.length,
    receivedQuantity: receipt.lines.reduce((sum, line) => sum + toNumber(line.receivedQuantity), 0),
    createdBy: receipt.createdBy.user.displayName,
    receivedAt: receipt.receivedAt.toISOString(),
  };
}

function mapFulfillment(order: {
  id: string;
  number: string;
  status: FulfillmentOrderRow["status"];
  customerName: string | null;
  sourceType: string;
  sourceId: string;
  createdAt: Date;
  dispatchedAt: Date | null;
  branch: { name: string };
  createdBy: { user: { displayName: string } };
  lines: Array<{ quantity: unknown }>;
}): FulfillmentOrderRow {
  return {
    id: order.id,
    number: order.number,
    branchName: order.branch.name,
    status: order.status,
    customerName: order.customerName,
    sourceType: order.sourceType,
    sourceId: order.sourceId,
    lineCount: order.lines.length,
    totalQuantity: order.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
    createdBy: order.createdBy.user.displayName,
    createdAt: order.createdAt.toISOString(),
    dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
  };
}
