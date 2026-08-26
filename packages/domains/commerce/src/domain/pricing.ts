import type { DiscountKind, PricedLine, PromotionConditions, SaleQuote } from "@bizentra/contracts";
import { allocateProportionally, roundMoney, roundQuantity } from "@bizentra/domain-shared";

/**
 * CC-P1-006, CC-P1-007 and CC-P1-008: the shared price, promotion and tax calculation.
 *
 * This module is pure. The same function is used by the POS cart preview, by sale posting and by
 * returns, so a receipt, a report and a refund can never disagree about how a total was reached.
 *
 * Calculation order:
 *   1. line base            = quantity x unit price
 *   2. manual line discount = percentage or fixed amount on that line
 *   3. promotion            = best applicable item/category promotion for the line
 *   4. sale discount        = manual sale discount or the best sale promotion, spread across lines
 *   5. tax                  = per line, on the discounted amount, inclusive or exclusive
 */
export interface PricingLine {
  itemId: string;
  variantId: string | null;
  code: string;
  description: string;
  categoryId: string | null;
  unitId: string;
  unitCode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  taxRateId: string | null;
  taxRatePercent: number;
  stockTracked: boolean;
  discountKind?: DiscountKind | undefined;
  discountValue?: number | undefined;
}

export interface PricingPromotion {
  id: string;
  code: string;
  name: string;
  discountKind: DiscountKind;
  discountValue: number;
  conditions: PromotionConditions;
}

export interface PricingRequest {
  currencyCode: string;
  taxInclusive: boolean;
  lines: PricingLine[];
  promotions: PricingPromotion[];
  saleDiscountKind?: DiscountKind | undefined;
  saleDiscountValue?: number | undefined;
  couponCode?: string | undefined;
}

interface WorkingLine {
  input: PricingLine;
  base: number;
  manualDiscount: number;
  promotionDiscount: number;
  promotionId: string | null;
  promotionName: string | null;
  saleDiscountShare: number;
}

