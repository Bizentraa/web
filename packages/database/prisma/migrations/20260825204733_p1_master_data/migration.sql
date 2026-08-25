-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('PRODUCT', 'SERVICE', 'INGREDIENT', 'PART', 'BUNDLE', 'FEE', 'RENTAL');

-- CreateEnum
CREATE TYPE "IdentifierKind" AS ENUM ('SKU', 'BARCODE', 'QR', 'SUPPLIER_CODE', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "TaxRateKind" AS ENUM ('SALES', 'PURCHASE', 'BOTH');

-- CreateEnum
CREATE TYPE "ImportEntityKind" AS ENUM ('ITEMS', 'CUSTOMERS', 'SUPPLIERS', 'OPENING_DATA');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'FAILED', 'APPLIED');

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_conversions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "fromUnitId" UUID NOT NULL,
    "toUnitId" UUID NOT NULL,
    "factor" DECIMAL(19,6) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_categories" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parentId" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_tags" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "item_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_tag_assignments" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_attribute_definitions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "appliesTo" VARCHAR(40) NOT NULL,
    "dataType" VARCHAR(30) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "custom_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_categories" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(240),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "taxCategoryId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "rate" DECIMAL(9,6) NOT NULL,
    "kind" "TaxRateKind" NOT NULL DEFAULT 'BOTH',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "description" VARCHAR(500),
    "categoryId" UUID,
    "brandId" UUID,
    "baseUnitId" UUID NOT NULL,
    "taxCategoryId" UUID,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "purchasable" BOOLEAN NOT NULL DEFAULT false,
    "stockTracked" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_variants" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "item_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_identifiers" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "kind" "IdentifierKind" NOT NULL,
    "value" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_prices" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "variantId" UUID,
    "branchId" UUID,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "costPrice" DECIMAL(19,4),
    "minQuantity" DECIMAL(19,4) NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "item_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "discountKind" "DiscountKind" NOT NULL,
    "discountValue" DECIMAL(19,4) NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "conditions" JSONB,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "groupId" UUID,
    "billingAddress" JSONB,
    "notes" VARCHAR(500),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "leadTimeDays" INTEGER,
    "paymentTerms" VARCHAR(120),
    "address" JSONB,
    "notes" VARCHAR(500),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_items" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "supplierCode" VARCHAR(80),
    "costPrice" DECIMAL(19,4),
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "supplier_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_attribute_values" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "item_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "entityKind" "ImportEntityKind" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'RECEIVED',
    "fileName" VARCHAR(240) NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "units_businessId_status_idx" ON "units"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "units_businessId_code_key" ON "units"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "units_id_businessId_key" ON "units"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_conversions_businessId_fromUnitId_toUnitId_key" ON "unit_conversions"("businessId", "fromUnitId", "toUnitId");

-- CreateIndex
CREATE INDEX "item_categories_businessId_status_idx" ON "item_categories"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_businessId_code_key" ON "item_categories"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_id_businessId_key" ON "item_categories"("id", "businessId");

-- CreateIndex
CREATE INDEX "brands_businessId_status_idx" ON "brands"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "brands_businessId_code_key" ON "brands"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "brands_id_businessId_key" ON "brands"("id", "businessId");

-- CreateIndex
CREATE INDEX "item_tags_businessId_status_idx" ON "item_tags"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "item_tags_businessId_code_key" ON "item_tags"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "item_tags_id_businessId_key" ON "item_tags"("id", "businessId");

