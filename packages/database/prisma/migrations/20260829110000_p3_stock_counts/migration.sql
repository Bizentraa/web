-- CC-P3-006: stock count sessions freeze expected quantities and post controlled variances.
CREATE TYPE "StockCountStatus" AS ENUM ('OPEN', 'POSTED', 'CANCELLED');

CREATE TABLE "stock_count_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "number" VARCHAR(60) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'OPEN',
    "varianceReason" VARCHAR(500),
    "createdByMembershipId" UUID NOT NULL,
    "postedByMembershipId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_count_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL,
    "stockCountId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "expectedQuantity" DECIMAL(19,4) NOT NULL,
    "countedQuantity" DECIMAL(19,4),
    "varianceQuantity" DECIMAL(19,4),
    "note" VARCHAR(240),

    CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_count_sessions_businessId_number_key"
    ON "stock_count_sessions"("businessId", "number");
CREATE UNIQUE INDEX "stock_count_sessions_id_businessId_key"
    ON "stock_count_sessions"("id", "businessId");
CREATE INDEX "stock_count_sessions_businessId_status_createdAt_idx"
    ON "stock_count_sessions"("businessId", "status", "createdAt");
CREATE INDEX "stock_count_sessions_businessId_locationId_status_idx"
    ON "stock_count_sessions"("businessId", "locationId", "status");

CREATE UNIQUE INDEX "stock_count_lines_businessId_stockCountId_itemId_variantId_key"
    ON "stock_count_lines"("businessId", "stockCountId", "itemId", "variantId");
CREATE UNIQUE INDEX "stock_count_lines_id_businessId_key"
    ON "stock_count_lines"("id", "businessId");
CREATE INDEX "stock_count_lines_businessId_itemId_idx"
    ON "stock_count_lines"("businessId", "itemId");

ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_branchId_businessId_fkey"
    FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_locationId_businessId_fkey"
    FOREIGN KEY ("locationId", "businessId") REFERENCES "locations"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_createdByMembershipId_businessId_fkey"
    FOREIGN KEY ("createdByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_postedByMembershipId_businessId_fkey"
    FOREIGN KEY ("postedByMembershipId", "businessId") REFERENCES "business_memberships"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_stockCountId_businessId_fkey"
    FOREIGN KEY ("stockCountId", "businessId") REFERENCES "stock_count_sessions"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_itemId_businessId_fkey"
    FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_variantId_businessId_fkey"
    FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_count_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_count_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "stock_count_sessions"
    USING ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid)
    WITH CHECK ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid);

ALTER TABLE "stock_count_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_count_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "stock_count_lines"
    USING ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid)
    WITH CHECK ("businessId" = NULLIF(current_setting('app.current_business_id', true), '')::uuid);
