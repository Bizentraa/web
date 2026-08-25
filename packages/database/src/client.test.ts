import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "./client.js";

describe("database configuration", () => {
  it("fails early when the connection string is missing", () => {
    expect(() => createDatabaseClient("")).toThrow("DATABASE_URL is required");
  });
});
