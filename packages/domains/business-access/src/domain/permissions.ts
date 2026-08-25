export const P0_PERMISSIONS = [
  { code: "BUSINESS_VIEW", name: "View business" },
  { code: "BUSINESS_UPDATE", name: "Update business" },
  { code: "BRANCH_VIEW", name: "View branches" },
  { code: "BRANCH_CREATE", name: "Create branches" },
  { code: "BRANCH_UPDATE", name: "Update branches" },
  { code: "LOCATION_VIEW", name: "View locations" },
  { code: "LOCATION_CREATE", name: "Create locations" },
  { code: "LOCATION_UPDATE", name: "Update locations" },
  { code: "USER_VIEW", name: "View users" },
  { code: "USER_CREATE", name: "Create users" },
  { code: "USER_ASSIGN", name: "Assign users" },
  { code: "ROLE_VIEW", name: "View roles" },
  { code: "ROLE_MANAGE", name: "Manage roles" },
  { code: "APPROVAL_VIEW", name: "View approval rules" },
  { code: "APPROVAL_MANAGE", name: "Manage approval rules" },
  { code: "DISCOUNT_APPROVE", name: "Approve large discounts" },
  { code: "REFUND_APPROVE", name: "Approve refunds" },
  { code: "STOCK_ADJUST", name: "Adjust stock" },
  { code: "PURCHASE_APPROVE", name: "Approve purchases" },
  { code: "SALE_VOID", name: "Void sales" },
  { code: "FINANCE_VIEW", name: "View financial information" },
  { code: "FEATURE_VIEW", name: "View feature access" },
  { code: "FEATURE_MANAGE", name: "Manage feature access" },
  { code: "AUDIT_VIEW", name: "View audit records" },
  { code: "NUMBERING_VIEW", name: "View number sequences" },
  { code: "NUMBERING_MANAGE", name: "Manage number sequences" },
] as const;

export const P1_PERMISSIONS = [
  { code: "CATALOG_VIEW", name: "View catalog master data" },
  { code: "CATALOG_MANAGE", name: "Manage catalog master data" },
  { code: "PRICE_VIEW", name: "View prices" },
  { code: "PRICE_MANAGE", name: "Manage prices" },
  { code: "PROMOTION_VIEW", name: "View promotions" },
  { code: "PROMOTION_MANAGE", name: "Manage promotions" },
  { code: "TAX_VIEW", name: "View tax setup" },
  { code: "TAX_MANAGE", name: "Manage tax setup" },
  { code: "CUSTOMER_VIEW", name: "View customers" },
  { code: "CUSTOMER_MANAGE", name: "Manage customers" },
  { code: "SUPPLIER_VIEW", name: "View suppliers" },
  { code: "SUPPLIER_MANAGE", name: "Manage suppliers" },
  { code: "IMPORT_VIEW", name: "View import batches" },
  { code: "IMPORT_MANAGE", name: "Manage import batches" },
] as const;

export const PLATFORM_PERMISSIONS = [...P0_PERMISSIONS, ...P1_PERMISSIONS] as const;

export type P0PermissionCode = (typeof P0_PERMISSIONS)[number]["code"];
export type PlatformPermissionCode = (typeof PLATFORM_PERMISSIONS)[number]["code"];
