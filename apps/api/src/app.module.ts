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
  productionReadinessProvider,
  pricingProvider,
  reportingOperationsProvider,
  storeReliabilityProvider,
} from "./composition/providers.js";
import { BusinessEnginesController } from "./controllers/business-engines.controller.js";
import { BusinessFoundationController } from "./controllers/business-foundation.controller.js";
import { CatalogController } from "./controllers/catalog.controller.js";
import { FinanceController } from "./controllers/finance.controller.js";
import { ImportController, PosController } from "./controllers/pos.controller.js";
import { InventoryController } from "./controllers/inventory.controller.js";
import { ProductionReadinessController } from "./controllers/production-readiness.controller.js";
import { ReportingOperationsController } from "./controllers/reporting-operations.controller.js";
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
    ProductionReadinessController,
    ReportingOperationsController,
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
    productionReadinessProvider,
    reportingOperationsProvider,
    pricingProvider,
    posProvider,
    storeReliabilityProvider,
    DatabaseLifecycle,
  ],
})
export class AppModule {}