export function calculateSale(request: PricingRequest): SaleQuote {
  const warnings: string[] = [];
  const appliedPromotions: SaleQuote["appliedPromotions"] = [];

  const working: WorkingLine[] = request.lines.map((line) => {
    const quantity = roundQuantity(line.quantity);
    const base = roundMoney(quantity * line.unitPrice);
    const manualDiscount = discountAmount(base, line.discountKind, line.discountValue);
    return {
      input: { ...line, quantity },
      base,
      manualDiscount: Math.min(manualDiscount, base),
      promotionDiscount: 0,
      promotionId: null,
      promotionName: null,
      saleDiscountShare: 0,
    };
  });

  const usableCoupon = request.couponCode?.trim().toUpperCase() ?? "";
  const eligible = request.promotions.filter((promotion) => {
    const coupon = promotion.conditions.couponCode?.trim().toUpperCase();
    if (coupon && coupon !== usableCoupon) return false;
    return true;
  });

  applyLinePromotions(working, eligible, warnings, appliedPromotions);

  const afterLineDiscounts = working.map((line) =>
    roundMoney(line.base - line.manualDiscount - line.promotionDiscount),
  );
  const cartAmount = roundMoney(afterLineDiscounts.reduce((sum, value) => sum + value, 0));

  const manualSaleDiscount = discountAmount(
    cartAmount,
    request.saleDiscountKind,
    request.saleDiscountValue,
  );
  const salePromotion = bestSalePromotion(eligible, cartAmount, totalQuantity(working));
  const promotionSaleDiscount = salePromotion
    ? Math.min(
        discountAmount(cartAmount, salePromotion.discountKind, salePromotion.discountValue),
        cartAmount,
      )
    : 0;

  let saleDiscount = 0;
  if (manualSaleDiscount > 0 && promotionSaleDiscount > 0) {
    saleDiscount = Math.max(manualSaleDiscount, promotionSaleDiscount);
    warnings.push(
      manualSaleDiscount >= promotionSaleDiscount
        ? `The manual sale discount replaced promotion ${salePromotion?.code ?? ""}.`
        : `Promotion ${salePromotion?.code ?? ""} replaced the smaller manual sale discount.`,
    );
    if (promotionSaleDiscount > manualSaleDiscount && salePromotion) {
      appliedPromotions.push({
        id: salePromotion.id,
        code: salePromotion.code,
        name: salePromotion.name,
        amount: promotionSaleDiscount,
      });
    }
  } else if (promotionSaleDiscount > 0 && salePromotion) {
    saleDiscount = promotionSaleDiscount;
    appliedPromotions.push({
      id: salePromotion.id,
      code: salePromotion.code,
      name: salePromotion.name,
      amount: promotionSaleDiscount,
    });
  } else {
    saleDiscount = manualSaleDiscount;
  }
  saleDiscount = Math.min(saleDiscount, cartAmount);

  const shares = allocateProportionally(saleDiscount, afterLineDiscounts);
  working.forEach((line, index) => {
    line.saleDiscountShare = shares[index] ?? 0;
  });

  const lines: PricedLine[] = working.map((line, index) => {
    const gross = roundMoney(
      line.base - line.manualDiscount - line.promotionDiscount - line.saleDiscountShare,
    );
    const rate = line.input.taxRatePercent;
    const net = request.taxInclusive ? roundMoney(gross / (1 + rate)) : gross;
    const tax = request.taxInclusive ? roundMoney(gross - net) : roundMoney(net * rate);
    const grossBase = request.taxInclusive ? roundMoney(line.base / (1 + rate)) : line.base;
    const discountTotal = roundMoney(grossBase - net);

    return {
      lineNo: index + 1,
      itemId: line.input.itemId,
      variantId: line.input.variantId,
      unitId: line.input.unitId,
      unitCode: line.input.unitCode,
      code: line.input.code,
      description: line.input.description,
      quantity: line.input.quantity,
      unitPrice: line.input.unitPrice,
      discountKind: line.input.discountKind ?? null,
      discountValue: line.input.discountValue ?? 0,
      discountAmount: discountTotal,
      promotionId: line.promotionId,
      promotionName: line.promotionName,
      taxRateId: line.input.taxRateId,
      taxRatePercent: rate,
      taxAmount: tax,
      lineSubtotal: net,
      lineTotal: roundMoney(net + tax),
      costPrice: line.input.costPrice,
      stockTracked: line.input.stockTracked,
    };
  });

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineSubtotal + line.discountAmount, 0),
  );
  const discountTotal = roundMoney(lines.reduce((sum, line) => sum + line.discountAmount, 0));
  const taxTotal = roundMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
  const total = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));

  return {
    currencyCode: request.currencyCode,
    lines,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    appliedPromotions,
    warnings,
  };
}

function applyLinePromotions(
  working: WorkingLine[],
  promotions: PricingPromotion[],
  warnings: string[],
  applied: SaleQuote["appliedPromotions"],
): void {
  const linePromotions = promotions.filter(
    (promotion) =>
      promotion.conditions.scope === "ITEM" || promotion.conditions.scope === "CATEGORY",
  );
  if (!linePromotions.length) return;

  for (const line of working) {
    const candidates = linePromotions
      .filter((promotion) => matchesLine(promotion, line))
      .map((promotion) => ({ promotion, amount: linePromotionAmount(promotion, line) }))
      .filter((candidate) => candidate.amount > 0)
      .sort(
        (left, right) =>
          right.amount - left.amount ||
          left.promotion.conditions.priority - right.promotion.conditions.priority,
      );

    const best = candidates[0];
    if (!best) continue;

    if (line.manualDiscount > 0) {
      warnings.push(
        `Line ${line.input.code} keeps its manual discount, so promotion ${best.promotion.code} was not applied.`,
      );
      continue;
    }

    line.promotionDiscount = Math.min(best.amount, line.base);
    line.promotionId = best.promotion.id;
    line.promotionName = best.promotion.name;
    applied.push({
      id: best.promotion.id,
      code: best.promotion.code,
      name: best.promotion.name,
      amount: line.promotionDiscount,
    });

    if (candidates.length > 1) {
      warnings.push(
        `Line ${line.input.code} matched ${candidates.length} promotions. ${best.promotion.code} gave the best price.`,
      );
    }
  }
}

