import { Body, Controller, Get, Headers, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  addPaymentSchema,
  cashMovementSchema,
  catalogSearchSchema,
  closeShiftSchema,
  confirmSaleSchema,
  createExchangeSchema,
  createReturnSchema,
  createSaleSchema,
  importEntityKindSchema,
  openShiftSchema,
  quoteSaleSchema,
  resolvePaymentSchema,
  saleQuerySchema,
  syncQueueSchema,
  updateHeldSaleSchema,
  validateImportSchema,
  voidSaleSchema,
} from "@bizentra/contracts";
import { ImportService } from "@bizentra/domain-business-access";
import { PosService, PricingService } from "@bizentra/domain-commerce";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P2 Sales, POS and Payments")
@Controller("businesses/:businessId/pos")
export class PosController {
  constructor(
    @Inject(PosService) private readonly pos: PosService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  /* ------------------------------------------------------------------ shift */

  @Post("shifts")
  @ApiOperation({ summary: "Open a POS shift with its opening cash float" })
  openShift(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.openShift(businessId, identity.userId, openShiftSchema.parse(body));
  }

  @Get("shifts")
  @ApiOperation({ summary: "List recent shifts with their reconciliation totals" })
  listShifts(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.listShifts(businessId, identity.userId);
  }

  @Get("shifts/current")
  @ApiOperation({ summary: "Read the open shift for one Branch and register" })
  getCurrentShift(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query("branchId") branchId: string,
    @Query("registerCode") registerCode: string,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.getCurrentShift(businessId, identity.userId, branchId, registerCode);
  }

  @Post("shifts/:shiftId/cash-movements")
  @ApiOperation({ summary: "Record a pay-in, pay-out or safe drop inside the shift" })
  addCashMovement(
    @Param("businessId") businessId: string,
    @Param("shiftId") shiftId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.addCashMovement(
      businessId,
      identity.userId,
      shiftId,
      cashMovementSchema.parse(body),
    );
  }

  @Post("shifts/:shiftId/close")
  @ApiOperation({ summary: "Close the shift with a counted cash reconciliation" })
  closeShift(
    @Param("businessId") businessId: string,
    @Param("shiftId") shiftId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.closeShift(businessId, identity.userId, shiftId, closeShiftSchema.parse(body));
  }

  /* ------------------------------------------------------------- selling */

  @Get("catalog")
  @ApiOperation({ summary: "Search sellable items with their resolved price and tax" })
  searchCatalog(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pricing.searchSellableItems(
      businessId,
      identity.userId,
      catalogSearchSchema.parse(query),
    );
  }

  @Post("quote")
  @ApiOperation({ summary: "Price a cart without saving anything" })
  async quote(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    const resolved = await this.pricing.quote(
      businessId,
      identity.userId,
      quoteSaleSchema.parse(body),
    );
    return resolved.quote;
  }

  @Post("sales")
  @ApiOperation({ summary: "Confirm or hold a sale using an idempotency key" })
  createSale(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.createSale(businessId, identity.userId, createSaleSchema.parse(body));
  }

  @Get("sales")
  @ApiOperation({ summary: "Search sales, held carts and returns" })
  listSales(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.listSales(businessId, identity.userId, saleQuerySchema.parse(query));
  }

  @Get("sales/:saleId")
  @ApiOperation({ summary: "Read one sale with lines, tenders, returns and history" })
  getSale(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.getSale(businessId, identity.userId, saleId);
  }

  @Put("sales/:saleId")
  @ApiOperation({ summary: "Replace the lines of a held sale" })
  updateHeldSale(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.updateHeldSale(
      businessId,
      identity.userId,
      saleId,
      updateHeldSaleSchema.parse(body),
    );
  }

  @Post("sales/:saleId/confirm")
  @ApiOperation({ summary: "Confirm a held sale" })
  confirmSale(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.confirmSale(
      businessId,
      identity.userId,
      saleId,
      confirmSaleSchema.parse(body ?? {}),
    );
  }

  @Post("sales/:saleId/void")
  @ApiOperation({ summary: "Void an unpaid sale with a reason and approval" })
  voidSale(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.voidSale(businessId, identity.userId, saleId, voidSaleSchema.parse(body));
  }

  @Post("sales/:saleId/payments")
  @ApiOperation({ summary: "Take one tender against a sale, safely on retry" })
  addPayment(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.addPayment(businessId, identity.userId, saleId, addPaymentSchema.parse(body));
  }

  @Post("payments/:paymentId/resolve")
  @ApiOperation({ summary: "Resolve a payment that was left in the unknown state" })
  resolvePayment(
    @Param("businessId") businessId: string,
    @Param("paymentId") paymentId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.resolvePayment(
      businessId,
      identity.userId,
      paymentId,
      resolvePaymentSchema.parse(body),
    );
  }

  @Get("sales/:saleId/receipt")
  @ApiOperation({ summary: "Build the printable receipt for a sale" })
  getReceipt(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.getReceipt(businessId, identity.userId, saleId);
  }

  /* ------------------------------------------------------------- returns */

  @Post("sales/:saleId/returns")
  @ApiOperation({ summary: "Accept a return against the original sale" })
  createReturn(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.createReturn(
      businessId,
      identity.userId,
      saleId,
      createReturnSchema.parse(body),
    );
  }

  @Post("sales/:saleId/exchange")
  @ApiOperation({ summary: "Return items and sell the replacement in one controlled flow" })
  createExchange(
    @Param("businessId") businessId: string,
    @Param("saleId") saleId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.createExchange(
      businessId,
      identity.userId,
      saleId,
      createExchangeSchema.parse(body),
    );
  }

  @Post("sync")
  @ApiOperation({ summary: "Apply a queue of offline sales and payments idempotently" })
  sync(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.pos.sync(businessId, identity.userId, syncQueueSchema.parse(body));
  }
}

@ApiTags("P1 Import")
@Controller("businesses/:businessId/imports")
export class ImportController {
  constructor(@Inject(ImportService) private readonly imports: ImportService) {}

  @Get("template")
  @ApiOperation({ summary: "Download the CSV template for one import type" })
  getTemplate(@Query("entityKind") entityKind: string) {
    const kind = importEntityKindSchema.parse(entityKind ?? "ITEMS");
    return { ...this.imports.getTemplate(kind), columns: this.imports.getTemplateColumns(kind) };
  }

  @Get()
  @ApiOperation({ summary: "List import batches and their lifecycle state" })
  list(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.imports.list(businessId, identity.userId);
  }

  @Post("validate")
  @ApiOperation({ summary: "Validate a delimited file and store the preview" })
  validate(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.imports.validate(businessId, identity.userId, validateImportSchema.parse(body));
  }

  @Get(":batchId")
  @ApiOperation({ summary: "Read a stored import preview" })
  getPreview(
    @Param("businessId") businessId: string,
    @Param("batchId") batchId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.imports.getPreview(businessId, identity.userId, batchId);
  }

  @Post(":batchId/apply")
  @ApiOperation({ summary: "Create the records for every valid row" })
  apply(
    @Param("businessId") businessId: string,
    @Param("batchId") batchId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.imports.apply(businessId, identity.userId, batchId);
  }

  @Post(":batchId/rollback")
  @ApiOperation({ summary: "Remove the records an applied import created" })
  rollback(
    @Param("businessId") businessId: string,
    @Param("batchId") batchId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.imports.rollback(businessId, identity.userId, batchId);
  }
}
