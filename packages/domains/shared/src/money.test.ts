import { describe, expect, it } from "vitest";

import { allocateProportionally, roundMoney, moneyToDb, toNumber } from "./money.js";

describe("money helpers", () => {
  it("rounds to two decimals without floating point drift", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(19.999)).toBe(20);
  });

  it("stores four decimal places for the database", () => {
    expect(moneyToDb(12.5)).toBe("12.5000");
    expect(moneyToDb(0.125)).toBe("0.1300");
  });

  it("reads decimal-like values safely", () => {
    expect(toNumber("12.34")).toBe(12.34);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("allocates an amount without losing or inventing money", () => {
    const allocations = allocateProportionally(10, [1, 1, 1]);
    expect(allocations.reduce((sum, value) => sum + value, 0)).toBe(10);
  });

  it("returns zero allocations when there is nothing to weigh", () => {
    expect(allocateProportionally(10, [0, 0])).toEqual([0, 0]);
  });
});
