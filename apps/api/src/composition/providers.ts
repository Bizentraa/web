import type { OnApplicationShutdown, Provider } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { BusinessAccessService, CatalogService } from "@bizentra/domain-business-access";
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

@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: DatabaseClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.$disconnect();
  }
}
