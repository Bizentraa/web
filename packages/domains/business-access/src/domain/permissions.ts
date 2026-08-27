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

export const P5_PERMISSIONS = [
  { code: "WORKFLOW_VIEW", name: "View workflow setup", area: "Workflow" },
  { code: "WORKFLOW_MANAGE", name: "Manage workflow setup", area: "Workflow", sensitive: true },
  { code: "WORK_TICKET_VIEW", name: "View work tickets", area: "Work tickets" },
  { code: "WORK_TICKET_MANAGE", name: "Manage work tickets", area: "Work tickets" },
  { code: "BOOKING_VIEW", name: "View bookings", area: "Bookings" },
  { code: "BOOKING_MANAGE", name: "Manage bookings", area: "Bookings" },
  { code: "TRACEABILITY_VIEW", name: "View traceability", area: "Traceability" },
  {
    code: "TRACEABILITY_MANAGE",
    name: "Manage traceability",
    area: "Traceability",
    sensitive: true,
  },
  { code: "WARRANTY_VIEW", name: "View warranties", area: "Warranty" },
  { code: "WARRANTY_MANAGE", name: "Manage warranties", area: "Warranty" },
  { code: "BOM_VIEW", name: "View recipes and BOMs", area: "Recipe / BOM" },
  { code: "BOM_MANAGE", name: "Manage recipes and BOMs", area: "Recipe / BOM", sensitive: true },
  { code: "ROUTE_VIEW", name: "View routes and deliveries", area: "Route / delivery" },
  { code: "ROUTE_MANAGE", name: "Manage routes and deliveries", area: "Route / delivery" },
  { code: "NOTIFICATION_VIEW", name: "View notifications", area: "Notifications" },
  { code: "NOTIFICATION_MANAGE", name: "Manage notifications", area: "Notifications" },
  { code: "DOCUMENT_VIEW", name: "View documents", area: "Documents" },
  { code: "DOCUMENT_MANAGE", name: "Manage documents", area: "Documents" },
] as const satisfies readonly PermissionDefinition[];

export const P6_PERMISSIONS = [
  { code: "DEVICE_VIEW", name: "View devices", area: "Devices" },
  { code: "DEVICE_MANAGE", name: "Manage devices", area: "Devices", sensitive: true },
  { code: "OFFLINE_VIEW", name: "View offline queue", area: "Offline sync" },
  {
    code: "OFFLINE_MANAGE",
    name: "Manage offline queue",
    area: "Offline sync",
    sensitive: true,
  },
] as const satisfies readonly PermissionDefinition[];

export const P7_PERMISSIONS = [
  { code: "REPORT_VIEW", name: "View reports", area: "Reports" },
  {
    code: "REPORT_EXPORT",
    name: "Export report data",
    area: "Reports",
    sensitive: true,
  },
  { code: "INTEGRATION_VIEW", name: "View integrations", area: "Integrations" },
  {
    code: "INTEGRATION_MANAGE",
    name: "Manage integrations",
    area: "Integrations",
    sensitive: true,
  },
  { code: "MIGRATION_VIEW", name: "View migration validation", area: "Migration" },
  {
    code: "MIGRATION_MANAGE",
    name: "Manage migration validation",
    area: "Migration",
    sensitive: true,
  },
] as const satisfies readonly PermissionDefinition[];

export const P8_PERMISSIONS = [
  { code: "SECURITY_VIEW", name: "View security events", area: "Security" },
  {
    code: "SECURITY_MANAGE",
    name: "Manage security controls",
    area: "Security",
    sensitive: true,
  },
  { code: "OPERATIONS_VIEW", name: "View operations readiness", area: "Operations" },
  {
    code: "OPERATIONS_MANAGE",
    name: "Manage operations readiness",
    area: "Operations",
    sensitive: true,
  },
  { code: "PRIVACY_VIEW", name: "View privacy requests", area: "Privacy" },
  {
    code: "PRIVACY_MANAGE",
    name: "Manage privacy requests",
    area: "Privacy",
    sensitive: true,
  },
  { code: "RELEASE_VIEW", name: "View release readiness", area: "Release" },
  {
    code: "RELEASE_MANAGE",
    name: "Manage release readiness",
    area: "Release",
    sensitive: true,
  },
] as const satisfies readonly PermissionDefinition[];

export const PLATFORM_PERMISSIONS = [
  ...P0_PERMISSIONS,
  ...P1_PERMISSIONS,
  ...P2_PERMISSIONS,
  ...P3_PERMISSIONS,
  ...P4_PERMISSIONS,
  ...P5_PERMISSIONS,
  ...P6_PERMISSIONS,
  ...P7_PERMISSIONS,
  ...P8_PERMISSIONS,
] as const;

