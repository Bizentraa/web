import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  adjustLoyaltySchema,
  collectCustomerPaymentSchema,
  createBankAccountSchema,
  createCustomerInvoiceSchema,
  createExpenseCategorySchema,
  createExpenseSchema,
  createSupplierBillSchema,
  paySupplierBillSchema,
  postBankTransactionSchema,
} from "@bizentra/contracts";
import { FinanceService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P4 Finance, Credit and Loyalty")
@Controller("businesses/:businessId/finance")
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly finance: FinanceService) {}

  @Get("overview")
  @ApiOperation({
    summary: "Read receivables, payables, expenses, cash, loyalty and accounting events",
  })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.getOverview(businessId, identity.userId);
  }

  @Post("customer-invoices")
  createCustomerInvoice(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.createCustomerInvoice(
      businessId,
      identity.userId,
      createCustomerInvoiceSchema.parse(body),
    );
  }

  @Post("customer-collections")
  collectCustomerPayment(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.collectCustomerPayment(
      businessId,
      identity.userId,
      collectCustomerPaymentSchema.parse(body),
    );
  }

  @Post("supplier-bills")
  createSupplierBill(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.createSupplierBill(
      businessId,
      identity.userId,
      createSupplierBillSchema.parse(body),
    );
  }

  @Post("supplier-payments")
  paySupplierBill(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.paySupplierBill(
      businessId,
      identity.userId,
      paySupplierBillSchema.parse(body),
    );
  }

  @Post("expense-categories")
  createExpenseCategory(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.createExpenseCategory(
      businessId,
      identity.userId,
      createExpenseCategorySchema.parse(body),
    );
  }

  @Post("expenses")
  createExpense(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.createExpense(businessId, identity.userId, createExpenseSchema.parse(body));
  }

  @Post("bank-accounts")
  createBankAccount(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.createBankAccount(
      businessId,
      identity.userId,
      createBankAccountSchema.parse(body),
    );
  }

  @Post("bank-transactions")
  postBankTransaction(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.postBankTransaction(
      businessId,
      identity.userId,
      postBankTransactionSchema.parse(body),
    );
  }

  @Post("loyalty-adjustments")
  adjustLoyalty(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.finance.adjustLoyalty(businessId, identity.userId, adjustLoyaltySchema.parse(body));
  }
}
