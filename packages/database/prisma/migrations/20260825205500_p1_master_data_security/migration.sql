-- CC-P1 master data uses the same Business isolation boundary as P0.
-- The API sets app.current_business_id locally inside each scoped transaction.

ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "units"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "unit_conversions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_conversions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "unit_conversions"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_categories"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brands" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "brands"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_tags"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_tag_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_tag_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_tag_assignments"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "custom_attribute_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_attribute_definitions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "custom_attribute_definitions"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "tax_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "tax_categories"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "tax_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "tax_rates"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "price_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_lists" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "price_lists"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "items"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_variants" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_variants"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_identifiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_identifiers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_identifiers"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_prices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_prices"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "promotions"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "customer_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_groups" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "customer_groups"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "customers"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "suppliers"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "supplier_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "supplier_items"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "item_attribute_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_attribute_values" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "item_attribute_values"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;
CREATE POLICY "business_isolation" ON "import_batches"
  USING ("businessId"::text = current_setting('app.current_business_id', true))
  WITH CHECK ("businessId"::text = current_setting('app.current_business_id', true));

INSERT INTO "permissions" ("id", "code", "name", "createdAt")
VALUES
  (gen_random_uuid(), 'CATALOG_VIEW', 'View catalog master data', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CATALOG_MANAGE', 'Manage catalog master data', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PRICE_VIEW', 'View prices', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PRICE_MANAGE', 'Manage prices', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PROMOTION_VIEW', 'View promotions', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PROMOTION_MANAGE', 'Manage promotions', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'TAX_VIEW', 'View tax setup', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'TAX_MANAGE', 'Manage tax setup', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CUSTOMER_VIEW', 'View customers', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CUSTOMER_MANAGE', 'Manage customers', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SUPPLIER_VIEW', 'View suppliers', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'SUPPLIER_MANAGE', 'Manage suppliers', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'IMPORT_VIEW', 'View import batches', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'IMPORT_MANAGE', 'Manage import batches', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

INSERT INTO "role_permissions" ("id", "businessId", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."businessId", r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."isSystem" = true
  AND r."code" = 'OWNER'
  AND p."code" IN (
    'CATALOG_VIEW',
    'CATALOG_MANAGE',
    'PRICE_VIEW',
    'PRICE_MANAGE',
    'PROMOTION_VIEW',
    'PROMOTION_MANAGE',
    'TAX_VIEW',
    'TAX_MANAGE',
    'CUSTOMER_VIEW',
    'CUSTOMER_MANAGE',
    'SUPPLIER_VIEW',
    'SUPPLIER_MANAGE',
    'IMPORT_VIEW',
    'IMPORT_MANAGE'
  )
ON CONFLICT ("businessId", "roleId", "permissionId") DO NOTHING;