function matchesLine(promotion: PricingPromotion, line: WorkingLine): boolean {
  const conditions = promotion.conditions;
  if (conditions.scope === "ITEM" && !conditions.itemIds.includes(line.input.itemId)) return false;
  if (
    conditions.scope === "CATEGORY" &&
    (!line.input.categoryId || !conditions.categoryIds.includes(line.input.categoryId))
  ) {
    return false;
  }
  if (conditions.minimumQuantity > 0 && line.input.quantity < conditions.minimumQuantity) {
    return false;
  }
  if (conditions.minimumAmount > 0 && line.base < conditions.minimumAmount) return false;
  return true;
}

function linePromotionAmount(promotion: PricingPromotion, line: WorkingLine): number {
  const conditions = promotion.conditions;

  if (conditions.buyQuantity > 0 && conditions.getQuantity > 0) {
    const groupSize = conditions.buyQuantity + conditions.getQuantity;
    const freeUnits = Math.floor(line.input.quantity / groupSize) * conditions.getQuantity;
    if (freeUnits <= 0) return 0;
    const freeValue = roundMoney(freeUnits * line.input.unitPrice);
    if (promotion.discountKind === "PERCENTAGE") {
      return roundMoney((freeValue * promotion.discountValue) / 100);
    }
    return Math.min(freeValue, roundMoney(freeUnits * promotion.discountValue));
  }

  return discountAmount(line.base, promotion.discountKind, promotion.discountValue);
}

function bestSalePromotion(
  promotions: PricingPromotion[],
  cartAmount: number,
  quantity: number,
): PricingPromotion | undefined {
  return promotions
    .filter((promotion) => promotion.conditions.scope === "SALE")
    .filter((promotion) => cartAmount >= promotion.conditions.minimumAmount)
    .filter((promotion) => quantity >= promotion.conditions.minimumQuantity)
    .sort((left, right) => {
      const leftAmount = discountAmount(cartAmount, left.discountKind, left.discountValue);
      const rightAmount = discountAmount(cartAmount, right.discountKind, right.discountValue);
      return rightAmount - leftAmount || left.conditions.priority - right.conditions.priority;
    })[0];
}

function totalQuantity(working: WorkingLine[]): number {
  return roundQuantity(working.reduce((sum, line) => sum + line.input.quantity, 0));
}

export function discountAmount(
  base: number,
  kind: DiscountKind | undefined | null,
  value: number | undefined | null,
): number {
  if (!kind || !value || value <= 0 || base <= 0) return 0;
  const amount = kind === "PERCENTAGE" ? (base * value) / 100 : value;
  return roundMoney(Math.min(Math.max(amount, 0), base));
}

/**
 * CC-P2-009: the refundable value of part of a sold line, keeping the same discount and tax split
 * that the original sale used so a partial return can never refund more than was charged.
 */
export function refundForQuantity(
  line: { quantity: number; lineSubtotal: number; taxAmount: number },
  quantity: number,
): { net: number; tax: number; total: number } {
  if (line.quantity <= 0 || quantity <= 0) return { net: 0, tax: 0, total: 0 };
  const share = Math.min(quantity / line.quantity, 1);
  const net = roundMoney(line.lineSubtotal * share);
  const tax = roundMoney(line.taxAmount * share);
  return { net, tax, total: roundMoney(net + tax) };
}
