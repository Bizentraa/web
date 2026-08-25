import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import {
  DatabaseLifecycle,
  businessAccessProvider,
  databaseProvider,
} from "./composition/providers.js";
import { BusinessFoundationController } from "./controllers/business-foundation.controller.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
  ],
  controllers: [HealthController, BusinessFoundationController],
  providers: [databaseProvider, businessAccessProvider, DatabaseLifecycle],
})
export class AppModule {}
