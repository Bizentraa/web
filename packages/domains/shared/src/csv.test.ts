import { describe, expect, it } from "vitest";

import { parseDelimited, requiredColumns } from "./csv.js";

describe("delimited import reader", () => {
  it("reads a simple CSV file", () => {
    const file = parseDelimited("code,name,price\nMILK,Fresh Milk,450\nRICE,White Rice,1200\n");
    expect(file.columns).toEqual(["code", "name", "price"]);
    expect(file.rows).toHaveLength(2);
    expect(file.rows[0]).toEqual({ code: "MILK", name: "Fresh Milk", price: "450" });
  });

  it("keeps commas and quotes inside quoted values", () => {
    const file = parseDelimited('code,name\nA,"Rice, 5kg"\nB,"He said ""hello"""\n');
    expect(file.rows[0]?.name).toBe("Rice, 5kg");
    expect(file.rows[1]?.name).toBe('He said "hello"');
  });

  it("supports CRLF files and skips blank rows", () => {
    const file = parseDelimited("code,name\r\nA,First\r\n\r\nB,Second\r\n");
    expect(file.rows).toHaveLength(2);
    expect(file.rows[1]?.code).toBe("B");
  });

  it("supports tab separated files", () => {
    const file = parseDelimited("code\tname\nA\tFirst\n", "\t");
    expect(file.rows[0]).toEqual({ code: "A", name: "First" });
  });

  it("reports missing required columns", () => {
    const file = parseDelimited("code,name\nA,First\n");
    expect(requiredColumns(file, ["code", "name", "unit"])).toEqual(["unit"]);
    expect(requiredColumns(file, ["CODE"])).toEqual([]);
  });

  it("returns an empty result for an empty file", () => {
    expect(parseDelimited("")).toEqual({ columns: [], rows: [] });
  });
});
