import { z } from "zod";

export { themeModeSchema, themePresetSchema, updateBusinessThemeSchema } from "@bizentra/themes";
export type {
  BusinessThemeSettings,
  ThemeMode,
  ThemePreset,
  UpdateBusinessThemeInput,
} from "@bizentra/themes";

/* -------------------------------------------------------------------------- */
/* Shared vocabulary                                                          */
/* -------------------------------------------------------------------------- */

export const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const membershipStatusSchema = z.enum(["INVITED", "ACTIVE", "SUSPENDED"]);

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

export const importStatusSchema = z.enum([
  "RECEIVED",
  "VALIDATED",
  "FAILED",
  "APPLIED",
  "ROLLED_BACK",
]);

export const locationTypeSchema = z.enum([
  "SHOP_FLOOR",
  "WAREHOUSE",
  "KITCHEN",
  "VAN",
  "SERVICE_BAY",
  "QUARANTINE",
  "OTHER",
]);

export const approvalStrategySchema = z.enum([
  "ANY_APPROVER",
  "ALL_APPROVERS",
  "MINIMUM_APPROVERS",
]);

export const approvalRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

export const auditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "ACTIVATE",
  "DEACTIVATE",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "DELETE",
  "ASSIGN",
  "ENABLE",
  "DISABLE",
  "GENERATE",
]);

export const shiftStatusSchema = z.enum(["OPEN", "CLOSED"]);

export const cashMovementKindSchema = z.enum([
  "OPENING_FLOAT",
  "PAY_IN",
  "PAY_OUT",
  "SAFE_DROP",
  "CLOSING_COUNT",
]);

export const saleStatusSchema = z.enum([
  "DRAFT",
  "QUOTATION",
  "ORDER",
  "HELD",
  "CONFIRMED",
  "PARTIALLY_RETURNED",
  "RETURNED",
  "VOIDED",
]);

export const saleChannelSchema = z.enum(["POS", "BACK_OFFICE"]);

export const paymentMethodKindSchema = z.enum([
  "CASH",
  "CARD",
  "TRANSFER",
  "QR_WALLET",
  "STORE_CREDIT",
  "OTHER",
]);

export const paymentStatusSchema = z.enum(["PENDING", "SUCCEEDED", "FAILED", "UNKNOWN", "VOIDED"]);

export const returnStatusSchema = z.enum(["DRAFT", "ACCEPTED", "CANCELLED"]);

export const refundMethodSchema = z.enum(["ORIGINAL_METHOD", "CASH", "STORE_CREDIT"]);

export const stockDispositionSchema = z.enum(["RESELLABLE", "DAMAGED", "QUARANTINE"]);

export const stockMovementKindSchema = z.enum([
  "OPENING",
  "ADJUSTMENT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RECEIPT",
  "PICK",
  "PACK",
  "DISPATCH",
  "RETURN",
]);

export const stockMovementStatusSchema = z.enum(["POSTED", "IN_TRANSIT", "CANCELLED"]);

export const stockCountStatusSchema = z.enum(["OPEN", "POSTED", "CANCELLED"]);

export const purchaseRequestStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CONVERTED",
  "CANCELLED",
]);

export const purchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);

export const fulfillmentStatusSchema = z.enum([
  "READY_TO_PICK",
  "PICKING",
  "PACKED",
  "DISPATCHED",
  "CANCELLED",
]);

export const customerInvoiceStatusSchema = z.enum(["POSTED", "PARTIALLY_PAID", "PAID", "VOIDED"]);

export const supplierBillStatusSchema = z.enum(["POSTED", "PARTIALLY_PAID", "PAID", "VOIDED"]);

export const expenseStatusSchema = z.enum(["POSTED", "VOIDED"]);

export const bankAccountTypeSchema = z.enum(["CASH", "BANK", "GATEWAY", "WALLET"]);

export const bankTransactionKindSchema = z.enum([
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "COLLECTION",
  "SUPPLIER_PAYMENT",
  "EXPENSE",
  "ADJUSTMENT",
]);

export const loyaltyEntryKindSchema = z.enum(["EARN", "REDEEM", "ADJUST", "EXPIRE"]);

export const accountingEventStatusSchema = z.enum(["PENDING", "EXPORTED", "FAILED"]);

export const workTicketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
]);

export const workTicketPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const bookingStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "CANCELLED",
  "NO_SHOW",
  "COMPLETED",
]);

export const traceableUnitStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "CONSUMED",
  "RETURNED",
  "DAMAGED",
  "EXPIRED",
]);

export const warrantyClaimStatusSchema = z.enum([
  "OPEN",
  "INSPECTING",
  "APPROVED",
  "REJECTED",
  "REPAIRED",
  "REPLACED",
  "CLOSED",
]);

export const bomStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE"]);

export const deliveryStatusSchema = z.enum([
  "PLANNED",
  "LOADED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export const notificationStatusSchema = z.enum(["PENDING", "SENT", "FAILED", "CANCELLED"]);

export const deviceKindSchema = z.enum([
  "POS_TERMINAL",
  "RECEIPT_PRINTER",
  "LABEL_PRINTER",
  "KITCHEN_PRINTER",
  "BARCODE_SCANNER",
  "CASH_DRAWER",
  "PAYMENT_TERMINAL",
  "CUSTOMER_DISPLAY",
  "CAMERA",
  "OTHER",
]);

export const deviceStatusSchema = z.enum(["REGISTERED", "ACTIVE", "DISABLED", "LOST"]);

export const offlineQueueStatusSchema = z.enum([
  "QUEUED",
  "SYNCED",
  "CONFLICT",
  "FAILED",
  "CANCELLED",
]);

export const syncConflictStatusSchema = z.enum(["OPEN", "RESOLVED", "IGNORED"]);

export const dataExportStatusSchema = z.enum(["QUEUED", "READY", "FAILED", "EXPIRED"]);

export const webhookSubscriptionStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

export const webhookDeliveryStatusSchema = z.enum(["PENDING", "SENT", "FAILED", "DEAD_LETTER"]);

export const migrationValidationStatusSchema = z.enum([
  "RECEIVED",
  "VALIDATED",
  "FAILED",
  "APPROVED",
]);

export const securityEventSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);

export const backupRunStatusSchema = z.enum([
  "SCHEDULED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "RESTORE_TESTED",
]);

export const readinessCheckStatusSchema = z.enum(["PASS", "WARNING", "FAIL", "NOT_RUN"]);

export const privacyRequestStatusSchema = z.enum(["OPEN", "COMPLETED", "REJECTED"]);

export const releaseReadinessStatusSchema = z.enum([
  "DRAFT",
  "READY",
  "BLOCKED",
  "RELEASED",
  "ROLLED_BACK",
]);

export const featureKindSchema = z.enum(["CORE", "BUSINESS_PACK", "OPTIONAL"]);

export type RecordStatus = z.infer<typeof recordStatusSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type ItemKind = z.infer<typeof itemKindSchema>;
export type IdentifierKind = z.infer<typeof identifierKindSchema>;
export type DiscountKind = z.infer<typeof discountKindSchema>;
export type TaxRateKind = z.infer<typeof taxRateKindSchema>;
export type ImportEntityKind = z.infer<typeof importEntityKindSchema>;
export type ImportStatus = z.infer<typeof importStatusSchema>;
export type LocationType = z.infer<typeof locationTypeSchema>;
export type ApprovalStrategy = z.infer<typeof approvalStrategySchema>;
export type ApprovalRequestStatus = z.infer<typeof approvalRequestStatusSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type ShiftStatus = z.infer<typeof shiftStatusSchema>;
export type CashMovementKind = z.infer<typeof cashMovementKindSchema>;
export type SaleStatus = z.infer<typeof saleStatusSchema>;
export type SaleChannel = z.infer<typeof saleChannelSchema>;
export type PaymentMethodKind = z.infer<typeof paymentMethodKindSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type ReturnStatus = z.infer<typeof returnStatusSchema>;
export type RefundMethod = z.infer<typeof refundMethodSchema>;
export type StockDisposition = z.infer<typeof stockDispositionSchema>;
export type StockMovementKind = z.infer<typeof stockMovementKindSchema>;
export type StockMovementStatus = z.infer<typeof stockMovementStatusSchema>;
export type StockCountStatus = z.infer<typeof stockCountStatusSchema>;
export type PurchaseRequestStatus = z.infer<typeof purchaseRequestStatusSchema>;
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;
export type CustomerInvoiceStatus = z.infer<typeof customerInvoiceStatusSchema>;
export type SupplierBillStatus = z.infer<typeof supplierBillStatusSchema>;
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;
export type BankAccountType = z.infer<typeof bankAccountTypeSchema>;
export type BankTransactionKind = z.infer<typeof bankTransactionKindSchema>;
export type LoyaltyEntryKind = z.infer<typeof loyaltyEntryKindSchema>;
export type AccountingEventStatus = z.infer<typeof accountingEventStatusSchema>;
export type WorkTicketStatus = z.infer<typeof workTicketStatusSchema>;
export type WorkTicketPriority = z.infer<typeof workTicketPrioritySchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type TraceableUnitStatus = z.infer<typeof traceableUnitStatusSchema>;
export type WarrantyClaimStatus = z.infer<typeof warrantyClaimStatusSchema>;
export type BomStatus = z.infer<typeof bomStatusSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type DeviceKind = z.infer<typeof deviceKindSchema>;
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;
export type OfflineQueueStatus = z.infer<typeof offlineQueueStatusSchema>;
export type SyncConflictStatus = z.infer<typeof syncConflictStatusSchema>;
export type DataExportStatus = z.infer<typeof dataExportStatusSchema>;
export type WebhookSubscriptionStatus = z.infer<typeof webhookSubscriptionStatusSchema>;
export type WebhookDeliveryStatus = z.infer<typeof webhookDeliveryStatusSchema>;
export type MigrationValidationStatus = z.infer<typeof migrationValidationStatusSchema>;
export type SecurityEventSeverity = z.infer<typeof securityEventSeveritySchema>;
export type BackupRunStatus = z.infer<typeof backupRunStatusSchema>;
export type ReadinessCheckStatus = z.infer<typeof readinessCheckStatusSchema>;
export type PrivacyRequestStatus = z.infer<typeof privacyRequestStatusSchema>;
export type ReleaseReadinessStatus = z.infer<typeof releaseReadinessStatusSchema>;
export type FeatureKind = z.infer<typeof featureKindSchema>;

/* -------------------------------------------------------------------------- */
/* Reusable field builders                                                    */
/* -------------------------------------------------------------------------- */

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

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9:_-]+$/);

