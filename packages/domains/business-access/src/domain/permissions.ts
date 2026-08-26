/**
 * CC-P0-006: one fine-grained permission catalogue shared by every Business type.
 *
 * `area` groups permissions for the Back Office role editor so a Business Administrator
 * can reason about access in business language instead of raw codes.
 */
export interface PermissionDefinition {
  readonly code: string;
  readonly name: string;
  readonly area: string;
  readonly sensitive?: boolean;
}

export const P0_PERMISSIONS = [
  { code: "BUSINESS_VIEW", name: "View business", area: "Business" },
  { code: "BUSINESS_UPDATE", name: "Update business", area: "Business" },
  { code: "BRANCH_VIEW", name: "View branches", area: "Branches" },
  { code: "BRANCH_CREATE", name: "Create branches", area: "Branches" },
  { code: "BRANCH_UPDATE", name: "Update branches", area: "Branches" },
  { code: "LOCATION_VIEW", name: "View locations", area: "Branches" },
  { code: "LOCATION_CREATE", name: "Create locations", area: "Branches" },
  { code: "LOCATION_UPDATE", name: "Update locations", area: "Branches" },
  { code: "USER_VIEW", name: "View users", area: "People" },
  { code: "USER_CREATE", name: "Create users", area: "People" },
  { code: "USER_UPDATE", name: "Update users", area: "People" },
  { code: "USER_ASSIGN", name: "Assign users", area: "People" },
  { code: "ROLE_VIEW", name: "View roles", area: "People" },
  { code: "ROLE_MANAGE", name: "Manage roles", area: "People" },
  { code: "APPROVAL_VIEW", name: "View approval rules", area: "Approvals" },
  { code: "APPROVAL_MANAGE", name: "Manage approval rules", area: "Approvals" },
  {
    code: "APPROVAL_DECIDE",
    name: "Approve or reject approval requests",
    area: "Approvals",
    sensitive: true,
  },
  {
    code: "DISCOUNT_APPROVE",
    name: "Approve large discounts",
    area: "Approvals",
    sensitive: true,
  },
  { code: "REFUND_APPROVE", name: "Approve refunds", area: "Approvals", sensitive: true },
  { code: "STOCK_ADJUST", name: "Adjust stock", area: "Approvals", sensitive: true },
  { code: "PURCHASE_APPROVE", name: "Approve purchases", area: "Approvals", sensitive: true },
  { code: "SALE_VOID", name: "Void sales", area: "Approvals", sensitive: true },
  { code: "FINANCE_VIEW", name: "View financial information", area: "Finance" },
  { code: "FEATURE_VIEW", name: "View feature access", area: "Features" },
  { code: "FEATURE_MANAGE", name: "Manage feature access", area: "Features" },
  { code: "AUDIT_VIEW", name: "View audit records", area: "Audit" },
  { code: "NUMBERING_VIEW", name: "View number sequences", area: "Numbering" },
  { code: "NUMBERING_MANAGE", name: "Manage number sequences", area: "Numbering" },
] as const satisfies readonly PermissionDefinition[];

export const P1_PERMISSIONS = [
  { code: "CATALOG_VIEW", name: "View catalog master data", area: "Catalog" },
  { code: "CATALOG_MANAGE", name: "Manage catalog master data", area: "Catalog" },
  { code: "PRICE_VIEW", name: "View prices", area: "Pricing" },
  { code: "PRICE_MANAGE", name: "Manage prices", area: "Pricing" },
  { code: "PROMOTION_VIEW", name: "View promotions", area: "Pricing" },
  { code: "PROMOTION_MANAGE", name: "Manage promotions", area: "Pricing" },
  { code: "TAX_VIEW", name: "View tax setup", area: "Tax" },
  { code: "TAX_MANAGE", name: "Manage tax setup", area: "Tax" },
  { code: "CUSTOMER_VIEW", name: "View customers", area: "Customers" },
  { code: "CUSTOMER_MANAGE", name: "Manage customers", area: "Customers" },
  { code: "SUPPLIER_VIEW", name: "View suppliers", area: "Suppliers" },
  { code: "SUPPLIER_MANAGE", name: "Manage suppliers", area: "Suppliers" },
  { code: "IMPORT_VIEW", name: "View import batches", area: "Import" },
  { code: "IMPORT_MANAGE", name: "Manage import batches", area: "Import" },
] as const satisfies readonly PermissionDefinition[];

