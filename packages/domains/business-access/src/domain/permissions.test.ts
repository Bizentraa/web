import { describe, expect, it } from "vitest";

import { P0_PERMISSIONS } from "./permissions.js";

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
