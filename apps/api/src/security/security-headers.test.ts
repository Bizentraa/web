import { describe, expect, it } from "vitest";

import { securityHeaderPolicy } from "./security-headers.js";

describe("securityHeaderPolicy", () => {
  it("enforces the API baseline transport and browser security headers", () => {
    expect(securityHeaderPolicy.strictTransportSecurity).toEqual({
      maxAge: 15552000,
      includeSubDomains: true,
    });
    expect(securityHeaderPolicy.frameguard).toEqual({ action: "deny" });
    expect(securityHeaderPolicy.noSniff).toBe(true);
    expect(securityHeaderPolicy.referrerPolicy).toEqual({ policy: "no-referrer" });
    expect(securityHeaderPolicy.contentSecurityPolicy.directives["frame-ancestors"]).toEqual([
      "'none'",
    ]);
  });
});
