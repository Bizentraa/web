import { describe, expect, it } from "vitest";

import { P0_PERMISSIONS, P1_PERMISSIONS, PLATFORM_PERMISSIONS } from "./permissions.js";

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
