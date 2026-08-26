import type { OnApplicationShutdown, Provider } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import {
  BusinessAccessService,
  CatalogService,
  FinanceService,
  ImportService,
  InventoryService,
} from "@bizentra/domain-business-access";
import { PosService, PricingService } from "@bizentra/domain-commerce";
import { createDatabaseClient, type DatabaseClient } from "@bizentra/database";

import { DATABASE } from "./tokens.js";

export const databaseProvider: Provider = {
  provide: DATABASE,
  useFactory: () => createDatabaseClient(),
};

export const businessAccessProvider: Provider = {
  provide: BusinessAccessService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new BusinessAccessService(database),
};

export const catalogProvider: Provider = {
  provide: CatalogService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new CatalogService(database),
};

export const importProvider: Provider = {
  provide: ImportService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new ImportService(database),
};

export const financeProvider: Provider = {
  provide: FinanceService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new FinanceService(database),
};

export const inventoryProvider: Provider = {
  provide: InventoryService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new InventoryService(database),
};

export const pricingProvider: Provider = {
  provide: PricingService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new PricingService(database),
};

export const posProvider: Provider = {
  provide: PosService,
  inject: [DATABASE],
  useFactory: (database: DatabaseClient) => new PosService(database),
};

@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: DatabaseClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.$disconnect();
  }
}