const reasonSchema = z.string().trim().min(3).max(500);

const contactSchema = {
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
};

export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: recordStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListQuery = z.output<typeof listQuerySchema>;

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* -------------------------------------------------------------------------- */
/* P0 - Business foundation and setup                                          */
/* -------------------------------------------------------------------------- */

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

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  legalName: z.string().trim().max(200).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  defaultCurrency: currencyCodeSchema.optional(),
  timeZone: z.string().trim().min(3).max(80).optional(),
  countryCode: countryCodeSchema.optional(),
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

export const updateBranchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: recordStatusSchema.optional(),
});

export const createLocationSchema = z.object({
  branchId: z.uuid(),
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  type: locationTypeSchema.default("SHOP_FLOOR"),
});

export const updateLocationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  type: locationTypeSchema.optional(),
  status: recordStatusSchema.optional(),
});

export const inviteUserSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(2).max(160),
  externalSubject: z.string().trim().min(3).max(200).optional(),
  roleIds: z.array(z.uuid()).max(20).default([]),
  branchIds: z.array(z.uuid()).max(50).default([]),
});

export const updateMembershipSchema = z.object({
  status: membershipStatusSchema.optional(),
  displayName: z.string().trim().min(2).max(160).optional(),
  roleIds: z.array(z.uuid()).max(20).optional(),
  branchIds: z.array(z.uuid()).max(50).optional(),
});

export const createRoleSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(z.string().trim().min(2).max(80)).max(200).default([]),
  templateCode: z.string().trim().max(50).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  status: recordStatusSchema.optional(),
  permissions: z.array(z.string().trim().min(2).max(80)).max(200).optional(),
});

export const upsertApprovalPolicySchema = z.object({
  actionCode: z.string().trim().min(3).max(80),
  name: z.string().trim().min(2).max(120),
  strategy: approvalStrategySchema.default("ANY_APPROVER"),
  minimumApprovers: z.coerce.number().int().min(1).max(10).default(1),
  thresholdAmount: nonNegativeMoneySchema.nullable().optional(),
  currencyCode: currencyCodeSchema.nullable().optional(),
  conditions: optionalJsonRecordSchema,
  enabled: z.boolean().default(true),
});

export const createApprovalRequestSchema = z.object({
  actionCode: z.string().trim().min(3).max(80),
  entityType: z.string().trim().min(2).max(80),
  entityId: z.string().trim().max(80).optional(),
  branchId: z.uuid().optional(),
  amount: nonNegativeMoneySchema.optional(),
  currencyCode: currencyCodeSchema.optional(),
  reason: reasonSchema,
  context: optionalJsonRecordSchema,
});

export const decideApprovalRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});

export const setFeatureSchema = z.object({
  featureKey: z.string().trim().min(2).max(80),
  enabled: z.boolean(),
  settings: optionalJsonRecordSchema,
});

export const auditQuerySchema = z.object({
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(80).optional(),
  action: auditActionSchema.optional(),
  actorMembershipId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const upsertDocumentSequenceSchema = z.object({
  documentType: codeSchema,
  branchId: z.uuid().nullable().optional(),
  prefix: z.string().trim().min(1).max(24),
  padding: z.coerce.number().int().min(3).max(12).default(6),
  nextValue: z.coerce.number().int().min(1).optional(),
});

export const nextDocumentNumberSchema = z.object({
  documentType: codeSchema,
  branchId: z.uuid().optional(),
});

export const developmentIdentitySchema = z.object({
  userId: z.uuid(),
  businessId: z.uuid(),
});

/* -------------------------------------------------------------------------- */
/* P1 - Master data and configuration                                          */
/* -------------------------------------------------------------------------- */

export const createUnitSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(80),
  precision: z.coerce.number().int().min(0).max(6).default(0),
});

export const updateUnitSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  precision: z.coerce.number().int().min(0).max(6).optional(),
  status: recordStatusSchema.optional(),
});

export const createUnitConversionSchema = z.object({
  fromUnitId: z.uuid(),
  toUnitId: z.uuid(),
  factor: z.coerce.number().finite().positive(),
});

export const createCategorySchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  parentId: z.uuid().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.uuid().nullable().optional(),
  status: recordStatusSchema.optional(),
});

export const createBrandSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
});

export const updateBrandSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: recordStatusSchema.optional(),
});

export const createItemTagSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(80),
});

export const assignItemTagsSchema = z.object({
  tagIds: z.array(z.uuid()).max(50).default([]),
});

export const createAttributeDefinitionSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  appliesTo: z.enum(["ITEM", "VARIANT", "CUSTOMER", "SUPPLIER"]).default("ITEM"),
  dataType: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "LIST"]).default("TEXT"),
});

export const setItemAttributeValuesSchema = z.object({
  values: z
    .array(z.object({ attributeId: z.uuid(), value: z.unknown() }))
    .max(50)
    .default([]),
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

export const updateTaxCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  status: recordStatusSchema.optional(),
});

export const createTaxRateSchema = z.object({
  taxCategoryId: z.uuid(),
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  rate: z.coerce.number().finite().min(0).max(1),
  kind: taxRateKindSchema.default("BOTH"),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date().optional(),
});

export const updateTaxRateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  rate: z.coerce.number().finite().min(0).max(1).optional(),
  kind: taxRateKindSchema.optional(),
  effectiveTo: z.iso.date().nullable().optional(),
  status: recordStatusSchema.optional(),
});

export const createPriceListSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(120),
  currencyCode: currencyCodeSchema,
  isDefault: z.boolean().default(false),
});

export const updatePriceListSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  status: recordStatusSchema.optional(),
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

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  kind: itemKindSchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  brandId: z.uuid().nullable().optional(),
  baseUnitId: z.uuid().optional(),
  taxCategoryId: z.uuid().nullable().optional(),
  sellable: z.boolean().optional(),
  purchasable: z.boolean().optional(),
  stockTracked: z.boolean().optional(),
  status: recordStatusSchema.optional(),
});

export const createItemVariantSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(180),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export const createItemIdentifierSchema = z.object({
  kind: identifierKindSchema,
  value: z.string().trim().min(1).max(120),
  variantId: z.uuid().optional(),
});

export const upsertItemPriceSchema = z.object({
  priceListId: z.uuid().optional(),
  variantId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  unitPrice: nonNegativeMoneySchema,
  costPrice: nonNegativeMoneySchema.optional(),
  minQuantity: positiveQuantitySchema.default(1),
  validFrom: z.iso.datetime().optional(),
  validTo: z.iso.datetime().optional(),
});

export const promotionConditionsSchema = z.object({
  scope: z.enum(["SALE", "ITEM", "CATEGORY"]).default("SALE"),
  itemIds: z.array(z.uuid()).max(200).default([]),
  categoryIds: z.array(z.uuid()).max(100).default([]),
  minimumQuantity: z.coerce.number().finite().min(0).default(0),
  minimumAmount: nonNegativeMoneySchema.default(0),
  buyQuantity: z.coerce.number().int().min(0).default(0),
  getQuantity: z.coerce.number().int().min(0).default(0),
  couponCode: z.string().trim().max(40).optional(),
  priority: z.coerce.number().int().min(0).max(100).default(50),
});

export const createPromotionSchema = z
  .object({
    code: shortCodeSchema,
    name: z.string().trim().min(1).max(120),
    discountKind: discountKindSchema,
    discountValue: nonNegativeMoneySchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
    conditions: promotionConditionsSchema.optional(),
  })
  .refine((input) => !input.endsAt || input.endsAt > input.startsAt, {
    message: "Promotion end time must be after start time.",
    path: ["endsAt"],
  });

export const updatePromotionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  discountKind: discountKindSchema.optional(),
  discountValue: nonNegativeMoneySchema.optional(),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  conditions: promotionConditionsSchema.optional(),
  status: recordStatusSchema.optional(),
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
  creditLimit: nonNegativeMoneySchema.default(0),
  creditTermsDays: z.coerce.number().int().min(0).max(3650).optional(),
  creditHold: z.boolean().default(false),
  ...contactSchema,
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  groupId: z.uuid().nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  billingAddress: optionalJsonRecordSchema,
  creditLimit: nonNegativeMoneySchema.optional(),
  creditTermsDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  creditHold: z.boolean().optional(),
  status: recordStatusSchema.optional(),
});

export const createSupplierSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(1).max(180),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).optional(),
  paymentTerms: z.string().trim().max(120).optional(),
  address: optionalJsonRecordSchema,
  ...contactSchema,
});

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  paymentTerms: z.string().trim().max(120).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  address: optionalJsonRecordSchema,
  status: recordStatusSchema.optional(),
});

