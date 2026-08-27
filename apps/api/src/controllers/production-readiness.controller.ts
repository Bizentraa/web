import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createPrivacyRequestSchema,
  createReleaseReadinessSchema,
  recordBackupRunSchema,
  recordSecurityEventSchema,
  resolvePrivacyRequestSchema,
  upsertReadinessCheckSchema,
} from "@bizentra/contracts";
import { ProductionReadinessService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P8 Security, Operations and Production Readiness")
@Controller("businesses/:businessId/production-readiness")
export class ProductionReadinessController {
  constructor(
    @Inject(ProductionReadinessService) private readonly readiness: ProductionReadinessService,
  ) {}

  @Get("overview")
  @ApiOperation({ summary: "Read security, backup, privacy and release-readiness status" })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.getOverview(identity.businessId, identity.userId);
  }

  @Post("security-events")
  recordSecurityEvent(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.recordSecurityEvent(
      identity.businessId,
      identity.userId,
      recordSecurityEventSchema.parse(body),
    );
  }

  @Post("backup-runs")
  recordBackupRun(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.recordBackupRun(
      identity.businessId,
      identity.userId,
      recordBackupRunSchema.parse(body),
    );
  }

  @Post("readiness-checks")
  upsertReadinessCheck(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.upsertReadinessCheck(
      identity.businessId,
      identity.userId,
      upsertReadinessCheckSchema.parse(body),
    );
  }

  @Post("privacy-requests")
  createPrivacyRequest(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.createPrivacyRequest(
      identity.businessId,
      identity.userId,
      createPrivacyRequestSchema.parse(body),
    );
  }

  @Patch("privacy-requests/:privacyRequestId")
  resolvePrivacyRequest(
    @Param("privacyRequestId") privacyRequestId: string,
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.resolvePrivacyRequest(
      identity.businessId,
      identity.userId,
      privacyRequestId,
      resolvePrivacyRequestSchema.parse(body),
    );
  }

  @Post("releases")
  createReleaseReadiness(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.readiness.createReleaseReadiness(
      identity.businessId,
      identity.userId,
      createReleaseReadinessSchema.parse(body),
    );
  }
}