export const P2_PERMISSIONS = [
  { code: "SHIFT_VIEW", name: "View POS shifts", area: "Point of sale" },
  { code: "SHIFT_MANAGE", name: "Open, adjust and close POS shifts", area: "Point of sale" },
  { code: "SALE_VIEW", name: "View sales", area: "Point of sale" },
  { code: "SALE_CREATE", name: "Create and confirm sales", area: "Point of sale" },
  { code: "PAYMENT_ACCEPT", name: "Accept payments", area: "Point of sale" },
  { code: "RECEIPT_PRINT", name: "Print and reprint receipts", area: "Point of sale" },
  { code: "RETURN_CREATE", name: "Create returns", area: "Returns" },
  {
    code: "REFUND_ISSUE",
    name: "Issue refunds and store credit",
    area: "Returns",
    sensitive: true,
  },
  { code: "STORE_CREDIT_VIEW", name: "View store credit", area: "Returns" },
  { code: "STORE_CREDIT_MANAGE", name: "Manage store credit", area: "Returns", sensitive: true },
] as const satisfies readonly PermissionDefinition[];

export const P3_PERMISSIONS = [
  { code: "INVENTORY_VIEW", name: "View inventory", area: "Inventory" },
  {
    code: "INVENTORY_MOVE",
    name: "Receive, transfer and reserve stock",
    area: "Inventory",
    sensitive: true,
  },
  { code: "INVENTORY_ADJUST", name: "Adjust stock", area: "Inventory", sensitive: true },
  { code: "REORDER_MANAGE", name: "Manage reorder levels", area: "Inventory" },
  { code: "PURCHASE_VIEW", name: "View purchasing", area: "Purchasing" },
  { code: "PURCHASE_MANAGE", name: "Create purchase requests and orders", area: "Purchasing" },
  { code: "PURCHASE_RECEIVE", name: "Receive purchase orders", area: "Purchasing" },
  { code: "FULFILLMENT_VIEW", name: "View fulfillment", area: "Fulfillment" },
  { code: "FULFILLMENT_MANAGE", name: "Pick, pack and dispatch orders", area: "Fulfillment" },
] as const satisfies readonly PermissionDefinition[];

export const P4_PERMISSIONS = [
  { code: "AR_VIEW", name: "View customer invoices and collections", area: "Finance" },
  { code: "AR_MANAGE", name: "Create invoices and collect customer payments", area: "Finance" },
  { code: "AP_VIEW", name: "View supplier bills and payments", area: "Finance" },
  {
    code: "AP_MANAGE",
    name: "Create supplier bills and record supplier payments",
    area: "Finance",
  },
  { code: "EXPENSE_VIEW", name: "View expenses", area: "Finance" },
  { code: "EXPENSE_MANAGE", name: "Create expense categories and expenses", area: "Finance" },
  { code: "BANK_VIEW", name: "View cash and bank accounts", area: "Finance" },
  {
    code: "BANK_MANAGE",
    name: "Post cash and bank transactions",
    area: "Finance",
    sensitive: true,
  },
  { code: "LOYALTY_VIEW", name: "View loyalty balances", area: "Loyalty" },
  { code: "LOYALTY_MANAGE", name: "Adjust loyalty balances", area: "Loyalty", sensitive: true },
  { code: "ACCOUNTING_EVENT_VIEW", name: "View accounting event queue", area: "Finance" },
] as const satisfies readonly PermissionDefinition[];

