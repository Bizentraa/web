import type {
  AddPaymentInput,
  CashMovementInput,
  CloseShiftInput,
  CreateExchangeInput,
  CreateReturnInput,
  CreateSaleInput,
  ExchangeResult,
  OpenShiftInput,
  Paginated,
  PaymentMethodKind,
  ReceiptDocument,
  ResolvePaymentInput,
  ReturnResult,
  SaleDetail,
  SaleListRow,
  SaleQuery,
  ShiftSummary,
  SyncQueueInput,
  SyncResultEntry,
  TenderInput,
  UpdateHeldSaleInput,
  VoidSaleInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  withBusinessContext,
} from "@bizentra/database";
import {
  allocateDocumentNumber,
  BusinessAccessError,
  enforceApproval,
  loadMembershipContext,
  type MembershipContext,
  moneyToDb,
  pagination,
  publishEvent,
  quantityToDb,
  rateToDb,
  readTimeline,
  recordAudit,
  requirePermission,
  roundMoney,
  toNumber,
  toOptionalNumber,
} from "@bizentra/domain-shared";

import { refundForQuantity } from "../domain/pricing.js";
import { PricingService } from "./pricing.service.js";

const CASH_IN_KINDS = new Set(["OPENING_FLOAT", "PAY_IN"]);

/**
 * CC-P2-001 to CC-P2-012: the shared selling engine.
 *
 * Every money-moving step is idempotent. A retry with the same idempotency key returns the record
 * that already exists instead of creating a second sale, payment or refund.
 */
export class PosService {
  private readonly pricing: PricingService;

  constructor(private readonly database: DatabaseClient) {
    this.pricing = new PricingService(database);
  }

  /* ------------------------------------------------------------------ shift */

  async openShift(
    businessId: string,
    actorUserId: string,
    input: OpenShiftInput,
  ): Promise<ShiftSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SHIFT_MANAGE");
      const branch = await transaction.branch.findFirst({
        where: { id: input.branchId, businessId, status: "ACTIVE" },
      });
      if (!branch)
        throw new BusinessAccessError("NOT_FOUND", "Branch was not found or is not active.");

      const openShift = await transaction.posShift.findFirst({
        where: {
          businessId,
          branchId: input.branchId,
          registerCode: input.registerCode,
          status: "OPEN",
        },
      });
      if (openShift) {
        throw new BusinessAccessError(
          "CONFLICT",
          `Register ${input.registerCode} already has an open shift (${openShift.number}). Close it before opening a new one.`,
        );
      }

      const number = await allocateDocumentNumber(transaction, {
        businessId,
        documentType: "SHIFT",
        branchId: branch.id,
        branchCode: branch.code,
      });

      const shift = await transaction.posShift.create({
        data: {
          businessId,
          branchId: branch.id,
          registerCode: input.registerCode,
          number,
          openingFloat: moneyToDb(input.openingFloat),
          openedByMembershipId: actor.membershipId,
        },
      });

      if (input.openingFloat > 0) {
        await transaction.cashMovement.create({
          data: {
            businessId,
            shiftId: shift.id,
            kind: "OPENING_FLOAT",
            amount: moneyToDb(input.openingFloat),
            reason: input.note ?? "Opening cash float",
            createdByMembershipId: actor.membershipId,
          },
        });
      }

      await recordAudit(transaction, {
        businessId,
        branchId: branch.id,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "PosShift",
        entityId: shift.id,
        after: { number, registerCode: input.registerCode, openingFloat: input.openingFloat },
      });
      await publishEvent(transaction, {
        businessId,
        eventType: "ShiftOpened",
        aggregateType: "PosShift",
        aggregateId: shift.id,
        payload: { businessId, branchId: branch.id, number, registerCode: input.registerCode },
      });

