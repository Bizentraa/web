import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  heartbeatDeviceSchema,
  markOfflineQueueItemSchema,
  queueOfflineOperationSchema,
  registerDeviceSchema,
  resolveSyncConflictSchema,
} from "@bizentra/contracts";
import { StoreReliabilityService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P6 Offline, Devices and Store Reliability")
@Controller("businesses/:businessId/store-reliability")
export class StoreReliabilityController {
  constructor(
    @Inject(StoreReliabilityService) private readonly reliability: StoreReliabilityService,
  ) {}

  @Get("overview")
  @ApiOperation({ summary: "Read device health, offline queue and sync conflicts" })
  getOverview(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.getOverview(businessId, identity.userId);
  }

  @Post("devices")
  registerDevice(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.registerDevice(
      businessId,
      identity.userId,
      registerDeviceSchema.parse(body),
    );
  }

  @Patch("devices/:deviceId/heartbeat")
  heartbeatDevice(
    @Param("businessId") businessId: string,
    @Param("deviceId") deviceId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.heartbeatDevice(
      businessId,
      identity.userId,
      deviceId,
      heartbeatDeviceSchema.parse(body),
    );
  }

  @Post("offline-queue")
  queueOfflineOperation(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.queueOfflineOperation(
      businessId,
      identity.userId,
      queueOfflineOperationSchema.parse(body),
    );
  }

  @Patch("offline-queue/:queueItemId")
  markOfflineQueueItem(
    @Param("businessId") businessId: string,
    @Param("queueItemId") queueItemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.markOfflineQueueItem(
      businessId,
      identity.userId,
      queueItemId,
      markOfflineQueueItemSchema.parse(body),
    );
  }

  @Patch("sync-conflicts/:conflictId")
  resolveSyncConflict(
    @Param("businessId") businessId: string,
    @Param("conflictId") conflictId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.reliability.resolveSyncConflict(
      businessId,
      identity.userId,
      conflictId,
      resolveSyncConflictSchema.parse(body),
    );
  }
}
