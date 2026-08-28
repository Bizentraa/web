import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";

export type DatabaseClient = PrismaClient;
export type DatabaseTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL): DatabaseClient {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to start a database-backed Bizentra service.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

function readTransactionTimeout(): number {
  const configuredTimeout = Number(process.env.PRISMA_TRANSACTION_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return 60_000;
}

export async function withBusinessContext<T>(
  database: DatabaseClient,
  businessId: string,
  work: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SELECT set_config('app.current_business_id', ${businessId}, true)`;
      return work(transaction);
    },
    { timeout: readTransactionTimeout() },
  );
}

export async function databaseIsReady(database: DatabaseClient): Promise<boolean> {
  try {
    await database.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