export const PLATFORM_PERMISSIONS = [
  ...P0_PERMISSIONS,
  ...P1_PERMISSIONS,
  ...P2_PERMISSIONS,
  ...P3_PERMISSIONS,
  ...P4_PERMISSIONS,
] as const;

export type P0PermissionCode = (typeof P0_PERMISSIONS)[number]["code"];
export type P1PermissionCode = (typeof P1_PERMISSIONS)[number]["code"];
export type P2PermissionCode = (typeof P2_PERMISSIONS)[number]["code"];
export type P3PermissionCode = (typeof P3_PERMISSIONS)[number]["code"];
export type P4PermissionCode = (typeof P4_PERMISSIONS)[number]["code"];
export type PlatformPermissionCode = (typeof PLATFORM_PERMISSIONS)[number]["code"];

const PERMISSION_CODES = new Set<string>(
  PLATFORM_PERMISSIONS.map((permission) => permission.code as string),
);

export function isPlatformPermissionCode(code: string): code is PlatformPermissionCode {
  return PERMISSION_CODES.has(code);
}

/**
 * CC-P0-007: sensitive actions that an approval policy can protect. The Back Office
 * approval-rule builder reads this list so rules stay tied to real permissions.
 */
export const APPROVABLE_ACTIONS = [
  {
    code: "SALE_DISCOUNT",
    name: "Large sale discount",
    decisionPermission: "DISCOUNT_APPROVE",
  },
  { code: "SALE_REFUND", name: "Refund a sale", decisionPermission: "REFUND_APPROVE" },
  { code: "SALE_VOID", name: "Void a confirmed sale", decisionPermission: "SALE_VOID" },
  { code: "STOCK_ADJUSTMENT", name: "Stock adjustment", decisionPermission: "STOCK_ADJUST" },
  {
    code: "PURCHASE_ORDER",
    name: "Purchase order approval",
    decisionPermission: "PURCHASE_APPROVE",
  },
  {
    code: "SHIFT_VARIANCE",
    name: "Shift cash variance",
    decisionPermission: "APPROVAL_DECIDE",
  },
] as const satisfies readonly {
  code: string;
  name: string;
  decisionPermission: PlatformPermissionCode;
}[];

export type ApprovableActionCode = (typeof APPROVABLE_ACTIONS)[number]["code"];

export function decisionPermissionForAction(actionCode: string): PlatformPermissionCode {
  const action = APPROVABLE_ACTIONS.find((candidate) => candidate.code === actionCode);
  return action?.decisionPermission ?? "APPROVAL_DECIDE";
}

/**
 * Roles that most Businesses need on day one. A Business Administrator can still create
 * custom Roles; these templates only make the common setup fast and consistent.
 */
