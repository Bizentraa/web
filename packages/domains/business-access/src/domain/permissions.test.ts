import { describe, expect, it } from "vitest";

import {
  APPROVABLE_ACTIONS,
  decisionPermissionForAction,
  FEATURE_DEFINITIONS,
  isPlatformPermissionCode,
  P0_PERMISSIONS,
  P1_PERMISSIONS,
  P2_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  ROLE_TEMPLATES,
} from "./permissions.js";

describe("P0 permissions", () => {
  it("uses unique permission codes", () => {
    const codes = P0_PERMISSIONS.map(({ code }) => code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes the sensitive actions required by CC-P0-006", () => {
    const codes = new Set<string>(P0_PERMISSIONS.map(({ code }) => code));
    for (const requiredCode of [
      "DISCOUNT_APPROVE",
      "REFUND_APPROVE",
      "STOCK_ADJUST",
      "PURCHASE_APPROVE",
      "SALE_VOID",
      "FINANCE_VIEW",
    ]) {
      expect(codes.has(requiredCode)).toBe(true);
    }
  });
});

describe("P1 permissions", () => {
  it("uses unique platform permission codes", () => {
    const codes = PLATFORM_PERMISSIONS.map(({ code }) => code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes master-data permissions required by CC-P1", () => {
    const codes = new Set<string>(P1_PERMISSIONS.map(({ code }) => code));
    for (const requiredCode of [
      "CATALOG_VIEW",
      "CATALOG_MANAGE",
      "PRICE_MANAGE",
      "PROMOTION_MANAGE",
      "TAX_MANAGE",
      "CUSTOMER_MANAGE",
      "SUPPLIER_MANAGE",
      "IMPORT_MANAGE",
    ]) {
      expect(codes.has(requiredCode)).toBe(true);
    }
  });
});

describe("P2 permissions", () => {
  it("includes the selling permissions required by CC-P2", () => {
    const codes = new Set<string>(P2_PERMISSIONS.map(({ code }) => code));
    for (const requiredCode of [
      "SHIFT_MANAGE",
      "SALE_CREATE",
      "PAYMENT_ACCEPT",
      "RECEIPT_PRINT",
      "RETURN_CREATE",
      "REFUND_ISSUE",
    ]) {
      expect(codes.has(requiredCode)).toBe(true);
    }
  });

  it("recognises platform permission codes", () => {
    expect(isPlatformPermissionCode("SALE_CREATE")).toBe(true);
    expect(isPlatformPermissionCode("NOT_A_PERMISSION")).toBe(false);
  });
});

describe("role templates", () => {
  it("only grants permissions that exist in the platform catalogue", () => {
    for (const template of ROLE_TEMPLATES) {
      for (const code of template.permissions) {
        expect(isPlatformPermissionCode(code)).toBe(true);
      }
    }
  });

  it("keeps a cashier away from role and feature management", () => {
    const cashier = ROLE_TEMPLATES.find((template) => template.code === "CASHIER");
    expect(cashier).toBeDefined();
    const permissions = new Set<string>(cashier?.permissions ?? []);
    expect(permissions.has("ROLE_MANAGE")).toBe(false);
    expect(permissions.has("FEATURE_MANAGE")).toBe(false);
    expect(permissions.has("REFUND_APPROVE")).toBe(false);
  });
});

describe("approvable actions", () => {
  it("maps every action to a real decision permission", () => {
    for (const action of APPROVABLE_ACTIONS) {
      expect(isPlatformPermissionCode(action.decisionPermission)).toBe(true);
    }
  });

  it("falls back to the generic decision permission for unknown actions", () => {
    expect(decisionPermissionForAction("SALE_REFUND")).toBe("REFUND_APPROVE");
    expect(decisionPermissionForAction("SOMETHING_ELSE")).toBe("APPROVAL_DECIDE");
  });
});

describe("feature definitions", () => {
  it("only depends on features that exist", () => {
    const keys = new Set<string>(FEATURE_DEFINITIONS.map(({ key }) => key));
    for (const feature of FEATURE_DEFINITIONS) {
      for (const dependency of feature.dependsOn) {
        expect(keys.has(dependency)).toBe(true);
      }
    }
  });
});