export const upsertSupplierItemSchema = z.object({
  itemId: z.uuid(),
  supplierCode: z.string().trim().max(80).optional(),
  costPrice: nonNegativeMoneySchema.optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(3650).optional(),
});

export const createImportBatchSchema = z.object({
  entityKind: importEntityKindSchema,
  fileName: z.string().trim().min(1).max(240),
  totalRows: z.coerce.number().int().min(0).default(0),
  validRows: z.coerce.number().int().min(0).default(0),
  invalidRows: z.coerce.number().int().min(0).default(0),
  errors: optionalJsonRecordSchema,
});

export const validateImportSchema = z.object({
  entityKind: importEntityKindSchema,
  fileName: z.string().trim().min(1).max(240),
  content: z.string().min(1).max(2_000_000),
  delimiter: z.enum([",", ";", "\t"]).default(","),
});

export const pricingContextSchema = z.object({
  branchId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  priceListId: z.uuid().optional(),
  quantity: positiveQuantitySchema.default(1),
  at: z.iso.datetime().optional(),
});

/* -------------------------------------------------------------------------- */
/* P2 - Sales, POS and payments                                                */
/* -------------------------------------------------------------------------- */

export const openShiftSchema = z.object({
  branchId: z.uuid(),
  registerCode: shortCodeSchema,
  openingFloat: nonNegativeMoneySchema.default(0),
  note: z.string().trim().max(240).optional(),
});

export const cashMovementSchema = z.object({
  kind: cashMovementKindSchema,
  amount: z.coerce.number().finite().positive(),
  reason: z.string().trim().min(3).max(240),
});

export const closeShiftSchema = z.object({
  countedCash: nonNegativeMoneySchema,
  varianceReason: z.string().trim().max(500).optional(),
  approvalRequestId: z.uuid().optional(),
});

export const saleLineInputSchema = z.object({
  itemId: z.uuid().optional(),
  variantId: z.uuid().optional(),
  identifier: z.string().trim().min(1).max(120).optional(),
  quantity: positiveQuantitySchema,
  unitPriceOverride: nonNegativeMoneySchema.optional(),
  discountKind: discountKindSchema.optional(),
  discountValue: nonNegativeMoneySchema.optional(),
  note: z.string().trim().max(240).optional(),
});

export const saleCartSchema = z.object({
  branchId: z.uuid(),
  customerId: z.uuid().optional(),
  priceListId: z.uuid().optional(),
  couponCode: z.string().trim().max(40).optional(),
  saleDiscountKind: discountKindSchema.optional(),
  saleDiscountValue: nonNegativeMoneySchema.optional(),
  lines: z.array(saleLineInputSchema).min(1).max(200),
  at: z.iso.datetime().optional(),
});

export const quoteSaleSchema = saleCartSchema;

export const tenderSchema = z.object({
  method: paymentMethodKindSchema,
  amount: nonNegativeMoneySchema,
  tenderedAmount: nonNegativeMoneySchema.optional(),
  reference: z.string().trim().max(120).optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const createSaleSchema = saleCartSchema.extend({
  idempotencyKey: idempotencyKeySchema,
  shiftId: z.uuid().optional(),
  channel: saleChannelSchema.default("POS"),
  hold: z.boolean().default(false),
  holdName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  offlineRef: z.string().trim().max(80).optional(),
  approvalRequestId: z.uuid().optional(),
  payments: z.array(tenderSchema).max(10).default([]),
});

export const createQuotationSchema = saleCartSchema.extend({
  idempotencyKey: idempotencyKeySchema,
  note: z.string().trim().max(500).optional(),
  validUntil: z.iso.datetime().optional(),
});

export const createSalesOrderSchema = saleCartSchema.extend({
  idempotencyKey: idempotencyKeySchema,
  note: z.string().trim().max(500).optional(),
  sourceQuotationId: z.uuid().optional(),
});

export const convertQuotationToOrderSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const confirmSalesOrderSchema = z.object({
  shiftId: z.uuid().optional(),
  approvalRequestId: z.uuid().optional(),
});

export const updateHeldSaleSchema = saleCartSchema.extend({
  holdName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export const confirmSaleSchema = z.object({
  shiftId: z.uuid().optional(),
  approvalRequestId: z.uuid().optional(),
});

export const addPaymentSchema = tenderSchema.extend({
  markUnknown: z.boolean().default(false),
});

export const resolvePaymentSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED", "VOIDED"]),
  reference: z.string().trim().max(120).optional(),
  failureReason: z.string().trim().max(240).optional(),
});

export const voidSaleSchema = z.object({
  reason: reasonSchema,
  approvalRequestId: z.uuid().optional(),
});

export const createReturnSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  shiftId: z.uuid().optional(),
  reason: reasonSchema,
  refundMethod: refundMethodSchema.default("ORIGINAL_METHOD"),
  approvalRequestId: z.uuid().optional(),
  lines: z
    .array(
      z.object({
        saleLineId: z.uuid(),
        quantity: positiveQuantitySchema,
        disposition: stockDispositionSchema.default("RESELLABLE"),
      }),
    )
    .min(1)
    .max(200),
});

export const createExchangeSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  shiftId: z.uuid().optional(),
  reason: reasonSchema,
  approvalRequestId: z.uuid().optional(),
  returnLines: z
    .array(
      z.object({
        saleLineId: z.uuid(),
        quantity: positiveQuantitySchema,
        disposition: stockDispositionSchema.default("RESELLABLE"),
      }),
    )
    .min(1)
    .max(200),
  replacement: saleCartSchema,
});

export const saleQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: saleStatusSchema.optional(),
  branchId: z.uuid().optional(),
  shiftId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const catalogSearchSchema = z.object({
  term: z.string().trim().max(120).default(""),
  branchId: z.uuid().optional(),
  /* A till shows the catalogue as a grid, so the cashier narrows it by category rather than by
     typing. The filter is applied in the query so paging and the result limit stay honest. */
  categoryId: z.uuid().optional(),
  priceListId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const syncQueueSchema = z.object({
  operations: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("SALE"),
          clientRef: z.string().trim().max(80),
          payload: createSaleSchema,
        }),
        z.object({
          kind: z.literal("PAYMENT"),
          clientRef: z.string().trim().max(80),
          saleId: z.uuid(),
          payload: addPaymentSchema,
        }),
      ]),
    )
    .min(1)
    .max(50),
});

/* -------------------------------------------------------------------------- */
/* P3 - Inventory, purchasing and fulfillment                                  */
/* -------------------------------------------------------------------------- */

const p3LineSchema = z.object({
  itemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: positiveQuantitySchema,
  unitCost: nonNegativeMoneySchema.optional(),
  note: z.string().trim().max(240).optional(),
});

export const stockAdjustmentSchema = z.object({
  branchId: z.uuid(),
  locationId: z.uuid(),
  itemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantityChange: z.coerce
    .number()
    .finite()
    .refine((value) => value !== 0, {
      message: "Quantity change cannot be zero.",
    }),
  unitCost: nonNegativeMoneySchema.optional(),
  reason: reasonSchema,
  approvalRequestId: z.uuid().optional(),
});

export const stockTransferSchema = z.object({
  branchId: z.uuid(),
  fromLocationId: z.uuid(),
  toLocationId: z.uuid(),
  itemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: positiveQuantitySchema,
  reason: reasonSchema,
});

export const createStockCountSchema = z.object({
  branchId: z.uuid(),
  locationId: z.uuid(),
  name: z.string().trim().min(2).max(160),
  itemIds: z.array(z.uuid()).max(100).optional(),
});

