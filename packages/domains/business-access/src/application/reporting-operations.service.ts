import type {
  CatalogRecordCreated,
  CreateMigrationValidationInput,
  CreateSavedReportViewInput,
  CreateWebhookSubscriptionInput,
  MigrationValidationRow,
  RecordWebhookDeliveryInput,
  ReportingOperationsOverview,
  RequestDataExportInput,
  SavedReportViewRow,
  WebhookDeliveryRow,
  WebhookSubscriptionRow,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  Prisma,
  withBusinessContext,
} from "@bizentra/database";
import { loadMembershipContext, recordChange, requirePermission } from "@bizentra/domain-shared";

import { ensureAccessCatalogSync } from "./access-sync.js";

export class ReportingOperationsService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<ReportingOperationsOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      await requirePermission(transaction, businessId, actorUserId, "REPORT_VIEW");

      const [
        business,
        saleAggregate,
        stockAggregate,
        lowStockItems,
        customerInvoices,
        supplierBills,
        expenses,
        bankAccounts,
        customers,
        savedViews,
        exports,
        webhooks,
        deliveries,
        migrations,
      ] = await Promise.all([
        transaction.business.findUniqueOrThrow({ where: { id: businessId } }),
        transaction.sale.aggregate({
          where: { businessId, status: { in: ["CONFIRMED", "PARTIALLY_RETURNED", "RETURNED"] } },
          _count: { _all: true },
          _sum: { total: true, taxTotal: true },
        }),
        transaction.stockBalance.aggregate({
          where: { businessId },
          _count: { _all: true },
          _sum: { onHandQuantity: true, availableQuantity: true },
        }),
        transaction.stockBalance.count({
          where: { businessId, availableQuantity: { lte: 0 } },
        }),
        transaction.customerInvoice.aggregate({
          where: { businessId, status: "POSTED" },
          _sum: { balanceAmount: true },
        }),
        transaction.supplierBill.aggregate({
          where: { businessId, status: "POSTED" },
          _sum: { balanceAmount: true },
        }),
        transaction.expense.aggregate({
          where: { businessId, status: "POSTED" },
          _sum: { amount: true },
        }),
        transaction.bankAccount.aggregate({
          where: { businessId, status: "ACTIVE" },
          _sum: { currentBalance: true },
        }),
        transaction.customer.count({ where: { businessId } }),
        transaction.savedReportView.findMany({
          where: { businessId },
          orderBy: { updatedAt: "desc" },
          take: 25,
        }),
        transaction.dataExportRequest.findMany({
          where: { businessId },
          orderBy: { requestedAt: "desc" },
          take: 25,
        }),
        transaction.webhookSubscription.findMany({
          where: { businessId },
          orderBy: { updatedAt: "desc" },
          take: 25,
        }),
        transaction.webhookDelivery.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { subscription: { select: { name: true } } },
        }),
        transaction.migrationValidation.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

      return {
        counts: {
          sales: saleAggregate._count._all,
          stockBalances: stockAggregate._count._all,
          customerInvoices: Number(customerInvoices._sum.balanceAmount ?? 0) > 0 ? 1 : 0,
          customers,
          savedReportViews: savedViews.length,
          queuedExports: exports.filter((row) => row.status === "QUEUED").length,
          activeWebhooks: webhooks.filter((row) => row.status === "ACTIVE").length,
          failedDeliveries: deliveries.filter((row) => row.status === "FAILED").length,
          migrationValidations: migrations.length,
        },
        salesSummary: {
          totalSales: saleAggregate._count._all,
          totalRevenue: Number(saleAggregate._sum.total ?? 0),
          totalTax: Number(saleAggregate._sum.taxTotal ?? 0),
          currencyCode: business.defaultCurrency,
        },
        stockSummary: {
          totalOnHand: Number(stockAggregate._sum.onHandQuantity ?? 0),
          totalAvailable: Number(stockAggregate._sum.availableQuantity ?? 0),
          lowStockItems,
        },
        financeSummary: {
          receivables: Number(customerInvoices._sum.balanceAmount ?? 0),
          payables: Number(supplierBills._sum.balanceAmount ?? 0),
          expenses: Number(expenses._sum.amount ?? 0),
          cashAndBank: Number(bankAccounts._sum.currentBalance ?? 0),
        },
        savedViews: savedViews.map(mapSavedView),
        exports: exports.map((row) => ({
          id: row.id,
          exportType: row.exportType,
          format: row.format,
          status: row.status,
          requestedAt: row.requestedAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
          expiresAt: row.expiresAt?.toISOString() ?? null,
        })),
        webhooks: webhooks.map(mapWebhook),
        deliveries: deliveries.map(mapDelivery),
        migrations: migrations.map(mapMigration),
      };
    });
  }

  async createSavedReportView(
    businessId: string,
    actorUserId: string,
    input: CreateSavedReportViewInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "REPORT_VIEW", async (transaction, actor) => {
      const view = await transaction.savedReportView.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          reportType: input.reportType,
          filters: input.filters as Prisma.InputJsonValue,
          columns: input.columns ? (input.columns as Prisma.InputJsonValue) : Prisma.JsonNull,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(transaction, businessId, actor.membershipId, "SavedReportView", view.id, {
        code: input.code,
        reportType: input.reportType,
      });
      return { id: view.id };
    });
  }

  async requestDataExport(
    businessId: string,
    actorUserId: string,
    input: RequestDataExportInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "REPORT_EXPORT", async (transaction, actor) => {
      const exportRequest = await transaction.dataExportRequest.create({
        data: {
          businessId,
          exportType: input.exportType,
          format: input.format,
          filters: input.filters ? (input.filters as Prisma.InputJsonValue) : Prisma.JsonNull,
          requestedByMembershipId: actor.membershipId,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "DataExportRequest",
        exportRequest.id,
        { exportType: input.exportType, format: input.format },
      );
      return { id: exportRequest.id };
    });
  }

  async createWebhookSubscription(
    businessId: string,
    actorUserId: string,
    input: CreateWebhookSubscriptionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "INTEGRATION_MANAGE", async (transaction, actor) => {
      const webhook = await transaction.webhookSubscription.create({
        data: {
          businessId,
          name: input.name,
          endpointUrl: input.endpointUrl,
          eventTypes: input.eventTypes,
          secretHint: input.secretHint ?? null,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "WebhookSubscription",
        webhook.id,
        { name: input.name, eventTypes: input.eventTypes },
      );
      return { id: webhook.id };
    });
  }

  async recordWebhookDelivery(
    businessId: string,
    actorUserId: string,
    input: RecordWebhookDeliveryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "INTEGRATION_MANAGE", async (transaction, actor) => {
      const delivery = await transaction.webhookDelivery.upsert({
        where: {
          businessId_subscriptionId_eventId: {
            businessId,
            subscriptionId: input.subscriptionId,
            eventId: input.eventId,
          },
        },
        update: {
          status: input.status,
          attempts: input.attempts,
          lastError: input.lastError ?? null,
          deliveredAt: input.status === "SENT" ? new Date() : null,
        },
        create: {
          businessId,
          subscriptionId: input.subscriptionId,
          eventId: input.eventId,
          eventType: input.eventType,
          payload: input.payload as Prisma.InputJsonValue,
          status: input.status,
          attempts: input.attempts,
          lastError: input.lastError ?? null,
          deliveredAt: input.status === "SENT" ? new Date() : null,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "WebhookDelivery",
        delivery.id,
        {
          eventId: input.eventId,
          status: input.status,
        },
      );
      return { id: delivery.id };
    });
  }

  async createMigrationValidation(
    businessId: string,
    actorUserId: string,
    input: CreateMigrationValidationInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "MIGRATION_MANAGE", async (transaction, actor) => {
      const status = input.invalidRows > 0 ? "FAILED" : "VALIDATED";
      const validation = await transaction.migrationValidation.create({
        data: {
          businessId,
          sourceName: input.sourceName,
          entityKind: input.entityKind,
          status,
          totalRows: input.totalRows,
          validRows: input.validRows,
          invalidRows: input.invalidRows,
          warningRows: input.warningRows,
          errors: input.errors ? (input.errors as Prisma.InputJsonValue) : Prisma.JsonNull,
          preview: input.preview ? (input.preview as Prisma.InputJsonValue) : Prisma.JsonNull,
          reconciliation: input.reconciliation
            ? (input.reconciliation as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          createdByMembershipId: actor.membershipId,
        },
      });
      await this.record(
        transaction,
        businessId,
        actor.membershipId,
        "MigrationValidation",
        validation.id,
        { sourceName: input.sourceName, status },
      );
      return { id: validation.id };
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
      eventType: `reporting_operations.${entityType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}.changed`,
      eventPayload: { entityId, ...after },
    });
  }
}

function mapSavedView(
  row: Prisma.SavedReportViewGetPayload<Record<string, never>>,
): SavedReportViewRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    reportType: row.reportType,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapWebhook(
  row: Prisma.WebhookSubscriptionGetPayload<Record<string, never>>,
): WebhookSubscriptionRow {
  return {
    id: row.id,
    name: row.name,
    endpointUrl: row.endpointUrl,
    eventTypes: Array.isArray(row.eventTypes) ? (row.eventTypes as string[]) : [],
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDelivery(
  row: Prisma.WebhookDeliveryGetPayload<{ include: { subscription: { select: { name: true } } } }>,
): WebhookDeliveryRow {
  return {
    id: row.id,
    subscriptionName: row.subscription.name,
    eventId: row.eventId,
    eventType: row.eventType,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
  };
}

function mapMigration(
  row: Prisma.MigrationValidationGetPayload<Record<string, never>>,
): MigrationValidationRow {
  return {
    id: row.id,
    sourceName: row.sourceName,
    entityKind: row.entityKind,
    status: row.status,
    totalRows: row.totalRows,
    validRows: row.validRows,
    invalidRows: row.invalidRows,
    warningRows: row.warningRows,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
  };
}
