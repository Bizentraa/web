import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import {
  DatabaseLifecycle,
  businessAccessProvider,
  catalogProvider,
  databaseProvider,
  importProvider,
  inventoryProvider,
  posProvider,
  pricingProvider,
} from "./composition/providers.js";
import { BusinessFoundationController } from "./controllers/business-foundation.controller.js";
import { CatalogController } from "./controllers/catalog.controller.js";
import { ImportController, PosController } from "./controllers/pos.controller.js";
import { InventoryController } from "./controllers/inventory.controller.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
  ],
  controllers: [
    HealthController,
    BusinessFoundationController,
    CatalogController,
    ImportController,
    InventoryController,
    PosController,
  ],
  providers: [
    databaseProvider,
    businessAccessProvider,
    catalogProvider,
    importProvider,
    inventoryProvider,
    pricingProvider,
    posProvider,
    DatabaseLifecycle,
  ],
})
export class AppModule {}