export const postStockCountSchema = z.object({
  varianceReason: reasonSchema,
  lines: z
    .array(
      z.object({
        stockCountLineId: z.uuid(),
        countedQuantity: nonNegativeMoneySchema,
        note: z.string().trim().max(240).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const reorderSettingSchema = z
  .object({
    locationId: z.uuid(),
    itemId: z.uuid(),
    variantId: z.uuid().optional(),
    minimumQuantity: nonNegativeMoneySchema,
    targetQuantity: positiveQuantitySchema,
  })
  .refine((input) => input.targetQuantity >= input.minimumQuantity, {
    message: "Target quantity must be greater than or equal to minimum quantity.",
    path: ["targetQuantity"],
  });

export const createPurchaseRequestSchema = z.object({
  branchId: z.uuid(),
  reason: reasonSchema,
  lines: z.array(p3LineSchema).min(1).max(100),
});

export const decidePurchaseRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500).optional(),
});

export const createPurchaseOrderSchema = z.object({
  branchId: z.uuid(),
  supplierId: z.uuid(),
  purchaseRequestId: z.uuid().optional(),
  expectedDate: z.iso.date().optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(p3LineSchema.extend({ unitCost: nonNegativeMoneySchema }))
    .min(1)
    .max(100),
});

export const receivePurchaseOrderSchema = z.object({
  locationId: z.uuid(),
  supplierDocument: z.string().trim().max(120).optional(),
  lines: z
    .array(
      z.object({
        purchaseOrderLineId: z.uuid(),
        quantity: positiveQuantitySchema,
        unitCost: nonNegativeMoneySchema.optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const createFulfillmentOrderSchema = z.object({
  branchId: z.uuid(),
  locationId: z.uuid().optional(),
  customerName: z.string().trim().max(180).optional(),
  sourceType: z.string().trim().min(2).max(80),
  sourceId: z.string().trim().min(2).max(80),
  lines: z.array(p3LineSchema).min(1).max(100),
});

export const reserveSalesOrderSchema = z.object({
  salesOrderId: z.uuid(),
  locationId: z.uuid(),
});

export const updateFulfillmentStatusSchema = z.object({
  status: fulfillmentStatusSchema,
});

/* -------------------------------------------------------------------------- */
/* P4 - Finance, customer credit and loyalty                                  */
/* -------------------------------------------------------------------------- */

const financeLineSchema = z.object({
  itemId: z.uuid().optional(),
  description: z.string().trim().min(2).max(240),
  quantity: positiveQuantitySchema,
  unitAmount: nonNegativeMoneySchema,
  taxAmount: nonNegativeMoneySchema.default(0),
});

const allocationSchema = z.object({
  documentId: z.uuid(),
  amount: positiveQuantitySchema,
});

export const createCustomerInvoiceSchema = z.object({
  branchId: z.uuid().optional(),
  customerId: z.uuid(),
  currencyCode: currencyCodeSchema,
  dueDate: z.iso.date().optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(financeLineSchema).min(1).max(100),
});

export const collectCustomerPaymentSchema = z.object({
  branchId: z.uuid().optional(),
  customerId: z.uuid(),
  amount: positiveQuantitySchema,
  currencyCode: currencyCodeSchema,
  method: z.string().trim().min(2).max(60),
  reference: z.string().trim().max(120).optional(),
  collectedAt: z.iso.datetime().optional(),
  allocations: z.array(allocationSchema).max(100).default([]),
});

export const createSupplierBillSchema = z.object({
  branchId: z.uuid().optional(),
  supplierId: z.uuid(),
  purchaseOrderId: z.uuid().optional(),
  supplierDocument: z.string().trim().max(120).optional(),
  currencyCode: currencyCodeSchema,
  dueDate: z.iso.date().optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(financeLineSchema).min(1).max(100),
});

export const paySupplierBillSchema = z.object({
  branchId: z.uuid().optional(),
  supplierId: z.uuid(),
  amount: positiveQuantitySchema,
  currencyCode: currencyCodeSchema,
  method: z.string().trim().min(2).max(60),
  reference: z.string().trim().max(120).optional(),
  paidAt: z.iso.datetime().optional(),
  allocations: z.array(allocationSchema).max(100).default([]),
});

export const createExpenseCategorySchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(120),
});

export const createExpenseSchema = z.object({
  branchId: z.uuid().optional(),
  categoryId: z.uuid(),
  amount: positiveQuantitySchema,
  taxAmount: nonNegativeMoneySchema.default(0),
  currencyCode: currencyCodeSchema,
  paymentMethod: z.string().trim().min(2).max(60),
  spentAt: z.iso.datetime().optional(),
  supplierName: z.string().trim().max(180).optional(),
  description: z.string().trim().min(2).max(240),
  attachmentUrl: z.url().max(500).optional(),
});

export const createBankAccountSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(120),
  type: bankAccountTypeSchema,
  currencyCode: currencyCodeSchema,
  openingBalance: nonNegativeMoneySchema.default(0),
});

export const postBankTransactionSchema = z.object({
  branchId: z.uuid().optional(),
  accountId: z.uuid(),
  kind: bankTransactionKindSchema,
  amount: positiveQuantitySchema,
  currencyCode: currencyCodeSchema,
  reference: z.string().trim().max(120).optional(),
  description: z.string().trim().min(2).max(240),
  occurredAt: z.iso.datetime().optional(),
});

export const postBankTransferSchema = z
  .object({
    branchId: z.uuid().optional(),
    fromAccountId: z.uuid(),
    toAccountId: z.uuid(),
    amount: positiveQuantitySchema,
    currencyCode: currencyCodeSchema,
    reference: z.string().trim().max(120).optional(),
    description: z.string().trim().min(2).max(240),
    occurredAt: z.iso.datetime().optional(),
  })
  .refine((input) => input.fromAccountId !== input.toAccountId, {
    message: "Transfer needs two different accounts.",
    path: ["toAccountId"],
  });

export const adjustLoyaltySchema = z.object({
  customerId: z.uuid(),
  kind: loyaltyEntryKindSchema,
  points: positiveQuantitySchema,
  tier: z.string().trim().min(2).max(80).optional(),
  reference: z.string().trim().max(120).optional(),
  reason: z.string().trim().min(2).max(240),
  expiresAt: z.iso.datetime().optional(),
});

/* -------------------------------------------------------------------------- */
/* P5 - Reusable business engines                                             */
/* -------------------------------------------------------------------------- */

export const createWorkflowStatusSchema = z.object({
  appliesTo: z.string().trim().min(2).max(80),
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(120),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isFinal: z.boolean().default(false),
});

export const createWorkflowTransitionSchema = z.object({
  appliesTo: z.string().trim().min(2).max(80),
  fromStatusCode: shortCodeSchema,
  toStatusCode: shortCodeSchema,
  requiredPermission: z.string().trim().min(2).max(80).optional(),
  requiresApproval: z.boolean().default(false),
});

export const createWorkTicketSchema = z.object({
  branchId: z.uuid().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).optional(),
  priority: workTicketPrioritySchema.default("NORMAL"),
  sourceType: z.string().trim().max(80).optional(),
  sourceId: z.string().trim().max(80).optional(),
  assigneeMembershipId: z.uuid().optional(),
  checklist: z
    .array(z.object({ label: z.string().trim().min(1).max(120), done: z.boolean().default(false) }))
    .max(50)
    .optional(),
  dueAt: z.iso.datetime().optional(),
});

export const updateWorkTicketStatusSchema = z.object({
  status: workTicketStatusSchema,
});

export const createBookingSchema = z.object({
  branchId: z.uuid(),
  customerId: z.uuid().optional(),
  resourceCode: shortCodeSchema,
  title: z.string().trim().min(2).max(180),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  capacityUsed: z.coerce.number().int().positive().default(1),
  depositAmount: nonNegativeMoneySchema.default(0),
  notes: z.string().trim().max(500).optional(),
});

export const createCustomerAssetSchema = z.object({
  customerId: z.uuid(),
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(180),
  assetType: z.string().trim().min(2).max(80),
  identifier: z.string().trim().max(120).optional(),
  attributes: optionalJsonRecordSchema,
});

export const createTraceableUnitSchema = z.object({
  itemId: z.uuid(),
  variantId: z.uuid().optional(),
  locationId: z.uuid().optional(),
  serialNumber: z.string().trim().max(120).optional(),
  batchNumber: z.string().trim().max(120).optional(),
  lotNumber: z.string().trim().max(120).optional(),
  imei: z.string().trim().max(120).optional(),
  manufactureDate: z.iso.date().optional(),
  expiryDate: z.iso.date().optional(),
  sourceType: z.string().trim().max(80).optional(),
  sourceId: z.string().trim().max(80).optional(),
});

export const createWarrantyClaimSchema = z.object({
  customerId: z.uuid().optional(),
  itemDescription: z.string().trim().min(2).max(240),
  serialReference: z.string().trim().max(120).optional(),
  issue: z.string().trim().min(3).max(1000),
});

export const createBomSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(180),
  outputItemId: z.uuid(),
  outputQuantity: positiveQuantitySchema,
  notes: z.string().trim().max(500).optional(),
  components: z
    .array(
      z.object({
        itemId: z.uuid(),
        variantId: z.uuid().optional(),
        quantity: positiveQuantitySchema,
        wastagePercent: nonNegativeMoneySchema.default(0),
      }),
    )
    .min(1)
    .max(100),
});

export const postMaterialConsumptionSchema = z.object({
  itemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: positiveQuantitySchema,
  sourceType: z.string().trim().min(2).max(80),
  sourceId: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional(),
});

