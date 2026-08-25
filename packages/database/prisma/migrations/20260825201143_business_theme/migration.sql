-- CreateEnum
CREATE TYPE "ThemePreset" AS ENUM ('GENERAL_RETAIL', 'GROCERY', 'FASHION', 'ELECTRONICS', 'HARDWARE', 'BOOKSTORE', 'COSMETICS', 'FURNITURE', 'JEWELRY', 'AUTO_PARTS', 'RESTAURANT', 'CAFE', 'BAKERY', 'FOOD_TRUCK', 'BAR', 'HOTEL_REVENUE', 'SALON', 'GARAGE', 'COMPUTER_REPAIR', 'LAUNDRY', 'TAILORING', 'FIELD_SERVICES', 'DISTRIBUTION', 'VAN_SALES', 'RENTAL', 'B2B_TRADE', 'PHARMACY', 'FUEL', 'HOTEL', 'HEALTHCARE');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "business_themes" (
    "businessId" UUID NOT NULL,
    "preset" "ThemePreset" NOT NULL DEFAULT 'GENERAL_RETAIL',
    "defaultMode" "ThemeMode" NOT NULL DEFAULT 'LIGHT',
    "allowUserModeChange" BOOLEAN NOT NULL DEFAULT true,
    "brandPrimary" CHAR(7),
    "brandAccent" CHAR(7),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_themes_pkey" PRIMARY KEY ("businessId"),
    CONSTRAINT "business_themes_revision_check" CHECK ("revision" >= 1),
    CONSTRAINT "business_themes_brand_primary_check" CHECK ("brandPrimary" IS NULL OR "brandPrimary" ~ '^#[0-9A-F]{6}$'),
    CONSTRAINT "business_themes_brand_accent_check" CHECK ("brandAccent" IS NULL OR "brandAccent" ~ '^#[0-9A-F]{6}$')
);

-- Existing P0 Businesses receive the safe platform fallback. New Businesses create this
-- record in the same transaction as the Business foundation.
INSERT INTO "business_themes" (
  "businessId",
  "preset",
  "defaultMode",
  "allowUserModeChange",
  "revision",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'GENERAL_RETAIL'::"ThemePreset",
  'LIGHT'::"ThemeMode",
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "businesses"
ON CONFLICT ("businessId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "business_themes" ADD CONSTRAINT "business_themes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Theme settings are Business-scoped and use the same forced isolation boundary as P0.
ALTER TABLE "business_themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_themes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "business_themes"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));
