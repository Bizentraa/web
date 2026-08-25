import { z } from "zod";

export { themeModeSchema, themePresetSchema, updateBusinessThemeSchema } from "@bizentra/themes";
export type {
  BusinessThemeSettings,
  ThemeMode,
  ThemePreset,
  UpdateBusinessThemeInput,
} from "@bizentra/themes";

export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const itemKindSchema = z.enum([
  "PRODUCT",
  "SERVICE",
  "INGREDIENT",
  "PART",
  "BUNDLE",
  "FEE",
  "RENTAL",
]);

export const identifierKindSchema = z.enum(["SKU", "BARCODE", "QR", "SUPPLIER_CODE", "OTHER"]);

export const discountKindSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);

export const taxRateKindSchema = z.enum(["SALES", "PURCHASE", "BOTH"]);

export const importEntityKindSchema = z.enum(["ITEMS", "CUSTOMERS", "SUPPLIERS", "OPENING_DATA"]);

export const importStatusSchema = z.enum(["RECEIVED", "VALIDATED", "FAILED", "APPLIED"]);

export const locationTypeSchema = z.enum([
  "SHOP_FLOOR",
  "WAREHOUSE",
  "KITCHEN",
  "VAN",
  "SERVICE_BAY",
  "QUARANTINE",
  "OTHER",
]);

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

const shortCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[A-Za-z0-9_.-]+$/)
  .transform((value) => value.toUpperCase());

const nonNegativeMoneySchema = z.coerce.number().finite().min(0);

const positiveQuantitySchema = z.coerce.number().finite().positive();

const optionalJsonRecordSchema = z.record(z.string(), z.unknown()).optional();

const contactSchema = {
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
};

export const createBusinessFoundationSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    legalName: z.string().trim().max(200).optional(),
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
    defaultCurrency: currencyCodeSchema,
    timeZone: z.string().trim().min(3).max(80),
    countryCode: countryCodeSchema,
  }),
  firstBranch: z.object({
    code: codeSchema,
    name: z.string().trim().min(2).max(120),
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
  }),
  firstLocation: z.object({
    code: codeSchema,
    name: z.string().trim().min(2).max(120),
    type: locationTypeSchema.default("SHOP_FLOOR"),
  }),
  owner: z.object({
    externalSubject: z.string().trim().min(3).max(200),
    email: z.email(),
    displayName: z.string().trim().min(2).max(160),
  }),
});

export const createBranchSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  firstLocation: z
    .object({
      code: codeSchema,
      name: z.string().trim().min(2).max(120),
      type: locationTypeSchema.default("SHOP_FLOOR"),
    })
    .optional(),
});

export const nextDocumentNumberSchema = z.object({
  documentType: codeSchema,
  branchId: z.uuid().optional(),
});

export const developmentIdentitySchema = z.object({
  userId: z.uuid(),
  businessId: z.uuid(),
});

export const createUnitSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(80),
  precision: z.coerce.number().int().min(0).max(6).default(0),
});

export const createCategorySchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  parentId: z.uuid().optional(),
});

export const createBrandSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
});

export const createTaxCategorySchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(240).optional(),
  rate: z
    .object({
      code: shortCodeSchema,
      name: z.string().trim().min(1).max(120),
      rate: z.coerce.number().finite().min(0).max(1),
      kind: taxRateKindSchema.default("BOTH"),
      effectiveFrom: z.iso.date(),
    })
    .optional(),
});

export const createPriceListSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  currencyCode: currencyCodeSchema,
  isDefault: z.boolean().default(false),
});

export const createItemSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(180),
  kind: itemKindSchema.default("PRODUCT"),
  description: z.string().trim().max(500).optional(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
  baseUnitId: z.uuid(),
  taxCategoryId: z.uuid().optional(),
  sellable: z.boolean().default(true),
  purchasable: z.boolean().default(false),
  stockTracked: z.boolean().default(false),
  identifiers: z
    .array(
      z.object({
        kind: identifierKindSchema,
        value: z.string().trim().min(1).max(120),
      }),
    )
    .max(20)
    .default([]),
  variants: z
    .array(
      z.object({
        code: shortCodeSchema,
        name: z.string().trim().min(1).max(180),
        attributes: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .max(100)
    .default([]),
  price: z
    .object({
      priceListId: z.uuid().optional(),
      branchId: z.uuid().optional(),
      unitPrice: nonNegativeMoneySchema,
      costPrice: nonNegativeMoneySchema.optional(),
      minQuantity: positiveQuantitySchema.default(1),
    })
    .optional(),
});

export const createPromotionSchema = z
  .object({
    code: shortCodeSchema,
    name: z.string().trim().min(1).max(120),
    discountKind: discountKindSchema,
    discountValue: nonNegativeMoneySchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
    conditions: optionalJsonRecordSchema,
  })
  .refine((input) => !input.endsAt || input.endsAt > input.startsAt, {
    message: "Promotion end time must be after start time.",
    path: ["endsAt"],
  });

export const createCustomerGroupSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
});

