import type {
  AdjustLoyaltyInput,
  BankAccountRow,
  BankTransactionRow,
  CatalogRecordCreated,
  CollectCustomerPaymentInput,
  CreateBankAccountInput,
  CreateCustomerInvoiceInput,
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  CreateSupplierBillInput,
  CustomerCreditRow,
  CustomerCollectionRow,
  CustomerInvoiceRow,
  ExpenseCategoryRow,
  ExpenseRow,
  FinanceOverview,
  LoyaltyAccountRow,
  PaySupplierBillInput,
  PostBankTransferInput,
  PostBankTransactionInput,
  SupplierBillRow,
  SupplierPaymentRow,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  type Prisma,
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

export class FinanceService {
  constructor(private readonly database: DatabaseClient) {}

  async getOverview(businessId: string, actorUserId: string): Promise<FinanceOverview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      await requirePermission(transaction, businessId, actorUserId, "FINANCE_VIEW");

      const [
        customerInvoices,
        customerCollections,
        supplierBills,
        supplierPayments,
        expenseCategories,
        expenses,
        bankAccounts,
        bankTransactions,
        loyaltyAccounts,
        accountingEvents,
        customerCreditCustomers,
      ] = await Promise.all([
        transaction.customerInvoice.findMany({
          where: { businessId },
          orderBy: { postedAt: "desc" },
          take: 25,
          include: invoiceInclude,
        }),
        transaction.customerCollection.findMany({
          where: { businessId },
          orderBy: { collectedAt: "desc" },
          take: 25,
          include: collectionInclude,
        }),
        transaction.supplierBill.findMany({
          where: { businessId },
          orderBy: { postedAt: "desc" },
          take: 25,
          include: billInclude,
        }),
        transaction.supplierPayment.findMany({
          where: { businessId },
          orderBy: { paidAt: "desc" },
          take: 25,
          include: supplierPaymentInclude,
        }),
        transaction.expenseCategory.findMany({
          where: { businessId },
          orderBy: { code: "asc" },
        }),
        transaction.expense.findMany({
          where: { businessId },
          orderBy: { spentAt: "desc" },
          take: 25,
          include: expenseInclude,
        }),
        transaction.bankAccount.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.bankTransaction.findMany({
          where: { businessId },
          orderBy: { occurredAt: "desc" },
          take: 25,
          include: bankTransactionInclude,
        }),
        transaction.loyaltyAccount.findMany({
          where: { businessId },
          orderBy: { lastActivityAt: "desc" },
          take: 25,
          include: { customer: { select: { id: true, name: true } } },
        }),
        transaction.accountingEvent.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        transaction.customer.findMany({
          where: {
            businessId,
            OR: [
              { creditHold: true },
              { creditLimit: { gt: 0 } },
              { invoices: { some: { balanceAmount: { gt: 0 } } } },
            ],
          },
          orderBy: { name: "asc" },
          take: 25,
          include: {
            invoices: {
              where: { balanceAmount: { gt: 0 } },
              select: { balanceAmount: true, dueDate: true },
            },
          },
        }),
      ]);

      return {
        totals: {
          receivables: customerInvoices.reduce((sum, row) => sum + toNumber(row.balanceAmount), 0),
          payables: supplierBills.reduce((sum, row) => sum + toNumber(row.balanceAmount), 0),
          expenses: expenses.reduce((sum, row) => sum + toNumber(row.amount), 0),
          cashAndBank: bankAccounts.reduce((sum, row) => sum + toNumber(row.currentBalance), 0),
          loyaltyPoints: loyaltyAccounts.reduce((sum, row) => sum + toNumber(row.pointsBalance), 0),
          pendingAccountingEvents: accountingEvents.filter((event) => event.status === "PENDING")
            .length,
        },
        customerInvoices: customerInvoices.map(mapCustomerInvoice),
        customerCredits: customerCreditCustomers.map(mapCustomerCredit),
        customerCollections: customerCollections.map(mapCustomerCollection),
        supplierBills: supplierBills.map(mapSupplierBill),
        supplierPayments: supplierPayments.map(mapSupplierPayment),
        expenseCategories: expenseCategories.map(mapExpenseCategory),
        expenses: expenses.map(mapExpense),
        bankAccounts: bankAccounts.map(mapBankAccount),
        bankTransactions: bankTransactions.map(mapBankTransaction),
        loyaltyAccounts: loyaltyAccounts.map(mapLoyaltyAccount),
        accountingEvents: accountingEvents.map((event) => ({
          id: event.id,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          eventType: event.eventType,
          amount: event.amount === null ? null : toNumber(event.amount),
          currencyCode: event.currencyCode,
          status: event.status,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    });
  }

  async createCustomerInvoice(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerInvoiceInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "AR_MANAGE", async (transaction, actor) => {
      const customer = await assertCustomer(transaction, businessId, input.customerId);
      const branch = input.branchId
        ? await assertBranch(transaction, businessId, input.branchId)
        : null;
      const total = totalLines(input.lines);
      await assertCreditAllowed(transaction, businessId, customer, total);
      const dueDate = input.dueDate
        ? new Date(input.dueDate)
        : customer.creditTermsDays === null
          ? null
          : addDays(new Date(), customer.creditTermsDays);
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId ?? null,
        documentType: "INV",
        ...(branch ? { branchCode: branch.code } : {}),
      });
      const invoice = await transaction.customerInvoice.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          customerId: input.customerId,
          number,
          currencyCode: input.currencyCode,
          totalAmount: moneyToDb(total),
          balanceAmount: moneyToDb(total),
          dueDate,
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.customerInvoiceLine.createMany({
        data: input.lines.map((line) => ({
          businessId,
          invoiceId: invoice.id,
          itemId: line.itemId ?? null,
          description: line.description,
          quantity: moneyToDb(line.quantity),
          unitPrice: moneyToDb(line.unitAmount),
          taxAmount: moneyToDb(line.taxAmount),
          lineTotal: moneyToDb(lineTotal(line)),
        })),
      });
      await accountingEvent(transaction, businessId, "CustomerInvoice", invoice.id, "POSTED", {
        amount: total,
        currencyCode: input.currencyCode,
        payload: { number, customerId: input.customerId },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "CustomerInvoice",
        entityId: invoice.id,
        branchId: input.branchId ?? null,
        after: { number, total },
        eventType: "finance.customer_invoice.posted",
        eventPayload: { invoiceId: invoice.id, number, total },
      });
      return { id: invoice.id };
    });
  }

  async collectCustomerPayment(
    businessId: string,
    actorUserId: string,
    input: CollectCustomerPaymentInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "AR_MANAGE", async (transaction, actor) => {
      await assertCustomer(transaction, businessId, input.customerId);
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      assertAllocations(input.amount, input.allocations);
      const collection = await transaction.customerCollection.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          customerId: input.customerId,
          amount: moneyToDb(input.amount),
          currencyCode: input.currencyCode,
          method: input.method,
          reference: input.reference ?? null,
          ...(input.collectedAt ? { collectedAt: new Date(input.collectedAt) } : {}),
          createdByMembershipId: actor.membershipId,
          unallocatedAmount: moneyToDb(
            input.amount - input.allocations.reduce((sum, row) => sum + row.amount, 0),
          ),
        },
      });
      for (const allocation of input.allocations) {
        const invoice = await transaction.customerInvoice.findUnique({
          where: { id_businessId: { id: allocation.documentId, businessId } },
        });
        if (!invoice || invoice.customerId !== input.customerId) {
          throw new BusinessAccessError(
            "INVALID_INPUT",
            "Invoice allocation does not match customer.",
          );
        }
        if (allocation.amount > toNumber(invoice.balanceAmount)) {
          throw new BusinessAccessError(
            "INVALID_INPUT",
            "Collection allocation exceeds invoice balance.",
          );
        }
        const paidAmount = toNumber(invoice.paidAmount) + allocation.amount;
        const balanceAmount = toNumber(invoice.totalAmount) - paidAmount;
        await transaction.customerCollectionAllocation.create({
          data: {
            businessId,
            collectionId: collection.id,
            invoiceId: invoice.id,
            amount: moneyToDb(allocation.amount),
          },
        });
        await transaction.customerInvoice.update({
          where: { id_businessId: { id: invoice.id, businessId } },
          data: {
            paidAmount: moneyToDb(paidAmount),
            balanceAmount: moneyToDb(balanceAmount),
            status: balanceAmount <= 0 ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }
      await accountingEvent(
        transaction,
        businessId,
        "CustomerCollection",
        collection.id,
        "POSTED",
        {
          amount: input.amount,
          currencyCode: input.currencyCode,
          payload: { customerId: input.customerId, method: input.method },
        },
      );
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "CustomerCollection",
        entityId: collection.id,
        branchId: input.branchId ?? null,
        after: { amount: input.amount, allocations: input.allocations.length },
        eventType: "finance.customer_collection.posted",
        eventPayload: { collectionId: collection.id, amount: input.amount },
      });
      return { id: collection.id };
    });
  }

  async createSupplierBill(
    businessId: string,
    actorUserId: string,
    input: CreateSupplierBillInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "AP_MANAGE", async (transaction, actor) => {
      await assertSupplier(transaction, businessId, input.supplierId);
      const branch = input.branchId
        ? await assertBranch(transaction, businessId, input.branchId)
        : null;
      const total = totalLines(input.lines);
      const number = await allocateDocumentNumber(transaction, {
        businessId,
        branchId: input.branchId ?? null,
        documentType: "BILL",
        ...(branch ? { branchCode: branch.code } : {}),
      });
      const bill = await transaction.supplierBill.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId ?? null,
          number,
          supplierDocument: input.supplierDocument ?? null,
          currencyCode: input.currencyCode,
          totalAmount: moneyToDb(total),
          balanceAmount: moneyToDb(total),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          notes: input.notes ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.supplierBillLine.createMany({
        data: input.lines.map((line) => ({
          businessId,
          billId: bill.id,
          itemId: line.itemId ?? null,
          description: line.description,
          quantity: moneyToDb(line.quantity),
          unitCost: moneyToDb(line.unitAmount),
          taxAmount: moneyToDb(line.taxAmount),
          lineTotal: moneyToDb(lineTotal(line)),
        })),
      });
      await accountingEvent(transaction, businessId, "SupplierBill", bill.id, "POSTED", {
        amount: total,
        currencyCode: input.currencyCode,
        payload: { number, supplierId: input.supplierId },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "SupplierBill",
        entityId: bill.id,
        branchId: input.branchId ?? null,
        after: { number, total },
        eventType: "finance.supplier_bill.posted",
        eventPayload: { billId: bill.id, number, total },
      });
      return { id: bill.id };
    });
  }

  async paySupplierBill(
    businessId: string,
    actorUserId: string,
    input: PaySupplierBillInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "AP_MANAGE", async (transaction, actor) => {
      await assertSupplier(transaction, businessId, input.supplierId);
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      assertAllocations(input.amount, input.allocations);
      const payment = await transaction.supplierPayment.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          supplierId: input.supplierId,
          amount: moneyToDb(input.amount),
          unallocatedAmount: moneyToDb(
            input.amount - input.allocations.reduce((sum, row) => sum + row.amount, 0),
          ),
          currencyCode: input.currencyCode,
          method: input.method,
          reference: input.reference ?? null,
          ...(input.paidAt ? { paidAt: new Date(input.paidAt) } : {}),
          createdByMembershipId: actor.membershipId,
        },
      });
      for (const allocation of input.allocations) {
        const bill = await transaction.supplierBill.findUnique({
          where: { id_businessId: { id: allocation.documentId, businessId } },
        });
        if (!bill || bill.supplierId !== input.supplierId) {
          throw new BusinessAccessError(
            "INVALID_INPUT",
            "Supplier bill allocation does not match supplier.",
          );
        }
        if (allocation.amount > toNumber(bill.balanceAmount)) {
          throw new BusinessAccessError(
            "INVALID_INPUT",
            "Payment allocation exceeds supplier bill balance.",
          );
        }
        const paidAmount = toNumber(bill.paidAmount) + allocation.amount;
        const balanceAmount = toNumber(bill.totalAmount) - paidAmount;
        await transaction.supplierPaymentAllocation.create({
          data: {
            businessId,
            paymentId: payment.id,
            billId: bill.id,
            amount: moneyToDb(allocation.amount),
          },
        });
        await transaction.supplierBill.update({
          where: { id_businessId: { id: bill.id, businessId } },
          data: {
            paidAmount: moneyToDb(paidAmount),
            balanceAmount: moneyToDb(balanceAmount),
            status: balanceAmount <= 0 ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }
      await accountingEvent(transaction, businessId, "SupplierPayment", payment.id, "POSTED", {
        amount: input.amount,
        currencyCode: input.currencyCode,
        payload: { supplierId: input.supplierId, method: input.method },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "SupplierPayment",
        entityId: payment.id,
        branchId: input.branchId ?? null,
        after: { amount: input.amount, allocations: input.allocations.length },
        eventType: "finance.supplier_payment.posted",
        eventPayload: { paymentId: payment.id, amount: input.amount },
      });
      return { id: payment.id };
    });
  }

  async createExpenseCategory(
    businessId: string,
    actorUserId: string,
    input: CreateExpenseCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "EXPENSE_MANAGE", async (transaction, actor) => {
      const category = await transaction.expenseCategory.create({
        data: { businessId, code: input.code, name: input.name },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "ExpenseCategory",
        entityId: category.id,
        after: { code: input.code, name: input.name },
        eventType: "finance.expense_category.created",
      });
      return { id: category.id };
    });
  }

  async createExpense(
    businessId: string,
    actorUserId: string,
    input: CreateExpenseInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "EXPENSE_MANAGE", async (transaction, actor) => {
      await assertExpenseCategory(transaction, businessId, input.categoryId);
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      const expense = await transaction.expense.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          categoryId: input.categoryId,
          amount: moneyToDb(input.amount),
          taxAmount: moneyToDb(input.taxAmount),
          currencyCode: input.currencyCode,
          paymentMethod: input.paymentMethod,
          ...(input.spentAt ? { spentAt: new Date(input.spentAt) } : {}),
          supplierName: input.supplierName ?? null,
          description: input.description,
          attachmentUrl: input.attachmentUrl ?? null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await accountingEvent(transaction, businessId, "Expense", expense.id, "POSTED", {
        amount: input.amount,
        currencyCode: input.currencyCode,
        payload: { categoryId: input.categoryId, paymentMethod: input.paymentMethod },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "Expense",
        entityId: expense.id,
        branchId: input.branchId ?? null,
        after: { amount: input.amount, description: input.description },
        eventType: "finance.expense.posted",
        eventPayload: { expenseId: expense.id, amount: input.amount },
      });
      return { id: expense.id };
    });
  }

  async createBankAccount(
    businessId: string,
    actorUserId: string,
    input: CreateBankAccountInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BANK_MANAGE", async (transaction, actor) => {
      const account = await transaction.bankAccount.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          type: input.type,
          currencyCode: input.currencyCode,
          openingBalance: moneyToDb(input.openingBalance),
          currentBalance: moneyToDb(input.openingBalance),
        },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "BankAccount",
        entityId: account.id,
        after: { code: input.code, type: input.type, openingBalance: input.openingBalance },
        eventType: "finance.bank_account.created",
      });
      return { id: account.id };
    });
  }

  async postBankTransaction(
    businessId: string,
    actorUserId: string,
    input: PostBankTransactionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BANK_MANAGE", async (transaction, actor) => {
      const account = await assertBankAccount(transaction, businessId, input.accountId);
      if (account.currencyCode !== input.currencyCode) {
        throw new BusinessAccessError(
          "INVALID_INPUT",
          "Bank transaction currency must match account currency.",
        );
      }
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      const delta = balanceDelta(input.kind, input.amount);
      const bankTransaction = await transaction.bankTransaction.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          accountId: input.accountId,
          kind: input.kind,
          amount: moneyToDb(input.amount),
          currencyCode: input.currencyCode,
          reference: input.reference ?? null,
          description: input.description,
          ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
          createdByMembershipId: actor.membershipId,
        },
      });
      await transaction.bankAccount.update({
        where: { id_businessId: { id: input.accountId, businessId } },
        data: { currentBalance: { increment: moneyToDb(delta) } },
      });
      await accountingEvent(
        transaction,
        businessId,
        "BankTransaction",
        bankTransaction.id,
        "POSTED",
        {
          amount: input.amount,
          currencyCode: input.currencyCode,
          payload: { accountId: input.accountId, kind: input.kind, delta },
        },
      );
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "BankTransaction",
        entityId: bankTransaction.id,
        branchId: input.branchId ?? null,
        after: { kind: input.kind, amount: input.amount, delta },
        eventType: "finance.bank_transaction.posted",
        eventPayload: { bankTransactionId: bankTransaction.id, amount: input.amount, delta },
      });
      return { id: bankTransaction.id };
    });
  }

  async postBankTransfer(
    businessId: string,
    actorUserId: string,
    input: PostBankTransferInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "BANK_MANAGE", async (transaction, actor) => {
      const [fromAccount, toAccount] = await Promise.all([
        assertBankAccount(transaction, businessId, input.fromAccountId),
        assertBankAccount(transaction, businessId, input.toAccountId),
      ]);
      if (fromAccount.id === toAccount.id) {
        throw new BusinessAccessError("INVALID_INPUT", "Transfer needs two different accounts.");
      }
      if (
        fromAccount.currencyCode !== input.currencyCode ||
        toAccount.currencyCode !== input.currencyCode
      ) {
        throw new BusinessAccessError(
          "INVALID_INPUT",
          "Transfer currency must match both accounts.",
        );
      }
      if (input.branchId) await assertBranch(transaction, businessId, input.branchId);
      const reference =
        input.reference ??
        `transfer-${input.fromAccountId.slice(0, 8)}-${input.toAccountId.slice(0, 8)}`;

      const outTransaction = await transaction.bankTransaction.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          accountId: input.fromAccountId,
          kind: "TRANSFER_OUT",
          amount: moneyToDb(input.amount),
          currencyCode: input.currencyCode,
          reference,
          description: input.description,
          ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
          createdByMembershipId: actor.membershipId,
        },
      });
      const inTransaction = await transaction.bankTransaction.create({
        data: {
          businessId,
          branchId: input.branchId ?? null,
          accountId: input.toAccountId,
          kind: "TRANSFER_IN",
          amount: moneyToDb(input.amount),
          currencyCode: input.currencyCode,
          reference,
          description: input.description,
          ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
          createdByMembershipId: actor.membershipId,
        },
      });

      await transaction.bankAccount.update({
        where: { id_businessId: { id: input.fromAccountId, businessId } },
        data: { currentBalance: { decrement: moneyToDb(input.amount) } },
      });
      await transaction.bankAccount.update({
        where: { id_businessId: { id: input.toAccountId, businessId } },
        data: { currentBalance: { increment: moneyToDb(input.amount) } },
      });
      await accountingEvent(transaction, businessId, "BankTransfer", outTransaction.id, "POSTED", {
        amount: input.amount,
        currencyCode: input.currencyCode,
        payload: {
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          inTransactionId: inTransaction.id,
        },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "BankTransfer",
        entityId: outTransaction.id,
        branchId: input.branchId ?? null,
        after: {
          amount: input.amount,
          currencyCode: input.currencyCode,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          outTransactionId: outTransaction.id,
          inTransactionId: inTransaction.id,
        },
        eventType: "finance.bank_transfer.posted",
        eventPayload: {
          bankTransferId: outTransaction.id,
          amount: input.amount,
          outTransactionId: outTransaction.id,
          inTransactionId: inTransaction.id,
        },
      });
      return { id: outTransaction.id };
    });
  }

  async adjustLoyalty(
    businessId: string,
    actorUserId: string,
    input: AdjustLoyaltyInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "LOYALTY_MANAGE", async (transaction, actor) => {
      await assertCustomer(transaction, businessId, input.customerId);
      const existing = await transaction.loyaltyAccount.findUnique({
        where: { customerId_businessId: { customerId: input.customerId, businessId } },
      });
      const signedPoints = input.kind === "EARN" ? input.points : -input.points;
      const resultingBalance = toNumber(existing?.pointsBalance) + signedPoints;
      if (resultingBalance < 0) {
        throw new BusinessAccessError("INVALID_INPUT", "Loyalty balance cannot go below zero.");
      }
      const account = await transaction.loyaltyAccount.upsert({
        where: { customerId_businessId: { customerId: input.customerId, businessId } },
        update: {
          pointsBalance: moneyToDb(resultingBalance),
          tier: input.tier ?? existing?.tier ?? "STANDARD",
          lastActivityAt: new Date(),
        },
        create: {
          businessId,
          customerId: input.customerId,
          pointsBalance: moneyToDb(resultingBalance),
          tier: input.tier ?? "STANDARD",
        },
      });
      const entry = await transaction.loyaltyEntry.create({
        data: {
          businessId,
          accountId: account.id,
          customerId: input.customerId,
          kind: input.kind,
          points: moneyToDb(signedPoints),
          resultingBalance: moneyToDb(resultingBalance),
          reference: input.reference ?? null,
          reason: input.reason,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          createdByMembershipId: actor.membershipId,
        },
      });
      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "LoyaltyAccount",
        entityId: account.id,
        after: { kind: input.kind, points: signedPoints, resultingBalance },
        eventType: "finance.loyalty.adjusted",
        eventPayload: { accountId: account.id, entryId: entry.id, resultingBalance },
      });
      return { id: entry.id };
    });
  }

  private async write<T>(
    businessId: string,
    actorUserId: string,
    permissionCode: string,
    operation: (
      transaction: DatabaseTransaction,
      actor: Awaited<ReturnType<typeof requirePermission>>,
    ) => Promise<T>,
  ): Promise<T> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await loadMembershipContext(transaction, businessId, actorUserId);
      await ensureAccessCatalogSync(transaction, businessId);
      const actor = await requirePermission(transaction, businessId, actorUserId, permissionCode);
      return operation(transaction, actor);
    });
  }
}

