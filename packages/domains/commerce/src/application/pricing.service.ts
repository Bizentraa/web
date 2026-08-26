import type {
  CatalogSearchQuery,
  PosCatalogEntry,
  PromotionConditions,
  SaleCartInput,
  SaleQuote,
} from "@bizentra/contracts";
import {
  type DatabaseClient,
  type DatabaseTransaction,
  withBusinessContext,
} from "@bizentra/database";
import {
  BusinessAccessError,
  type MembershipContext,
  requirePermission,
  toNumber,
  toOptionalNumber,
} from "@bizentra/domain-shared";

import { calculateSale, type PricingLine, type PricingPromotion } from "../domain/pricing.js";

const DEFAULT_CONDITIONS: PromotionConditions = {
  scope: "SALE",
  itemIds: [],
  categoryIds: [],
  minimumQuantity: 0,
  minimumAmount: 0,
  buyQuantity: 0,
  getQuantity: 0,
  priority: 50,
};

export interface ResolvedCart {
  quote: SaleQuote;
  branchId: string;
  branchCode: string;
  currencyCode: string;
  priceListId: string;
  customerId: string | null;
}

/**
 * CC-P1-006 to CC-P1-008 resolution for a live cart.
 *
 * The service loads the Business master data a cart needs, hands it to the pure pricing engine and
 * returns a quote. Nothing is written here, so the POS can call it on every keystroke.
 */
export class PricingService {
  constructor(private readonly database: DatabaseClient) {}

