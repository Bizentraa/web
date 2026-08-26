import type { PromotionConditions } from "@bizentra/contracts";
import { describe, expect, it } from "vitest";

import {
  calculateSale,
  discountAmount,
  refundForQuantity,
  type PricingLine,
  type PricingPromotion,
} from "./pricing.js";

const conditions = (overrides: Partial<PromotionConditions> = {}): PromotionConditions => ({
  scope: "SALE",
  itemIds: [],
  categoryIds: [],
  minimumQuantity: 0,
  minimumAmount: 0,
  buyQuantity: 0,
  getQuantity: 0,
  priority: 50,
  ...overrides,
});

const line = (overrides: Partial<PricingLine> = {}): PricingLine => ({
  itemId: "item-1",
  variantId: null,
  code: "MILK",
  description: "Fresh Milk 1L",
  categoryId: "cat-1",
  unitId: "unit-1",
  unitCode: "EA",
  quantity: 1,
  unitPrice: 100,
  costPrice: 70,
  taxRateId: "tax-1",
  taxRatePercent: 0,
  stockTracked: true,
  ...overrides,
});

const promotion = (overrides: Partial<PricingPromotion> = {}): PricingPromotion => ({
  id: "promo-1",
  code: "PROMO",
  name: "Promotion",
  discountKind: "PERCENTAGE",
  discountValue: 10,
  conditions: conditions(),
  ...overrides,
});

