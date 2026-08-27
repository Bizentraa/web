import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  attachBusinessDocumentSchema,
  createBomSchema,
  createBookingSchema,
  createCustomerAssetSchema,
  createDeliveryRouteSchema,
  createNotificationEventSchema,
  createTraceableUnitSchema,
  createWarrantyClaimSchema,
  createWorkflowStatusSchema,
  createWorkflowTransitionSchema,
  createWorkTicketSchema,
  postMaterialConsumptionSchema,
  updateDeliveryStopSchema,
  updateWorkTicketStatusSchema,
} from "@bizentra/contracts";
import { BusinessEnginesService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P5 Reusable Business Engines")
@Controller("businesses/:businessId/business-engines")
export class BusinessEnginesController {
  constructor(@Inject(BusinessEnginesService) private readonly engines: BusinessEnginesService) {}

  @Get("overview")
  @ApiOperation({
    summary: "Read reusable workflow, ticket, booking, traceability and delivery engines",
  })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.getOverview(businessId, identity.userId);
  }

  @Post("workflow-statuses")
  createWorkflowStatus(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createWorkflowStatus(
      businessId,
      identity.userId,
      createWorkflowStatusSchema.parse(body),
    );
  }

  @Post("workflow-transitions")
  createWorkflowTransition(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createWorkflowTransition(
      businessId,
      identity.userId,
      createWorkflowTransitionSchema.parse(body),
    );
  }

  @Post("work-tickets")
  createWorkTicket(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createWorkTicket(
      businessId,
      identity.userId,
      createWorkTicketSchema.parse(body),
    );
  }

  @Patch("work-tickets/:ticketId/status")
  updateWorkTicketStatus(
    @Param("businessId") businessId: string,
    @Param("ticketId") ticketId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.updateWorkTicketStatus(
      businessId,
      identity.userId,
      ticketId,
      updateWorkTicketStatusSchema.parse(body),
    );
  }

  @Post("bookings")
  createBooking(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createBooking(businessId, identity.userId, createBookingSchema.parse(body));
  }

  @Post("customer-assets")
  createCustomerAsset(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createCustomerAsset(
      businessId,
      identity.userId,
      createCustomerAssetSchema.parse(body),
    );
  }

  @Post("traceable-units")
  createTraceableUnit(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createTraceableUnit(
      businessId,
      identity.userId,
      createTraceableUnitSchema.parse(body),
    );
  }

  @Post("warranty-claims")
  createWarrantyClaim(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createWarrantyClaim(
      businessId,
      identity.userId,
      createWarrantyClaimSchema.parse(body),
    );
  }

  @Post("boms")
  createBom(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createBom(businessId, identity.userId, createBomSchema.parse(body));
  }

  @Post("material-consumptions")
  postMaterialConsumption(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.postMaterialConsumption(
      businessId,
      identity.userId,
      postMaterialConsumptionSchema.parse(body),
    );
  }

  @Post("delivery-routes")
  createDeliveryRoute(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createDeliveryRoute(
      businessId,
      identity.userId,
      createDeliveryRouteSchema.parse(body),
    );
  }

  @Patch("delivery-stops/:stopId")
  updateDeliveryStop(
    @Param("businessId") businessId: string,
    @Param("stopId") stopId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.updateDeliveryStop(
      businessId,
      identity.userId,
      stopId,
      updateDeliveryStopSchema.parse(body),
    );
  }

  @Post("notifications")
  createNotificationEvent(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.createNotificationEvent(
      businessId,
      identity.userId,
      createNotificationEventSchema.parse(body),
    );
  }

  @Post("documents")
  attachDocument(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.engines.attachDocument(
      businessId,
      identity.userId,
      attachBusinessDocumentSchema.parse(body),
    );
  }
}
