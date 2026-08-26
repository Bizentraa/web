import type {
  ImportApplied,
  ImportBatchSummary,
  ImportEntityKind,
  ImportPreview,
  ImportPreviewRow,
  ValidateImportInput,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  type Prisma,
  withBusinessContext,
} from "@bizentra/database";
import {
  BusinessAccessError,
  moneyToDb,
  parseDelimited,
  quantityToDb,
  recordChange,
  requiredColumns,
  requirePermission,
} from "@bizentra/domain-shared";

export interface TemplateColumn {
  name: string;
  required: boolean;
  hint: string;
}

const TEMPLATES: Record<ImportEntityKind, { columns: TemplateColumn[]; sample: string[] }> = {
  ITEMS: {
    columns: [
      { name: "code", required: true, hint: "Unique item code, for example MILK-1L" },
      { name: "name", required: true, hint: "Item name shown on the POS and receipt" },
      {
        name: "kind",
        required: false,
        hint: "PRODUCT, SERVICE, INGREDIENT, PART, BUNDLE, FEE or RENTAL",
      },
      { name: "unit", required: false, hint: "Existing unit code, defaults to EA" },
      { name: "category", required: false, hint: "Existing category code" },
      { name: "brand", required: false, hint: "Existing brand code" },
      { name: "tax_category", required: false, hint: "Existing tax category code" },
      { name: "barcode", required: false, hint: "Barcode or SKU, must not already exist" },
      { name: "price", required: false, hint: "Selling price in the Business currency" },
      { name: "cost", required: false, hint: "Cost price used for margin reporting" },
      { name: "stock_tracked", required: false, hint: "true or false" },
    ],
    sample: [
      "MILK-1L",
      "Fresh Milk 1L",
      "PRODUCT",
      "EA",
      "",
      "",
      "STANDARD",
      "9550000000019",
      "450",
      "380",
      "true",
    ],
  },
  CUSTOMERS: {
    columns: [
      { name: "code", required: true, hint: "Unique customer code" },
      { name: "name", required: true, hint: "Customer name" },
      { name: "email", required: false, hint: "Email address" },
      { name: "phone", required: false, hint: "Phone number" },
      { name: "group", required: false, hint: "Existing customer group code" },
      { name: "notes", required: false, hint: "Free notes" },
    ],
    sample: ["CUS-0001", "Nimal Perera", "nimal@example.com", "0771234567", "RETAIL", ""],
  },
  SUPPLIERS: {
    columns: [
      { name: "code", required: true, hint: "Unique supplier code" },
      { name: "name", required: true, hint: "Supplier name" },
      { name: "email", required: false, hint: "Email address" },
      { name: "phone", required: false, hint: "Phone number" },
      { name: "lead_time_days", required: false, hint: "Whole days between order and delivery" },
      { name: "payment_terms", required: false, hint: "For example 30 days" },
      { name: "notes", required: false, hint: "Free notes" },
    ],
    sample: [
      "SUP-0001",
      "Island Distributors",
      "orders@example.com",
      "0112345678",
      "3",
      "30 days",
      "",
    ],
  },
  OPENING_DATA: {
    columns: [
      { name: "item_code", required: true, hint: "Existing item code" },
      { name: "location_code", required: true, hint: "Existing location code" },
      { name: "quantity", required: true, hint: "Opening quantity" },
      { name: "cost", required: false, hint: "Opening unit cost" },
    ],
    sample: ["MILK-1L", "SHOP", "24", "380"],
  },
};

const ITEM_KINDS = new Set(["PRODUCT", "SERVICE", "INGREDIENT", "PART", "BUNDLE", "FEE", "RENTAL"]);

/**
 * CC-P1-011: validated CSV/XLSX-exported imports with preview, apply and rollback.
 *
 * Nothing is written to the Business during validation. The preview is stored on the batch so the
 * apply step uses exactly the rows the User approved, and the created ids are stored so a mistake
 * can be rolled back while the records are still untouched.
 */
export class ImportService {
  constructor(private readonly database: DatabaseClient) {}