  async quote(
    businessId: string,
    actorUserId: string,
    input: SaleCartInput,
  ): Promise<ResolvedCart> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      const actor = await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");
      return this.resolveCart(transaction, businessId, actor, input);
    });
  }

  async searchSellableItems(
    businessId: string,
    actorUserId: string,
    query: CatalogSearchQuery,
  ): Promise<PosCatalogEntry[]> {
    return withBusinessContext(this.database, businessId, async (transaction) => {
      await requirePermission(transaction, businessId, actorUserId, "CATALOG_VIEW");

      const term = query.term.trim();
      const items = await transaction.item.findMany({
        where: {
          businessId,
          status: "ACTIVE",
          sellable: true,
          ...(term
            ? {
                OR: [
                  { name: { contains: term, mode: "insensitive" as const } },
                  { code: { contains: term, mode: "insensitive" as const } },
                  { identifiers: { some: { value: { contains: term } } } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        take: query.limit,
        include: {
          baseUnit: true,
          identifiers: true,
          taxCategory: { include: { rates: true } },
          prices: { include: { priceList: true } },
        },
      });

      const priceListId = await this.resolvePriceListId(transaction, businessId, {
        priceListId: query.priceListId,
        customerId: query.customerId,
      });
      const now = new Date();

      return items.map((item) => {
        const price = pickPrice(item.prices, {
          priceListId,
          branchId: query.branchId ?? null,
          variantId: null,
          quantity: 1,
          at: now,
        });
        const rate = pickTaxRate(item.taxCategory?.rates ?? [], now);
        return {
          itemId: item.id,
          variantId: null,
          code: item.code,
          name: item.name,
          unitCode: item.baseUnit.code,
          kind: item.kind,
          unitPrice: price ? toNumber(price.unitPrice) : 0,
          taxRatePercent: rate ? toNumber(rate.rate) : 0,
          stockTracked: item.stockTracked,
          identifiers: item.identifiers.map((identifier) => identifier.value),
        };
      });
    });
  }

  /** Shared by the POS quote endpoint and by sale posting so both use the same numbers. */
  async resolveCart(
    transaction: DatabaseTransaction,
    businessId: string,
    actor: MembershipContext,
    input: SaleCartInput,
  ): Promise<ResolvedCart> {
    const business = await transaction.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { defaultCurrency: true },
    });
    const branch = await transaction.branch.findFirst({
      where: { id: input.branchId, businessId },
    });
    if (!branch) throw new BusinessAccessError("NOT_FOUND", "Branch was not found.");
    if (branch.status !== "ACTIVE") {
      throw new BusinessAccessError("CONFLICT", "This Branch is not active.");
    }

    const priceListId = await this.resolvePriceListId(transaction, businessId, {
      priceListId: input.priceListId,
      customerId: input.customerId,
    });
    const priceList = await transaction.priceList.findFirstOrThrow({
      where: { id: priceListId, businessId },
    });
    if (priceList.currencyCode !== business.defaultCurrency) {
      throw new BusinessAccessError(
        "CONFLICT",
        `Price list ${priceList.name} uses ${priceList.currencyCode} but this Business sells in ${business.defaultCurrency}.`,
      );
    }

    const at = input.at ? new Date(input.at) : new Date();
    const lines: PricingLine[] = [];

    for (const requested of input.lines) {
      const item = await this.findItem(transaction, businessId, requested);
      const variant = requested.variantId
        ? await transaction.itemVariant.findFirst({
            where: { id: requested.variantId, businessId, itemId: item.id },
          })
        : null;
      if (requested.variantId && !variant) {
        throw new BusinessAccessError("NOT_FOUND", "Item variant was not found.");
      }
      if (!item.sellable || item.status !== "ACTIVE") {
        throw new BusinessAccessError(
          "CONFLICT",
          `${item.name} is not available for selling. Activate it in the catalog first.`,
        );
      }

      const price = pickPrice(item.prices, {
        priceListId,
        branchId: input.branchId,
        variantId: variant?.id ?? null,
        quantity: requested.quantity,
        at,
      });

      let unitPrice = price ? toNumber(price.unitPrice) : null;
      if (requested.unitPriceOverride !== undefined) {
        actor.require("PRICE_MANAGE");
        unitPrice = requested.unitPriceOverride;
      }
      if (unitPrice === null) {
        throw new BusinessAccessError(
          "CONFLICT",
          `${item.name} has no price in ${priceList.name}. Add a price before selling it.`,
        );
      }

      const taxRate = pickTaxRate(item.taxCategory?.rates ?? [], at);

      lines.push({
        itemId: item.id,
        variantId: variant?.id ?? null,
        code: item.code,
        description: variant ? `${item.name} - ${variant.name}` : item.name,
        categoryId: item.categoryId,
        unitId: item.baseUnitId,
        unitCode: item.baseUnit.code,
        quantity: requested.quantity,
        unitPrice,
        costPrice: price ? toOptionalNumber(price.costPrice) : null,
        taxRateId: taxRate?.id ?? null,
        taxRatePercent: taxRate ? toNumber(taxRate.rate) : 0,
        stockTracked: item.stockTracked,
        ...(requested.discountKind ? { discountKind: requested.discountKind } : {}),
        ...(requested.discountValue === undefined
          ? {}
          : { discountValue: requested.discountValue }),
      });
    }

    if (input.saleDiscountValue !== undefined && input.saleDiscountValue > 0) {
      actor.requireAny(["PRICE_MANAGE", "DISCOUNT_APPROVE", "SALE_CREATE"]);
    }

    const promotions = await this.loadPromotions(transaction, businessId, at);

    const quote = calculateSale({
      currencyCode: priceList.currencyCode,
      taxInclusive: priceList.taxInclusive,
      lines,
      promotions,
      ...(input.saleDiscountKind ? { saleDiscountKind: input.saleDiscountKind } : {}),
      ...(input.saleDiscountValue === undefined
        ? {}
        : { saleDiscountValue: input.saleDiscountValue }),
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    });

    return {
      quote,
      branchId: branch.id,
      branchCode: branch.code,
      currencyCode: priceList.currencyCode,
      priceListId,
      customerId: input.customerId ?? null,
    };
  }

  private async findItem(
    transaction: DatabaseTransaction,
    businessId: string,
    requested: { itemId?: string | undefined; identifier?: string | undefined },
  ) {
    const include = {
      baseUnit: true,
      taxCategory: { include: { rates: true } },
      prices: { include: { priceList: true } },
    } as const;

    if (requested.itemId) {
      const item = await transaction.item.findFirst({
        where: { id: requested.itemId, businessId },
        include,
      });
      if (!item) throw new BusinessAccessError("NOT_FOUND", "Item was not found.");
      return item;
    }

    if (requested.identifier) {
      const identifier = await transaction.itemIdentifier.findFirst({
        where: { businessId, value: requested.identifier },
      });
      if (!identifier) {
        throw new BusinessAccessError(
          "NOT_FOUND",
          `No item uses the code ${requested.identifier}. Check the barcode or search by name.`,
        );
      }
      const item = await transaction.item.findFirst({
        where: { id: identifier.itemId, businessId },
        include,
      });
      if (!item) throw new BusinessAccessError("NOT_FOUND", "Item was not found.");
      return item;
    }

    throw new BusinessAccessError(
      "INVALID_INPUT",
      "Every cart line needs an item or a scanned code.",
    );
  }

  private async resolvePriceListId(
    transaction: DatabaseTransaction,
    businessId: string,
    input: { priceListId?: string | undefined; customerId?: string | undefined },
  ): Promise<string> {
    if (input.priceListId) {
      const explicit = await transaction.priceList.findFirst({
        where: { id: input.priceListId, businessId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!explicit) throw new BusinessAccessError("NOT_FOUND", "Price list was not found.");
      return explicit.id;
    }

    if (input.customerId) {
      const customer = await transaction.customer.findFirst({
        where: { id: input.customerId, businessId },
        include: { group: { include: { priceList: true } } },
      });
      if (!customer) throw new BusinessAccessError("NOT_FOUND", "Customer was not found.");
      const groupPriceList = customer.group?.priceList;
      if (groupPriceList && groupPriceList.status === "ACTIVE") return groupPriceList.id;
    }

    const fallback = await transaction.priceList.findFirst({
      where: { businessId, isDefault: true, status: "ACTIVE" },
      select: { id: true },
    });
    if (!fallback) {
      throw new BusinessAccessError(
        "NOT_FOUND",
        "This Business has no default price list yet. Run the catalog setup first.",
      );
    }
    return fallback.id;
  }

  private async loadPromotions(
    transaction: DatabaseTransaction,
    businessId: string,
    at: Date,
  ): Promise<PricingPromotion[]> {
    const promotions = await transaction.promotion.findMany({
      where: {
        businessId,
        status: "ACTIVE",
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gte: at } }],
      },
    });

    return promotions.map((promotion) => ({
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      discountKind: promotion.discountKind,
      discountValue: toNumber(promotion.discountValue),
      conditions: {
        ...DEFAULT_CONDITIONS,
        ...((promotion.conditions as Partial<PromotionConditions> | null) ?? {}),
      },
    }));
  }
}

interface PriceCandidate {
  priceListId: string;
  branchId: string | null;
  variantId: string | null;
  minQuantity: unknown;
  unitPrice: unknown;
  costPrice: unknown;
  validFrom: Date;
  validTo: Date | null;
}

/**
 * CC-P1-006: branch price beats a Business-wide price, a variant price beats an item price and the
 * highest quantity break that the cart qualifies for wins.
 */
export function pickPrice<T extends PriceCandidate>(
  prices: T[],
  context: {
    priceListId: string;
    branchId: string | null;
    variantId: string | null;
    quantity: number;
    at: Date;
  },
): T | undefined {
  return prices
    .filter((price) => price.priceListId === context.priceListId)
    .filter((price) => price.branchId === null || price.branchId === context.branchId)
    .filter((price) => price.variantId === null || price.variantId === context.variantId)
    .filter((price) => price.validFrom <= context.at)
    .filter((price) => !price.validTo || price.validTo >= context.at)
    .filter((price) => toNumber(price.minQuantity) <= context.quantity)
    .sort((left, right) => {
      const branchScore = Number(right.branchId !== null) - Number(left.branchId !== null);
      if (branchScore !== 0) return branchScore;
      const variantScore = Number(right.variantId !== null) - Number(left.variantId !== null);
      if (variantScore !== 0) return variantScore;
      const quantityScore = toNumber(right.minQuantity) - toNumber(left.minQuantity);
      if (quantityScore !== 0) return quantityScore;
      return right.validFrom.getTime() - left.validFrom.getTime();
    })[0];
}

interface TaxRateCandidate {
  id: string;
  rate: unknown;
  kind: "SALES" | "PURCHASE" | "BOTH";
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: "ACTIVE" | "INACTIVE";
}

/** CC-P1-008: the sales tax rate that is in force on the sale date. */
export function pickTaxRate<T extends TaxRateCandidate>(rates: T[], at: Date): T | undefined {
  return rates
    .filter((rate) => rate.status === "ACTIVE")
    .filter((rate) => rate.kind === "SALES" || rate.kind === "BOTH")
    .filter((rate) => rate.effectiveFrom <= at)
    .filter((rate) => !rate.effectiveTo || rate.effectiveTo >= at)
    .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0];
}
