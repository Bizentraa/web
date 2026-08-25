import { describe, expect, it } from "vitest";

import { createId, requireId } from "./index.js";

describe("identifier helpers", () => {
  it("creates and validates UUID identifiers", () => {
    const id = createId();
    expect(requireId(id)).toBe(id);
  });

  it("rejects ambiguous identifiers", () => {
    expect(() => requireId("business-1", "Business ID")).toThrow("Business ID must be a UUID");
  });
});