export const createCustomerSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(180),
  groupId: z.uuid().optional(),
  billingAddress: optionalJsonRecordSchema,
  ...contactSchema,
});

export const createSupplierSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(180),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).optional(),
  paymentTerms: z.string().trim().max(120).optional(),
  address: optionalJsonRecordSchema,
  ...contactSchema,
});

export const createImportBatchSchema = z.object({
  entityKind: importEntityKindSchema,
  fileName: z.string().trim().min(1).max(240),
  totalRows: z.coerce.number().int().min(0).default(0),
  validRows: z.coerce.number().int().min(0).default(0),
  invalidRows: z.coerce.number().int().min(0).default(0),
  errors: optionalJsonRecordSchema,
});

export type CreateBusinessFoundationInput = z.input<typeof createBusinessFoundationSchema>;
export type CreateBranchInput = z.input<typeof createBranchSchema>;
export type NextDocumentNumberInput = z.input<typeof nextDocumentNumberSchema>;
export type CreateUnitInput = z.output<typeof createUnitSchema>;
export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type CreateBrandInput = z.output<typeof createBrandSchema>;
export type CreateTaxCategoryInput = z.output<typeof createTaxCategorySchema>;
export type CreatePriceListInput = z.output<typeof createPriceListSchema>;
export type CreateItemInput = z.output<typeof createItemSchema>;
export type CreatePromotionInput = z.output<typeof createPromotionSchema>;
export type CreateCustomerGroupInput = z.output<typeof createCustomerGroupSchema>;
export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type CreateSupplierInput = z.output<typeof createSupplierSchema>;
export type CreateImportBatchInput = z.output<typeof createImportBatchSchema>;

export interface P1DefaultsCreated {
  unitId: string;
  taxCategoryId: string;
  taxRateId: string;
  priceListId: string;
}

export interface CatalogRecordCreated {
  id: string;
}

export interface ItemCreated extends CatalogRecordCreated {
  variantIds: string[];
  identifierIds: string[];
  priceId?: string;
}

export interface CatalogSummary {
  counts: {
    units: number;
    categories: number;
    brands: number;
    taxCategories: number;
    priceLists: number;
    items: number;
    promotions: number;
    customers: number;
    suppliers: number;
    importBatches: number;
  };
  items: Array<{
    id: string;
    code: string;
    name: string;
    kind: z.infer<typeof itemKindSchema>;
    status: z.infer<typeof recordStatusSchema>;
    unit: string;
    price?: number;
  }>;
  customers: Array<{
    id: string;
    code: string;
    name: string;
    status: z.infer<typeof recordStatusSchema>;
  }>;
  suppliers: Array<{
    id: string;
    code: string;
    name: string;
    status: z.infer<typeof recordStatusSchema>;
  }>;
}

export interface BusinessFoundationCreated {
  businessId: string;
  branchId: string;
  locationId: string;
  ownerUserId: string;
  ownerMembershipId: string;
  ownerRoleId: string;
}

export interface BusinessFoundationSummary {
  business: {
    id: string;
    name: string;
    slug: string;
    defaultCurrency: string;
    timeZone: string;
    countryCode: string;
    status: "ACTIVE" | "INACTIVE";
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "INACTIVE";
    locations: Array<{
      id: string;
      code: string;
      name: string;
      type: z.infer<typeof locationTypeSchema>;
      status: "ACTIVE" | "INACTIVE";
    }>;
  }>;
  enabledFeatures: string[];
  memberships: number;
  roles: number;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
  checks?: Record<string, "up" | "down">;
  timestamp: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}
