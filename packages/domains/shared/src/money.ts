/**
 * Money and quantity helpers.
 *
 * Every stored amount is a PostgreSQL decimal. Application code works with numbers that are
 * rounded to a fixed scale so totals stay reconcilable between POS, receipts and reports.
 */
const MONEY_SCALE = 2;
const QUANTITY_SCALE = 4;
const RATE_SCALE = 6;

function roundTo(value: number, scale: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function roundMoney(value: number): number {
  return roundTo(value, MONEY_SCALE);
}

export function roundQuantity(value: number): number {
  return roundTo(value, QUANTITY_SCALE);
}

export function roundRate(value: number): number {
  return roundTo(value, RATE_SCALE);
}

/** Prisma decimal columns accept strings; this keeps the stored scale predictable. */
export function moneyToDb(value: number): string {
  return roundMoney(value).toFixed(4);
}

export function quantityToDb(value: number): string {
  return roundQuantity(value).toFixed(4);
}

export function rateToDb(value: number): string {
  return roundRate(value).toFixed(6);
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return safeNumber(value);
  if (typeof value === "object" && "toString" in value) {
    return safeNumber((value as { toString: () => string }).toString());
  }
  return 0;
}

function safeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

/** Distributes an amount across weights without losing or inventing cents. */
export function allocateProportionally(amount: number, weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => 0);

  const allocations = weights.map((weight) => roundMoney((amount * weight) / total));
  const difference = roundMoney(amount - allocations.reduce((sum, value) => sum + value, 0));
  if (difference !== 0) {
    let largestIndex = 0;
    for (let index = 1; index < weights.length; index += 1) {
      if ((weights[index] ?? 0) > (weights[largestIndex] ?? 0)) largestIndex = index;
    }
    allocations[largestIndex] = roundMoney((allocations[largestIndex] ?? 0) + difference);
  }
  return allocations;
}