export type P0PermissionCode = (typeof P0_PERMISSIONS)[number]["code"];
export type P1PermissionCode = (typeof P1_PERMISSIONS)[number]["code"];
export type P2PermissionCode = (typeof P2_PERMISSIONS)[number]["code"];
export type P3PermissionCode = (typeof P3_PERMISSIONS)[number]["code"];
export type P4PermissionCode = (typeof P4_PERMISSIONS)[number]["code"];
export type P5PermissionCode = (typeof P5_PERMISSIONS)[number]["code"];
export type P6PermissionCode = (typeof P6_PERMISSIONS)[number]["code"];
export type P7PermissionCode = (typeof P7_PERMISSIONS)[number]["code"];
export type P8PermissionCode = (typeof P8_PERMISSIONS)[number]["code"];
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
      "WORKFLOW_VIEW",
      "WORK_TICKET_VIEW",
      "WORK_TICKET_MANAGE",
      "BOOKING_VIEW",
      "BOOKING_MANAGE",
      "TRACEABILITY_VIEW",
      "TRACEABILITY_MANAGE",
      "WARRANTY_VIEW",
      "WARRANTY_MANAGE",
      "BOM_VIEW",
      "BOM_MANAGE",
      "ROUTE_VIEW",
      "ROUTE_MANAGE",
      "NOTIFICATION_VIEW",
      "DOCUMENT_VIEW",
      "DOCUMENT_MANAGE",
      "DEVICE_VIEW",
      "OFFLINE_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "INTEGRATION_VIEW",
      "MIGRATION_VIEW",
      "SECURITY_VIEW",
      "OPERATIONS_VIEW",
      "PRIVACY_VIEW",
      "RELEASE_VIEW",
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
      "DEVICE_VIEW",
      "OFFLINE_VIEW",
      "OFFLINE_MANAGE",
      "WORK_TICKET_VIEW",
      "BOOKING_VIEW",
      "DOCUMENT_VIEW",
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
      "TRACEABILITY_VIEW",
      "TRACEABILITY_MANAGE",
      "BOM_VIEW",
      "BOM_MANAGE",
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
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "SECURITY_VIEW",
      "OPERATIONS_VIEW",
      "PRIVACY_VIEW",
      "RELEASE_VIEW",
    ],
  },
  {
    code: "REPORTING_USER",
    name: "Reporting / Integration User",
    description: "Reviews reports, exports data and manages integration evidence.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "CATALOG_VIEW",
      "CUSTOMER_VIEW",
      "SUPPLIER_VIEW",
      "SALE_VIEW",
      "FINANCE_VIEW",
      "INVENTORY_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "INTEGRATION_VIEW",
      "INTEGRATION_MANAGE",
      "MIGRATION_VIEW",
      "MIGRATION_MANAGE",
      "AUDIT_VIEW",
    ],
  },
  {
    code: "OPERATIONS_USER",
    name: "Operations User",
    description:
      "Manages workflows, work tickets, bookings, traceability, warranties and delivery execution.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "CUSTOMER_VIEW",
      "CATALOG_VIEW",
      "INVENTORY_VIEW",
      "WORKFLOW_VIEW",
      "WORK_TICKET_VIEW",
      "WORK_TICKET_MANAGE",
      "BOOKING_VIEW",
      "BOOKING_MANAGE",
      "TRACEABILITY_VIEW",
      "TRACEABILITY_MANAGE",
      "WARRANTY_VIEW",
      "WARRANTY_MANAGE",
      "BOM_VIEW",
      "BOM_MANAGE",
      "ROUTE_VIEW",
      "ROUTE_MANAGE",
      "NOTIFICATION_VIEW",
      "DOCUMENT_VIEW",
      "DOCUMENT_MANAGE",
      "DEVICE_VIEW",
      "OFFLINE_VIEW",
      "REPORT_VIEW",
    ],
  },
  {
    code: "DEVICE_USER",
    name: "Device / Offline User",
    description: "Manages store devices, offline queue review and sync conflict resolution.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "DEVICE_VIEW",
      "DEVICE_MANAGE",
      "OFFLINE_VIEW",
      "OFFLINE_MANAGE",
      "AUDIT_VIEW",
    ],
  },
  {
    code: "OPERATIONS_ADMIN",
    name: "Security / Operations Admin",
    description: "Manages security, backup, privacy and release-readiness evidence.",
    permissions: [
      "BUSINESS_VIEW",
      "BRANCH_VIEW",
      "LOCATION_VIEW",
      "USER_VIEW",
      "ROLE_VIEW",
      "APPROVAL_VIEW",
      "FEATURE_VIEW",
      "AUDIT_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "INTEGRATION_VIEW",
      "INTEGRATION_MANAGE",
      "MIGRATION_VIEW",
      "MIGRATION_MANAGE",
      "SECURITY_VIEW",
      "SECURITY_MANAGE",
      "OPERATIONS_VIEW",
      "OPERATIONS_MANAGE",
      "PRIVACY_VIEW",
      "PRIVACY_MANAGE",
      "RELEASE_VIEW",
      "RELEASE_MANAGE",
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
      "WORKFLOW_VIEW",
      "WORK_TICKET_VIEW",
      "BOOKING_VIEW",
      "TRACEABILITY_VIEW",
      "WARRANTY_VIEW",
      "BOM_VIEW",
      "ROUTE_VIEW",
      "NOTIFICATION_VIEW",
      "DOCUMENT_VIEW",
      "DEVICE_VIEW",
      "OFFLINE_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "SECURITY_VIEW",
      "OPERATIONS_VIEW",
      "PRIVACY_VIEW",
      "RELEASE_VIEW",
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
    key: "BUSINESS_ENGINES",
    name: "Reusable business engines",
    description: "Work tickets, bookings, traceability, warranties, BOMs, routes and documents.",
    kind: "CORE",
    dependsOn: ["INVENTORY_PURCHASING"],
  },
  {
    key: "STORE_RELIABILITY",
    name: "Offline, devices and store reliability",
    description: "Device registry, offline queue, sync conflicts and terminal health.",
    kind: "CORE",
    dependsOn: ["POS_SALES"],
  },
  {
    key: "REPORTING_INTEGRATIONS",
    name: "Reporting, integrations and migration",
    description: "Reports, data exports, webhooks, integration delivery and migration validation.",
    kind: "CORE",
    dependsOn: ["POS_SALES", "INVENTORY_PURCHASING"],
  },
  {
    key: "PRODUCTION_READINESS",
    name: "Security, operations and production readiness",
    description:
      "Security events, backups, readiness checks, privacy requests and release controls.",
    kind: "CORE",
    dependsOn: ["COMMON_CORE"],
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
