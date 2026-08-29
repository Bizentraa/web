import { Body, Controller, Get, Headers, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createFulfillmentOrderSchema,
  createPurchaseOrderSchema,
  createPurchaseRequestSchema,
  createStockCountSchema,
  decidePurchaseRequestSchema,
  postStockCountSchema,
  receivePurchaseOrderSchema,
  reorderSettingSchema,
  reserveSalesOrderSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  updateFulfillmentStatusSchema,
} from "@bizentra/contracts";
import { InventoryService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P3 Inventory, Purchasing and Fulfillment")
@Controller("businesses/:businessId/inventory")
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get("overview")
  @ApiOperation({ summary: "Read stock, purchasing and fulfillment overview" })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.getOverview(businessId, identity.userId);
  }

  @Post("adjustments")
  @ApiOperation({ summary: "Post an opening-stock or stock-adjustment movement" })
  adjustStock(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.adjustStock(
      businessId,
      identity.userId,
      stockAdjustmentSchema.parse(body),
    );
  }

  @Post("transfers")
  @ApiOperation({ summary: "Move stock between Locations with paired movement rows" })
  transferStock(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.transferStock(
      businessId,
      identity.userId,
      stockTransferSchema.parse(body),
    );
  }

  @Post("stock-counts")
  @ApiOperation({ summary: "Open a stock count and freeze expected quantities" })
  createStockCount(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.createStockCount(
      businessId,
      identity.userId,
      createStockCountSchema.parse(body),
    );
  }

  @Post("stock-counts/:stockCountId/post")
  @ApiOperation({ summary: "Post a stock count and write variance movements" })
  postStockCount(
    @Param("businessId") businessId: string,
    @Param("stockCountId") stockCountId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.postStockCount(
      businessId,
      identity.userId,
      stockCountId,
      postStockCountSchema.parse(body),
    );
  }

  @Put("reorder-settings")
  @ApiOperation({ summary: "Create or update reorder settings for an Item at a Location" })
  upsertReorderSetting(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.upsertReorderSetting(
      businessId,
      identity.userId,
      reorderSettingSchema.parse(body),
    );
  }

  @Post("purchase-requests")
  createPurchaseRequest(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.createPurchaseRequest(
      businessId,
      identity.userId,
      createPurchaseRequestSchema.parse(body),
    );
  }

  @Post("purchase-requests/:requestId/decision")
  decidePurchaseRequest(
    @Param("businessId") businessId: string,
    @Param("requestId") requestId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.decidePurchaseRequest(
      businessId,
      identity.userId,
      requestId,
      decidePurchaseRequestSchema.parse(body),
    );
  }

  @Post("purchase-orders")
  createPurchaseOrder(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.createPurchaseOrder(
      businessId,
      identity.userId,
      createPurchaseOrderSchema.parse(body),
    );
  }

  @Post("purchase-orders/:purchaseOrderId/receipts")
  receivePurchaseOrder(
    @Param("businessId") businessId: string,
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.receivePurchaseOrder(
      businessId,
      identity.userId,
      purchaseOrderId,
      receivePurchaseOrderSchema.parse(body),
    );
  }

  @Post("fulfillment-orders")
  createFulfillmentOrder(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.createFulfillmentOrder(
      businessId,
      identity.userId,
      createFulfillmentOrderSchema.parse(body),
    );
  }

  @Post("sales-orders/:salesOrderId/reserve")
  @ApiOperation({
    summary: "Reserve available stock for a sales order and create fulfillment work",
  })
  reserveSalesOrder(
    @Param("businessId") businessId: string,
    @Param("salesOrderId") salesOrderId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.reserveSalesOrder(
      businessId,
      identity.userId,
      reserveSalesOrderSchema.parse({
        ...(typeof body === "object" && body !== null ? body : {}),
        salesOrderId,
      }),
    );
  }

  @Put("fulfillment-orders/:fulfillmentOrderId/status")
  updateFulfillmentStatus(
    @Param("businessId") businessId: string,
    @Param("fulfillmentOrderId") fulfillmentOrderId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.inventory.updateFulfillmentStatus(
      businessId,
      identity.userId,
      fulfillmentOrderId,
      updateFulfillmentStatusSchema.parse(body),
    );
  }
}
