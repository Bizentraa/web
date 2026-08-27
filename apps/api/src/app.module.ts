import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import {
  DatabaseLifecycle,
  businessAccessProvider,
  businessEnginesProvider,
  catalogProvider,
  databaseProvider,
  financeProvider,
  importProvider,
  inventoryProvider,
  posProvider,
  pricingProvider,
  storeReliabilityProvider,
} from "./composition/providers.js";
import { BusinessEnginesController } from "./controllers/business-engines.controller.js";
import { BusinessFoundationController } from "./controllers/business-foundation.controller.js";
import { CatalogController } from "./controllers/catalog.controller.js";
import { FinanceController } from "./controllers/finance.controller.js";
import { ImportController, PosController } from "./controllers/pos.controller.js";
import { InventoryController } from "./controllers/inventory.controller.js";
import { StoreReliabilityController } from "./controllers/store-reliability.controller.js";
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
    BusinessEnginesController,
    CatalogController,
    ImportController,
    FinanceController,
    InventoryController,
    PosController,
    StoreReliabilityController,
  ],
  providers: [
    databaseProvider,
    businessAccessProvider,
    businessEnginesProvider,
    catalogProvider,
    financeProvider,
    importProvider,
    inventoryProvider,
    pricingProvider,
    posProvider,
    storeReliabilityProvider,
    DatabaseLifecycle,
  ],
})
export class AppModule {}
