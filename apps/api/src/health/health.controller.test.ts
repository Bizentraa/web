import { describe, expect, it, vi } from "vitest";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("reports the process as live without touching infrastructure", () => {
    const database = { $queryRaw: vi.fn() };
    const response = new HealthController(database as never).live();
    expect(response.status).toBe("ok");
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });
});
