import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createBrandSchema,
  createCategorySchema,
  createCustomerGroupSchema,
  createCustomerSchema,
  createImportBatchSchema,
  createItemSchema,
  createPriceListSchema,
  createPromotionSchema,
  createSupplierSchema,
  createTaxCategorySchema,
  createUnitSchema,
} from "@bizentra/contracts";
import { CatalogService } from "@bizentra/domain-business-access";

import { identityForBusiness } from "./identity.js";

@ApiTags("P1 Master Data")
@Controller("businesses/:businessId/catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Post("defaults")
  @ApiOperation({ summary: "Create or repair the default unit, tax category and price list" })
  ensureDefaults(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.ensureP1Defaults(businessId, identity.userId);
  }

  @Get("summary")
  @ApiOperation({ summary: "Read the current P1 master-data summary" })
  getSummary(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.getSummary(businessId, identity.userId);
  }

  @Post("units")
  createUnit(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createUnit(businessId, identity.userId, createUnitSchema.parse(body));
  }

  @Post("categories")
  createCategory(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createCategory(
      businessId,
      identity.userId,
      createCategorySchema.parse(body),
    );
  }

  @Post("brands")
  createBrand(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createBrand(businessId, identity.userId, createBrandSchema.parse(body));
  }

  @Post("tax-categories")
  createTaxCategory(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createTaxCategory(
      businessId,
      identity.userId,
      createTaxCategorySchema.parse(body),
    );
  }

  @Post("price-lists")
  createPriceList(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createPriceList(
      businessId,
      identity.userId,
      createPriceListSchema.parse(body),
    );
  }

  @Post("items")
  createItem(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createItem(businessId, identity.userId, createItemSchema.parse(body));
  }

  @Post("promotions")
  createPromotion(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createPromotion(
      businessId,
      identity.userId,
      createPromotionSchema.parse(body),
    );
  }

  @Post("customer-groups")
  createCustomerGroup(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
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
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createCustomer(
      businessId,
      identity.userId,
      createCustomerSchema.parse(body),
    );
  }

  @Post("suppliers")
  createSupplier(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const identity = identityForBusiness(headers, businessId);
    return this.catalog.createSupplier(
      businessId,
      identity.userId,
      createSupplierSchema.parse(body),
    );
  }

  @Post("import-batches")
  createImportBatch(
    @Param("businessId") businessId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
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
