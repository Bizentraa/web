import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createMigrationValidationSchema,
  createSavedReportViewSchema,
  createWebhookSubscriptionSchema,
  recordWebhookDeliverySchema,
  requestDataExportSchema,
} from "@bizentra/contracts";
import { ReportingOperationsService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P7 Reporting, Integrations and Migration")
@Controller("businesses/:businessId/reporting-operations")
export class ReportingOperationsController {
  constructor(
    @Inject(ReportingOperationsService) private readonly reporting: ReportingOperationsService,
  ) {}

  @Get("overview")
  @ApiOperation({ summary: "Read reporting, export, webhook and migration status" })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.getOverview(identity.businessId, identity.userId);
  }

  @Post("report-views")
  createSavedReportView(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.createSavedReportView(
      identity.businessId,
      identity.userId,
      createSavedReportViewSchema.parse(body),
    );
  }

  @Post("exports")
  requestDataExport(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.requestDataExport(
      identity.businessId,
      identity.userId,
      requestDataExportSchema.parse(body),
    );
  }

  @Post("webhooks")
  createWebhookSubscription(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.createWebhookSubscription(
      identity.businessId,
      identity.userId,
      createWebhookSubscriptionSchema.parse(body),
    );
  }

  @Post("webhook-deliveries")
  recordWebhookDelivery(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.recordWebhookDelivery(
      identity.businessId,
      identity.userId,
      recordWebhookDeliverySchema.parse(body),
    );
  }

  @Post("migration-validations")
  createMigrationValidation(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reporting.createMigrationValidation(
      identity.businessId,
      identity.userId,
      createMigrationValidationSchema.parse(body),
    );
  }
}
