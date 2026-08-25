import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import {
  DatabaseLifecycle,
  businessAccessProvider,
  catalogProvider,
  databaseProvider,
} from "./composition/providers.js";
import { BusinessFoundationController } from "./controllers/business-foundation.controller.js";
import { CatalogController } from "./controllers/catalog.controller.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
  ],
  controllers: [HealthController, BusinessFoundationController, CatalogController],
  providers: [databaseProvider, businessAccessProvider, catalogProvider, DatabaseLifecycle],
})
export class AppModule {}
