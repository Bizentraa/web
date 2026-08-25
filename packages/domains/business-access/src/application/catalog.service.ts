import type {
  CatalogRecordCreated,
  CatalogSummary,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCustomerGroupInput,
  CreateCustomerInput,
  CreateImportBatchInput,
  CreateItemInput,
  CreatePriceListInput,
  CreatePromotionInput,
  CreateSupplierInput,
  CreateTaxCategoryInput,
  CreateUnitInput,
  ItemCreated,
  P1DefaultsCreated,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  type Prisma,
  withBusinessContext,
} from "@bizentra/database";
import { createId } from "@bizentra/ids";

import { BusinessAccessError } from "./errors.js";

export class CatalogService {
  constructor(private readonly database: DatabaseClient) {}

  async ensureP1Defaults(businessId: string, actorUserId: string): Promise<P1DefaultsCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "CATALOG_MANAGE",
      );
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

      await this.recordChange(transaction, businessId, membershipId, "P1Defaults", businessId, {
        unitId: unit.id,
        taxCategoryId: taxCategory.id,
        taxRateId: taxRate.id,
        priceListId: priceList.id,
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
      await this.requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");
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
          include: {
            baseUnit: true,
            prices: { orderBy: { createdAt: "desc" }, take: 1 },
          },
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
          ...(item.prices[0] ? { price: Number(item.prices[0].unitPrice) } : {}),
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

  async createUnit(
    businessId: string,
    actorUserId: string,
    input: CreateUnitInput,
  ): Promise<CatalogRecordCreated> {
    return this.createSimpleRecord(businessId, actorUserId, "CATALOG_MANAGE", "Unit", "unit", {
      businessId,
      ...input,
    });
  }

  async createCategory(
    businessId: string,
    actorUserId: string,
    input: CreateCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return this.createSimpleRecord(
      businessId,
      actorUserId,
      "CATALOG_MANAGE",
      "ItemCategory",
      "itemCategory",
      { businessId, ...input, parentId: input.parentId ?? null },
    );
  }

  async createBrand(
    businessId: string,
    actorUserId: string,
    input: CreateBrandInput,
  ): Promise<CatalogRecordCreated> {
    return this.createSimpleRecord(businessId, actorUserId, "CATALOG_MANAGE", "Brand", "brand", {
      businessId,
      ...input,
    });
  }

  async createTaxCategory(
    businessId: string,
    actorUserId: string,
    input: CreateTaxCategoryInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "TAX_MANAGE",
      );
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
            rate: Number(input.rate.rate).toString(),
            kind: input.rate.kind ?? "BOTH",
            effectiveFrom: new Date(`${input.rate.effectiveFrom}T00:00:00.000Z`),
          },
        });
      }
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "TaxCategory",
        taxCategoryId,
        input,
      );
      return { id: taxCategoryId };
    });
  }

  async createPriceList(
    businessId: string,
    actorUserId: string,
    input: CreatePriceListInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "PRICE_MANAGE",
      );
      const priceList = await transaction.priceList.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          currencyCode: input.currencyCode.toUpperCase(),
          isDefault: input.isDefault ?? false,
        },
      });
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "PriceList",
        priceList.id,
        input,
      );
      return { id: priceList.id };
    });
  }

  async createItem(
    businessId: string,
    actorUserId: string,
    input: CreateItemInput,
  ): Promise<ItemCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "CATALOG_MANAGE",
      );
      await this.assertBusinessScopedReferences(transaction, businessId, input);

      const item = await transaction.item.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          kind: input.kind ?? "PRODUCT",
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

      const variants = await Promise.all(
        (input.variants ?? []).map((variant) =>
          transaction.itemVariant.create({
            data: {
              businessId,
              itemId: item.id,
              code: variant.code,
              name: variant.name,
              attributes: variant.attributes as Prisma.InputJsonObject,
            },
          }),
        ),
      );
      const identifiers = await Promise.all(
        (input.identifiers ?? []).map((identifier) =>
          transaction.itemIdentifier.create({
            data: { businessId, itemId: item.id, kind: identifier.kind, value: identifier.value },
          }),
        ),
      );
      const price = input.price
        ? await transaction.itemPrice.create({
            data: {
              businessId,
              itemId: item.id,
              priceListId:
                input.price.priceListId ?? (await this.defaultPriceListId(transaction, businessId)),
              branchId: input.price.branchId ?? null,
              unitPrice: Number(input.price.unitPrice).toString(),
              costPrice:
                input.price.costPrice === undefined
                  ? null
                  : Number(input.price.costPrice).toString(),
              minQuantity: Number(input.price.minQuantity ?? 1).toString(),
            },
          })
        : undefined;

      await this.recordChange(transaction, businessId, membershipId, "Item", item.id, {
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

  async createPromotion(
    businessId: string,
    actorUserId: string,
    input: CreatePromotionInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "PROMOTION_MANAGE",
      );
      const promotion = await transaction.promotion.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          discountKind: input.discountKind,
          discountValue: Number(input.discountValue).toString(),
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          ...(input.conditions ? { conditions: input.conditions as Prisma.InputJsonObject } : {}),
        },
      });
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "Promotion",
        promotion.id,
        input,
      );
      return { id: promotion.id };
    });
  }

  async createCustomerGroup(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerGroupInput,
  ): Promise<CatalogRecordCreated> {
    return this.createSimpleRecord(
      businessId,
      actorUserId,
      "CUSTOMER_MANAGE",
      "CustomerGroup",
      "customerGroup",
      { businessId, ...input },
    );
  }

  async createCustomer(
    businessId: string,
    actorUserId: string,
    input: CreateCustomerInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "CUSTOMER_MANAGE",
      );
      if (input.groupId) {
        await this.assertExists(
          transaction.customerGroup,
          businessId,
          input.groupId,
          "Customer group",
        );
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
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "Customer",
        customer.id,
        input,
      );
      return { id: customer.id };
    });
  }

  async createSupplier(
    businessId: string,
    actorUserId: string,
    input: CreateSupplierInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "SUPPLIER_MANAGE",
      );
      const supplier = await transaction.supplier.create({
        data: {
          businessId,
          code: input.code,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          leadTimeDays:
            typeof input.leadTimeDays === "number" && Number.isFinite(input.leadTimeDays)
              ? input.leadTimeDays
              : null,
          paymentTerms: input.paymentTerms ?? null,
          ...(input.address ? { address: input.address as Prisma.InputJsonObject } : {}),
          notes: input.notes ?? null,
        },
      });
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "Supplier",
        supplier.id,
        input,
      );
      return { id: supplier.id };
    });
  }

  async createImportBatch(
    businessId: string,
    actorUserId: string,
    input: CreateImportBatchInput,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        "IMPORT_MANAGE",
      );
      const batch = await transaction.importBatch.create({
        data: {
          businessId,
          entityKind: input.entityKind,
          fileName: input.fileName,
          totalRows: Number(input.totalRows ?? 0),
          validRows: Number(input.validRows ?? 0),
          invalidRows: Number(input.invalidRows ?? 0),
          ...(input.errors ? { errors: input.errors as Prisma.InputJsonObject } : {}),
        },
      });
      await this.recordChange(
        transaction,
        businessId,
        membershipId,
        "ImportBatch",
        batch.id,
        input,
      );
      return { id: batch.id };
    });
  }

  private async createSimpleRecord(
    businessId: string,
    actorUserId: string,
    permissionCode: string,
    entityType: string,
    delegateName: keyof Pick<
      DatabaseTransaction,
      "brand" | "customerGroup" | "itemCategory" | "unit"
    >,
    data: Record<string, unknown>,
  ): Promise<CatalogRecordCreated> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const membershipId = await this.requirePermission(
        transaction,
        businessId,
        actorUserId,
        permissionCode,
      );
      const delegate = transaction[delegateName] as unknown as {
        create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      };
      const record = await delegate.create({ data });
      await this.recordChange(transaction, businessId, membershipId, entityType, record.id, data);
      return { id: record.id };
    });
  }

  private async assertBusinessScopedReferences(
    transaction: DatabaseTransaction,
    businessId: string,
    input: CreateItemInput,
  ): Promise<void> {
    await this.assertExists(transaction.unit, businessId, input.baseUnitId, "Unit");
    if (input.categoryId)
      await this.assertExists(transaction.itemCategory, businessId, input.categoryId, "Category");
    if (input.brandId)
      await this.assertExists(transaction.brand, businessId, input.brandId, "Brand");
    if (input.taxCategoryId) {
      await this.assertExists(
        transaction.taxCategory,
        businessId,
        input.taxCategoryId,
        "Tax category",
      );
    }
    if (input.price?.branchId)
      await this.assertExists(transaction.branch, businessId, input.price.branchId, "Branch");
    if (input.price?.priceListId) {
      await this.assertExists(
        transaction.priceList,
        businessId,
        input.price.priceListId,
        "Price list",
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

  private async assertExists(
    delegate: {
      findFirst: (args: { where: { businessId: string; id: string } }) => Promise<unknown>;
    },
    businessId: string,
    id: string,
    label: string,
  ): Promise<void> {
    const record = await delegate.findFirst({ where: { businessId, id } });
    if (!record) throw new BusinessAccessError("NOT_FOUND", `${label} was not found.`);
  }

  private async requirePermission(
    transaction: DatabaseTransaction,
    businessId: string,
    userId: string,
    permissionCode: string,
  ): Promise<string> {
    const membership = await transaction.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new BusinessAccessError("FORBIDDEN", "The user is not active in this Business.");
    }

    const hasPermission = membership.roleAssignments.some((assignment) =>
      assignment.role.permissions.some(({ permission }) => permission.code === permissionCode),
    );
    if (!hasPermission) {
      throw new BusinessAccessError(
        "FORBIDDEN",
        `The user does not have the ${permissionCode} permission.`,
      );
    }

    return membership.id;
  }

  private async recordChange(
    transaction: DatabaseTransaction,
    businessId: string,
    actorMembershipId: string,
    entityType: string,
    entityId: string,
    after: unknown,
  ): Promise<void> {
    await transaction.auditEvent.create({
      data: {
        businessId,
        actorMembershipId,
        action: "CREATE",
        entityType,
        entityId,
        after: after as Prisma.InputJsonValue,
      },
    });
    await transaction.outboxEvent.create({
      data: {
        businessId,
        eventType: `${entityType}Created`,
        aggregateType: entityType,
        aggregateId: entityId,
        payload: { businessId, entityId, after } as Prisma.InputJsonObject,
      },
    });
  }
}