      return this.buildShiftSummary(transaction, businessId, shift.id);
    });
  }

  async getCurrentShift(
    businessId: string,
    actorUserId: string,
    branchId: string,
    registerCode: string,
  ): Promise<ShiftSummary | null> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SHIFT_VIEW");
      const shift = await transaction.posShift.findFirst({
        where: { businessId, branchId, registerCode, status: "OPEN" },
      });
      return shift ? this.buildShiftSummary(transaction, businessId, shift.id) : null;
    });
  }

  async listShifts(businessId: string, actorUserId: string): Promise<ShiftSummary[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SHIFT_VIEW");
      const shifts = await transaction.posShift.findMany({
        where: { businessId },
        orderBy: { openedAt: "desc" },
        take: 25,
        select: { id: true },
      });
      const summaries: ShiftSummary[] = [];
      for (const shift of shifts) {
        summaries.push(await this.buildShiftSummary(transaction, businessId, shift.id));
      }
      return summaries;
    });
  }

  async addCashMovement(
    businessId: string,
    actorUserId: string,
    shiftId: string,
    input: CashMovementInput,
  ): Promise<ShiftSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SHIFT_MANAGE");
      const shift = await transaction.posShift.findFirst({ where: { id: shiftId, businessId } });
      if (!shift) throw new BusinessAccessError("NOT_FOUND", "Shift was not found.");
      if (shift.status !== "OPEN") {
        throw new BusinessAccessError("CONFLICT", "This shift is already closed.");
      }

      await transaction.cashMovement.create({
        data: {
          businessId,
          shiftId,
          kind: input.kind,
          amount: moneyToDb(input.amount),
          reason: input.reason,
          createdByMembershipId: actor.membershipId,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: shift.branchId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "CashMovement",
        entityId: shiftId,
        after: { kind: input.kind, amount: input.amount, reason: input.reason },
      });

      return this.buildShiftSummary(transaction, businessId, shiftId);
    });
  }

  async closeShift(
    businessId: string,
    actorUserId: string,
    shiftId: string,
    input: CloseShiftInput,
  ): Promise<ShiftSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SHIFT_MANAGE");
      const shift = await transaction.posShift.findFirst({ where: { id: shiftId, businessId } });
      if (!shift) throw new BusinessAccessError("NOT_FOUND", "Shift was not found.");
      if (shift.status !== "OPEN") {
        throw new BusinessAccessError("CONFLICT", "This shift is already closed.");
      }

      const openSales = await transaction.sale.count({
        where: { businessId, shiftId, status: { in: ["DRAFT", "HELD"] } },
      });
      if (openSales > 0) {
        throw new BusinessAccessError(
          "CONFLICT",
          `${openSales} held sale(s) are still open on this shift. Finish or discard them before closing.`,
        );
      }

      const expectedCash = await this.expectedCash(transaction, businessId, shiftId);
      const variance = roundMoney(input.countedCash - expectedCash);

      if (variance !== 0) {
        if (!input.varianceReason) {
          throw new BusinessAccessError(
            "INVALID_INPUT",
            "A cash difference needs a short reason before the shift can close.",
          );
        }
        await enforceApproval(transaction, {
          businessId,
          actionCode: "SHIFT_VARIANCE",
          amount: Math.abs(variance),
          approvalRequestId: input.approvalRequestId,
          membership: actor,
          entityType: "PosShift",
          entityId: shiftId,
        });
      }

      await transaction.cashMovement.create({
        data: {
          businessId,
          shiftId,
          kind: "CLOSING_COUNT",
          amount: moneyToDb(input.countedCash),
          reason: input.varianceReason ?? "Closing count",
          createdByMembershipId: actor.membershipId,
        },
      });

      await transaction.posShift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByMembershipId: actor.membershipId,
          expectedCash: moneyToDb(expectedCash),
          countedCash: moneyToDb(input.countedCash),
          cashVariance: moneyToDb(variance),
          varianceReason: input.varianceReason ?? null,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: shift.branchId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "PosShift",
        entityId: shiftId,
        before: { status: "OPEN" },
        after: {
          status: "CLOSED",
          expectedCash,
          countedCash: input.countedCash,
          variance,
          reason: input.varianceReason ?? null,
        },
      });
      await publishEvent(transaction, {
        businessId,
        eventType: "ShiftClosed",
        aggregateType: "PosShift",
        aggregateId: shiftId,
        payload: { businessId, expectedCash, countedCash: input.countedCash, variance },
      });

      return this.buildShiftSummary(transaction, businessId, shiftId);
    });
  }

  /* ------------------------------------------------------------------- sale */

  async createSale(
    businessId: string,
    actorUserId: string,
    input: CreateSaleInput,
  ): Promise<SaleDetail> {
    const saleId = await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SALE_CREATE");

      const existing = await transaction.sale.findFirst({
        where: { businessId, idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (existing) return existing.id;

      const cart = await this.pricing.resolveCart(transaction, businessId, actor, input);
      const shift = await this.requireShiftForChannel(transaction, businessId, input);

      if (cart.quote.discountTotal > 0) {
        await enforceApproval(transaction, {
          businessId,
          actionCode: "SALE_DISCOUNT",
          amount: cart.quote.discountTotal,
          approvalRequestId: input.approvalRequestId,
          membership: actor,
          entityType: "Sale",
        });
      }

      const number = await allocateDocumentNumber(transaction, {
        businessId,
        documentType: "SALE",
        branchId: cart.branchId,
        branchCode: cart.branchCode,
      });

      const sale = await transaction.sale.create({
        data: {
          businessId,
          branchId: cart.branchId,
          shiftId: shift?.id ?? null,
          number,
          status: input.hold ? "HELD" : "CONFIRMED",
          channel: input.channel,
          customerId: cart.customerId,
          currencyCode: cart.currencyCode,
          subtotal: moneyToDb(cart.quote.subtotal),
          discountTotal: moneyToDb(cart.quote.discountTotal),
          taxTotal: moneyToDb(cart.quote.taxTotal),
          total: moneyToDb(cart.quote.total),
          dueTotal: moneyToDb(input.hold ? 0 : cart.quote.total),
          idempotencyKey: input.idempotencyKey,
          offlineRef: input.offlineRef ?? null,
          holdName: input.holdName ?? null,
          note: input.note ?? null,
          createdByMembershipId: actor.membershipId,
          confirmedAt: input.hold ? null : new Date(),
        },
      });

      await this.writeSaleLines(transaction, businessId, sale.id, cart.quote.lines);

      await recordAudit(transaction, {
        businessId,
        branchId: cart.branchId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "Sale",
        entityId: sale.id,
        after: {
          number,
          status: sale.status,
          total: cart.quote.total,
          lines: cart.quote.lines.length,
        },
      });

      if (!input.hold) {
        await publishEvent(transaction, {
          businessId,
          eventType: "OrderConfirmed",
          aggregateType: "Sale",
          aggregateId: sale.id,
          payload: {
            businessId,
            branchId: cart.branchId,
            number,
            total: cart.quote.total,
            customerId: cart.customerId,
          },
        });
      }

      return sale.id;
    });

    for (const tender of input.payments) {
      await this.addPayment(businessId, actorUserId, saleId, { ...tender, markUnknown: false });
    }

    return this.getSale(businessId, actorUserId, saleId);
  }

  async updateHeldSale(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: UpdateHeldSaleInput,
  ): Promise<SaleDetail> {
    await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SALE_CREATE");
      const sale = await transaction.sale.findFirst({ where: { id: saleId, businessId } });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");
      if (sale.status !== "HELD") {
        throw new BusinessAccessError("CONFLICT", "Only a held sale can be edited.");
      }

      const cart = await this.pricing.resolveCart(transaction, businessId, actor, input);
      await transaction.saleLine.deleteMany({ where: { businessId, saleId } });
      await this.writeSaleLines(transaction, businessId, saleId, cart.quote.lines);

      await transaction.sale.update({
        where: { id: saleId },
        data: {
          customerId: cart.customerId,
          subtotal: moneyToDb(cart.quote.subtotal),
          discountTotal: moneyToDb(cart.quote.discountTotal),
          taxTotal: moneyToDb(cart.quote.taxTotal),
          total: moneyToDb(cart.quote.total),
          holdName: input.holdName ?? sale.holdName,
          note: input.note ?? sale.note,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: sale.branchId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "Sale",
        entityId: saleId,
        before: { total: toNumber(sale.total) },
        after: { total: cart.quote.total, lines: cart.quote.lines.length },
      });
    });

    return this.getSale(businessId, actorUserId, saleId);
  }

  async confirmSale(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: { shiftId?: string | undefined; approvalRequestId?: string | undefined },
  ): Promise<SaleDetail> {
    await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SALE_CREATE");
      const sale = await transaction.sale.findFirst({
        where: { id: saleId, businessId },
        include: { lines: true },
      });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");
      if (sale.status === "CONFIRMED") return;
      if (sale.status !== "HELD") {
        throw new BusinessAccessError("CONFLICT", "Only a held sale can be confirmed.");
      }
      if (!sale.lines.length) {
        throw new BusinessAccessError("CONFLICT", "A sale needs at least one line.");
      }

      if (toNumber(sale.discountTotal) > 0) {
        await enforceApproval(transaction, {
          businessId,
          actionCode: "SALE_DISCOUNT",
          amount: toNumber(sale.discountTotal),
          approvalRequestId: input.approvalRequestId,
          membership: actor,
          entityType: "Sale",
          entityId: saleId,
        });
      }

      const shift = input.shiftId
        ? await this.requireOpenShift(transaction, businessId, input.shiftId)
        : null;

      await transaction.sale.update({
        where: { id: saleId },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          dueTotal: moneyToDb(roundMoney(toNumber(sale.total) - toNumber(sale.paidTotal))),
          ...(shift ? { shiftId: shift.id } : {}),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: sale.branchId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "Sale",
        entityId: saleId,
        before: { status: "HELD" },
        after: { status: "CONFIRMED" },
      });
      await publishEvent(transaction, {
        businessId,
        eventType: "OrderConfirmed",
        aggregateType: "Sale",
        aggregateId: saleId,
        payload: { businessId, number: sale.number, total: toNumber(sale.total) },
      });
    });

    return this.getSale(businessId, actorUserId, saleId);
  }

  async voidSale(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: VoidSaleInput,
  ): Promise<SaleDetail> {
    await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "SALE_VOID");
      const sale = await transaction.sale.findFirst({ where: { id: saleId, businessId } });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");
      if (sale.status === "VOIDED") return;
      if (toNumber(sale.paidTotal) > 0) {
        throw new BusinessAccessError(
          "CONFLICT",
          "This sale already received money. Use a return and refund so the reversal stays visible.",
        );
      }

      await enforceApproval(transaction, {
        businessId,
        actionCode: "SALE_VOID",
        amount: toNumber(sale.total),
        approvalRequestId: input.approvalRequestId,
        membership: actor,
        entityType: "Sale",
        entityId: saleId,
      });

      await transaction.sale.update({
        where: { id: saleId },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidReason: input.reason,
          dueTotal: moneyToDb(0),
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: sale.branchId,
        actorMembershipId: actor.membershipId,
        action: "CANCEL",
        entityType: "Sale",
        entityId: saleId,
        before: { status: sale.status },
        after: { status: "VOIDED", reason: input.reason },
      });
      await publishEvent(transaction, {
        businessId,
        eventType: "SaleVoided",
        aggregateType: "Sale",
        aggregateId: saleId,
        payload: { businessId, number: sale.number, reason: input.reason },
      });
    });

    return this.getSale(businessId, actorUserId, saleId);
  }

  /* ---------------------------------------------------------------- payment */

  async addPayment(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: AddPaymentInput,
  ): Promise<SaleDetail> {
    await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "PAYMENT_ACCEPT");

      const duplicate = await transaction.salePayment.findFirst({
        where: { businessId, idempotencyKey: input.idempotencyKey },
      });
      if (duplicate) return;

      const sale = await transaction.sale.findFirst({
        where: { id: saleId, businessId },
        include: { lines: true },
      });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");
      if (sale.status === "VOIDED") {
        throw new BusinessAccessError("CONFLICT", "A voided sale cannot receive payment.");
      }
      if (sale.status === "HELD") {
        throw new BusinessAccessError(
          "CONFLICT",
          "Confirm the held sale before receiving payment.",
        );
      }

      const due = roundMoney(toNumber(sale.total) - toNumber(sale.paidTotal));
      if (due <= 0) {
        throw new BusinessAccessError("CONFLICT", "This sale is already paid in full.");
      }

      const tendered = input.tenderedAmount ?? input.amount;
      const applied = roundMoney(Math.min(input.amount, due));
      const change = input.method === "CASH" ? roundMoney(Math.max(tendered - applied, 0)) : 0;

      if (input.method !== "CASH" && input.amount > due + 0.0001) {
        throw new BusinessAccessError(
          "CONFLICT",
          "A card, transfer or wallet tender cannot be more than the amount due.",
        );
      }

      if (input.method === "STORE_CREDIT") {
        await this.redeemStoreCredit(transaction, businessId, actor, sale.customerId, applied, {
          saleId,
        });
      }

      const status = input.markUnknown ? "UNKNOWN" : "SUCCEEDED";
      const payment = await transaction.salePayment.create({
        data: {
          businessId,
          saleId,
          method: input.method,
          direction: "IN",
          status,
          amount: moneyToDb(applied),
          tenderedAmount: moneyToDb(tendered),
          changeAmount: moneyToDb(change),
          reference: input.reference ?? null,
          idempotencyKey: input.idempotencyKey,
          createdByMembershipId: actor.membershipId,
          capturedAt: status === "SUCCEEDED" ? new Date() : null,
        },
      });

      await recordAudit(transaction, {
        businessId,
        branchId: sale.branchId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "SalePayment",
        entityId: payment.id,
        after: { saleId, method: input.method, amount: applied, status },
      });

      if (status === "SUCCEEDED") {
        await this.settleSale(transaction, businessId, saleId, actor);
        await publishEvent(transaction, {
          businessId,
          eventType: "PaymentReceived",
          aggregateType: "Sale",
          aggregateId: saleId,
          payload: { businessId, paymentId: payment.id, method: input.method, amount: applied },
        });
      }
    });

    return this.getSale(businessId, actorUserId, saleId);
  }

  async resolvePayment(
    businessId: string,
    actorUserId: string,
    paymentId: string,
    input: ResolvePaymentInput,
  ): Promise<SaleDetail> {
    const saleId = await withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "PAYMENT_ACCEPT");
      const payment = await transaction.salePayment.findFirst({
        where: { id: paymentId, businessId },
      });
      if (!payment) throw new BusinessAccessError("NOT_FOUND", "Payment was not found.");
      if (payment.status === "SUCCEEDED" && input.status !== "VOIDED") {
        throw new BusinessAccessError("CONFLICT", "This payment is already successful.");
      }

      await transaction.salePayment.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          reference: input.reference ?? payment.reference,
          failureReason: input.failureReason ?? null,
          capturedAt: input.status === "SUCCEEDED" ? new Date() : payment.capturedAt,
        },
      });

      await recordAudit(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "SalePayment",
        entityId: paymentId,
        before: { status: payment.status },
        after: { status: input.status, reason: input.failureReason ?? null },
      });

      await this.settleSale(transaction, businessId, payment.saleId, actor);
      return payment.saleId;
    });

    return this.getSale(businessId, actorUserId, saleId);
  }

  /* ---------------------------------------------------------------- returns */

  async createReturn(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: CreateReturnInput,
  ): Promise<ReturnResult> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "RETURN_CREATE");

      const duplicate = await transaction.saleReturn.findFirst({
        where: { businessId, idempotencyKey: input.idempotencyKey },
        include: { sale: true },
      });
      if (duplicate) {
        return {
          returnId: duplicate.id,
          number: duplicate.number,
          refundTotal: toNumber(duplicate.refundTotal),
          storeCreditTotal: toNumber(duplicate.storeCreditTotal),
          saleStatus: duplicate.sale.status,
        };
      }

      return this.acceptReturn(transaction, businessId, actor, saleId, input);
    });
  }

  async createExchange(
    businessId: string,
    actorUserId: string,
    saleId: string,
    input: CreateExchangeInput,
  ): Promise<ExchangeResult> {
    const prepared = await withBusinessContext(
      this.database,
      businessId,
      async (transaction): Promise<ExchangeResult> => {
        const actor = await requirePermission(
          transaction,
          businessId,
          actorUserId,
          "RETURN_CREATE",
        );

        const returnResult = await this.acceptReturn(transaction, businessId, actor, saleId, {
          idempotencyKey: `${input.idempotencyKey}:return`,
          reason: input.reason,
          refundMethod: "STORE_CREDIT",
          lines: input.returnLines,
          ...(input.shiftId ? { shiftId: input.shiftId } : {}),
          ...(input.approvalRequestId ? { approvalRequestId: input.approvalRequestId } : {}),
        });

        const cart = await this.pricing.resolveCart(
          transaction,
          businessId,
          actor,
          input.replacement,
        );
        const branch = await transaction.branch.findFirstOrThrow({
          where: { id: cart.branchId, businessId },
        });
        const number = await allocateDocumentNumber(transaction, {
          businessId,
          documentType: "SALE",
          branchId: branch.id,
          branchCode: branch.code,
        });

        const replacement = await transaction.sale.create({
          data: {
            businessId,
            branchId: cart.branchId,
            shiftId: input.shiftId ?? null,
            number,
            status: "CONFIRMED",
            channel: "POS",
            customerId: cart.customerId,
            currencyCode: cart.currencyCode,
            subtotal: moneyToDb(cart.quote.subtotal),
            discountTotal: moneyToDb(cart.quote.discountTotal),
            taxTotal: moneyToDb(cart.quote.taxTotal),
            total: moneyToDb(cart.quote.total),
            dueTotal: moneyToDb(cart.quote.total),
            idempotencyKey: `${input.idempotencyKey}:sale`,
            note: `Exchange for ${returnResult.number}`,
            createdByMembershipId: actor.membershipId,
            confirmedAt: new Date(),
          },
        });
        await this.writeSaleLines(transaction, businessId, replacement.id, cart.quote.lines);
        await transaction.saleReturn.update({
          where: { id: returnResult.returnId },
          data: { exchangeSaleId: replacement.id },
        });

        await publishEvent(transaction, {
          businessId,
          eventType: "OrderConfirmed",
          aggregateType: "Sale",
          aggregateId: replacement.id,
          payload: { businessId, number, total: cart.quote.total, exchange: true },
        });
        await recordAudit(transaction, {
          businessId,
          branchId: cart.branchId,
          actorMembershipId: actor.membershipId,
          action: "CREATE",
          entityType: "Sale",
          entityId: replacement.id,
          after: { number, exchangeFor: returnResult.number, total: cart.quote.total },
        });

        return {
          ...returnResult,
          replacementSaleId: replacement.id,
          replacementNumber: number,
          replacementDue: cart.quote.total,
          exchangeCreditApplied: 0,
        };
      },
    );

    const creditToApply = roundMoney(Math.min(prepared.storeCreditTotal, prepared.replacementDue));
    if (creditToApply > 0) {
      await this.addPayment(businessId, actorUserId, prepared.replacementSaleId, {
        method: "STORE_CREDIT",
        amount: creditToApply,
        tenderedAmount: creditToApply,
        reference: `Exchange ${prepared.number}`,
        idempotencyKey: `${input.idempotencyKey}:credit`,
        markUnknown: false,
      });
    }

    return {
      ...prepared,
      replacementDue: roundMoney(prepared.replacementDue - creditToApply),
      exchangeCreditApplied: creditToApply,
    };
  }

  /* ------------------------------------------------------------------ reads */

  async listSales(
    businessId: string,
    actorUserId: string,
    query: SaleQuery,
  ): Promise<Paginated<SaleListRow>> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SALE_VIEW");

      const where = {
        businessId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.shiftId ? { shiftId: query.shiftId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.search
          ? {
              OR: [
                { number: { contains: query.search, mode: "insensitive" as const } },
                { receiptNumber: { contains: query.search, mode: "insensitive" as const } },
                { customer: { name: { contains: query.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      };

      const { skip, take } = pagination(query);
      const [total, sales] = await Promise.all([
        transaction.sale.count({ where }),
        transaction.sale.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          include: { branch: true, customer: true, _count: { select: { lines: true } } },
        }),
      ]);

      return {
        rows: sales.map((sale) => toSaleRow(sale)),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  async getSale(businessId: string, actorUserId: string, saleId: string): Promise<SaleDetail> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SALE_VIEW");
      const sale = await transaction.sale.findFirst({
        where: { id: saleId, businessId },
        include: {
          branch: true,
          customer: true,
          _count: { select: { lines: true } },
          lines: { orderBy: { lineNo: "asc" }, include: { unit: true, promotion: true } },
          payments: { orderBy: { createdAt: "asc" } },
          returns: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");

      return {
        ...toSaleRow(sale),
        shiftId: sale.shiftId,
        note: sale.note,
        holdName: sale.holdName,
        voidReason: sale.voidReason,
        subtotal: toNumber(sale.subtotal),
        discountTotal: toNumber(sale.discountTotal),
        taxTotal: toNumber(sale.taxTotal),
        changeTotal: toNumber(sale.changeTotal),
        lines: sale.lines.map((line) => ({
          id: line.id,
          lineNo: line.lineNo,
          itemId: line.itemId,
          variantId: line.variantId,
          unitId: line.unitId,
          unitCode: line.unit.code,
          code: line.description,
          description: line.description,
          quantity: toNumber(line.quantity),
          unitPrice: toNumber(line.unitPrice),
          discountKind: line.discountKind,
          discountValue: toNumber(line.discountValue),
          discountAmount: toNumber(line.discountAmount),
          promotionId: line.promotionId,
          promotionName: line.promotion?.name ?? null,
          taxRateId: line.taxRateId,
          taxRatePercent: toNumber(line.taxRatePercent),
          taxAmount: toNumber(line.taxAmount),
          lineSubtotal: toNumber(line.lineSubtotal),
          lineTotal: toNumber(line.lineTotal),
          costPrice: toOptionalNumber(line.costPrice),
          stockTracked: line.stockTracked,
          returnedQuantity: toNumber(line.returnedQuantity),
        })),
        payments: sale.payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          direction: payment.direction,
          status: payment.status,
          amount: toNumber(payment.amount),
          tenderedAmount: toOptionalNumber(payment.tenderedAmount),
          changeAmount: toNumber(payment.changeAmount),
          reference: payment.reference,
          failureReason: payment.failureReason,
          capturedAt: payment.capturedAt?.toISOString() ?? null,
          createdAt: payment.createdAt.toISOString(),
        })),
        returns: sale.returns.map((saleReturn) => ({
          id: saleReturn.id,
          number: saleReturn.number,
          status: saleReturn.status,
          reason: saleReturn.reason,
          refundMethod: saleReturn.refundMethod,
          refundTotal: toNumber(saleReturn.refundTotal),
          storeCreditTotal: toNumber(saleReturn.storeCreditTotal),
          acceptedAt: saleReturn.acceptedAt?.toISOString() ?? null,
        })),
        timeline: await readTimeline(transaction, businessId, "Sale", saleId),
      };
    });
  }

  async getReceipt(
    businessId: string,
    actorUserId: string,
    saleId: string,
  ): Promise<ReceiptDocument> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await loadMembershipContext(transaction, businessId, actorUserId);
      actor.requireAny(["RECEIPT_PRINT", "SALE_VIEW"]);

      const sale = await transaction.sale.findFirst({
        where: { id: saleId, businessId },
        include: {
          branch: true,
          customer: true,
          business: true,
          createdBy: { include: { user: { select: { displayName: true } } } },
          lines: { orderBy: { lineNo: "asc" }, include: { taxRate: true } },
          payments: { where: { direction: "IN" }, orderBy: { createdAt: "asc" } },
        },
      });
      if (!sale) throw new BusinessAccessError("NOT_FOUND", "Sale was not found.");

      const taxLines = new Map<string, { name: string; ratePercent: number; amount: number }>();
      for (const line of sale.lines) {
        const key = line.taxRateId ?? "none";
        const current = taxLines.get(key) ?? {
          name: line.taxRate?.name ?? "No tax",
          ratePercent: toNumber(line.taxRatePercent),
          amount: 0,
        };
        current.amount = roundMoney(current.amount + toNumber(line.taxAmount));
        taxLines.set(key, current);
      }

      await recordAudit(transaction, {
        businessId,
        branchId: sale.branchId,
        actorMembershipId: actor.membershipId,
        action: "GENERATE",
        entityType: "Receipt",
        entityId: sale.receiptNumber ?? sale.number,
        metadata: { saleId },
      });

      return {
        business: {
          name: sale.business.name,
          email: sale.business.email,
          phone: sale.business.phone,
          currencyCode: sale.currencyCode,
        },
        branch: { code: sale.branch.code, name: sale.branch.name },
        sale: {
          number: sale.number,
          receiptNumber: sale.receiptNumber,
          status: sale.status,
          confirmedAt: sale.confirmedAt?.toISOString() ?? null,
          cashier: sale.createdBy.user.displayName,
          customer: sale.customer?.name ?? null,
        },
        lines: sale.lines.map((line) => ({
          description: line.description,
          quantity: toNumber(line.quantity),
          unitPrice: toNumber(line.unitPrice),
          discountAmount: toNumber(line.discountAmount),
          taxAmount: toNumber(line.taxAmount),
          lineTotal: toNumber(line.lineTotal),
        })),
        totals: {
          subtotal: toNumber(sale.subtotal),
          discountTotal: toNumber(sale.discountTotal),
          taxTotal: toNumber(sale.taxTotal),
          total: toNumber(sale.total),
          paidTotal: toNumber(sale.paidTotal),
          changeTotal: toNumber(sale.changeTotal),
          dueTotal: toNumber(sale.dueTotal),
        },
        payments: sale.payments.map((payment) => ({
          method: payment.method,
          amount: toNumber(payment.amount),
          status: payment.status,
        })),
        taxLines: [...taxLines.values()].filter((entry) => entry.amount !== 0),
        printedAt: new Date().toISOString(),
      };
    });
  }

  /* -------------------------------------------------------------- offline */

  async sync(
    businessId: string,
    actorUserId: string,
    input: SyncQueueInput,
  ): Promise<SyncResultEntry[]> {
    const results: SyncResultEntry[] = [];

    for (const operation of input.operations) {
      try {
        if (operation.kind === "SALE") {
          const existing = await this.findSaleByIdempotencyKey(
            businessId,
            operation.payload.idempotencyKey,
          );
          const sale = existing
            ? await this.getSale(businessId, actorUserId, existing)
            : await this.createSale(businessId, actorUserId, operation.payload);
          results.push({
            clientRef: operation.clientRef,
            status: existing ? "DUPLICATE" : "APPLIED",
            saleId: sale.id,
          });
        } else {
          const sale = await this.addPayment(
            businessId,
            actorUserId,
            operation.saleId,
            operation.payload,
          );
          const payment = sale.payments.find(
            (entry) => entry.reference === operation.payload.reference,
          );
          results.push({
            clientRef: operation.clientRef,
            status: "APPLIED",
            saleId: sale.id,
            ...(payment ? { paymentId: payment.id } : {}),
          });
        }
      } catch (error) {
        results.push({
          clientRef: operation.clientRef,
          status: "FAILED",
          message:
            error instanceof Error ? error.message : "The queued action could not be applied.",
        });
      }
    }

    return results;
  }

  /* -------------------------------------------------------------- internals */

  private async findSaleByIdempotencyKey(
    businessId: string,
    idempotencyKey: string,
  ): Promise<string | null> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const sale = await transaction.sale.findFirst({
        where: { businessId, idempotencyKey },
        select: { id: true },
      });
      return sale?.id ?? null;
    });
  }

  private async writeSaleLines(
    transaction: DatabaseTransaction,
    businessId: string,
    saleId: string,
    lines:
      | SaleDetail["lines"]
      | ReadonlyArray<Omit<SaleDetail["lines"][number], "id" | "returnedQuantity">>,
  ): Promise<void> {
    for (const line of lines) {
      await transaction.saleLine.create({
        data: {
          businessId,
          saleId,
          lineNo: line.lineNo,
          itemId: line.itemId,
          variantId: line.variantId,
          unitId: line.unitId,
          description: line.description,
          quantity: quantityToDb(line.quantity),
          unitPrice: moneyToDb(line.unitPrice),
          discountKind: line.discountKind,
          discountValue: moneyToDb(line.discountValue),
          discountAmount: moneyToDb(line.discountAmount),
          promotionId: line.promotionId,
          taxRateId: line.taxRateId,
          taxRatePercent: rateToDb(line.taxRatePercent),
          taxAmount: moneyToDb(line.taxAmount),
          lineSubtotal: moneyToDb(line.lineSubtotal),
          lineTotal: moneyToDb(line.lineTotal),
          costPrice: line.costPrice === null ? null : moneyToDb(line.costPrice),
          stockTracked: line.stockTracked,
        },
      });
    }
  }

  private async requireShiftForChannel(
    transaction: DatabaseTransaction,
    businessId: string,
    input: CreateSaleInput,
  ): Promise<{ id: string } | null> {
    if (input.channel !== "POS") return null;
    if (!input.shiftId) {
      throw new BusinessAccessError(
        "CONFLICT",
        "Open a POS shift before selling. Sales must belong to a shift so cash can be reconciled.",
      );
    }
    return this.requireOpenShift(transaction, businessId, input.shiftId);
  }

  private async requireOpenShift(
    transaction: DatabaseTransaction,
    businessId: string,
    shiftId: string,
  ): Promise<{ id: string }> {
    const shift = await transaction.posShift.findFirst({ where: { id: shiftId, businessId } });
    if (!shift) throw new BusinessAccessError("NOT_FOUND", "Shift was not found.");
    if (shift.status !== "OPEN") {
      throw new BusinessAccessError("CONFLICT", "This shift is closed. Open a new shift first.");
    }
    return { id: shift.id };
  }

  /**
   * Recalculates paid, change and due from the successful tenders and, when a sale becomes fully
   * paid, allocates the receipt number and publishes the stock and invoice events exactly once.
   */
  private async settleSale(
    transaction: DatabaseTransaction,
    businessId: string,
    saleId: string,
    actor: MembershipContext,
  ): Promise<void> {
    const sale = await transaction.sale.findFirstOrThrow({
      where: { id: saleId, businessId },
      include: { lines: true, branch: true, payments: true },
    });

    const successful = sale.payments.filter(
      (payment) => payment.status === "SUCCEEDED" && payment.direction === "IN",
    );
    const paidTotal = roundMoney(
      successful.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    );
    const changeTotal = roundMoney(
      successful.reduce((sum, payment) => sum + toNumber(payment.changeAmount), 0),
    );
    const dueTotal = roundMoney(Math.max(toNumber(sale.total) - paidTotal, 0));
    const fullyPaid = dueTotal <= 0 && toNumber(sale.total) > 0;
    const needsReceipt = fullyPaid && !sale.receiptNumber;

    const receiptNumber = needsReceipt
      ? await allocateDocumentNumber(transaction, {
          businessId,
          documentType: "RECEIPT",
          branchId: sale.branchId,
          branchCode: sale.branch.code,
        })
      : sale.receiptNumber;

    await transaction.sale.update({
      where: { id: saleId },
      data: {
        paidTotal: moneyToDb(paidTotal),
        changeTotal: moneyToDb(changeTotal),
        dueTotal: moneyToDb(dueTotal),
        receiptNumber,
      },
    });

    if (!needsReceipt) return;

    const stockLines = sale.lines.filter((line) => line.stockTracked);
    if (stockLines.length) {
      await publishEvent(transaction, {
        businessId,
        eventType: "StockSaleCommitted",
        aggregateType: "Sale",
        aggregateId: saleId,
        payload: {
          businessId,
          branchId: sale.branchId,
          lines: stockLines.map((line) => ({
            itemId: line.itemId,
            variantId: line.variantId,
            quantity: toNumber(line.quantity),
          })),
        },
      });
    }

    await publishEvent(transaction, {
      businessId,
      eventType: "CustomerInvoicePosted",
      aggregateType: "Sale",
      aggregateId: saleId,
      payload: {
        businessId,
        number: sale.number,
        receiptNumber,
        total: toNumber(sale.total),
        customerId: sale.customerId,
      },
    });

    await recordAudit(transaction, {
      businessId,
      branchId: sale.branchId,
      actorMembershipId: actor.membershipId,
      action: "UPDATE",
      entityType: "Sale",
      entityId: saleId,
      after: { receiptNumber, paidTotal, status: "PAID" },
    });
  }

  private async acceptReturn(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    saleId: string,
    input: CreateReturnInput,
  ): Promise<ReturnResult> {
    const sale = await transaction.sale.findFirst({
      where: { id: saleId, businessId },
      include: { lines: true, branch: true, payments: true },
    });
    if (!sale) throw new BusinessAccessError("NOT_FOUND", "The original sale was not found.");
    if (sale.status === "VOIDED" || sale.status === "HELD" || sale.status === "DRAFT") {
      throw new BusinessAccessError(
        "CONFLICT",
        "Only a confirmed sale can be returned. A held or voided sale has no money to reverse.",
      );
    }

    let refundNet = 0;
    let refundTax = 0;
    const returnLines: Array<{
      saleLineId: string;
      quantity: number;
      refundAmount: number;
      taxAmount: number;
      disposition: "RESELLABLE" | "DAMAGED" | "QUARANTINE";
      itemId: string;
      stockTracked: boolean;
    }> = [];

    for (const requested of input.lines) {
      const line = sale.lines.find((candidate) => candidate.id === requested.saleLineId);
      if (!line) {
        throw new BusinessAccessError("NOT_FOUND", "One of the sale lines was not found.");
      }
      const available = roundMoney(toNumber(line.quantity) - toNumber(line.returnedQuantity));
      if (requested.quantity > available + 0.0001) {
        throw new BusinessAccessError(
          "CONFLICT",
          `${line.description} only has ${available} left to return.`,
        );
      }

      const refund = refundForQuantity(
        {
          quantity: toNumber(line.quantity),
          lineSubtotal: toNumber(line.lineSubtotal),
          taxAmount: toNumber(line.taxAmount),
        },
        requested.quantity,
      );
      refundNet = roundMoney(refundNet + refund.net);
      refundTax = roundMoney(refundTax + refund.tax);
      returnLines.push({
        saleLineId: line.id,
        quantity: requested.quantity,
        refundAmount: refund.total,
        taxAmount: refund.tax,
        disposition: requested.disposition,
        itemId: line.itemId,
        stockTracked: line.stockTracked,
      });
    }

    const refundTotal = roundMoney(refundNet + refundTax);
    const alreadyRefunded = toNumber(sale.refundedTotal);
    if (roundMoney(alreadyRefunded + refundTotal) > toNumber(sale.paidTotal) + 0.0001) {
      throw new BusinessAccessError(
        "CONFLICT",
        "A refund cannot be more than the money this sale actually received.",
      );
    }

    if (refundTotal > 0) {
      actor.require("REFUND_ISSUE");
      await enforceApproval(transaction, {
        businessId,
        actionCode: "SALE_REFUND",
        amount: refundTotal,
        approvalRequestId: input.approvalRequestId,
        membership: actor,
        entityType: "SaleReturn",
        entityId: saleId,
      });
    }

    const number = await allocateDocumentNumber(transaction, {
      businessId,
      documentType: "RETURN",
      branchId: sale.branchId,
      branchCode: sale.branch.code,
    });

    const useStoreCredit =
      input.refundMethod === "STORE_CREDIT" ||
      (input.refundMethod === "ORIGINAL_METHOD" &&
        sale.payments.every((payment) => payment.method === "STORE_CREDIT"));
    const storeCreditTotal = useStoreCredit ? refundTotal : 0;
    const cashRefundTotal = useStoreCredit ? 0 : refundTotal;

    const saleReturn = await transaction.saleReturn.create({
      data: {
        businessId,
        branchId: sale.branchId,
        saleId,
        shiftId: input.shiftId ?? sale.shiftId,
        number,
        status: "ACCEPTED",
        reason: input.reason,
        refundMethod: input.refundMethod,
        refundTotal: moneyToDb(cashRefundTotal),
        storeCreditTotal: moneyToDb(storeCreditTotal),
        taxTotal: moneyToDb(refundTax),
        idempotencyKey: input.idempotencyKey,
        createdByMembershipId: actor.membershipId,
        acceptedAt: new Date(),
        ...(input.approvalRequestId ? { approvalRequestId: input.approvalRequestId } : {}),
      },
    });

    for (const line of returnLines) {
      await transaction.saleReturnLine.create({
        data: {
          businessId,
          returnId: saleReturn.id,
          saleLineId: line.saleLineId,
          quantity: quantityToDb(line.quantity),
          refundAmount: moneyToDb(line.refundAmount),
          taxAmount: moneyToDb(line.taxAmount),
          disposition: line.disposition,
        },
      });
      await transaction.saleLine.update({
        where: { id: line.saleLineId },
        data: { returnedQuantity: { increment: quantityToDb(line.quantity) } },
      });
    }

    if (cashRefundTotal > 0) {
      const originalMethod = pickRefundMethod(sale.payments);
      await transaction.salePayment.create({
        data: {
          businessId,
          saleId,
          returnId: saleReturn.id,
          method: input.refundMethod === "CASH" ? "CASH" : originalMethod,
          direction: "OUT",
          status: "SUCCEEDED",
          amount: moneyToDb(cashRefundTotal),
          reference: `Refund ${number}`,
          idempotencyKey: `${input.idempotencyKey}:refund`,
          createdByMembershipId: actor.membershipId,
          capturedAt: new Date(),
        },
      });
    }

    if (storeCreditTotal > 0) {
      await this.issueStoreCredit(
        transaction,
        businessId,
        actor,
        sale.customerId,
        storeCreditTotal,
        {
          returnId: saleReturn.id,
          reference: `Return ${number}`,
          currencyCode: sale.currencyCode,
        },
      );
    }

    const updatedLines = await transaction.saleLine.findMany({ where: { businessId, saleId } });
    const fullyReturned = updatedLines.every(
      (line) => toNumber(line.returnedQuantity) >= toNumber(line.quantity) - 0.0001,
    );
    const saleStatus = fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED";

    await transaction.sale.update({
      where: { id: saleId },
      data: {
        status: saleStatus,
        refundedTotal: moneyToDb(roundMoney(alreadyRefunded + refundTotal)),
      },
    });

    await recordAudit(transaction, {
      businessId,
      branchId: sale.branchId,
      actorMembershipId: actor.membershipId,
      action: "CREATE",
      entityType: "SaleReturn",
      entityId: saleReturn.id,
      after: {
        number,
        saleNumber: sale.number,
        refundTotal: cashRefundTotal,
        storeCreditTotal,
        reason: input.reason,
      },
    });

    await publishEvent(transaction, {
      businessId,
      eventType: "ReturnAccepted",
      aggregateType: "SaleReturn",
      aggregateId: saleReturn.id,
      payload: { businessId, saleId, number, lines: returnLines.length },
    });
    await publishEvent(transaction, {
      businessId,
      eventType: "CreditNotePosted",
      aggregateType: "SaleReturn",
      aggregateId: saleReturn.id,
      payload: { businessId, saleId, amount: refundTotal, taxAmount: refundTax },
    });
    if (cashRefundTotal > 0) {
      await publishEvent(transaction, {
        businessId,
        eventType: "RefundCompleted",
        aggregateType: "SaleReturn",
        aggregateId: saleReturn.id,
        payload: { businessId, saleId, amount: cashRefundTotal },
      });
    }

    const resellable = returnLines.filter(
      (line) => line.stockTracked && line.disposition === "RESELLABLE",
    );
    const quarantined = returnLines.filter(
      (line) => line.stockTracked && line.disposition !== "RESELLABLE",
    );
    if (resellable.length) {
      await publishEvent(transaction, {
        businessId,
        eventType: "StockReturned",
        aggregateType: "SaleReturn",
        aggregateId: saleReturn.id,
        payload: {
          businessId,
          branchId: sale.branchId,
          lines: resellable.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
        },
      });
    }
    if (quarantined.length) {
      await publishEvent(transaction, {
        businessId,
        eventType: "StockAdjusted",
        aggregateType: "SaleReturn",
        aggregateId: saleReturn.id,
        payload: {
          businessId,
          branchId: sale.branchId,
          lines: quarantined.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            disposition: line.disposition,
          })),
        },
      });
    }

    return {
      returnId: saleReturn.id,
      number,
      refundTotal: cashRefundTotal,
      storeCreditTotal,
      saleStatus,
    };
  }

  private async issueStoreCredit(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    customerId: string | null,
    amount: number,
    context: { returnId: string; reference: string; currencyCode: string },
  ): Promise<void> {
    if (!customerId) {
      throw new BusinessAccessError(
        "CONFLICT",
        "Store credit needs a customer on the sale. Attach a customer or refund to the original method.",
      );
    }
    actor.require("REFUND_ISSUE");

    const account = await transaction.storeCreditAccount.upsert({
      where: { customerId_businessId: { customerId, businessId } },
      update: {},
      create: { businessId, customerId, currencyCode: context.currencyCode },
    });
    const balanceAfter = roundMoney(toNumber(account.balance) + amount);

    await transaction.storeCreditAccount.update({
      where: { id: account.id },
      data: { balance: moneyToDb(balanceAfter) },
    });
    await transaction.storeCreditEntry.create({
      data: {
        businessId,
        accountId: account.id,
        kind: "ISSUE",
        amount: moneyToDb(amount),
        balanceAfter: moneyToDb(balanceAfter),
        reference: context.reference,
        returnId: context.returnId,
        createdByMembershipId: actor.membershipId,
      },
    });
  }

  private async redeemStoreCredit(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    customerId: string | null,
    amount: number,
    context: { saleId: string },
  ): Promise<void> {
    if (!customerId) {
      throw new BusinessAccessError(
        "CONFLICT",
        "Attach the customer before paying with store credit.",
      );
    }
    const account = await transaction.storeCreditAccount.findFirst({
      where: { businessId, customerId },
    });
    const balance = toNumber(account?.balance ?? 0);
    if (!account || balance + 0.0001 < amount) {
      throw new BusinessAccessError(
        "CONFLICT",
        `This customer has ${balance.toFixed(2)} store credit, which is less than ${amount.toFixed(2)}.`,
      );
    }

    const balanceAfter = roundMoney(balance - amount);
    await transaction.storeCreditAccount.update({
      where: { id: account.id },
      data: { balance: moneyToDb(balanceAfter) },
    });
    await transaction.storeCreditEntry.create({
      data: {
        businessId,
        accountId: account.id,
        kind: "REDEEM",
        amount: moneyToDb(amount),
        balanceAfter: moneyToDb(balanceAfter),
        reference: "Store credit tender",
        saleId: context.saleId,
        createdByMembershipId: actor.membershipId,
      },
    });
  }

  private async expectedCash(
    transaction: DatabaseTransaction,
    businessId: string,
    shiftId: string,
  ): Promise<number> {
    const [movements, sales] = await Promise.all([
      transaction.cashMovement.findMany({ where: { businessId, shiftId } }),
      transaction.sale.findMany({
        where: { businessId, shiftId },
        include: { payments: { where: { method: "CASH", status: "SUCCEEDED" } } },
      }),
    ]);

    let expected = 0;
    for (const movement of movements) {
      if (movement.kind === "CLOSING_COUNT") continue;
      const amount = toNumber(movement.amount);
      expected = roundMoney(expected + (CASH_IN_KINDS.has(movement.kind) ? amount : -amount));
    }
    for (const sale of sales) {
      for (const payment of sale.payments) {
        const amount = toNumber(payment.amount);
        expected = roundMoney(expected + (payment.direction === "IN" ? amount : -amount));
      }
    }
    return expected;
  }

  private async buildShiftSummary(
    transaction: DatabaseTransaction,
    businessId: string,
    shiftId: string,
  ): Promise<ShiftSummary> {
    const shift = await transaction.posShift.findFirstOrThrow({
      where: { id: shiftId, businessId },
      include: {
        branch: true,
        openedBy: { include: { user: { select: { displayName: true } } } },
        closedBy: { include: { user: { select: { displayName: true } } } },
        cashMovements: { orderBy: { createdAt: "asc" } },
        sales: { include: { payments: { where: { status: "SUCCEEDED" } } } },
      },
    });

    const tenders = new Map<PaymentMethodKind, { amount: number; count: number }>();
    let salesTotal = 0;
    let refundTotal = 0;
    let saleCount = 0;

    for (const sale of shift.sales) {
      if (sale.status !== "HELD" && sale.status !== "DRAFT" && sale.status !== "VOIDED") {
        saleCount += 1;
        salesTotal = roundMoney(salesTotal + toNumber(sale.total));
        refundTotal = roundMoney(refundTotal + toNumber(sale.refundedTotal));
      }
      for (const payment of sale.payments) {
        const current = tenders.get(payment.method) ?? { amount: 0, count: 0 };
        const signed =
          payment.direction === "IN" ? toNumber(payment.amount) : -toNumber(payment.amount);
        tenders.set(payment.method, {
          amount: roundMoney(current.amount + signed),
          count: current.count + 1,
        });
      }
    }

    const expected =
      shift.status === "CLOSED"
        ? toNumber(shift.expectedCash)
        : await this.expectedCash(transaction, businessId, shiftId);

    return {
      id: shift.id,
      number: shift.number,
      branchId: shift.branchId,
      branchName: shift.branch.name,
      registerCode: shift.registerCode,
      status: shift.status,
      openingFloat: toNumber(shift.openingFloat),
      openedBy: shift.openedBy.user.displayName,
      openedAt: shift.openedAt.toISOString(),
      closedBy: shift.closedBy?.user.displayName ?? null,
      closedAt: shift.closedAt?.toISOString() ?? null,
      expectedCash: expected,
      countedCash: toOptionalNumber(shift.countedCash),
      cashVariance: toOptionalNumber(shift.cashVariance),
      varianceReason: shift.varianceReason,
      saleCount,
      salesTotal,
      refundTotal,
      tenders: [...tenders.entries()].map(([method, value]) => ({
        method,
        amount: value.amount,
        count: value.count,
      })),
      cashMovements: shift.cashMovements.map((movement) => ({
        id: movement.id,
        kind: movement.kind,
        amount: toNumber(movement.amount),
        reason: movement.reason,
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }
}

function pickRefundMethod(
  payments: Array<{ method: PaymentMethodKind; direction: "IN" | "OUT"; status: string }>,
): PaymentMethodKind {
  const incoming = payments.filter(
    (payment) => payment.direction === "IN" && payment.status === "SUCCEEDED",
  );
  return incoming[0]?.method ?? "CASH";
}

function toSaleRow(sale: {
  id: string;
  number: string;
  receiptNumber: string | null;
  status: SaleListRow["status"];
  channel: SaleListRow["channel"];
  branchId: string;
  branch: { name: string };
  customerId: string | null;
  customer: { name: string } | null;
  currencyCode: string;
  total: unknown;
  paidTotal: unknown;
  dueTotal: unknown;
  refundedTotal: unknown;
  _count: { lines: number };
  createdAt: Date;
  confirmedAt: Date | null;
}): SaleListRow {
  return {
    id: sale.id,
    number: sale.number,
    receiptNumber: sale.receiptNumber,
    status: sale.status,
    channel: sale.channel,
    branchId: sale.branchId,
    branchName: sale.branch.name,
    customerId: sale.customerId,
    customerName: sale.customer?.name ?? null,
    currencyCode: sale.currencyCode,
    total: toNumber(sale.total),
    paidTotal: toNumber(sale.paidTotal),
    dueTotal: toNumber(sale.dueTotal),
    refundedTotal: toNumber(sale.refundedTotal),
    lineCount: sale._count.lines,
    createdAt: sale.createdAt.toISOString(),
    confirmedAt: sale.confirmedAt?.toISOString() ?? null,
  };
}

export type { TenderInput };