export const ROLE_TEMPLATES = [
  {
    code: "ADMINISTRATOR",
    name: "Business Administrator",
    description: "Manages users, Branches, settings and permissions.",
    permissions: PLATFORM_PERMISSIONS.map((permission) => permission.code as string),
  },
  {
    code: "BRANCH_MANAGER",
    name: "Branch Manager",
    description: "Runs one Branch, approves sensitive actions and reviews operations.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "USER_VIEW",
      "APPROVAL_VIEW",
      "APPROVAL_DECIDE",
      "DISCOUNT_APPROVE",
      "REFUND_APPROVE",
      "SALE_VOID",
      "PURCHASE_APPROVE",
      "AUDIT_VIEW",
      "CATALOG_VIEW",
      "PRICE_VIEW",
      "PROMOTION_VIEW",
      "TAX_VIEW",
      "CUSTOMER_VIEW",
      "SUPPLIER_VIEW",
      "SHIFT_VIEW",
      "SHIFT_MANAGE",
      "SALE_VIEW",
      "SALE_CREATE",
      "PAYMENT_ACCEPT",
      "RECEIPT_PRINT",
      "RETURN_CREATE",
      "REFUND_ISSUE",
      "STORE_CREDIT_VIEW",
      "FINANCE_VIEW",
      "INVENTORY_VIEW",
      "INVENTORY_MOVE",
      "INVENTORY_ADJUST",
      "REORDER_MANAGE",
      "PURCHASE_VIEW",
      "PURCHASE_MANAGE",
      "PURCHASE_RECEIVE",
      "FULFILLMENT_VIEW",
      "FULFILLMENT_MANAGE",
      "AR_VIEW",
      "AR_MANAGE",
      "AP_VIEW",
      "AP_MANAGE",
      "EXPENSE_VIEW",
      "EXPENSE_MANAGE",
      "BANK_VIEW",
      "BANK_MANAGE",
      "LOYALTY_VIEW",
      "LOYALTY_MANAGE",
      "ACCOUNTING_EVENT_VIEW",
    ],
  },
  {
    code: "CASHIER",
    name: "Cashier / Sales User",
    description: "Creates sales, receives allowed payments and handles permitted returns.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "CATALOG_VIEW",
      "PRICE_VIEW",
      "CUSTOMER_VIEW",
      "CUSTOMER_MANAGE",
      "SHIFT_VIEW",
      "SHIFT_MANAGE",
      "SALE_VIEW",
      "SALE_CREATE",
      "PAYMENT_ACCEPT",
      "RECEIPT_PRINT",
      "RETURN_CREATE",
      "STORE_CREDIT_VIEW",
    ],
  },
  {
    code: "MERCHANDISER",
    name: "Catalog / Pricing User",
    description: "Maintains items, prices, tax setup and promotions.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "CATALOG_VIEW",
      "CATALOG_MANAGE",
      "PRICE_VIEW",
      "PRICE_MANAGE",
      "PROMOTION_VIEW",
      "PROMOTION_MANAGE",
      "TAX_VIEW",
      "TAX_MANAGE",
      "SUPPLIER_VIEW",
      "IMPORT_VIEW",
      "IMPORT_MANAGE",
      "INVENTORY_VIEW",
      "REORDER_MANAGE",
      "PURCHASE_VIEW",
      "PURCHASE_MANAGE",
    ],
  },
  {
    code: "INVENTORY_USER",
    name: "Inventory User",
    description: "Receives, counts, transfers and adjusts stock.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "CATALOG_VIEW",
      "SUPPLIER_VIEW",
      "INVENTORY_VIEW",
      "INVENTORY_MOVE",
      "INVENTORY_ADJUST",
      "REORDER_MANAGE",
      "PURCHASE_VIEW",
      "PURCHASE_RECEIVE",
      "FULFILLMENT_VIEW",
      "FULFILLMENT_MANAGE",
      "AUDIT_VIEW",
    ],
  },
  {
    code: "PURCHASING_USER",
    name: "Purchasing User",
    description: "Creates purchase requests and purchase orders with supplier costs.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "CATALOG_VIEW",
      "SUPPLIER_VIEW",
      "SUPPLIER_MANAGE",
      "INVENTORY_VIEW",
      "REORDER_MANAGE",
      "PURCHASE_VIEW",
      "PURCHASE_MANAGE",
      "AUDIT_VIEW",
    ],
  },
  {
    code: "FINANCE_USER",
    name: "Finance User",
    description: "Manages customer invoices, supplier bills, expenses, cash and finance reviews.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "CUSTOMER_VIEW",
      "SUPPLIER_VIEW",
      "SALE_VIEW",
      "STORE_CREDIT_VIEW",
      "FINANCE_VIEW",
      "AR_VIEW",
      "AR_MANAGE",
      "AP_VIEW",
      "AP_MANAGE",
      "EXPENSE_VIEW",
      "EXPENSE_MANAGE",
      "BANK_VIEW",
      "BANK_MANAGE",
      "LOYALTY_VIEW",
      "LOYALTY_MANAGE",
      "ACCOUNTING_EVENT_VIEW",
      "AUDIT_VIEW",
      "NUMBERING_VIEW",
    ],
  },
  {
    code: "AUDITOR",
    name: "Auditor / Read-only User",
    description: "Reviews records and audit history without changing business data.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "USER_VIEW",
      "ROLE_VIEW",
      "APPROVAL_VIEW",
      "FEATURE_VIEW",
      "AUDIT_VIEW",
      "NUMBERING_VIEW",
      "CATALOG_VIEW",
      "PRICE_VIEW",
      "PROMOTION_VIEW",
      "TAX_VIEW",
      "CUSTOMER_VIEW",
      "SUPPLIER_VIEW",
      "IMPORT_VIEW",
      "SHIFT_VIEW",
      "SALE_VIEW",
      "STORE_CREDIT_VIEW",
      "FINANCE_VIEW",
      "INVENTORY_VIEW",
      "PURCHASE_VIEW",
      "FULFILLMENT_VIEW",
      "AR_VIEW",
      "AP_VIEW",
      "EXPENSE_VIEW",
      "BANK_VIEW",
      "LOYALTY_VIEW",
      "ACCOUNTING_EVENT_VIEW",
    ],
  },
] as const satisfies readonly {
  code: string;
  name: string;
  description: string;
  permissions: readonly string[];
}[];