export const createDeliveryRouteSchema = z.object({
  branchId: z.uuid(),
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(180),
  vehicleReference: z.string().trim().max(120).optional(),
  driverName: z.string().trim().max(120).optional(),
  plannedDate: z.iso.date(),
  stops: z
    .array(
      z.object({
        sequence: z.coerce.number().int().positive(),
        customerName: z.string().trim().min(2).max(180),
        address: optionalJsonRecordSchema,
        sourceType: z.string().trim().max(80).optional(),
        sourceId: z.string().trim().max(80).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const updateDeliveryStopSchema = z.object({
  status: deliveryStatusSchema,
  proofReference: z.string().trim().max(240).optional(),
  failedReason: z.string().trim().max(240).optional(),
});

export const createNotificationEventSchema = z.object({
  channel: z.string().trim().min(2).max(40),
  recipient: z.string().trim().min(3).max(254),
  subject: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(1000),
  sourceType: z.string().trim().max(80).optional(),
  sourceId: z.string().trim().max(80).optional(),
});

export const attachBusinessDocumentSchema = z.object({
  entityType: z.string().trim().min(2).max(80),
  entityId: z.string().trim().min(2).max(80),
  fileName: z.string().trim().min(2).max(240),
  mimeType: z.string().trim().min(2).max(120),
  url: z.url().max(1000),
  notes: z.string().trim().max(500).optional(),
});

/* -------------------------------------------------------------------------- */
/* P6 - Offline, devices and store reliability                                */
/* -------------------------------------------------------------------------- */

export const registerDeviceSchema = z.object({
  branchId: z.uuid().optional(),
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(120),
  kind: deviceKindSchema,
  hardwareId: z.string().trim().max(160).optional(),
  capabilities: optionalJsonRecordSchema,
});

export const heartbeatDeviceSchema = z.object({
  pendingOfflineItems: z.coerce.number().int().min(0).default(0),
});

export const queueOfflineOperationSchema = z.object({
  branchId: z.uuid().optional(),
  deviceId: z.uuid().optional(),
  idempotencyKey: idempotencyKeySchema,
  operationType: z.string().trim().min(2).max(120),
  payload: z.record(z.string(), z.unknown()),
  riskLevel: z.string().trim().min(2).max(40).default("NORMAL"),
});

export const markOfflineQueueItemSchema = z.object({
  status: offlineQueueStatusSchema,
  failureReason: z.string().trim().max(500).optional(),
});

export const resolveSyncConflictSchema = z.object({
  status: syncConflictStatusSchema,
  resolution: z.string().trim().min(2).max(500),
});

/* -------------------------------------------------------------------------- */
/* P7 - Reporting, integrations and migration                                 */
/* -------------------------------------------------------------------------- */

export const createSavedReportViewSchema = z.object({
  code: shortCodeSchema,
  name: z.string().trim().min(2).max(160),
  reportType: z.string().trim().min(2).max(80),
  filters: z.record(z.string(), z.unknown()).default({}),
  columns: z.array(z.string().trim().min(1).max(80)).max(80).optional(),
});

export const requestDataExportSchema = z.object({
  exportType: z.string().trim().min(2).max(80),
  format: z.enum(["CSV", "XLSX", "JSON", "PDF"]).default("CSV"),
  filters: optionalJsonRecordSchema,
});

export const createWebhookSubscriptionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  endpointUrl: z.url().max(1000),
  eventTypes: z.array(z.string().trim().min(2).max(120)).min(1).max(50),
  secretHint: z.string().trim().max(120).optional(),
});

export const recordWebhookDeliverySchema = z.object({
  subscriptionId: z.uuid(),
  eventId: z.string().trim().min(2).max(120),
  eventType: z.string().trim().min(2).max(120),
  payload: z.record(z.string(), z.unknown()),
  status: webhookDeliveryStatusSchema.default("PENDING"),
  attempts: z.coerce.number().int().min(0).default(0),
  lastError: z.string().trim().max(500).optional(),
});

export const createMigrationValidationSchema = z.object({
  sourceName: z.string().trim().min(2).max(180),
  entityKind: importEntityKindSchema,
  totalRows: z.coerce.number().int().min(0),
  validRows: z.coerce.number().int().min(0),
  invalidRows: z.coerce.number().int().min(0),
  warningRows: z.coerce.number().int().min(0).default(0),
  errors: optionalJsonRecordSchema,
  preview: optionalJsonRecordSchema,
  reconciliation: optionalJsonRecordSchema,
});

/* -------------------------------------------------------------------------- */
/* P8 - Security, operations and production readiness                          */
/* -------------------------------------------------------------------------- */

export const recordSecurityEventSchema = z.object({
  eventType: z.string().trim().min(2).max(120),
  severity: securityEventSeveritySchema.default("INFO"),
  subjectType: z.string().trim().max(80).optional(),
  subjectId: z.string().trim().max(80).optional(),
  detail: z.string().trim().min(2).max(500),
  metadata: optionalJsonRecordSchema,
});

export const recordBackupRunSchema = z.object({
  scope: z.string().trim().min(2).max(120),
  status: backupRunStatusSchema,
  storageReference: z.string().trim().max(500).optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  recoveryPointObjective: z.string().trim().max(80).optional(),
  recoveryTimeObjective: z.string().trim().max(80).optional(),
  failureReason: z.string().trim().max(500).optional(),
  restoreTested: z.boolean().default(false),
});

export const upsertReadinessCheckSchema = z.object({
  area: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(160),
  status: readinessCheckStatusSchema,
  target: z.string().trim().max(120).optional(),
  measuredValue: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createPrivacyRequestSchema = z.object({
  customerId: z.uuid().optional(),
  requestType: z.string().trim().min(2).max(80),
  requester: z.string().trim().min(2).max(180),
  dueDate: z.iso.date().optional(),
});

export const resolvePrivacyRequestSchema = z.object({
  status: privacyRequestStatusSchema.exclude(["OPEN"]),
  resolution: z.string().trim().min(2).max(500),
});

export const createReleaseReadinessSchema = z.object({
  version: z.string().trim().min(1).max(80),
  status: releaseReadinessStatusSchema.default("DRAFT"),
  checklist: z.record(z.string(), z.unknown()),
  rollbackPlan: z.string().trim().min(2).max(1000),
  migrationPlan: z.string().trim().max(1000).optional(),
});

/* -------------------------------------------------------------------------- */
/* Input types                                                                 */
/* -------------------------------------------------------------------------- */

export type CreateBusinessFoundationInput = z.input<typeof createBusinessFoundationSchema>;
export type UpdateBusinessInput = z.output<typeof updateBusinessSchema>;
export type CreateBranchInput = z.input<typeof createBranchSchema>;
export type UpdateBranchInput = z.output<typeof updateBranchSchema>;
export type CreateLocationInput = z.output<typeof createLocationSchema>;
export type UpdateLocationInput = z.output<typeof updateLocationSchema>;
export type InviteUserInput = z.output<typeof inviteUserSchema>;
export type UpdateMembershipInput = z.output<typeof updateMembershipSchema>;
export type CreateRoleInput = z.output<typeof createRoleSchema>;
export type UpdateRoleInput = z.output<typeof updateRoleSchema>;
export type UpsertApprovalPolicyInput = z.output<typeof upsertApprovalPolicySchema>;
export type CreateApprovalRequestInput = z.output<typeof createApprovalRequestSchema>;
export type DecideApprovalRequestInput = z.output<typeof decideApprovalRequestSchema>;
export type SetFeatureInput = z.output<typeof setFeatureSchema>;
export type AuditQuery = z.output<typeof auditQuerySchema>;
export type UpsertDocumentSequenceInput = z.output<typeof upsertDocumentSequenceSchema>;
export type NextDocumentNumberInput = z.input<typeof nextDocumentNumberSchema>;

export type CreateUnitInput = z.output<typeof createUnitSchema>;
export type UpdateUnitInput = z.output<typeof updateUnitSchema>;
export type CreateUnitConversionInput = z.output<typeof createUnitConversionSchema>;
export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
export type CreateBrandInput = z.output<typeof createBrandSchema>;
export type UpdateBrandInput = z.output<typeof updateBrandSchema>;
export type CreateItemTagInput = z.output<typeof createItemTagSchema>;
export type AssignItemTagsInput = z.output<typeof assignItemTagsSchema>;
export type CreateAttributeDefinitionInput = z.output<typeof createAttributeDefinitionSchema>;
export type SetItemAttributeValuesInput = z.output<typeof setItemAttributeValuesSchema>;
export type CreateTaxCategoryInput = z.output<typeof createTaxCategorySchema>;
export type UpdateTaxCategoryInput = z.output<typeof updateTaxCategorySchema>;
export type CreateTaxRateInput = z.output<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.output<typeof updateTaxRateSchema>;
export type CreatePriceListInput = z.output<typeof createPriceListSchema>;
export type UpdatePriceListInput = z.output<typeof updatePriceListSchema>;
export type CreateItemInput = z.output<typeof createItemSchema>;
export type UpdateItemInput = z.output<typeof updateItemSchema>;
export type CreateItemVariantInput = z.output<typeof createItemVariantSchema>;
export type CreateItemIdentifierInput = z.output<typeof createItemIdentifierSchema>;
export type UpsertItemPriceInput = z.output<typeof upsertItemPriceSchema>;
export type PromotionConditions = z.output<typeof promotionConditionsSchema>;
export type CreatePromotionInput = z.output<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.output<typeof updatePromotionSchema>;
export type CreateCustomerGroupInput = z.output<typeof createCustomerGroupSchema>;
export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.output<typeof updateCustomerSchema>;
export type CreateSupplierInput = z.output<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.output<typeof updateSupplierSchema>;
export type UpsertSupplierItemInput = z.output<typeof upsertSupplierItemSchema>;
export type CreateImportBatchInput = z.output<typeof createImportBatchSchema>;
export type ValidateImportInput = z.output<typeof validateImportSchema>;
export type PricingContextInput = z.output<typeof pricingContextSchema>;

export type OpenShiftInput = z.output<typeof openShiftSchema>;
export type CashMovementInput = z.output<typeof cashMovementSchema>;
export type CloseShiftInput = z.output<typeof closeShiftSchema>;
export type SaleLineInput = z.output<typeof saleLineInputSchema>;
export type SaleCartInput = z.output<typeof saleCartSchema>;
export type QuoteSaleInput = z.output<typeof quoteSaleSchema>;
export type TenderInput = z.output<typeof tenderSchema>;
export type CreateSaleInput = z.output<typeof createSaleSchema>;
export type CreateQuotationInput = z.output<typeof createQuotationSchema>;
export type CreateSalesOrderInput = z.output<typeof createSalesOrderSchema>;
export type ConvertQuotationToOrderInput = z.output<typeof convertQuotationToOrderSchema>;
export type ConfirmSalesOrderInput = z.output<typeof confirmSalesOrderSchema>;
export type UpdateHeldSaleInput = z.output<typeof updateHeldSaleSchema>;
export type ConfirmSaleInput = z.output<typeof confirmSaleSchema>;
export type AddPaymentInput = z.output<typeof addPaymentSchema>;
export type ResolvePaymentInput = z.output<typeof resolvePaymentSchema>;
export type VoidSaleInput = z.output<typeof voidSaleSchema>;
export type CreateReturnInput = z.output<typeof createReturnSchema>;
export type CreateExchangeInput = z.output<typeof createExchangeSchema>;
export type SaleQuery = z.output<typeof saleQuerySchema>;
export type CatalogSearchQuery = z.output<typeof catalogSearchSchema>;
export type SyncQueueInput = z.output<typeof syncQueueSchema>;
export type StockAdjustmentInput = z.output<typeof stockAdjustmentSchema>;
export type StockTransferInput = z.output<typeof stockTransferSchema>;
export type CreateStockCountInput = z.output<typeof createStockCountSchema>;
export type PostStockCountInput = z.output<typeof postStockCountSchema>;
export type ReorderSettingInput = z.output<typeof reorderSettingSchema>;
export type CreatePurchaseRequestInput = z.output<typeof createPurchaseRequestSchema>;
export type DecidePurchaseRequestInput = z.output<typeof decidePurchaseRequestSchema>;
export type CreatePurchaseOrderInput = z.output<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.output<typeof receivePurchaseOrderSchema>;
export type CreateFulfillmentOrderInput = z.output<typeof createFulfillmentOrderSchema>;
export type ReserveSalesOrderInput = z.output<typeof reserveSalesOrderSchema>;
export type UpdateFulfillmentStatusInput = z.output<typeof updateFulfillmentStatusSchema>;
export type CreateCustomerInvoiceInput = z.output<typeof createCustomerInvoiceSchema>;
export type CollectCustomerPaymentInput = z.output<typeof collectCustomerPaymentSchema>;
export type CreateSupplierBillInput = z.output<typeof createSupplierBillSchema>;
export type PaySupplierBillInput = z.output<typeof paySupplierBillSchema>;
export type CreateExpenseCategoryInput = z.output<typeof createExpenseCategorySchema>;
export type CreateExpenseInput = z.output<typeof createExpenseSchema>;
export type CreateBankAccountInput = z.output<typeof createBankAccountSchema>;
export type PostBankTransactionInput = z.output<typeof postBankTransactionSchema>;
export type PostBankTransferInput = z.output<typeof postBankTransferSchema>;
export type AdjustLoyaltyInput = z.output<typeof adjustLoyaltySchema>;
export type CreateWorkflowStatusInput = z.output<typeof createWorkflowStatusSchema>;
export type CreateWorkflowTransitionInput = z.output<typeof createWorkflowTransitionSchema>;
export type CreateWorkTicketInput = z.output<typeof createWorkTicketSchema>;
export type UpdateWorkTicketStatusInput = z.output<typeof updateWorkTicketStatusSchema>;
export type CreateBookingInput = z.output<typeof createBookingSchema>;
export type CreateCustomerAssetInput = z.output<typeof createCustomerAssetSchema>;
export type CreateTraceableUnitInput = z.output<typeof createTraceableUnitSchema>;
export type CreateWarrantyClaimInput = z.output<typeof createWarrantyClaimSchema>;
export type CreateBomInput = z.output<typeof createBomSchema>;
export type PostMaterialConsumptionInput = z.output<typeof postMaterialConsumptionSchema>;
export type CreateDeliveryRouteInput = z.output<typeof createDeliveryRouteSchema>;
export type UpdateDeliveryStopInput = z.output<typeof updateDeliveryStopSchema>;
export type CreateNotificationEventInput = z.output<typeof createNotificationEventSchema>;
export type AttachBusinessDocumentInput = z.output<typeof attachBusinessDocumentSchema>;
export type RegisterDeviceInput = z.output<typeof registerDeviceSchema>;
export type HeartbeatDeviceInput = z.output<typeof heartbeatDeviceSchema>;
export type QueueOfflineOperationInput = z.output<typeof queueOfflineOperationSchema>;
export type MarkOfflineQueueItemInput = z.output<typeof markOfflineQueueItemSchema>;
export type ResolveSyncConflictInput = z.output<typeof resolveSyncConflictSchema>;
export type CreateSavedReportViewInput = z.output<typeof createSavedReportViewSchema>;
export type RequestDataExportInput = z.output<typeof requestDataExportSchema>;
export type CreateWebhookSubscriptionInput = z.output<typeof createWebhookSubscriptionSchema>;
export type RecordWebhookDeliveryInput = z.output<typeof recordWebhookDeliverySchema>;
export type CreateMigrationValidationInput = z.output<typeof createMigrationValidationSchema>;
export type RecordSecurityEventInput = z.output<typeof recordSecurityEventSchema>;
export type RecordBackupRunInput = z.output<typeof recordBackupRunSchema>;
export type UpsertReadinessCheckInput = z.output<typeof upsertReadinessCheckSchema>;
export type CreatePrivacyRequestInput = z.output<typeof createPrivacyRequestSchema>;
export type ResolvePrivacyRequestInput = z.output<typeof resolvePrivacyRequestSchema>;
export type CreateReleaseReadinessInput = z.output<typeof createReleaseReadinessSchema>;

/* -------------------------------------------------------------------------- */
/* Response contracts                                                          */
/* -------------------------------------------------------------------------- */

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
    kind: ItemKind;
    status: RecordStatus;
    unit: string;
    price?: number;
  }>;
  customers: Array<{
    id: string;
    code: string;
    name: string;
    status: RecordStatus;
  }>;
  suppliers: Array<{
    id: string;
    code: string;
    name: string;
    status: RecordStatus;
  }>;
}

export interface CatalogReferenceData {
  units: Array<{ id: string; code: string; name: string; precision: number; status: RecordStatus }>;
  categories: Array<{
    id: string;
    code: string;
    name: string;
    parentId: string | null;
    status: RecordStatus;
  }>;
  brands: Array<{ id: string; code: string; name: string; status: RecordStatus }>;
  tags: Array<{ id: string; code: string; name: string; status: RecordStatus }>;
  attributes: Array<{
    id: string;
    code: string;
    name: string;
    appliesTo: string;
    dataType: string;
    status: RecordStatus;
  }>;
  taxCategories: Array<{
    id: string;
    code: string;
    name: string;
    status: RecordStatus;
    rates: Array<{
      id: string;
      code: string;
      name: string;
      rate: number;
      kind: TaxRateKind;
      effectiveFrom: string;
      effectiveTo: string | null;
      status: RecordStatus;
    }>;
  }>;
  priceLists: Array<{
    id: string;
    code: string;
    name: string;
    currencyCode: string;
    isDefault: boolean;
    status: RecordStatus;
  }>;
  customerGroups: Array<{ id: string; code: string; name: string; status: RecordStatus }>;
  branches: Array<{ id: string; code: string; name: string; status: RecordStatus }>;
  unitConversions: Array<{
    id: string;
    fromUnitId: string;
    toUnitId: string;
    factor: number;
  }>;
}

export interface ItemListRow {
  id: string;
  code: string;
  name: string;
  kind: ItemKind;
  status: RecordStatus;
  unitCode: string;
  categoryName: string | null;
  brandName: string | null;
  taxCategoryName: string | null;
  sellable: boolean;
  purchasable: boolean;
  stockTracked: boolean;
  price: number | null;
  identifiers: string[];
  updatedAt: string;
}

export interface ItemDetail extends ItemListRow {
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  baseUnitId: string;
  taxCategoryId: string | null;
  variants: Array<{
    id: string;
    code: string;
    name: string;
    attributes: Record<string, unknown>;
    status: RecordStatus;
  }>;
  identifierRecords: Array<{
    id: string;
    kind: IdentifierKind;
    value: string;
    variantId: string | null;
  }>;
  prices: Array<{
    id: string;
    priceListId: string;
    priceListName: string;
    branchId: string | null;
    variantId: string | null;
    unitPrice: number;
    costPrice: number | null;
    minQuantity: number;
    validFrom: string;
    validTo: string | null;
  }>;
  tagIds: string[];
  attributeValues: Array<{ attributeId: string; value: unknown }>;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    supplierCode: string | null;
    costPrice: number | null;
    leadTimeDays: number | null;
  }>;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor: string;
  occurredAt: string;
  summary: string;
}

export interface CustomerListRow {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  groupId: string | null;
  groupName: string | null;
  status: RecordStatus;
  salesCount: number;
  salesTotal: number;
  storeCredit: number;
  creditLimit: number;
  creditTermsDays: number | null;
  creditHold: boolean;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerListRow {
  notes: string | null;
  billingAddress: Record<string, unknown> | null;
  recentSales: SaleListRow[];
  storeCreditEntries: Array<{
    id: string;
    kind: string;
    amount: number;
    balanceAfter: number;
    reference: string | null;
    createdAt: string;
  }>;
  timeline: TimelineEntry[];
}

export interface SupplierListRow {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  status: RecordStatus;
  itemCount: number;
  updatedAt: string;
}

export interface SupplierDetail extends SupplierListRow {
  notes: string | null;
  address: Record<string, unknown> | null;
  items: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    supplierCode: string | null;
    costPrice: number | null;
    leadTimeDays: number | null;
  }>;
  timeline: TimelineEntry[];
}

export interface PromotionRow {
  id: string;
  code: string;
  name: string;
  discountKind: DiscountKind;
  discountValue: number;
  startsAt: string;
  endsAt: string | null;
  status: RecordStatus;
  conditions: PromotionConditions | null;
  conflicts: string[];
}

export interface ImportPreviewRow {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  values: Record<string, string>;
}

export interface ImportBatchSummary {
  id: string;
  entityKind: ImportEntityKind;
  status: ImportStatus;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  appliedRows: number;
  createdAt: string;
  appliedAt: string | null;
  rolledBackAt: string | null;
}

export interface ImportPreview extends ImportBatchSummary {
  columns: string[];
  rows: ImportPreviewRow[];
}

export interface ImportApplied extends ImportBatchSummary {
  createdIds: string[];
}

export interface PricedLine {
  lineNo: number;
  itemId: string;
  variantId: string | null;
  unitId: string;
  unitCode: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountKind: DiscountKind | null;
  discountValue: number;
  discountAmount: number;
  promotionId: string | null;
  promotionName: string | null;
  taxRateId: string | null;
  taxRatePercent: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  costPrice: number | null;
  stockTracked: boolean;
}

export interface SaleQuote {
  currencyCode: string;
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  appliedPromotions: Array<{ id: string; code: string; name: string; amount: number }>;
  warnings: string[];
}

export interface SaleListRow {
  id: string;
  number: string;
  receiptNumber: string | null;
  status: SaleStatus;
  channel: SaleChannel;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  currencyCode: string;
  total: number;
  paidTotal: number;
  dueTotal: number;
  refundedTotal: number;
  lineCount: number;
  createdAt: string;
  confirmedAt: string | null;
}

export interface SalePaymentRow {
  id: string;
  method: PaymentMethodKind;
  direction: "IN" | "OUT";
  status: PaymentStatus;
  amount: number;
  tenderedAmount: number | null;
  changeAmount: number;
  reference: string | null;
  failureReason: string | null;
  capturedAt: string | null;
  createdAt: string;
}

export interface SaleDetail extends SaleListRow {
  shiftId: string | null;
  note: string | null;
  holdName: string | null;
  voidReason: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  changeTotal: number;
  lines: Array<
    PricedLine & {
      id: string;
      returnedQuantity: number;
    }
  >;
  payments: SalePaymentRow[];
  returns: Array<{
    id: string;
    number: string;
    status: ReturnStatus;
    reason: string;
    refundMethod: RefundMethod;
    refundTotal: number;
    storeCreditTotal: number;
    acceptedAt: string | null;
  }>;
  timeline: TimelineEntry[];
}

export interface ReceiptDocument {
  business: { name: string; email: string | null; phone: string | null; currencyCode: string };
  branch: { code: string; name: string };
  sale: {
    number: string;
    receiptNumber: string | null;
    status: SaleStatus;
    confirmedAt: string | null;
    cashier: string;
    customer: string | null;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    paidTotal: number;
    changeTotal: number;
    dueTotal: number;
  };
  payments: Array<{ method: PaymentMethodKind; amount: number; status: PaymentStatus }>;
  taxLines: Array<{ name: string; ratePercent: number; amount: number }>;
  printedAt: string;
}

export interface ShiftSummary {
  id: string;
  number: string;
  branchId: string;
  branchName: string;
  registerCode: string;
  status: ShiftStatus;
  openingFloat: number;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  expectedCash: number;
  countedCash: number | null;
  cashVariance: number | null;
  varianceReason: string | null;
  saleCount: number;
  salesTotal: number;
  refundTotal: number;
  tenders: Array<{ method: PaymentMethodKind; amount: number; count: number }>;
  cashMovements: Array<{
    id: string;
    kind: CashMovementKind;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface ReturnResult {
  returnId: string;
  number: string;
  refundTotal: number;
  storeCreditTotal: number;
  saleStatus: SaleStatus;
}

export interface ExchangeResult extends ReturnResult {
  replacementSaleId: string;
  replacementNumber: string;
  replacementDue: number;
  exchangeCreditApplied: number;
}

export interface PosCatalogEntry {
  itemId: string;
  variantId: string | null;
  code: string;
  name: string;
  unitCode: string;
  kind: ItemKind;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  taxRatePercent: number;
  stockTracked: boolean;
  identifiers: string[];
}

export interface SyncResultEntry {
  clientRef: string;
  status: "APPLIED" | "DUPLICATE" | "FAILED";
  saleId?: string;
  paymentId?: string;
  message?: string;
}

export interface StockAvailabilityRow {
  id: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  variantId: string | null;
  variantName: string | null;
  onHandQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export interface StockMovementRow {
  id: string;
  branchName: string;
  locationName: string;
  itemCode: string;
  itemName: string;
  variantName: string | null;
  kind: StockMovementKind;
  status: StockMovementStatus;
  quantity: number;
  unitCost: number | null;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  actor: string;
  occurredAt: string;
}

export interface ReorderSuggestionRow {
  id: string;
  locationId: string;
  locationName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  availableQuantity: number;
  incomingQuantity: number;
  minimumQuantity: number;
  targetQuantity: number;
  suggestedQuantity: number;
}

export interface StockCountRow {
  id: string;
  number: string;
  name: string;
  branchName: string;
  locationName: string;
  status: StockCountStatus;
  lineCount: number;
  expectedQuantity: number;
  countedQuantity: number | null;
  varianceQuantity: number | null;
  createdBy: string;
  createdAt: string;
  postedBy: string | null;
  postedAt: string | null;
  lines: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    variantName: string | null;
    expectedQuantity: number;
    countedQuantity: number | null;
    varianceQuantity: number | null;
    note: string | null;
  }>;
}

export interface PurchaseRequestRow {
  id: string;
  number: string;
  branchName: string;
  status: PurchaseRequestStatus;
  reason: string;
  lineCount: number;
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface PurchaseOrderRow {
  id: string;
  number: string;
  branchName: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  lineCount: number;
  orderedQuantity: number;
  receivedQuantity: number;
  varianceQuantity: number;
  lines: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: number;
  }>;
  createdBy: string;
  createdAt: string;
}

export interface GoodsReceiptRow {
  id: string;
  number: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  branchName: string;
  locationName: string;
  supplierDocument: string | null;
  lineCount: number;
  receivedQuantity: number;
  createdBy: string;
  receivedAt: string;
}

export interface FulfillmentOrderRow {
  id: string;
  number: string;
  branchName: string;
  locationName: string | null;
  status: FulfillmentStatus;
  customerName: string | null;
  sourceType: string;
  sourceId: string;
  lineCount: number;
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  dispatchedAt: string | null;
}

export interface InventoryOverview {
  counts: {
    balances: number;
    movements: number;
    reorderSuggestions: number;
    purchaseRequests: number;
    purchaseOrders: number;
    receipts: number;
    fulfillmentOrders: number;
    stockCounts: number;
    openStockCounts: number;
  };
  availability: StockAvailabilityRow[];
  movements: StockMovementRow[];
  stockCounts: StockCountRow[];
  reorderSuggestions: ReorderSuggestionRow[];
  purchaseRequests: PurchaseRequestRow[];
  purchaseOrders: PurchaseOrderRow[];
  receipts: GoodsReceiptRow[];
  fulfillmentOrders: FulfillmentOrderRow[];
}

export interface CustomerInvoiceRow {
  id: string;
  number: string;
  branchName: string | null;
  customerId: string;
  customerName: string;
  status: CustomerInvoiceStatus;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  daysOverdue: number;
  ageingBucket: "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS";
  lineCount: number;
  createdBy: string;
  postedAt: string;
}

export interface CustomerCreditRow {
  customerId: string;
  customerName: string;
  creditLimit: number;
  receivableBalance: number;
  availableCredit: number;
  creditTermsDays: number | null;
  creditHold: boolean;
  overdueBalance: number;
  maxDaysOverdue: number;
}

export interface CustomerCollectionRow {
  id: string;
  branchName: string | null;
  customerName: string;
  amount: number;
  unallocatedAmount: number;
  currencyCode: string;
  method: string;
  reference: string | null;
  allocationCount: number;
  createdBy: string;
  collectedAt: string;
}

export interface SupplierBillRow {
  id: string;
  number: string;
  branchName: string | null;
  supplierId: string;
  supplierName: string;
  status: SupplierBillStatus;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  lineCount: number;
  createdBy: string;
  postedAt: string;
}

export interface SupplierPaymentRow {
  id: string;
  branchName: string | null;
  supplierName: string;
  amount: number;
  unallocatedAmount: number;
  currencyCode: string;
  method: string;
  reference: string | null;
  allocationCount: number;
  createdBy: string;
  paidAt: string;
}

export interface ExpenseRow {
  id: string;
  branchName: string | null;
  categoryId: string;
  categoryName: string;
  status: ExpenseStatus;
  amount: number;
  taxAmount: number;
  currencyCode: string;
  paymentMethod: string;
  supplierName: string | null;
  description: string;
  createdBy: string;
  spentAt: string;
}

export interface ExpenseCategoryRow {
  id: string;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface BankAccountRow {
  id: string;
  code: string;
  name: string;
  type: BankAccountType;
  currencyCode: string;
  openingBalance: number;
  currentBalance: number;
  status: RecordStatus;
}

export interface BankTransactionRow {
  id: string;
  accountName: string;
  branchName: string | null;
  kind: BankTransactionKind;
  amount: number;
  currencyCode: string;
  reference: string | null;
  description: string;
  createdBy: string;
  occurredAt: string;
}

export interface LoyaltyAccountRow {
  id: string;
  customerId: string;
  customerName: string;
  pointsBalance: number;
  tier: string;
  lastActivityAt: string;
}

export interface AccountingEventRow {
  id: string;
  sourceType: string;
  sourceId: string;
  eventType: string;
  amount: number | null;
  currencyCode: string | null;
  status: AccountingEventStatus;
  createdAt: string;
}

export interface FinanceOverview {
  totals: {
    receivables: number;
    payables: number;
    expenses: number;
    cashAndBank: number;
    loyaltyPoints: number;
    pendingAccountingEvents: number;
  };
  customerInvoices: CustomerInvoiceRow[];
  customerCredits: CustomerCreditRow[];
  customerCollections: CustomerCollectionRow[];
  supplierBills: SupplierBillRow[];
  supplierPayments: SupplierPaymentRow[];
  expenseCategories: ExpenseCategoryRow[];
  expenses: ExpenseRow[];
  bankAccounts: BankAccountRow[];
  bankTransactions: BankTransactionRow[];
  loyaltyAccounts: LoyaltyAccountRow[];
  accountingEvents: AccountingEventRow[];
}

export interface WorkTicketRow {
  id: string;
  number: string;
  branchName: string | null;
  title: string;
  status: WorkTicketStatus;
  priority: WorkTicketPriority;
  sourceType: string | null;
  sourceId: string | null;
  createdBy: string;
  createdAt: string;
  dueAt: string | null;
}

export interface BookingRow {
  id: string;
  number: string;
  branchName: string;
  customerName: string | null;
  resourceCode: string;
  title: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  depositAmount: number;
}

export interface TraceableUnitRow {
  id: string;
  itemName: string;
  locationName: string | null;
  serialNumber: string | null;
  batchNumber: string | null;
  imei: string | null;
  expiryDate: string | null;
  status: TraceableUnitStatus;
}

export interface WarrantyClaimRow {
  id: string;
  number: string;
  customerName: string | null;
  status: WarrantyClaimStatus;
  itemDescription: string;
  serialReference: string | null;
  issue: string;
  openedAt: string;
}

export interface BomRow {
  id: string;
  code: string;
  name: string;
  outputItemName: string;
  outputQuantity: number;
  status: BomStatus;
  componentCount: number;
}

export interface DeliveryRouteRow {
  id: string;
  code: string;
  name: string;
  branchName: string;
  plannedDate: string;
  vehicleReference: string | null;
  driverName: string | null;
  stopCount: number;
}

export interface NotificationEventRow {
  id: string;
  channel: string;
  recipient: string;
  subject: string;
  status: NotificationStatus;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

export interface BusinessDocumentRow {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  url: string;
  createdAt: string;
}

export interface BusinessEnginesOverview {
  counts: {
    workflowStatuses: number;
    workTickets: number;
    bookings: number;
    traceableUnits: number;
    warrantyClaims: number;
    boms: number;
    deliveryRoutes: number;
    notifications: number;
    documents: number;
  };
  workTickets: WorkTicketRow[];
  bookings: BookingRow[];
  traceableUnits: TraceableUnitRow[];
  warrantyClaims: WarrantyClaimRow[];
  boms: BomRow[];
  deliveryRoutes: DeliveryRouteRow[];
  notifications: NotificationEventRow[];
  documents: BusinessDocumentRow[];
}

export interface StoreDeviceRow {
  id: string;
  code: string;
  name: string;
  branchName: string | null;
  kind: DeviceKind;
  status: DeviceStatus;
  hardwareId: string | null;
  pendingOfflineItems: number;
  lastSeenAt: string | null;
}

export interface OfflineQueueItemRow {
  id: string;
  idempotencyKey: string;
  operationType: string;
  status: OfflineQueueStatus;
  riskLevel: string;
  failureReason: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export interface SyncConflictRow {
  id: string;
  queueItemId: string;
  entityType: string;
  entityId: string | null;
  reason: string;
  status: SyncConflictStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface StoreReliabilityOverview {
  counts: {
    devices: number;
    activeDevices: number;
    queuedOfflineItems: number;
    openConflicts: number;
  };
  devices: StoreDeviceRow[];
  queue: OfflineQueueItemRow[];
  conflicts: SyncConflictRow[];
}

export interface SavedReportViewRow {
  id: string;
  code: string;
  name: string;
  reportType: string;
  createdAt: string;
}

export interface DataExportRequestRow {
  id: string;
  exportType: string;
  format: string;
  status: DataExportStatus;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface WebhookSubscriptionRow {
  id: string;
  name: string;
  endpointUrl: string;
  eventTypes: string[];
  status: WebhookSubscriptionStatus;
  createdAt: string;
}

export interface WebhookDeliveryRow {
  id: string;
  subscriptionName: string | null;
  eventId: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface MigrationValidationRow {
  id: string;
  sourceName: string;
  entityKind: ImportEntityKind;
  status: MigrationValidationStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  createdAt: string;
  approvedAt: string | null;
}

export interface ReportingOperationsOverview {
  counts: {
    sales: number;
    stockBalances: number;
    customerInvoices: number;
    customers: number;
    savedReportViews: number;
    queuedExports: number;
    activeWebhooks: number;
    failedDeliveries: number;
    migrationValidations: number;
  };
  salesSummary: {
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    currencyCode: string;
  };
  stockSummary: {
    totalOnHand: number;
    totalAvailable: number;
    lowStockItems: number;
  };
  financeSummary: {
    receivables: number;
    payables: number;
    expenses: number;
    cashAndBank: number;
  };
  savedViews: SavedReportViewRow[];
  exports: DataExportRequestRow[];
  webhooks: WebhookSubscriptionRow[];
  deliveries: WebhookDeliveryRow[];
  migrations: MigrationValidationRow[];
}

export interface SecurityEventRow {
  id: string;
  eventType: string;
  severity: SecurityEventSeverity;
  subjectType: string | null;
  subjectId: string | null;
  detail: string;
  occurredAt: string;
}

export interface BackupRunRow {
  id: string;
  scope: string;
  status: BackupRunStatus;
  storageReference: string | null;
  sizeBytes: number | null;
  recoveryPointObjective: string | null;
  recoveryTimeObjective: string | null;
  restoreTestedAt: string | null;
  failureReason: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ReadinessCheckRow {
  id: string;
  area: string;
  name: string;
  status: ReadinessCheckStatus;
  target: string | null;
  measuredValue: string | null;
  notes: string | null;
  checkedAt: string;
}

export interface PrivacyRequestRow {
  id: string;
  customerName: string | null;
  requestType: string;
  requester: string;
  status: PrivacyRequestStatus;
  dueDate: string | null;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReleaseReadinessRow {
  id: string;
  version: string;
  status: ReleaseReadinessStatus;
  rollbackPlan: string;
  migrationPlan: string | null;
  createdAt: string;
  releasedAt: string | null;
}

export interface ProductionReadinessOverview {
  counts: {
    criticalSecurityEvents: number;
    failedBackups: number;
    failedReadinessChecks: number;
    openPrivacyRequests: number;
    blockedReleases: number;
    auditEvents: number;
  };
  securityEvents: SecurityEventRow[];
  backupRuns: BackupRunRow[];
  readinessChecks: ReadinessCheckRow[];
  privacyRequests: PrivacyRequestRow[];
  releases: ReleaseReadinessRow[];
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
    legalName: string | null;
    slug: string;
    email: string | null;
    phone: string | null;
    defaultCurrency: string;
    timeZone: string;
    countryCode: string;
    status: RecordStatus;
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: RecordStatus;
    locations: Array<{
      id: string;
      code: string;
      name: string;
      type: LocationType;
      status: RecordStatus;
    }>;
  }>;
  enabledFeatures: string[];
  memberships: number;
  roles: number;
  setup: {
    hasSecondBranch: boolean;
    hasAdditionalUsers: boolean;
    hasCustomRoles: boolean;
    hasApprovalPolicies: boolean;
    hasCatalogDefaults: boolean;
    hasSellableItems: boolean;
    hasOpenShift: boolean;
    hasConfirmedSale: boolean;
  };
}

export interface MembershipRow {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  status: MembershipStatus;
  joinedAt: string | null;
  roles: Array<{ id: string; code: string; name: string }>;
  branches: Array<{ id: string; code: string; name: string }>;
}

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: RecordStatus;
  memberCount: number;
  permissions: string[];
}

export interface PermissionCatalogEntry {
  code: string;
  name: string;
  area: string;
  phase: "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";
  sensitive: boolean;
}

export interface AccessOverview {
  memberships: MembershipRow[];
  roles: RoleRow[];
  permissionCatalog: PermissionCatalogEntry[];
  roleTemplates: Array<{
    code: string;
    name: string;
    description: string;
    permissions: string[];
  }>;
}

export interface ApprovalPolicyRow {
  id: string;
  actionCode: string;
  name: string;
  strategy: ApprovalStrategy;
  minimumApprovers: number;
  thresholdAmount: number | null;
  currencyCode: string | null;
  enabled: boolean;
  conditions: Record<string, unknown> | null;
}

export interface ApprovalRequestRow {
  id: string;
  actionCode: string;
  actionName: string;
  entityType: string;
  entityId: string | null;
  status: ApprovalRequestStatus;
  amount: number | null;
  currencyCode: string | null;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  decisions: Array<{
    id: string;
    decision: ApprovalRequestStatus;
    decidedBy: string;
    decidedAt: string;
    note: string | null;
  }>;
  branchName: string | null;
  context: Record<string, unknown> | null;
}

export interface ApprovalOverview {
  policies: ApprovalPolicyRow[];
  requests: ApprovalRequestRow[];
  approvableActions: Array<{ code: string; name: string; decisionPermission: string }>;
}

export interface FeatureRow {
  key: string;
  name: string;
  description: string;
  kind: FeatureKind;
  enabled: boolean;
  dependsOn: string[];
  blockedBy: string[];
  settings: Record<string, unknown> | null;
}

export interface DocumentSequenceRow {
  id: string;
  documentType: string;
  branchId: string | null;
  branchName: string | null;
  scopeKey: string;
  prefix: string;
  padding: number;
  nextValue: number;
  nextNumberPreview: string;
}

export interface AuditEventRow {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor: string;
  branchName: string | null;
  occurredAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
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
