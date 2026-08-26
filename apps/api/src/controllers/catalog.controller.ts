import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  assignItemTagsSchema,
  createAttributeDefinitionSchema,
  createBrandSchema,
  createCategorySchema,
  createCustomerGroupSchema,
  createCustomerSchema,
  createImportBatchSchema,
  createItemIdentifierSchema,
  createItemSchema,
  createItemTagSchema,
  createItemVariantSchema,
  createPriceListSchema,
  createPromotionSchema,
  createSupplierSchema,
  createTaxCategorySchema,
  createTaxRateSchema,
  createUnitConversionSchema,
  createUnitSchema,
  listQuerySchema,
  setItemAttributeValuesSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateCustomerSchema,
  updateItemSchema,
  updatePriceListSchema,
  updatePromotionSchema,
  updateSupplierSchema,
  updateTaxCategorySchema,
  updateTaxRateSchema,
  updateUnitSchema,
  upsertItemPriceSchema,
  upsertSupplierItemSchema,
} from "@bizentra/contracts";
import { CatalogService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

type RequestHeaders = Record<string, string | string[] | undefined>;

@ApiTags("P1 Master Data")
@Controller("businesses/:businessId/catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Post("defaults")
  @ApiOperation({ summary: "Create or repair the default unit, tax category and price list" })
  ensureDefaults(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.ensureP1Defaults(businessId, identity.userId);
  }

  @Get("summary")
  @ApiOperation({ summary: "Read the current master-data summary" })
  getSummary(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getSummary(businessId, identity.userId);
  }

  @Get("reference")
  @ApiOperation({ summary: "Read units, categories, brands, tax, price lists and groups" })
  getReference(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getReferenceData(businessId, identity.userId);
  }

  /* ------------------------------------------------------------------ units */

  @Post("units")
  createUnit(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createUnit(businessId, identity.userId, createUnitSchema.parse(body));
  }

  @Patch("units/:unitId")
  updateUnit(
    @Param("businessId") businessId: string,
    @Param("unitId") unitId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateUnit(
      businessId,
      identity.userId,
      unitId,
      updateUnitSchema.parse(body),
    );
  }

  @Post("unit-conversions")
  createUnitConversion(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createUnitConversion(
      businessId,
      identity.userId,
      createUnitConversionSchema.parse(body),
    );
  }

  /* ------------------------------------------------------- classification */

  @Post("categories")
  createCategory(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createCategory(
      businessId,
      identity.userId,
      createCategorySchema.parse(body),
    );
  }

  @Patch("categories/:categoryId")
  updateCategory(
    @Param("businessId") businessId: string,
    @Param("categoryId") categoryId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateCategory(
      businessId,
      identity.userId,
      categoryId,
      updateCategorySchema.parse(body),
    );
  }

  @Post("brands")
  createBrand(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createBrand(businessId, identity.userId, createBrandSchema.parse(body));
  }

  @Patch("brands/:brandId")
  updateBrand(
    @Param("businessId") businessId: string,
    @Param("brandId") brandId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateBrand(
      businessId,
      identity.userId,
      brandId,
      updateBrandSchema.parse(body),
    );
  }

  @Post("tags")
  createTag(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createItemTag(businessId, identity.userId, createItemTagSchema.parse(body));
  }

  @Post("attributes")
  createAttribute(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createAttributeDefinition(
      businessId,
      identity.userId,
      createAttributeDefinitionSchema.parse(body),
    );
  }

  /* -------------------------------------------------------------------- tax */

  @Post("tax-categories")
  createTaxCategory(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createTaxCategory(
      businessId,
      identity.userId,
      createTaxCategorySchema.parse(body),
    );
  }

  @Patch("tax-categories/:taxCategoryId")
  updateTaxCategory(
    @Param("businessId") businessId: string,
    @Param("taxCategoryId") taxCategoryId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateTaxCategory(
      businessId,
      identity.userId,
      taxCategoryId,
      updateTaxCategorySchema.parse(body),
    );
  }

  @Post("tax-rates")
  createTaxRate(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createTaxRate(businessId, identity.userId, createTaxRateSchema.parse(body));
  }

  @Patch("tax-rates/:taxRateId")
  updateTaxRate(
    @Param("businessId") businessId: string,
    @Param("taxRateId") taxRateId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateTaxRate(
      businessId,
      identity.userId,
      taxRateId,
      updateTaxRateSchema.parse(body),
    );
  }

  /* ----------------------------------------------------------------- prices */

  @Post("price-lists")
  createPriceList(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createPriceList(
      businessId,
      identity.userId,
      createPriceListSchema.parse(body),
    );
  }

  @Patch("price-lists/:priceListId")
  updatePriceList(
    @Param("businessId") businessId: string,
    @Param("priceListId") priceListId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updatePriceList(
      businessId,
      identity.userId,
      priceListId,
      updatePriceListSchema.parse(body),
    );
  }

  /* ------------------------------------------------------------------ items */

  @Get("items")
  listItems(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.listItems(businessId, identity.userId, listQuerySchema.parse(query));
  }

  @Get("items/:itemId")
  getItem(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getItem(businessId, identity.userId, itemId);
  }

  @Post("items")
  createItem(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createItem(businessId, identity.userId, createItemSchema.parse(body));
  }

  @Patch("items/:itemId")
  updateItem(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateItem(
      businessId,
      identity.userId,
      itemId,
      updateItemSchema.parse(body),
    );
  }

  @Post("items/:itemId/variants")
  createVariant(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createItemVariant(
      businessId,
      identity.userId,
      itemId,
      createItemVariantSchema.parse(body),
    );
  }

  @Post("items/:itemId/identifiers")
  createIdentifier(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createItemIdentifier(
      businessId,
      identity.userId,
      itemId,
      createItemIdentifierSchema.parse(body),
    );
  }

  @Put("items/:itemId/prices")
  upsertItemPrice(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.upsertItemPrice(
      businessId,
      identity.userId,
      itemId,
      upsertItemPriceSchema.parse(body),
    );
  }

  @Put("items/:itemId/tags")
  assignTags(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.assignItemTags(
      businessId,
      identity.userId,
      itemId,
      assignItemTagsSchema.parse(body),
    );
  }

  @Put("items/:itemId/attributes")
  setAttributes(
    @Param("businessId") businessId: string,
    @Param("itemId") itemId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.setItemAttributeValues(
      businessId,
      identity.userId,
      itemId,
      setItemAttributeValuesSchema.parse(body),
    );
  }

  /* ------------------------------------------------------------- promotions */

  @Get("promotions")
  listPromotions(@Param("businessId") businessId: string, @Headers() headers: RequestHeaders) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.listPromotions(businessId, identity.userId);
  }

  @Post("promotions")
  createPromotion(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createPromotion(
      businessId,
      identity.userId,
      createPromotionSchema.parse(body),
    );
  }

  @Patch("promotions/:promotionId")
  updatePromotion(
    @Param("businessId") businessId: string,
    @Param("promotionId") promotionId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updatePromotion(
      businessId,
      identity.userId,
      promotionId,
      updatePromotionSchema.parse(body),
    );
  }

  /* -------------------------------------------------------------- customers */

  @Get("customers")
  listCustomers(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.listCustomers(businessId, identity.userId, listQuerySchema.parse(query));
  }

  @Get("customers/:customerId")
  getCustomer(
    @Param("businessId") businessId: string,
    @Param("customerId") customerId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getCustomer(businessId, identity.userId, customerId);
  }

  @Post("customer-groups")
  createCustomerGroup(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createCustomerGroup(
      businessId,
      identity.userId,
      createCustomerGroupSchema.parse(body),
    );
  }

  @Post("customers")
  createCustomer(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createCustomer(
      businessId,
      identity.userId,
      createCustomerSchema.parse(body),
    );
  }

  @Patch("customers/:customerId")
  updateCustomer(
    @Param("businessId") businessId: string,
    @Param("customerId") customerId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateCustomer(
      businessId,
      identity.userId,
      customerId,
      updateCustomerSchema.parse(body),
    );
  }

  /* -------------------------------------------------------------- suppliers */

  @Get("suppliers")
  listSuppliers(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Query() query: Record<string, string>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.listSuppliers(businessId, identity.userId, listQuerySchema.parse(query));
  }

  @Get("suppliers/:supplierId")
  getSupplier(
    @Param("businessId") businessId: string,
    @Param("supplierId") supplierId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getSupplier(businessId, identity.userId, supplierId);
  }

  @Post("suppliers")
  createSupplier(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createSupplier(
      businessId,
      identity.userId,
      createSupplierSchema.parse(body),
    );
  }

  @Patch("suppliers/:supplierId")
  updateSupplier(
    @Param("businessId") businessId: string,
    @Param("supplierId") supplierId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.updateSupplier(
      businessId,
      identity.userId,
      supplierId,
      updateSupplierSchema.parse(body),
    );
  }

  @Put("suppliers/:supplierId/items")
  upsertSupplierItem(
    @Param("businessId") businessId: string,
    @Param("supplierId") supplierId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.upsertSupplierItem(
      businessId,
      identity.userId,
      supplierId,
      upsertSupplierItemSchema.parse(body),
    );
  }

  @Post("import-batches")
  createImportBatch(
    @Param("businessId") businessId: string,
    @Headers() headers: RequestHeaders,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createImportBatch(
      businessId,
      identity.userId,
      createImportBatchSchema.parse(body),
    );
  }
}
