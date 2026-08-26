import type {
  AssignItemTagsInput,
  CatalogRecordCreated,
  CatalogReferenceData,
  CatalogSummary,
  CreateAttributeDefinitionInput,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCustomerGroupInput,
  CreateCustomerInput,
  CreateImportBatchInput,
  CreateItemIdentifierInput,
  CreateItemInput,
  CreateItemTagInput,
  CreateItemVariantInput,
  CreatePriceListInput,
  CreatePromotionInput,
  CreateSupplierInput,
  CreateTaxCategoryInput,
  CreateTaxRateInput,
  CreateUnitConversionInput,
  CreateUnitInput,
  CustomerDetail,
  CustomerListRow,
  ItemCreated,
  ItemDetail,
  ItemListRow,
  ListQuery,
  P1DefaultsCreated,
  Paginated,
  PromotionConditions,
  PromotionRow,
  SetItemAttributeValuesInput,
  SupplierDetail,
  SupplierListRow,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateItemInput,
  UpdatePriceListInput,
  UpdatePromotionInput,
  UpdateSupplierInput,
  UpdateTaxCategoryInput,
  UpdateTaxRateInput,
  UpdateUnitInput,
  UpsertItemPriceInput,
  UpsertSupplierItemInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  type Prisma,
  withBusinessContext,
} from "@bizentra/database";
import {
  asJsonObject,
  BusinessAccessError,
  type MembershipContext,
  moneyToDb,
  pagination,
  quantityToDb,
  rateToDb,
  readTimeline,
  recordChange,
  requirePermission,
  toNumber,
  toOptionalNumber,
} from "@bizentra/domain-shared";
import { createId } from "@bizentra/ids";

const DEFAULT_PROMOTION_CONDITIONS: PromotionConditions = {
  scope: "SALE",
  itemIds: [],
  categoryIds: [],
  minimumQuantity: 0,
  minimumAmount: 0,
  buyQuantity: 0,
  getQuantity: 0,
  priority: 50,
};

export class CatalogService {
  constructor(private readonly database: DatabaseClient) {}

  /* ---------------------------------------------------------------- setup */