  getTemplate(entityKind: ImportEntityKind): { fileName: string; content: string } {
    const template = TEMPLATES[entityKind];
    const header = template.columns.map((column) => column.name).join(",");
    return {
      fileName: `bizentra-${entityKind.toLowerCase()}-template.csv`,
      content: `${header}\n${template.sample.join(",")}\n`,
    };
  }

  getTemplateColumns(entityKind: ImportEntityKind): TemplateColumn[] {
    return TEMPLATES[entityKind].columns;
  }

  async validate(
    businessId: string,
    actorUserId: string,
    input: ValidateImportInput,
  ): Promise<ImportPreview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "IMPORT_MANAGE");

      const file = parseDelimited(input.content, input.delimiter);
      const template = TEMPLATES[input.entityKind];
      const missing = requiredColumns(
        file,
        template.columns.filter((column) => column.required).map((column) => column.name),
      );

      let rows: ImportPreviewRow[] = [];
      if (missing.length) {
        rows = [
          {
            rowNumber: 0,
            valid: false,
            errors: [`The file is missing required columns: ${missing.join(", ")}.`],
            values: {},
          },
        ];
      } else {
        rows = await this.validateRows(transaction, businessId, input.entityKind, file.rows);
      }

      const validRows = rows.filter((row) => row.valid).length;
      const invalidRows = rows.length - validRows;

      const batch = await transaction.importBatch.create({
        data: {
          businessId,
          entityKind: input.entityKind,
          fileName: input.fileName,
          status: validRows > 0 ? "VALIDATED" : "FAILED",
          totalRows: rows.length,
          validRows,
          invalidRows,
          preview: { columns: file.columns, rows } as unknown as Prisma.InputJsonObject,
          ...(invalidRows > 0
            ? {
                errors: {
                  messages: rows
                    .filter((row) => !row.valid)
                    .slice(0, 50)
                    .map((row) => ({ rowNumber: row.rowNumber, errors: row.errors })),
                },
              }
            : {}),
        },
      });

      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CREATE",
        entityType: "ImportBatch",
        entityId: batch.id,
        after: {
          entityKind: input.entityKind,
          fileName: input.fileName,
          totalRows: rows.length,
          validRows,
          invalidRows,
        },
        eventType: "ImportValidated",
        eventPayload: { businessId, batchId: batch.id, entityKind: input.entityKind },
      });

      return {
        ...toSummary(batch),
        columns: file.columns,
        rows,
      };
    });
  }

  async apply(businessId: string, actorUserId: string, batchId: string): Promise<ImportApplied> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "IMPORT_MANAGE");
      const batch = await transaction.importBatch.findFirst({
        where: { id: batchId, businessId },
      });
      if (!batch) throw new BusinessAccessError("NOT_FOUND", "Import batch was not found.");
      if (batch.status !== "VALIDATED") {
        throw new BusinessAccessError(
          "CONFLICT",
          `Only a validated import can be applied. This batch is ${batch.status.toLowerCase()}.`,
        );
      }

      const preview = batch.preview as unknown as { rows: ImportPreviewRow[] } | null;
      const validRows = (preview?.rows ?? []).filter((row) => row.valid);
      if (!validRows.length) {
        throw new BusinessAccessError("CONFLICT", "This import has no valid rows to apply.");
      }

      const createdIds: string[] = [];
      for (const row of validRows) {
        createdIds.push(await this.applyRow(transaction, businessId, batch.entityKind, row.values));
      }

      const updated = await transaction.importBatch.update({
        where: { id: batchId },
        data: {
          status: "APPLIED",
          appliedRows: createdIds.length,
          appliedAt: new Date(),
          createdIds,
        },
      });

      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "UPDATE",
        entityType: "ImportBatch",
        entityId: batchId,
        before: { status: batch.status },
        after: { status: "APPLIED", appliedRows: createdIds.length },
        eventType: "ImportApplied",
        eventPayload: {
          businessId,
          batchId,
          entityKind: batch.entityKind,
          createdCount: createdIds.length,
        },
      });

      return { ...toSummary(updated), createdIds };
    });
  }

  async rollback(
    businessId: string,
    actorUserId: string,
    batchId: string,
  ): Promise<ImportBatchSummary> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "IMPORT_MANAGE");
      const batch = await transaction.importBatch.findFirst({
        where: { id: batchId, businessId },
      });
      if (!batch) throw new BusinessAccessError("NOT_FOUND", "Import batch was not found.");
      if (batch.status !== "APPLIED") {
        throw new BusinessAccessError("CONFLICT", "Only an applied import can be rolled back.");
      }

      const createdIds = (batch.createdIds as unknown as string[] | null) ?? [];
      if (createdIds.length) {
        if (batch.entityKind === "ITEMS") {
          const used = await transaction.saleLine.count({
            where: { businessId, itemId: { in: createdIds } },
          });
          if (used > 0) {
            throw new BusinessAccessError(
              "CONFLICT",
              "Some imported items are already used on sales. Deactivate them instead of rolling back.",
            );
          }
          await transaction.itemPrice.deleteMany({
            where: { businessId, itemId: { in: createdIds } },
          });
          await transaction.itemIdentifier.deleteMany({
            where: { businessId, itemId: { in: createdIds } },
          });
          await transaction.item.deleteMany({ where: { businessId, id: { in: createdIds } } });
        }
        if (batch.entityKind === "CUSTOMERS") {
          const used = await transaction.sale.count({
            where: { businessId, customerId: { in: createdIds } },
          });
          if (used > 0) {
            throw new BusinessAccessError(
              "CONFLICT",
              "Some imported customers already have sales. Deactivate them instead of rolling back.",
            );
          }
          await transaction.customer.deleteMany({ where: { businessId, id: { in: createdIds } } });
        }
        if (batch.entityKind === "SUPPLIERS") {
          await transaction.supplierItem.deleteMany({
            where: { businessId, supplierId: { in: createdIds } },
          });
          await transaction.supplier.deleteMany({ where: { businessId, id: { in: createdIds } } });
        }
      }

      const updated = await transaction.importBatch.update({
        where: { id: batchId },
        data: { status: "ROLLED_BACK", rolledBackAt: new Date(), appliedRows: 0 },
      });

      await recordChange(transaction, {
        businessId,
        actorMembershipId: actor.membershipId,
        action: "CANCEL",
        entityType: "ImportBatch",
        entityId: batchId,
        before: { status: batch.status, appliedRows: batch.appliedRows },
        after: { status: "ROLLED_BACK", removed: createdIds.length },
        eventType: "ImportRolledBack",
        eventPayload: { businessId, batchId, removed: createdIds.length },
      });

      return toSummary(updated);
    });
  }

  async list(businessId: string, actorUserId: string): Promise<ImportBatchSummary[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "IMPORT_VIEW");
      const batches = await transaction.importBatch.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return batches.map(toSummary);
    });
  }

  async getPreview(
    businessId: string,
    actorUserId: string,
    batchId: string,
  ): Promise<ImportPreview> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "IMPORT_VIEW");
      const batch = await transaction.importBatch.findFirst({
        where: { id: batchId, businessId },
      });
      if (!batch) throw new BusinessAccessError("NOT_FOUND", "Import batch was not found.");
      const preview = batch.preview as unknown as {
        columns: string[];
        rows: ImportPreviewRow[];
      } | null;
      return {
        ...toSummary(batch),
        columns: preview?.columns ?? [],
        rows: preview?.rows ?? [],
      };
    });
  }

  /* --------------------------------------------------------------- helpers */

  private async validateRows(
    transaction: DatabaseTransaction,
    businessId: string,
    entityKind: ImportEntityKind,
    rows: Array<Record<string, string>>,
  ): Promise<ImportPreviewRow[]> {
    const seenCodes = new Set<string>();
    const seenBarcodes = new Set<string>();

    const [units, categories, brands, taxCategories, customerGroups] = await Promise.all([
      transaction.unit.findMany({ where: { businessId }, select: { code: true } }),
      transaction.itemCategory.findMany({ where: { businessId }, select: { code: true } }),
      transaction.brand.findMany({ where: { businessId }, select: { code: true } }),
      transaction.taxCategory.findMany({ where: { businessId }, select: { code: true } }),
      transaction.customerGroup.findMany({ where: { businessId }, select: { code: true } }),
    ]);
    const unitCodes = new Set(units.map((unit) => unit.code));
    const categoryCodes = new Set(categories.map((category) => category.code));
    const brandCodes = new Set(brands.map((brand) => brand.code));
    const taxCodes = new Set(taxCategories.map((category) => category.code));
    const groupCodes = new Set(customerGroups.map((group) => group.code));

    const result: ImportPreviewRow[] = [];

    for (const [index, raw] of rows.entries()) {
      const values = normalizeRow(raw);
      const errors: string[] = [];
      const code = (values.code ?? "").toUpperCase();

      if (entityKind === "OPENING_DATA") {
        errors.push(
          "Opening stock needs the P3 inventory phase. Import items first, then load opening quantities when stock is available.",
        );
        result.push({ rowNumber: index + 2, valid: false, errors, values });
        continue;
      }

      if (!code) errors.push("code is required.");
      if (!values.name) errors.push("name is required.");
      if (code && seenCodes.has(code)) errors.push("code is repeated inside this file.");
      seenCodes.add(code);

      if (entityKind === "ITEMS") {
        const existing = code
          ? await transaction.item.findFirst({ where: { businessId, code }, select: { id: true } })
          : null;
        if (existing) errors.push("An item with this code already exists.");

        const unit = (values.unit ?? "EA").toUpperCase();
        if (!unitCodes.has(unit)) errors.push(`unit ${unit} does not exist yet.`);
        values.unit = unit;

        const kind = (values.kind ?? "PRODUCT").toUpperCase();
        if (!ITEM_KINDS.has(kind)) errors.push(`kind ${kind} is not a supported item kind.`);
        values.kind = kind;

        if (values.category && !categoryCodes.has(values.category.toUpperCase())) {
          errors.push(`category ${values.category} does not exist yet.`);
        }
        if (values.brand && !brandCodes.has(values.brand.toUpperCase())) {
          errors.push(`brand ${values.brand} does not exist yet.`);
        }
        if (values.tax_category && !taxCodes.has(values.tax_category.toUpperCase())) {
          errors.push(`tax_category ${values.tax_category} does not exist yet.`);
        }
        if (values.barcode) {
          if (seenBarcodes.has(values.barcode)) {
            errors.push("barcode is repeated inside this file.");
          } else {
            seenBarcodes.add(values.barcode);
            const duplicate = await transaction.itemIdentifier.findFirst({
              where: { businessId, value: values.barcode },
              select: { id: true },
            });
            if (duplicate) errors.push("barcode already belongs to another item.");
          }
        }
        for (const field of ["price", "cost"]) {
          const value = values[field];
          if (value && Number.isNaN(Number(value))) errors.push(`${field} must be a number.`);
        }
      }

      if (entityKind === "CUSTOMERS") {
        const existing = code
          ? await transaction.customer.findFirst({
              where: { businessId, code },
              select: { id: true },
            })
          : null;
        if (existing) errors.push("A customer with this code already exists.");
        if (values.email && !values.email.includes("@")) errors.push("email is not valid.");
        if (values.group && !groupCodes.has(values.group.toUpperCase())) {
          errors.push(`group ${values.group} does not exist yet.`);
        }
      }

      if (entityKind === "SUPPLIERS") {
        const existing = code
          ? await transaction.supplier.findFirst({
              where: { businessId, code },
              select: { id: true },
            })
          : null;
        if (existing) errors.push("A supplier with this code already exists.");
        if (values.email && !values.email.includes("@")) errors.push("email is not valid.");
        if (values.lead_time_days && !Number.isInteger(Number(values.lead_time_days))) {
          errors.push("lead_time_days must be a whole number.");
        }
      }

      values.code = code;
      result.push({ rowNumber: index + 2, valid: errors.length === 0, errors, values });
    }

    return result;
  }

  private async applyRow(
    transaction: DatabaseTransaction,
    businessId: string,
    entityKind: ImportEntityKind,
    values: Record<string, string>,
  ): Promise<string> {
    if (entityKind === "ITEMS") {
      const unit = await transaction.unit.findFirstOrThrow({
        where: { businessId, code: (values.unit ?? "EA").toUpperCase() },
        select: { id: true },
      });
      const category = values.category
        ? await transaction.itemCategory.findFirst({
            where: { businessId, code: values.category.toUpperCase() },
            select: { id: true },
          })
        : null;
      const brand = values.brand
        ? await transaction.brand.findFirst({
            where: { businessId, code: values.brand.toUpperCase() },
            select: { id: true },
          })
        : null;
      const taxCategory = values.tax_category
        ? await transaction.taxCategory.findFirst({
            where: { businessId, code: values.tax_category.toUpperCase() },
            select: { id: true },
          })
        : null;

      const item = await transaction.item.create({
        data: {
          businessId,
          code: values.code ?? "",
          name: values.name ?? "",
          kind: (values.kind ?? "PRODUCT") as "PRODUCT",
          baseUnitId: unit.id,
          categoryId: category?.id ?? null,
          brandId: brand?.id ?? null,
          taxCategoryId: taxCategory?.id ?? null,
          sellable: true,
          purchasable: true,
          stockTracked: (values.stock_tracked ?? "").toLowerCase() === "true",
        },
      });

      if (values.barcode) {
        await transaction.itemIdentifier.create({
          data: { businessId, itemId: item.id, kind: "BARCODE", value: values.barcode },
        });
      }
      if (values.price) {
        const priceList = await transaction.priceList.findFirst({
          where: { businessId, isDefault: true },
          select: { id: true },
        });
        if (priceList) {
          await transaction.itemPrice.create({
            data: {
              businessId,
              itemId: item.id,
              priceListId: priceList.id,
              unitPrice: moneyToDb(Number(values.price)),
              costPrice: values.cost ? moneyToDb(Number(values.cost)) : null,
              minQuantity: quantityToDb(1),
            },
          });
        }
      }
      return item.id;
    }

    if (entityKind === "CUSTOMERS") {
      const group = values.group
        ? await transaction.customerGroup.findFirst({
            where: { businessId, code: values.group.toUpperCase() },
            select: { id: true },
          })
        : null;
      const customer = await transaction.customer.create({
        data: {
          businessId,
          code: values.code ?? "",
          name: values.name ?? "",
          email: values.email || null,
          phone: values.phone || null,
          groupId: group?.id ?? null,
          notes: values.notes || null,
        },
      });
      return customer.id;
    }

    const supplier = await transaction.supplier.create({
      data: {
        businessId,
        code: values.code ?? "",
        name: values.name ?? "",
        email: values.email || null,
        phone: values.phone || null,
        leadTimeDays: values.lead_time_days ? Number(values.lead_time_days) : null,
        paymentTerms: values.payment_terms || null,
        notes: values.notes || null,
      },
    });
    return supplier.id;
  }
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase().replace(/\s+/g, "_")] = value.trim();
  }
  return normalized;
}

function toSummary(batch: {
  id: string;
  entityKind: ImportEntityKind;
  status: ImportBatchSummary["status"];
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  appliedRows: number;
  createdAt: Date;
  appliedAt: Date | null;
  rolledBackAt: Date | null;
}): ImportBatchSummary {
  return {
    id: batch.id,
    entityKind: batch.entityKind,
    status: batch.status,
    fileName: batch.fileName,
    totalRows: batch.totalRows,
    validRows: batch.validRows,
    invalidRows: batch.invalidRows,
    appliedRows: batch.appliedRows,
    createdAt: batch.createdAt.toISOString(),
    appliedAt: batch.appliedAt?.toISOString() ?? null,
    rolledBackAt: batch.rolledBackAt?.toISOString() ?? null,
  };
}