export type RoleTemplateCode = (typeof ROLE_TEMPLATES)[number]["code"];

/**
 * CC-P0-008: feature definitions that a Business can enable or disable. Business packs stay
 * off until the Business type is chosen so shared data never changes shape.
 */
export const FEATURE_DEFINITIONS = [
  {
    key: "COMMON_CORE",
    name: "Common Core",
    description: "Shared Bizentra platform capabilities.",
    kind: "CORE",
    dependsOn: [],
  },
  {
    key: "MASTER_DATA",
    name: "Master data and pricing",
    description: "Items, prices, tax, customers, suppliers and imports.",
    kind: "CORE",
    dependsOn: ["COMMON_CORE"],
  },
  {
    key: "POS_SALES",
    name: "POS sales and payments",
    description: "Shifts, sales, tenders, receipts, returns and refunds.",
    kind: "CORE",
    dependsOn: ["MASTER_DATA"],
  },
  {
    key: "STORE_CREDIT",
    name: "Store credit",
    description: "Refund to store credit and redeem it on a later sale.",
    kind: "OPTIONAL",
    dependsOn: ["POS_SALES"],
  },
  {
    key: "OFFLINE_POS",
    name: "Offline POS operations",
    description: "Approved offline selling with a visible sync queue.",
    kind: "OPTIONAL",
    dependsOn: ["POS_SALES"],
  },
  {
    key: "INVENTORY_PURCHASING",
    name: "Inventory, purchasing and fulfillment",
    description: "Stock ledger, availability, receiving, transfers, purchasing and fulfillment.",
    kind: "CORE",
    dependsOn: ["MASTER_DATA"],
  },
  {
    key: "GROCERY_PACK",
    name: "Grocery / Supermarket pack",
    description: "Grocery-specific screens and workflows.",
    kind: "BUSINESS_PACK",
    dependsOn: ["POS_SALES"],
  },
  {
    key: "GENERAL_RETAIL_PACK",
    name: "General retail pack",
    description: "General retail screens and workflows.",
    kind: "BUSINESS_PACK",
    dependsOn: ["POS_SALES"],
  },
] as const satisfies readonly {
  key: string;
  name: string;
  description: string;
  kind: "CORE" | "BUSINESS_PACK" | "OPTIONAL";
  dependsOn: readonly string[];
}[];

export type FeatureKey = (typeof FEATURE_DEFINITIONS)[number]["key"];
