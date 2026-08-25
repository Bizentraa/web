import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@bizentra/contracts";
import { databaseIsReady, type DatabaseClient } from "@bizentra/database";

import { DATABASE } from "../composition/tokens.js";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: DatabaseClient) {}

  @Get("live")
  @ApiOperation({ summary: "Confirm that the API process is running" })
  live(): HealthResponse {
    return {
      status: "ok",
      service: "bizentra-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Confirm that the API and its database are ready" })
  async ready(): Promise<HealthResponse> {
    const databaseReady = await databaseIsReady(this.database);
    return {
      status: databaseReady ? "ok" : "degraded",
      service: "bizentra-api",
      version: "0.1.0",
      checks: { database: databaseReady ? "up" : "down" },
      timestamp: new Date().toISOString(),
    };
  }
}