  async ensureP1Defaults(businessId: string, actorUserId: string): Promise<P1DefaultsCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "CATALOG_MANAGE");
      const business = await transaction.business.findUnique({
        where: { id: businessId },
        select: { defaultCurrency: true },
      });
      if (!business) throw new BusinessAccessError("NOT_FOUND", "Business was not found.");

      const unit = await transaction.unit.upsert({
        where: { businessId_code: { businessId, code: "EA" } },
        update: { name: "Each", precision: 0, status: "ACTIVE" },
        create: { businessId, code: "EA", name: "Each", precision: 0 },
      });
      const taxCategory = await transaction.taxCategory.upsert({
        where: { businessId_code: { businessId, code: "STANDARD" } },
        update: { name: "Standard Tax", status: "ACTIVE" },
        create: { businessId, code: "STANDARD", name: "Standard Tax" },
      });
      const taxRate = await transaction.taxRate.upsert({
        where: { businessId_code: { businessId, code: "STANDARD_ZERO" } },
        update: { name: "Standard Zero", rate: "0", kind: "BOTH", status: "ACTIVE" },
        create: {
          businessId,
          taxCategoryId: taxCategory.id,
          code: "STANDARD_ZERO",
          name: "Standard Zero",
          rate: "0",
          kind: "BOTH",
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
      const priceList = await transaction.priceList.upsert({
        where: { businessId_code: { businessId, code: "DEFAULT" } },
        update: {
          name: "Default Selling Price",
          currencyCode: business.defaultCurrency,
          isDefault: true,
        },
        create: {
          businessId,
          code: "DEFAULT",
          name: "Default Selling Price",
          currencyCode: business.defaultCurrency,
          isDefault: true,
        },
      });
      await transaction.customerGroup.upsert({
        where: { businessId_code: { businessId, code: "RETAIL" } },
        update: { name: "Retail" },
        create: { businessId, code: "RETAIL", name: "Retail" },
      });

      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "P1Defaults",
        entityId: businessId,
        after: {
          unitId: unit.id,
          taxCategoryId: taxCategory.id,
          taxRateId: taxRate.id,
          priceListId: priceList.id,
        },
      });

      return {
        unitId: unit.id,
        taxCategoryId: taxCategory.id,
        taxRateId: taxRate.id,
        priceListId: priceList.id,
      };
    });
  }

  async getSummary(businessId: string, actorUserId: string): Promise<CatalogSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");
      const [
        units,
        categories,
        brands,
        taxCategories,
        priceLists,
        items,
        promotions,
        customers,
        suppliers,
        importBatches,
        recentItems,
        recentCustomers,
        recentSuppliers,
      ] = await Promise.all([
        transaction.unit.count({ where: { businessId } }),
        transaction.itemCategory.count({ where: { businessId } }),
        transaction.brand.count({ where: { businessId } }),
        transaction.taxCategory.count({ where: { businessId } }),
        transaction.priceList.count({ where: { businessId } }),
        transaction.item.count({ where: { businessId } }),
        transaction.promotion.count({ where: { businessId } }),
        transaction.customer.count({ where: { businessId } }),
        transaction.supplier.count({ where: { businessId } }),
        transaction.importBatch.count({ where: { businessId } }),
        transaction.item.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { baseUnit: true, prices: { orderBy: { createdAt: "desc" }, take: 1 } },
        }),
        transaction.customer.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        transaction.supplier.findMany({
          where: { businessId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        counts: {
          units,
          categories,
          brands,
          taxCategories,
          priceLists,
          items,
          promotions,
          customers,
          suppliers,
          importBatches,
        },
        items: recentItems.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          kind: item.kind,
          status: item.status,
          unit: item.baseUnit.code,
          ...(item.prices[0] ? { price: toNumber(item.prices[0].unitPrice) } : {}),
        })),
        customers: recentCustomers.map((customer) => ({
          id: customer.id,
          code: customer.code,
          name: customer.name,
          status: customer.status,
        })),
        suppliers: recentSuppliers.map((supplier) => ({
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          status: supplier.status,
        })),
      };
    });
  }

  async getReferenceData(businessId: string, actorUserId: string): Promise<CatalogReferenceData> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");

      const [
        units,
        categories,
        brands,
        tags,
        attributes,
        taxCategories,
        priceLists,
        customerGroups,
        branches,
        unitConversions,
      ] = await Promise.all([
        transaction.unit.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.itemCategory.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.brand.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.itemTag.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.customAttributeDefinition.findMany({
          where: { businessId },
          orderBy: { code: "asc" },
        }),
        transaction.taxCategory.findMany({
          where: { businessId },
          orderBy: { code: "asc" },
          include: { rates: { orderBy: { effectiveFrom: "desc" } } },
        }),
        transaction.priceList.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.customerGroup.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.branch.findMany({ where: { businessId }, orderBy: { code: "asc" } }),
        transaction.unitConversion.findMany({ where: { businessId } }),
      ]);

      return {
        units: units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          name: unit.name,
          precision: unit.precision,
          status: unit.status,
        })),
        categories: categories.map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
          parentId: category.parentId,
          status: category.status,
        })),
        brands: brands.map((brand) => ({
          id: brand.id,
          code: brand.code,
          name: brand.name,
          status: brand.status,
        })),
        tags: tags.map((tag) => ({
          id: tag.id,
          code: tag.code,
          name: tag.name,
          status: tag.status,
        })),
        attributes: attributes.map((attribute) => ({
          id: attribute.id,
          code: attribute.code,
          name: attribute.name,
          appliesTo: attribute.appliesTo,
          dataType: attribute.dataType,
          status: attribute.status,
        })),
        taxCategories: taxCategories.map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
          status: category.status,
          rates: category.rates.map((rate) => ({
            id: rate.id,
            code: rate.code,
            name: rate.name,
            rate: toNumber(rate.rate),
            kind: rate.kind,
            effectiveFrom: rate.effectiveFrom.toISOString().slice(0, 10),
            effectiveTo: rate.effectiveTo?.toISOString().slice(0, 10) ?? null,
            status: rate.status,
          })),
        })),
        priceLists: priceLists.map((priceList) => ({
          id: priceList.id,
          code: priceList.code,
          name: priceList.name,
          currencyCode: priceList.currencyCode,
          isDefault: priceList.isDefault,
          status: priceList.status,
        })),
        customerGroups: customerGroups.map((group) => ({
          id: group.id,
          code: group.code,
          name: group.name,
          status: group.status,
        })),
        branches: branches.map((branch) => ({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          status: branch.status,
        })),
        unitConversions: unitConversions.map((conversion) => ({
          id: conversion.id,
          fromUnitId: conversion.fromUnitId,
          toUnitId: conversion.toUnitId,
          factor: toNumber(conversion.factor),
        })),
      };
    });
  }

  /* ---------------------------------------------------- units and structure */

  async createUnit(
    businessId: string,
    actorUserId: string,
    input: CreateUnitInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const unit = await transaction.unit.create({ data: { businessId, ...input } });
      await this.audit(transaction, businessId, actor, "CREATE", "Unit", unit.id, input);
      return { id: unit.id };
    });
  }

  async updateUnit(
    businessId: string,
    actorUserId: string,
    unitId: string,
    input: UpdateUnitInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.unit, businessId, unitId, "Unit");
      if (input.status === "INACTIVE") {
        const usedBy = await transaction.item.count({
          where: { businessId, baseUnitId: unitId, status: "ACTIVE" },
        });
        if (usedBy > 0) {
          throw new BusinessAccessError(
            "CONFLICT",
            `${usedBy} active Item(s) still use this unit. Change them first.`,
          );
        }
      }
      const after = await transaction.unit.update({
        where: { id: unitId },
        data: definedOnly(input),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Unit",
        unitId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: unitId };
    });
  }

  async createUnitConversion(
    businessId: string,
    actorUserId: string,
    input: CreateUnitConversionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      if (input.fromUnitId === input.toUnitId) {
        throw new BusinessAccessError(
          "INVALID_INPUT",
          "A conversion needs two different units, for example Box to Each.",
        );
      }
      await this.mustFind(transaction.unit, businessId, input.fromUnitId, "Unit");
      await this.mustFind(transaction.unit, businessId, input.toUnitId, "Unit");

      const conversion = await transaction.unitConversion.upsert({
        where: {
          businessId_fromUnitId_toUnitId: {
            businessId,
            fromUnitId: input.fromUnitId,
            toUnitId: input.toUnitId,
          },
        },
        update: { factor: quantityToDb(input.factor) },
        create: {
          businessId,
          fromUnitId: input.fromUnitId,
          toUnitId: input.toUnitId,
          factor: quantityToDb(input.factor),
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        "CREATE",
        "UnitConversion",
        conversion.id,
        input,
      );
      return { id: conversion.id };
    });
  }

  async createCategory(
    businessId: string,
    actorUserId: string,
    input: CreateCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      if (input.parentId) {
        await this.mustFind(transaction.itemCategory, businessId, input.parentId, "Category");
      }
      const category = await transaction.itemCategory.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          parentId: input.parentId ?? null,
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        "CREATE",
        "ItemCategory",
        category.id,
        input,
      );
      return { id: category.id };
    });
  }

  async updateCategory(
    businessId: string,
    actorUserId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(
        transaction.itemCategory,
        businessId,
        categoryId,
        "Category",
      );
      if (input.parentId === categoryId) {
        throw new BusinessAccessError("INVALID_INPUT", "A category cannot be its own parent.");
      }
      const after = await transaction.itemCategory.update({
        where: { id: categoryId },
        data: definedOnly(input),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "ItemCategory",
        categoryId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: categoryId };
    });
  }

  async createBrand(
    businessId: string,
    actorUserId: string,
    input: CreateBrandInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const brand = await transaction.brand.create({ data: { businessId, ...input } });
      await this.audit(transaction, businessId, actor, "CREATE", "Brand", brand.id, input);
      return { id: brand.id };
    });
  }

  async updateBrand(
    businessId: string,
    actorUserId: string,
    brandId: string,
    input: UpdateBrandInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.brand, businessId, brandId, "Brand");
      const after = await transaction.brand.update({
        where: { id: brandId },
        data: definedOnly(input),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Brand",
        brandId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: brandId };
    });
  }

  async createItemTag(
    businessId: string,
    actorUserId: string,
    input: CreateItemTagInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const tag = await transaction.itemTag.create({ data: { businessId, ...input } });
      await this.audit(transaction, businessId, actor, "CREATE", "ItemTag", tag.id, input);
      return { id: tag.id };
    });
  }

  async assignItemTags(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: AssignItemTagsInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.item, businessId, itemId, "Item");
      await transaction.itemTagAssignment.deleteMany({ where: { businessId, itemId } });
      if (input.tagIds.length) {
        const tags = await transaction.itemTag.findMany({
          where: { businessId, id: { in: input.tagIds } },
          select: { id: true },
        });
        if (tags.length !== new Set(input.tagIds).size) {
          throw new BusinessAccessError("NOT_FOUND", "One or more tags were not found.");
        }
        await transaction.itemTagAssignment.createMany({
          data: tags.map((tag) => ({ businessId, itemId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
      await this.audit(transaction, businessId, actor, "ASSIGN", "Item", itemId, {
        tagIds: input.tagIds,
      });
      return { id: itemId };
    });
  }

  async createAttributeDefinition(
    businessId: string,
    actorUserId: string,
    input: CreateAttributeDefinitionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const attribute = await transaction.customAttributeDefinition.create({
        data: { businessId, ...input },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        "CREATE",
        "CustomAttributeDefinition",
        attribute.id,
        input,
      );
      return { id: attribute.id };
    });
  }

  async setItemAttributeValues(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: SetItemAttributeValuesInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.item, businessId, itemId, "Item");
      for (const entry of input.values) {
        await this.mustFind(
          transaction.customAttributeDefinition,
          businessId,
          entry.attributeId,
          "Attribute",
        );
        await transaction.itemAttributeValue.upsert({
          where: {
            businessId_itemId_attributeId: {
              businessId,
              itemId,
              attributeId: entry.attributeId,
            },
          },
          update: { value: entry.value as Prisma.InputJsonValue },
          create: {
            businessId,
            itemId,
            attributeId: entry.attributeId,
            value: entry.value as Prisma.InputJsonValue,
          },
        });
      }
      await this.audit(transaction, businessId, actor, "UPDATE", "Item", itemId, {
        attributeCount: input.values.length,
      });
      return { id: itemId };
    });
  }

  /* ------------------------------------------------------------------- tax */

  async createTaxCategory(
    businessId: string,
    actorUserId: string,
    input: CreateTaxCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "TAX_MANAGE", async (transaction, actor) => {
      const taxCategoryId = createId();
      await transaction.taxCategory.create({
        data: {
          id: taxCategoryId,
          businessId,
          code: input.code,
          name: input.name,
          description: input.description ?? null,
        },
      });
      if (input.rate) {
        await transaction.taxRate.create({
          data: {
            businessId,
            taxCategoryId,
            code: input.rate.code,
            name: input.rate.name,
            rate: rateToDb(input.rate.rate),
            kind: input.rate.kind,
            effectiveFrom: new Date(`${input.rate.effectiveFrom}T00:00:00.000Z`),
          },
        });
      }
      await this.audit(
        transaction,
        businessId,
        actor,
        "CREATE",
        "TaxCategory",
        taxCategoryId,
        input,
      );
      return { id: taxCategoryId };
    });
  }

  async updateTaxCategory(
    businessId: string,
    actorUserId: string,
    taxCategoryId: string,
    input: UpdateTaxCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "TAX_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(
        transaction.taxCategory,
        businessId,
        taxCategoryId,
        "Tax category",
      );
      const after = await transaction.taxCategory.update({
        where: { id: taxCategoryId },
        data: definedOnly(input),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "TaxCategory",
        taxCategoryId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: taxCategoryId };
    });
  }

  async createTaxRate(
    businessId: string,
    actorUserId: string,
    input: CreateTaxRateInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "TAX_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.taxCategory, businessId, input.taxCategoryId, "Tax category");
      const rate = await transaction.taxRate.create({
        data: {
          businessId,
          taxCategoryId: input.taxCategoryId,
          code: input.code,
          name: input.name,
          rate: rateToDb(input.rate),
          kind: input.kind,
          effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
          effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : null,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "TaxRate", rate.id, input);
      return { id: rate.id };
    });
  }

  async updateTaxRate(
    businessId: string,
    actorUserId: string,
    taxRateId: string,
    input: UpdateTaxRateInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "TAX_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.taxRate, businessId, taxRateId, "Tax rate");
      const after = await transaction.taxRate.update({
        where: { id: taxRateId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.rate === undefined ? {} : { rate: rateToDb(input.rate) }),
          ...(input.kind === undefined ? {} : { kind: input.kind }),
          ...(input.effectiveTo === undefined
            ? {}
            : {
                effectiveTo: input.effectiveTo
                  ? new Date(`${input.effectiveTo}T00:00:00.000Z`)
                  : null,
              }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "TaxRate",
        taxRateId,
        input,
        { rate: toNumber(before.rate), status: before.status },
      );
      return { id: taxRateId };
    });
  }

  /* ---------------------------------------------------------------- prices */

  async createPriceList(
    businessId: string,
    actorUserId: string,
    input: CreatePriceListInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PRICE_MANAGE", async (transaction, actor) => {
      if (input.isDefault) {
        await transaction.priceList.updateMany({
          where: { businessId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const priceList = await transaction.priceList.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          currencyCode: input.currencyCode.toUpperCase(),
          isDefault: input.isDefault,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "PriceList", priceList.id, input);
      return { id: priceList.id };
    });
  }

  async updatePriceList(
    businessId: string,
    actorUserId: string,
    priceListId: string,
    input: UpdatePriceListInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PRICE_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(
        transaction.priceList,
        businessId,
        priceListId,
        "Price list",
      );
      if (input.isDefault) {
        await transaction.priceList.updateMany({
          where: { businessId, isDefault: true },
          data: { isDefault: false },
        });
      }
      if (input.status === "INACTIVE" && before.isDefault) {
        throw new BusinessAccessError(
          "CONFLICT",
          "Choose another default price list before deactivating this one.",
        );
      }
      const after = await transaction.priceList.update({
        where: { id: priceListId },
        data: definedOnly(input),
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "PriceList",
        priceListId,
        input,
        { name: before.name, isDefault: before.isDefault, status: before.status },
      );
      return { id: priceListId };
    });
  }

  async upsertItemPrice(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: UpsertItemPriceInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PRICE_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.item, businessId, itemId, "Item");
      const priceListId =
        input.priceListId ?? (await this.defaultPriceListId(transaction, businessId));
      if (input.branchId)
        await this.mustFind(transaction.branch, businessId, input.branchId, "Branch");
      if (input.variantId) {
        await this.mustFind(transaction.itemVariant, businessId, input.variantId, "Variant");
      }

      const existing = await transaction.itemPrice.findFirst({
        where: {
          businessId,
          itemId,
          priceListId,
          variantId: input.variantId ?? null,
          branchId: input.branchId ?? null,
          minQuantity: quantityToDb(input.minQuantity),
        },
      });

      const data = {
        unitPrice: moneyToDb(input.unitPrice),
        costPrice: input.costPrice === undefined ? null : moneyToDb(input.costPrice),
        minQuantity: quantityToDb(input.minQuantity),
        ...(input.validFrom ? { validFrom: new Date(input.validFrom) } : {}),
        validTo: input.validTo ? new Date(input.validTo) : null,
      };

      const price = existing
        ? await transaction.itemPrice.update({ where: { id: existing.id }, data })
        : await transaction.itemPrice.create({
            data: {
              businessId,
              itemId,
              priceListId,
              variantId: input.variantId ?? null,
              branchId: input.branchId ?? null,
              ...data,
            },
          });

      await this.audit(
        transaction,
        businessId,
        actor,
        existing ? "UPDATE" : "CREATE",
        "ItemPrice",
        price.id,
        { itemId, ...input },
        existing ? { unitPrice: toNumber(existing.unitPrice) } : undefined,
      );
      return { id: price.id };
    });
  }

  /* ----------------------------------------------------------------- items */

  async createItem(
    businessId: string,
    actorUserId: string,
    input: CreateItemInput,
  ): Promise<ItemCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      await this.assertItemReferences(transaction, businessId, input);
      await this.assertIdentifiersAvailable(
        transaction,
        businessId,
        input.identifiers.map((identifier) => identifier.value),
      );

      const item = await transaction.item.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          kind: input.kind,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          brandId: input.brandId ?? null,
          baseUnitId: input.baseUnitId,
          taxCategoryId: input.taxCategoryId ?? null,
          sellable: input.sellable,
          purchasable: input.purchasable,
          stockTracked: input.stockTracked,
        },
      });

      const variants = [];
      for (const variant of input.variants) {
        variants.push(
          await transaction.itemVariant.create({
            data: {
              businessId,
              itemId: item.id,
              code: variant.code,
              name: variant.name,
              attributes: variant.attributes as Prisma.InputJsonObject,
            },
          }),
        );
      }

      const identifiers = [];
      for (const identifier of input.identifiers) {
        identifiers.push(
          await transaction.itemIdentifier.create({
            data: {
              businessId,
              itemId: item.id,
              kind: identifier.kind,
              value: identifier.value,
            },
          }),
        );
      }

      const price = input.price
        ? await transaction.itemPrice.create({
            data: {
              businessId,
              itemId: item.id,
              priceListId:
                input.price.priceListId ?? (await this.defaultPriceListId(transaction, businessId)),
              branchId: input.price.branchId ?? null,
              unitPrice: moneyToDb(input.price.unitPrice),
              costPrice:
                input.price.costPrice === undefined ? null : moneyToDb(input.price.costPrice),
              minQuantity: quantityToDb(input.price.minQuantity),
            },
          })
        : undefined;

      await this.audit(transaction, businessId, actor, "CREATE", "Item", item.id, {
        code: input.code,
        name: input.name,
        variantCount: variants.length,
        identifierCount: identifiers.length,
        hasPrice: Boolean(price),
      });

      return {
        id: item.id,
        variantIds: variants.map((variant) => variant.id),
        identifierIds: identifiers.map((identifier) => identifier.id),
        ...(price ? { priceId: price.id } : {}),
      };
    });
  }

  async updateItem(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: UpdateItemInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.item, businessId, itemId, "Item");
      if (input.baseUnitId)
        await this.mustFind(transaction.unit, businessId, input.baseUnitId, "Unit");
      if (input.categoryId) {
        await this.mustFind(transaction.itemCategory, businessId, input.categoryId, "Category");
      }
      if (input.brandId) await this.mustFind(transaction.brand, businessId, input.brandId, "Brand");
      if (input.taxCategoryId) {
        await this.mustFind(
          transaction.taxCategory,
          businessId,
          input.taxCategoryId,
          "Tax category",
        );
      }

      const after = await transaction.item.update({
        where: { id: itemId },
        data: definedOnly(input),
      });

      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Item",
        itemId,
        input,
        { name: before.name, status: before.status, sellable: before.sellable },
      );
      return { id: itemId };
    });
  }

  async createItemVariant(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: CreateItemVariantInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.item, businessId, itemId, "Item");
      const variant = await transaction.itemVariant.create({
        data: {
          businessId,
          itemId,
          code: input.code,
          name: input.name,
          attributes: input.attributes as Prisma.InputJsonObject,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "ItemVariant", variant.id, {
        itemId,
        ...input,
      });
      return { id: variant.id };
    });
  }

  async createItemIdentifier(
    businessId: string,
    actorUserId: string,
    itemId: string,
    input: CreateItemIdentifierInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CATALOG_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.item, businessId, itemId, "Item");
      await this.assertIdentifiersAvailable(transaction, businessId, [input.value]);
      const identifier = await transaction.itemIdentifier.create({
        data: {
          businessId,
          itemId,
          variantId: input.variantId ?? null,
          kind: input.kind,
          value: input.value,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "ItemIdentifier", identifier.id, {
        itemId,
        ...input,
      });
      return { id: identifier.id };
    });
  }

  async listItems(
    businessId: string,
    actorUserId: string,
    query: ListQuery,
  ): Promise<Paginated<ItemListRow>> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");
      const where = {
        businessId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { code: { contains: query.search, mode: "insensitive" as const } },
                {
                  identifiers: {
                    some: { value: { contains: query.search, mode: "insensitive" as const } },
                  },
                },
              ],
            }
          : {}),
      };
      const { skip, take } = pagination(query);
      const [total, items] = await Promise.all([
        transaction.item.count({ where }),
        transaction.item.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take,
          include: {
            baseUnit: true,
            category: true,
            brand: true,
            taxCategory: true,
            identifiers: true,
            prices: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        }),
      ]);

      return {
        rows: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          kind: item.kind,
          status: item.status,
          unitCode: item.baseUnit.code,
          categoryName: item.category?.name ?? null,
          brandName: item.brand?.name ?? null,
          taxCategoryName: item.taxCategory?.name ?? null,
          sellable: item.sellable,
          purchasable: item.purchasable,
          stockTracked: item.stockTracked,
          price: item.prices[0] ? toNumber(item.prices[0].unitPrice) : null,
          identifiers: item.identifiers.map((identifier) => identifier.value),
          updatedAt: item.updatedAt.toISOString(),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  async getItem(businessId: string, actorUserId: string, itemId: string): Promise<ItemDetail> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");
      const item = await transaction.item.findFirst({
        where: { id: itemId, businessId },
        include: {
          baseUnit: true,
          category: true,
          brand: true,
          taxCategory: true,
          identifiers: true,
          variants: { orderBy: { code: "asc" } },
          prices: { include: { priceList: true }, orderBy: { createdAt: "desc" } },
          tagAssignments: true,
          attributeValues: true,
          supplierItems: { include: { supplier: true } },
        },
      });
      if (!item) throw new BusinessAccessError("NOT_FOUND", "Item was not found.");

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        kind: item.kind,
        status: item.status,
        unitCode: item.baseUnit.code,
        categoryName: item.category?.name ?? null,
        brandName: item.brand?.name ?? null,
        taxCategoryName: item.taxCategory?.name ?? null,
        sellable: item.sellable,
        purchasable: item.purchasable,
        stockTracked: item.stockTracked,
        price: item.prices[0] ? toNumber(item.prices[0].unitPrice) : null,
        identifiers: item.identifiers.map((identifier) => identifier.value),
        updatedAt: item.updatedAt.toISOString(),
        description: item.description,
        categoryId: item.categoryId,
        brandId: item.brandId,
        baseUnitId: item.baseUnitId,
        taxCategoryId: item.taxCategoryId,
        variants: item.variants.map((variant) => ({
          id: variant.id,
          code: variant.code,
          name: variant.name,
          attributes: asJsonObject(variant.attributes) ?? {},
          status: variant.status,
        })),
        identifierRecords: item.identifiers.map((identifier) => ({
          id: identifier.id,
          kind: identifier.kind,
          value: identifier.value,
          variantId: identifier.variantId,
        })),
        prices: item.prices.map((price) => ({
          id: price.id,
          priceListId: price.priceListId,
          priceListName: price.priceList.name,
          branchId: price.branchId,
          variantId: price.variantId,
          unitPrice: toNumber(price.unitPrice),
          costPrice: toOptionalNumber(price.costPrice),
          minQuantity: toNumber(price.minQuantity),
          validFrom: price.validFrom.toISOString(),
          validTo: price.validTo?.toISOString() ?? null,
        })),
        tagIds: item.tagAssignments.map((assignment) => assignment.tagId),
        attributeValues: item.attributeValues.map((value) => ({
          attributeId: value.attributeId,
          value: value.value,
        })),
        suppliers: item.supplierItems.map((supplierItem) => ({
          supplierId: supplierItem.supplierId,
          supplierName: supplierItem.supplier.name,
          supplierCode: supplierItem.supplierCode,
          costPrice: toOptionalNumber(supplierItem.costPrice),
          leadTimeDays: supplierItem.leadTimeDays,
        })),
        timeline: await readTimeline(transaction, businessId, "Item", itemId),
      };
    });
  }

  /* ------------------------------------------------------------ promotions */

  async createPromotion(
    businessId: string,
    actorUserId: string,
    input: CreatePromotionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PROMOTION_MANAGE", async (transaction, actor) => {
      this.assertPromotionValue(input.discountKind, input.discountValue);
      const promotion = await transaction.promotion.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          discountKind: input.discountKind,
          discountValue: moneyToDb(input.discountValue),
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          conditions: {
            ...DEFAULT_PROMOTION_CONDITIONS,
            ...(input.conditions ?? {}),
          },
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "Promotion", promotion.id, input);
      return { id: promotion.id };
    });
  }

  async updatePromotion(
    businessId: string,
    actorUserId: string,
    promotionId: string,
    input: UpdatePromotionInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "PROMOTION_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(
        transaction.promotion,
        businessId,
        promotionId,
        "Promotion",
      );
      if (input.discountKind && input.discountValue !== undefined) {
        this.assertPromotionValue(input.discountKind, input.discountValue);
      }
      const after = await transaction.promotion.update({
        where: { id: promotionId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.discountKind === undefined ? {} : { discountKind: input.discountKind }),
          ...(input.discountValue === undefined
            ? {}
            : { discountValue: moneyToDb(input.discountValue) }),
          ...(input.startsAt === undefined ? {} : { startsAt: new Date(input.startsAt) }),
          ...(input.endsAt === undefined
            ? {}
            : { endsAt: input.endsAt ? new Date(input.endsAt) : null }),
          ...(input.conditions === undefined
            ? {}
            : {
                conditions: {
                  ...DEFAULT_PROMOTION_CONDITIONS,
                  ...input.conditions,
                },
              }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Promotion",
        promotionId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: promotionId };
    });
  }

  async listPromotions(businessId: string, actorUserId: string): Promise<PromotionRow[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "PROMOTION_VIEW");
      void actor;
      const promotions = await transaction.promotion.findMany({
        where: { businessId },
        orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      });

      return promotions.map((promotion) => {
        const conditions = asJsonObject(promotion.conditions) as PromotionConditions | null;
        const conflicts = promotions
          .filter((candidate) => candidate.id !== promotion.id)
          .filter((candidate) => candidate.status === "ACTIVE" && promotion.status === "ACTIVE")
          .filter((candidate) => overlaps(promotion, candidate))
          .filter((candidate) => {
            const candidateConditions = asJsonObject(
              candidate.conditions,
            ) as PromotionConditions | null;
            return sharesScope(conditions, candidateConditions);
          })
          .map((candidate) => candidate.code);

        return {
          id: promotion.id,
          code: promotion.code,
          name: promotion.name,
          discountKind: promotion.discountKind,
          discountValue: toNumber(promotion.discountValue),
          startsAt: promotion.startsAt.toISOString(),
          endsAt: promotion.endsAt?.toISOString() ?? null,
          status: promotion.status,
          conditions,
          conflicts,
        };
      });
    });
  }

  /* ------------------------------------------------------------- customers */

  async createCustomerGroup(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerGroupInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CUSTOMER_MANAGE", async (transaction, actor) => {
      const group = await transaction.customerGroup.create({ data: { businessId, ...input } });
      await this.audit(transaction, businessId, actor, "CREATE", "CustomerGroup", group.id, input);
      return { id: group.id };
    });
  }

  async createCustomer(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CUSTOMER_MANAGE", async (transaction, actor) => {
      if (input.groupId) {
        await this.mustFind(transaction.customerGroup, businessId, input.groupId, "Customer group");
      }
      const customer = await transaction.customer.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          groupId: input.groupId ?? null,
          ...(input.billingAddress
            ? { billingAddress: input.billingAddress as Prisma.InputJsonObject }
            : {}),
          notes: input.notes ?? null,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "Customer", customer.id, input);
      return { id: customer.id };
    });
  }

  async updateCustomer(
    businessId: string,
    actorUserId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "CUSTOMER_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.customer, businessId, customerId, "Customer");
      if (input.groupId) {
        await this.mustFind(transaction.customerGroup, businessId, input.groupId, "Customer group");
      }
      const after = await transaction.customer.update({
        where: { id: customerId },
        data: {
          ...definedOnly({
            name: input.name,
            groupId: input.groupId,
            email: input.email,
            phone: input.phone,
            notes: input.notes,
            status: input.status,
          }),
          ...(input.billingAddress
            ? { billingAddress: input.billingAddress as Prisma.InputJsonObject }
            : {}),
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Customer",
        customerId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: customerId };
    });
  }

  async listCustomers(
    businessId: string,
    actorUserId: string,
    query: ListQuery,
  ): Promise<Paginated<CustomerListRow>> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CUSTOMER_VIEW");
      const where = {
        businessId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { code: { contains: query.search, mode: "insensitive" as const } },
                { phone: { contains: query.search, mode: "insensitive" as const } },
                { email: { contains: query.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const { skip, take } = pagination(query);
      const [total, customers] = await Promise.all([
        transaction.customer.count({ where }),
        transaction.customer.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take,
          include: {
            group: true,
            storeCredit: true,
            sales: { where: { status: { notIn: ["DRAFT", "VOIDED"] } }, select: { total: true } },
          },
        }),
      ]);

      return {
        rows: customers.map((customer) => ({
          id: customer.id,
          code: customer.code,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          groupId: customer.groupId,
          groupName: customer.group?.name ?? null,
          status: customer.status,
          salesCount: customer.sales.length,
          salesTotal: customer.sales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
          storeCredit: toNumber(customer.storeCredit?.balance ?? 0),
          updatedAt: customer.updatedAt.toISOString(),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  async getCustomer(
    businessId: string,
    actorUserId: string,
    customerId: string,
  ): Promise<CustomerDetail> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CUSTOMER_VIEW");
      const customer = await transaction.customer.findFirst({
        where: { id: customerId, businessId },
        include: {
          group: true,
          storeCredit: { include: { entries: { orderBy: { createdAt: "desc" }, take: 20 } } },
          sales: {
            where: { status: { not: "DRAFT" } },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { branch: true, _count: { select: { lines: true } } },
          },
        },
      });
      if (!customer) throw new BusinessAccessError("NOT_FOUND", "Customer was not found.");

      const allSales = await transaction.sale.findMany({
        where: { businessId, customerId, status: { notIn: ["DRAFT", "VOIDED"] } },
        select: { total: true },
      });

      return {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        groupId: customer.groupId,
        groupName: customer.group?.name ?? null,
        status: customer.status,
        salesCount: allSales.length,
        salesTotal: allSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
        storeCredit: toNumber(customer.storeCredit?.balance ?? 0),
        updatedAt: customer.updatedAt.toISOString(),
        notes: customer.notes,
        billingAddress: asJsonObject(customer.billingAddress),
        recentSales: customer.sales.map((sale) => ({
          id: sale.id,
          number: sale.number,
          receiptNumber: sale.receiptNumber,
          status: sale.status,
          channel: sale.channel,
          branchId: sale.branchId,
          branchName: sale.branch.name,
          customerId: sale.customerId,
          customerName: customer.name,
          currencyCode: sale.currencyCode,
          total: toNumber(sale.total),
          paidTotal: toNumber(sale.paidTotal),
          dueTotal: toNumber(sale.dueTotal),
          refundedTotal: toNumber(sale.refundedTotal),
          lineCount: sale._count.lines,
          createdAt: sale.createdAt.toISOString(),
          confirmedAt: sale.confirmedAt?.toISOString() ?? null,
        })),
        storeCreditEntries: (customer.storeCredit?.entries ?? []).map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          amount: toNumber(entry.amount),
          balanceAfter: toNumber(entry.balanceAfter),
          reference: entry.reference,
          createdAt: entry.createdAt.toISOString(),
        })),
        timeline: await readTimeline(transaction, businessId, "Customer", customerId),
      };
    });
  }

  /* ------------------------------------------------------------- suppliers */

  async createSupplier(
    businessId: string,
    actorUserId: string,
    input: CreateSupplierInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "SUPPLIER_MANAGE", async (transaction, actor) => {
      const supplier = await transaction.supplier.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          leadTimeDays: input.leadTimeDays ?? null,
          paymentTerms: input.paymentTerms ?? null,
          ...(input.address ? { address: input.address as Prisma.InputJsonObject } : {}),
          notes: input.notes ?? null,
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "Supplier", supplier.id, input);
      return { id: supplier.id };
    });
  }

  async updateSupplier(
    businessId: string,
    actorUserId: string,
    supplierId: string,
    input: UpdateSupplierInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "SUPPLIER_MANAGE", async (transaction, actor) => {
      const before = await this.mustFind(transaction.supplier, businessId, supplierId, "Supplier");
      const after = await transaction.supplier.update({
        where: { id: supplierId },
        data: {
          ...definedOnly({
            name: input.name,
            email: input.email,
            phone: input.phone,
            leadTimeDays: input.leadTimeDays,
            paymentTerms: input.paymentTerms,
            notes: input.notes,
            status: input.status,
          }),
          ...(input.address ? { address: input.address as Prisma.InputJsonObject } : {}),
        },
      });
      await this.audit(
        transaction,
        businessId,
        actor,
        statusAction(before.status, after.status),
        "Supplier",
        supplierId,
        input,
        { name: before.name, status: before.status },
      );
      return { id: supplierId };
    });
  }

  async upsertSupplierItem(
    businessId: string,
    actorUserId: string,
    supplierId: string,
    input: UpsertSupplierItemInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "SUPPLIER_MANAGE", async (transaction, actor) => {
      await this.mustFind(transaction.supplier, businessId, supplierId, "Supplier");
      await this.mustFind(transaction.item, businessId, input.itemId, "Item");

      const record = await transaction.supplierItem.upsert({
        where: {
          businessId_supplierId_itemId: { businessId, supplierId, itemId: input.itemId },
        },
        update: {
          supplierCode: input.supplierCode ?? null,
          costPrice: input.costPrice === undefined ? null : moneyToDb(input.costPrice),
          leadTimeDays: input.leadTimeDays ?? null,
        },
        create: {
          businessId,
          supplierId,
          itemId: input.itemId,
          supplierCode: input.supplierCode ?? null,
          costPrice: input.costPrice === undefined ? null : moneyToDb(input.costPrice),
          leadTimeDays: input.leadTimeDays ?? null,
        },
      });
      await this.audit(transaction, businessId, actor, "UPDATE", "SupplierItem", record.id, {
        supplierId,
        ...input,
      });
      return { id: record.id };
    });
  }

  async listSuppliers(
    businessId: string,
    actorUserId: string,
    query: ListQuery,
  ): Promise<Paginated<SupplierListRow>> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SUPPLIER_VIEW");
      const where = {
        businessId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { code: { contains: query.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const { skip, take } = pagination(query);
      const [total, suppliers] = await Promise.all([
        transaction.supplier.count({ where }),
        transaction.supplier.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take,
          include: { _count: { select: { supplierItems: true } } },
        }),
      ]);

      return {
        rows: suppliers.map((supplier) => ({
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          leadTimeDays: supplier.leadTimeDays,
          paymentTerms: supplier.paymentTerms,
          status: supplier.status,
          itemCount: supplier._count.supplierItems,
          updatedAt: supplier.updatedAt.toISOString(),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
  }

  async getSupplier(
    businessId: string,
    actorUserId: string,
    supplierId: string,
  ): Promise<SupplierDetail> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "SUPPLIER_VIEW");
      const supplier = await transaction.supplier.findFirst({
        where: { id: supplierId, businessId },
        include: { supplierItems: { include: { item: true } } },
      });
      if (!supplier) throw new BusinessAccessError("NOT_FOUND", "Supplier was not found.");

      return {
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        leadTimeDays: supplier.leadTimeDays,
        paymentTerms: supplier.paymentTerms,
        status: supplier.status,
        itemCount: supplier.supplierItems.length,
        updatedAt: supplier.updatedAt.toISOString(),
        notes: supplier.notes,
        address: asJsonObject(supplier.address),
        items: supplier.supplierItems.map((supplierItem) => ({
          itemId: supplierItem.itemId,
          itemCode: supplierItem.item.code,
          itemName: supplierItem.item.name,
          supplierCode: supplierItem.supplierCode,
          costPrice: toOptionalNumber(supplierItem.costPrice),
          leadTimeDays: supplierItem.leadTimeDays,
        })),
        timeline: await readTimeline(transaction, businessId, "Supplier", supplierId),
      };
    });
  }

  /* ----------------------------------------------------------- import stub */

  async createImportBatch(
    businessId: string,
    actorUserId: string,
    input: CreateImportBatchInput,
  ): Promise<CatalogRecordCreated> {
    return this.write(businessId, actorUserId, "IMPORT_MANAGE", async (transaction, actor) => {
      const batch = await transaction.importBatch.create({
        data: {
          businessId,
          entityKind: input.entityKind,
          fileName: input.fileName,
          totalRows: input.totalRows,
          validRows: input.validRows,
          invalidRows: input.invalidRows,
          ...(input.errors ? { errors: input.errors as Prisma.InputJsonObject } : {}),
        },
      });
      await this.audit(transaction, businessId, actor, "CREATE", "ImportBatch", batch.id, input);
      return { id: batch.id };
    });
  }

  /* --------------------------------------------------------------- helpers */

  private async write<T>(
    businessId: string,
    actorUserId: string,
    permissionCode: string,
    work: (transaction: DatabaseTransaction, actor: MembershipContext) => Promise<T>,
  ): Promise<T> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, permissionCode);
      return work(transaction, actor);
    });
  }

  private async audit(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    action: "CREATE" | "UPDATE" | "ACTIVATE" | "DEACTIVATE" | "ASSIGN",
    entityType: string,
    entityId: string,
    after: unknown,
    before?: unknown,
  ): Promise<void> {
    await recordChange(transaction, {
      businessId,
      actorMembershipId: actor.membershipId,
      action,
      entityType,
      entityId,
      after,
      ...(before === undefined ? {} : { before }),
      eventType: `${entityType}${action === "CREATE" ? "Created" : "Updated"}`,
      eventPayload: { businessId, entityId },
    });
  }

  private assertPromotionValue(kind: "PERCENTAGE" | "FIXED_AMOUNT", value: number): void {
    if (kind === "PERCENTAGE" && value > 100) {
      throw new BusinessAccessError(
        "INVALID_INPUT",
        "A percentage discount cannot be more than 100%.",
      );
    }
  }

  private async assertItemReferences(
    transaction: DatabaseTransaction,
    businessId: string,
    input: CreateItemInput,
  ): Promise<void> {
    await this.mustFind(transaction.unit, businessId, input.baseUnitId, "Unit");
    if (input.categoryId) {
      await this.mustFind(transaction.itemCategory, businessId, input.categoryId, "Category");
    }
    if (input.brandId) await this.mustFind(transaction.brand, businessId, input.brandId, "Brand");
    if (input.taxCategoryId) {
      await this.mustFind(transaction.taxCategory, businessId, input.taxCategoryId, "Tax category");
    }
    if (input.price?.branchId) {
      await this.mustFind(transaction.branch, businessId, input.price.branchId, "Branch");
    }
    if (input.price?.priceListId) {
      await this.mustFind(transaction.priceList, businessId, input.price.priceListId, "Price list");
    }
  }

  private async assertIdentifiersAvailable(
    transaction: DatabaseTransaction,
    businessId: string,
    values: readonly string[],
  ): Promise<void> {
    if (!values.length) return;
    const duplicates = await transaction.itemIdentifier.findMany({
      where: { businessId, value: { in: [...values] } },
      include: { item: { select: { code: true, name: true } } },
    });
    if (duplicates.length) {
      const first = duplicates[0];
      throw new BusinessAccessError(
        "CONFLICT",
        `The barcode ${first?.value} already belongs to ${first?.item.name}. Use a different identifier or edit that Item.`,
      );
    }
  }

  private async defaultPriceListId(
    transaction: DatabaseTransaction,
    businessId: string,
  ): Promise<string> {
    const priceList = await transaction.priceList.findFirst({
      where: { businessId, isDefault: true, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!priceList) {
      throw new BusinessAccessError(
        "NOT_FOUND",
        "Create or initialize a default price list first.",
      );
    }
    return priceList.id;
  }

  private async mustFind<T extends { id: string; status?: unknown }>(
    delegate: {
      findFirst: (args: { where: { businessId: string; id: string } }) => Promise<T | null>;
    },
    businessId: string,
    id: string,
    label: string,
  ): Promise<T> {
    const record = await delegate.findFirst({ where: { businessId, id } });
    if (!record) throw new BusinessAccessError("NOT_FOUND", `${label} was not found.`);
    return record;
  }
}

/**
 * Drops `undefined` entries so a partial update never overwrites a field the screen did not send.
 * The mapped return type keeps `exactOptionalPropertyTypes` satisfied for Prisma update inputs.
 */
function definedOnly<T extends Record<string, unknown>>(
  input: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

function statusAction(before: unknown, after: unknown): "UPDATE" | "ACTIVATE" | "DEACTIVATE" {
  if (before === after) return "UPDATE";
  return after === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE";
}

function overlaps(
  left: { startsAt: Date; endsAt: Date | null },
  right: { startsAt: Date; endsAt: Date | null },
): boolean {
  const leftEnd = left.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return left.startsAt.getTime() <= rightEnd && right.startsAt.getTime() <= leftEnd;
}

function sharesScope(left: PromotionConditions | null, right: PromotionConditions | null): boolean {
  if (!left || !right) return true;
  if (left.scope === "SALE" || right.scope === "SALE") return true;
  if (left.scope === "ITEM" && right.scope === "ITEM") {
    return left.itemIds.some((itemId) => right.itemIds.includes(itemId));
  }
  if (left.scope === "CATEGORY" && right.scope === "CATEGORY") {
    return left.categoryIds.some((categoryId) => right.categoryIds.includes(categoryId));
  }
  return false;
}