-- CreateIndex
CREATE INDEX "item_tag_assignments_businessId_tagId_idx" ON "item_tag_assignments"("businessId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "item_tag_assignments_businessId_itemId_tagId_key" ON "item_tag_assignments"("businessId", "itemId", "tagId");

-- CreateIndex
CREATE INDEX "custom_attribute_definitions_businessId_status_idx" ON "custom_attribute_definitions"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_attribute_definitions_businessId_code_key" ON "custom_attribute_definitions"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "custom_attribute_definitions_id_businessId_key" ON "custom_attribute_definitions"("id", "businessId");

-- CreateIndex
CREATE INDEX "tax_categories_businessId_status_idx" ON "tax_categories"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_businessId_code_key" ON "tax_categories"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_id_businessId_key" ON "tax_categories"("id", "businessId");

-- CreateIndex
CREATE INDEX "tax_rates_businessId_taxCategoryId_status_idx" ON "tax_rates"("businessId", "taxCategoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_businessId_code_key" ON "tax_rates"("businessId", "code");

-- CreateIndex
CREATE INDEX "price_lists_businessId_status_idx" ON "price_lists"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_businessId_code_key" ON "price_lists"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_id_businessId_key" ON "price_lists"("id", "businessId");

-- CreateIndex
CREATE INDEX "items_businessId_name_idx" ON "items"("businessId", "name");

-- CreateIndex
CREATE INDEX "items_businessId_status_idx" ON "items"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "items_businessId_code_key" ON "items"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "items_id_businessId_key" ON "items"("id", "businessId");

-- CreateIndex
CREATE INDEX "item_variants_businessId_status_idx" ON "item_variants"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "item_variants_businessId_itemId_code_key" ON "item_variants"("businessId", "itemId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "item_variants_id_businessId_key" ON "item_variants"("id", "businessId");

-- CreateIndex
CREATE INDEX "item_identifiers_businessId_itemId_idx" ON "item_identifiers"("businessId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "item_identifiers_businessId_value_key" ON "item_identifiers"("businessId", "value");

-- CreateIndex
CREATE INDEX "item_prices_businessId_itemId_branchId_idx" ON "item_prices"("businessId", "itemId", "branchId");

-- CreateIndex
CREATE INDEX "item_prices_businessId_priceListId_idx" ON "item_prices"("businessId", "priceListId");

-- CreateIndex
CREATE INDEX "promotions_businessId_status_startsAt_idx" ON "promotions"("businessId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_businessId_code_key" ON "promotions"("businessId", "code");

-- CreateIndex
CREATE INDEX "customer_groups_businessId_status_idx" ON "customer_groups"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_businessId_code_key" ON "customer_groups"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_id_businessId_key" ON "customer_groups"("id", "businessId");

-- CreateIndex
CREATE INDEX "customers_businessId_name_idx" ON "customers"("businessId", "name");

-- CreateIndex
CREATE INDEX "customers_businessId_status_idx" ON "customers"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_businessId_code_key" ON "customers"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_businessId_key" ON "customers"("id", "businessId");

-- CreateIndex
CREATE INDEX "suppliers_businessId_name_idx" ON "suppliers"("businessId", "name");

-- CreateIndex
CREATE INDEX "suppliers_businessId_status_idx" ON "suppliers"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_businessId_code_key" ON "suppliers"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_id_businessId_key" ON "suppliers"("id", "businessId");

-- CreateIndex
CREATE INDEX "supplier_items_businessId_itemId_idx" ON "supplier_items"("businessId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_items_businessId_supplierId_itemId_key" ON "supplier_items"("businessId", "supplierId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "item_attribute_values_businessId_itemId_attributeId_key" ON "item_attribute_values"("businessId", "itemId", "attributeId");

-- CreateIndex
CREATE INDEX "import_batches_businessId_entityKind_status_idx" ON "import_batches"("businessId", "entityKind", "status");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_fromUnitId_businessId_fkey" FOREIGN KEY ("fromUnitId", "businessId") REFERENCES "units"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_toUnitId_businessId_fkey" FOREIGN KEY ("toUnitId", "businessId") REFERENCES "units"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tag_assignments" ADD CONSTRAINT "item_tag_assignments_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tag_assignments" ADD CONSTRAINT "item_tag_assignments_tagId_businessId_fkey" FOREIGN KEY ("tagId", "businessId") REFERENCES "item_tags"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_attribute_definitions" ADD CONSTRAINT "custom_attribute_definitions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_categories" ADD CONSTRAINT "tax_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_taxCategoryId_businessId_fkey" FOREIGN KEY ("taxCategoryId", "businessId") REFERENCES "tax_categories"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_businessId_fkey" FOREIGN KEY ("categoryId", "businessId") REFERENCES "item_categories"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_brandId_businessId_fkey" FOREIGN KEY ("brandId", "businessId") REFERENCES "brands"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_baseUnitId_businessId_fkey" FOREIGN KEY ("baseUnitId", "businessId") REFERENCES "units"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_taxCategoryId_businessId_fkey" FOREIGN KEY ("taxCategoryId", "businessId") REFERENCES "tax_categories"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_variants" ADD CONSTRAINT "item_variants_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_identifiers" ADD CONSTRAINT "item_identifiers_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_identifiers" ADD CONSTRAINT "item_identifiers_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_priceListId_businessId_fkey" FOREIGN KEY ("priceListId", "businessId") REFERENCES "price_lists"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_variantId_businessId_fkey" FOREIGN KEY ("variantId", "businessId") REFERENCES "item_variants"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "branches"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_groupId_businessId_fkey" FOREIGN KEY ("groupId", "businessId") REFERENCES "customer_groups"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_supplierId_businessId_fkey" FOREIGN KEY ("supplierId", "businessId") REFERENCES "suppliers"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_items" ADD CONSTRAINT "supplier_items_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_attribute_values" ADD CONSTRAINT "item_attribute_values_itemId_businessId_fkey" FOREIGN KEY ("itemId", "businessId") REFERENCES "items"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_attribute_values" ADD CONSTRAINT "item_attribute_values_attributeId_businessId_fkey" FOREIGN KEY ("attributeId", "businessId") REFERENCES "custom_attribute_definitions"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