describe("sale calculation", () => {
  it("multiplies quantity by price for a simple untaxed line", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ quantity: 3, unitPrice: 450 })],
      promotions: [],
    });

    expect(quote.subtotal).toBe(1350);
    expect(quote.taxTotal).toBe(0);
    expect(quote.total).toBe(1350);
    expect(quote.lines[0]?.lineTotal).toBe(1350);
  });

  it("adds tax on top when the price list is tax exclusive", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ quantity: 2, unitPrice: 100, taxRatePercent: 0.15 })],
      promotions: [],
    });

    expect(quote.subtotal).toBe(200);
    expect(quote.taxTotal).toBe(30);
    expect(quote.total).toBe(230);
  });

  it("splits tax out of the price when the price list is tax inclusive", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: true,
      lines: [line({ quantity: 1, unitPrice: 115, taxRatePercent: 0.15 })],
      promotions: [],
    });

    expect(quote.total).toBe(115);
    expect(quote.taxTotal).toBe(15);
    expect(quote.subtotal).toBe(100);
  });

  it("applies a manual line discount before tax", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [
        line({
          quantity: 1,
          unitPrice: 1000,
          taxRatePercent: 0.1,
          discountKind: "PERCENTAGE",
          discountValue: 10,
        }),
      ],
      promotions: [],
    });

    expect(quote.discountTotal).toBe(100);
    expect(quote.taxTotal).toBe(90);
    expect(quote.total).toBe(990);
  });

  it("never lets a discount exceed the line value", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 100, discountKind: "FIXED_AMOUNT", discountValue: 500 })],
      promotions: [],
    });

    expect(quote.total).toBe(0);
    expect(quote.discountTotal).toBe(100);
  });

  it("spreads a sale discount across lines without losing money", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [
        line({ itemId: "a", code: "A", unitPrice: 100 }),
        line({ itemId: "b", code: "B", unitPrice: 200 }),
        line({ itemId: "c", code: "C", unitPrice: 33.33 }),
      ],
      promotions: [],
      saleDiscountKind: "PERCENTAGE",
      saleDiscountValue: 10,
    });

    const lineDiscounts = quote.lines.reduce((sum, entry) => sum + entry.discountAmount, 0);
    expect(Math.round(lineDiscounts * 100) / 100).toBe(quote.discountTotal);
    expect(quote.discountTotal).toBe(33.33);
    expect(quote.total).toBe(300);
  });

  it("applies the best item promotion and explains the ones it skipped", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 1000 })],
      promotions: [
        promotion({
          id: "p1",
          code: "TEN",
          discountValue: 10,
          conditions: conditions({ scope: "ITEM", itemIds: ["item-1"] }),
        }),
        promotion({
          id: "p2",
          code: "TWENTY",
          discountValue: 20,
          conditions: conditions({ scope: "ITEM", itemIds: ["item-1"] }),
        }),
      ],
    });

    expect(quote.lines[0]?.promotionId).toBe("p2");
    expect(quote.discountTotal).toBe(200);
    expect(quote.warnings.some((warning) => warning.includes("TWENTY"))).toBe(true);
  });

  it("keeps a manual line discount instead of stacking a promotion on top", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 1000, discountKind: "FIXED_AMOUNT", discountValue: 50 })],
      promotions: [promotion({ conditions: conditions({ scope: "ITEM", itemIds: ["item-1"] }) })],
    });

    expect(quote.discountTotal).toBe(50);
    expect(quote.lines[0]?.promotionId).toBeNull();
    expect(quote.warnings[0]).toContain("manual discount");
  });

  it("gives the free units of a buy-two-get-one promotion", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ quantity: 6, unitPrice: 100 })],
      promotions: [
        promotion({
          code: "B2G1",
          discountKind: "PERCENTAGE",
          discountValue: 100,
          conditions: conditions({
            scope: "ITEM",
            itemIds: ["item-1"],
            buyQuantity: 2,
            getQuantity: 1,
          }),
        }),
      ],
    });

    expect(quote.discountTotal).toBe(200);
    expect(quote.total).toBe(400);
  });

  it("only applies a coupon promotion when the coupon is entered", () => {
    const coupon = promotion({
      code: "SAVE10",
      conditions: conditions({ couponCode: "SAVE10" }),
    });

    const without = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 1000 })],
      promotions: [coupon],
    });
    const withCoupon = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 1000 })],
      promotions: [coupon],
      couponCode: "save10",
    });

    expect(without.total).toBe(1000);
    expect(withCoupon.total).toBe(900);
  });

  it("respects a promotion minimum amount", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 500 })],
      promotions: [promotion({ conditions: conditions({ minimumAmount: 1000 }) })],
    });

    expect(quote.total).toBe(500);
    expect(quote.appliedPromotions).toHaveLength(0);
  });

  it("keeps the larger of a manual sale discount and a sale promotion", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: false,
      lines: [line({ unitPrice: 1000 })],
      promotions: [promotion({ code: "FIVE", discountValue: 5 })],
      saleDiscountKind: "PERCENTAGE",
      saleDiscountValue: 12,
    });

    expect(quote.discountTotal).toBe(120);
    expect(quote.warnings[0]).toContain("FIVE");
  });

  it("reconciles subtotal, discount and tax back to the total", () => {
    const quote = calculateSale({
      currencyCode: "LKR",
      taxInclusive: true,
      lines: [
        line({ itemId: "a", code: "A", quantity: 2, unitPrice: 345.5, taxRatePercent: 0.15 }),
        line({ itemId: "b", code: "B", quantity: 1, unitPrice: 99.99, taxRatePercent: 0.08 }),
      ],
      promotions: [],
      saleDiscountKind: "FIXED_AMOUNT",
      saleDiscountValue: 50,
    });

    expect(Math.round((quote.subtotal - quote.discountTotal + quote.taxTotal) * 100) / 100).toBe(
      quote.total,
    );
  });
});

describe("discount helper", () => {
  it("ignores empty and negative discounts", () => {
    expect(discountAmount(100, "PERCENTAGE", 0)).toBe(0);
    expect(discountAmount(100, undefined, 10)).toBe(0);
    expect(discountAmount(0, "FIXED_AMOUNT", 10)).toBe(0);
  });
});

describe("refund calculation", () => {
  it("refunds the proportional share of a partly returned line", () => {
    const refund = refundForQuantity({ quantity: 4, lineSubtotal: 400, taxAmount: 60 }, 1);
    expect(refund).toEqual({ net: 100, tax: 15, total: 115 });
  });

  it("never refunds more than the line was sold for", () => {
    const refund = refundForQuantity({ quantity: 2, lineSubtotal: 200, taxAmount: 30 }, 5);
    expect(refund.total).toBe(230);
  });

  it("returns nothing for an empty line", () => {
    expect(refundForQuantity({ quantity: 0, lineSubtotal: 0, taxAmount: 0 }, 1).total).toBe(0);
  });
});