const invoiceInclude = {
  branch: { select: { name: true } },
  customer: {
    select: { id: true, name: true, creditLimit: true, creditTermsDays: true, creditHold: true },
  },
  createdBy: { include: { user: { select: { displayName: true } } } },
  lines: { select: { id: true } },
} satisfies Prisma.CustomerInvoiceInclude;

const collectionInclude = {
  branch: { select: { name: true } },
  customer: { select: { name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
  allocations: { select: { id: true } },
} satisfies Prisma.CustomerCollectionInclude;

const billInclude = {
  branch: { select: { name: true } },
  supplier: { select: { id: true, name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
  lines: { select: { id: true } },
} satisfies Prisma.SupplierBillInclude;

const supplierPaymentInclude = {
  branch: { select: { name: true } },
  supplier: { select: { name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
  allocations: { select: { id: true } },
} satisfies Prisma.SupplierPaymentInclude;

const expenseInclude = {
  branch: { select: { name: true } },
  category: { select: { name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
} satisfies Prisma.ExpenseInclude;

const bankTransactionInclude = {
  branch: { select: { name: true } },
  account: { select: { name: true } },
  createdBy: { include: { user: { select: { displayName: true } } } },
} satisfies Prisma.BankTransactionInclude;

function totalLines(lines: CreateCustomerInvoiceInput["lines"]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

function lineTotal(line: CreateCustomerInvoiceInput["lines"][number]): number {
  return Number((line.quantity * line.unitAmount + line.taxAmount).toFixed(2));
}

function assertAllocations(amount: number, allocations: readonly { amount: number }[]): void {
  const allocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  if (allocated > amount) {
    throw new BusinessAccessError(
      "INVALID_INPUT",
      "Allocated amount cannot be greater than payment amount.",
    );
  }
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

async function assertCustomer(
  transaction: DatabaseTransaction,
  businessId: string,
  customerId: string,
): Promise<{
  id: string;
  name: string;
  creditLimit: Prisma.Decimal;
  creditTermsDays: number | null;
  creditHold: boolean;
}> {
  const customer = await transaction.customer.findUnique({
    where: { id_businessId: { id: customerId, businessId } },
  });
  if (!customer) throw new BusinessAccessError("NOT_FOUND", "Customer was not found.");
  return customer;
}

async function assertCreditAllowed(
  transaction: DatabaseTransaction,
  businessId: string,
  customer: {
    id: string;
    name: string;
    creditLimit: Prisma.Decimal;
    creditHold: boolean;
  },
  newInvoiceTotal: number,
): Promise<void> {
  if (customer.creditHold) {
    throw new BusinessAccessError("CONFLICT", `${customer.name} is on credit hold.`);
  }
  const creditLimit = toNumber(customer.creditLimit);
  if (creditLimit <= 0) return;
  const aggregate = await transaction.customerInvoice.aggregate({
    where: { businessId, customerId: customer.id, balanceAmount: { gt: 0 } },
    _sum: { balanceAmount: true },
  });
  const currentReceivable = toNumber(aggregate._sum.balanceAmount ?? 0);
  if (currentReceivable + newInvoiceTotal > creditLimit + 0.0001) {
    throw new BusinessAccessError(
      "CONFLICT",
      `${customer.name} would exceed the configured credit limit.`,
    );
  }
}

async function assertSupplier(
  transaction: DatabaseTransaction,
  businessId: string,
  supplierId: string,
): Promise<void> {
  const supplier = await transaction.supplier.findUnique({
    where: { id_businessId: { id: supplierId, businessId } },
  });
  if (!supplier) throw new BusinessAccessError("NOT_FOUND", "Supplier was not found.");
}

async function assertExpenseCategory(
  transaction: DatabaseTransaction,
  businessId: string,
  categoryId: string,
): Promise<void> {
  const category = await transaction.expenseCategory.findUnique({
    where: { id_businessId: { id: categoryId, businessId } },
  });
  if (!category) throw new BusinessAccessError("NOT_FOUND", "Expense category was not found.");
}

async function assertBankAccount(
  transaction: DatabaseTransaction,
  businessId: string,
  accountId: string,
) {
  const account = await transaction.bankAccount.findUnique({
    where: { id_businessId: { id: accountId, businessId } },
  });
  if (!account) throw new BusinessAccessError("NOT_FOUND", "Bank account was not found.");
  return account;
}

function balanceDelta(kind: PostBankTransactionInput["kind"], amount: number): number {
  return ["WITHDRAWAL", "TRANSFER_OUT", "SUPPLIER_PAYMENT", "EXPENSE"].includes(kind)
    ? -amount
    : amount;
}

async function accountingEvent(
  transaction: DatabaseTransaction,
  businessId: string,
  sourceType: string,
  sourceId: string,
  eventType: string,
  input: { amount: number; currencyCode: string; payload: Record<string, unknown> },
): Promise<void> {
  await transaction.accountingEvent.upsert({
    where: {
      businessId_sourceType_sourceId_eventType: { businessId, sourceType, sourceId, eventType },
    },
    update: {},
    create: {
      businessId,
      sourceType,
      sourceId,
      eventType,
      amount: moneyToDb(input.amount),
      currencyCode: input.currencyCode,
      payload: input.payload as Prisma.InputJsonObject,
    },
  });
}

function mapCustomerInvoice(
  invoice: Prisma.CustomerInvoiceGetPayload<{ include: typeof invoiceInclude }>,
): CustomerInvoiceRow {
  const dueDate = invoice.dueDate ?? null;
  const daysOverdue = dueDate ? calculateDaysOverdue(dueDate) : 0;
  return {
    id: invoice.id,
    number: invoice.number,
    branchName: invoice.branch?.name ?? null,
    customerId: invoice.customer.id,
    customerName: invoice.customer.name,
    status: invoice.status,
    currencyCode: invoice.currencyCode,
    totalAmount: toNumber(invoice.totalAmount),
    paidAmount: toNumber(invoice.paidAmount),
    balanceAmount: toNumber(invoice.balanceAmount),
    dueDate: dueDate?.toISOString().slice(0, 10) ?? null,
    daysOverdue,
    ageingBucket: ageingBucket(daysOverdue),
    lineCount: invoice.lines.length,
    createdBy: invoice.createdBy.user.displayName,
    postedAt: invoice.postedAt.toISOString(),
  };
}

function mapCustomerCredit(
  customer: Prisma.CustomerGetPayload<{
    include: {
      invoices: { select: { balanceAmount: true; dueDate: true } };
    };
  }>,
): CustomerCreditRow {
  const receivableBalance = customer.invoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.balanceAmount),
    0,
  );
  const overdueInvoices = customer.invoices.filter(
    (invoice) => invoice.dueDate && calculateDaysOverdue(invoice.dueDate) > 0,
  );
  const overdueBalance = overdueInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.balanceAmount),
    0,
  );
  const maxDaysOverdue = overdueInvoices.reduce(
    (max, invoice) => Math.max(max, calculateDaysOverdue(invoice.dueDate ?? new Date())),
    0,
  );
  const creditLimit = toNumber(customer.creditLimit);
  return {
    customerId: customer.id,
    customerName: customer.name,
    creditLimit,
    receivableBalance,
    availableCredit: Math.max(0, creditLimit - receivableBalance),
    creditTermsDays: customer.creditTermsDays,
    creditHold: customer.creditHold,
    overdueBalance,
    maxDaysOverdue,
  };
}

function calculateDaysOverdue(dueDate: Date): number {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function ageingBucket(daysOverdue: number): CustomerInvoiceRow["ageingBucket"] {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  return "90_PLUS";
}

function mapCustomerCollection(
  collection: Prisma.CustomerCollectionGetPayload<{ include: typeof collectionInclude }>,
): CustomerCollectionRow {
  return {
    id: collection.id,
    branchName: collection.branch?.name ?? null,
    customerName: collection.customer.name,
    amount: toNumber(collection.amount),
    unallocatedAmount: toNumber(collection.unallocatedAmount),
    currencyCode: collection.currencyCode,
    method: collection.method,
    reference: collection.reference,
    allocationCount: collection.allocations.length,
    createdBy: collection.createdBy.user.displayName,
    collectedAt: collection.collectedAt.toISOString(),
  };
}

function mapSupplierBill(
  bill: Prisma.SupplierBillGetPayload<{ include: typeof billInclude }>,
): SupplierBillRow {
  return {
    id: bill.id,
    number: bill.number,
    branchName: bill.branch?.name ?? null,
    supplierId: bill.supplier.id,
    supplierName: bill.supplier.name,
    status: bill.status,
    currencyCode: bill.currencyCode,
    totalAmount: toNumber(bill.totalAmount),
    paidAmount: toNumber(bill.paidAmount),
    balanceAmount: toNumber(bill.balanceAmount),
    dueDate: bill.dueDate?.toISOString().slice(0, 10) ?? null,
    lineCount: bill.lines.length,
    createdBy: bill.createdBy.user.displayName,
    postedAt: bill.postedAt.toISOString(),
  };
}

function mapSupplierPayment(
  payment: Prisma.SupplierPaymentGetPayload<{ include: typeof supplierPaymentInclude }>,
): SupplierPaymentRow {
  return {
    id: payment.id,
    branchName: payment.branch?.name ?? null,
    supplierName: payment.supplier.name,
    amount: toNumber(payment.amount),
    unallocatedAmount: toNumber(payment.unallocatedAmount),
    currencyCode: payment.currencyCode,
    method: payment.method,
    reference: payment.reference,
    allocationCount: payment.allocations.length,
    createdBy: payment.createdBy.user.displayName,
    paidAt: payment.paidAt.toISOString(),
  };
}

function mapExpense(
  expense: Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>,
): ExpenseRow {
  return {
    id: expense.id,
    branchName: expense.branch?.name ?? null,
    categoryId: expense.categoryId,
    categoryName: expense.category.name,
    status: expense.status,
    amount: toNumber(expense.amount),
    taxAmount: toNumber(expense.taxAmount),
    currencyCode: expense.currencyCode,
    paymentMethod: expense.paymentMethod,
    supplierName: expense.supplierName,
    description: expense.description,
    createdBy: expense.createdBy.user.displayName,
    spentAt: expense.spentAt.toISOString(),
  };
}

function mapExpenseCategory(category: {
  id: string;
  code: string;
  name: string;
  status: ExpenseCategoryRow["status"];
}): ExpenseCategoryRow {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    status: category.status,
  };
}

function mapBankAccount(account: {
  id: string;
  code: string;
  name: string;
  type: BankAccountRow["type"];
  currencyCode: string;
  openingBalance: unknown;
  currentBalance: unknown;
  status: BankAccountRow["status"];
}): BankAccountRow {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    currencyCode: account.currencyCode,
    openingBalance: toNumber(account.openingBalance),
    currentBalance: toNumber(account.currentBalance),
    status: account.status,
  };
}

function mapBankTransaction(
  transaction: Prisma.BankTransactionGetPayload<{ include: typeof bankTransactionInclude }>,
): BankTransactionRow {
  return {
    id: transaction.id,
    accountName: transaction.account.name,
    branchName: transaction.branch?.name ?? null,
    kind: transaction.kind,
    amount: toNumber(transaction.amount),
    currencyCode: transaction.currencyCode,
    reference: transaction.reference,
    description: transaction.description,
    createdBy: transaction.createdBy.user.displayName,
    occurredAt: transaction.occurredAt.toISOString(),
  };
}

function mapLoyaltyAccount(account: {
  id: string;
  customerId: string;
  pointsBalance: unknown;
  tier: string;
  lastActivityAt: Date;
  customer: { id: string; name: string };
}): LoyaltyAccountRow {
  return {
    id: account.id,
    customerId: account.customer.id,
    customerName: account.customer.name,
    pointsBalance: toNumber(account.pointsBalance),
    tier: account.tier,
    lastActivityAt: account.lastActivityAt.toISOString(),
  };
}
