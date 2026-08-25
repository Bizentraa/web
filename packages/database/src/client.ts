import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";
import type { Prisma } from "./generated/prisma/client.js";

export type DatabaseClient = PrismaClient;
export type DatabaseTransaction = Prisma.TransactionClient;

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL): DatabaseClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to start a database-backed Bizentra service.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export async function withBusinessContext<T>(
  database: DatabaseClient,
  businessId: string,
  work: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.current_business_id', ${businessId}, true)`;
    return work(transaction);
  });
}

export async function databaseIsReady(database: DatabaseClient): Promise<boolean> {
  try {
    await database.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
