import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUSINESS_THEME,
  THEME_PRESETS,
  resolveTheme,
  updateBusinessThemeSchema,
} from "./index.js";

describe("business themes", () => {
  it("provides one unique definition for every supported preset", () => {
    const codes = THEME_PRESETS.map(({ code }) => code);
    expect(codes).toHaveLength(30);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("keeps semantic danger independent from the business preset", () => {
    const grocery = resolveTheme({ ...DEFAULT_BUSINESS_THEME, preset: "GROCERY" });
    const restaurant = resolveTheme({ ...DEFAULT_BUSINESS_THEME, preset: "RESTAURANT" });
    expect(grocery.tokens.danger).toBe("#DC2626");
    expect(restaurant.tokens.danger).toBe("#DC2626");
  });

  it("uses an allowed per-device mode without changing the saved business default", () => {
    const theme = resolveTheme(
      { ...DEFAULT_BUSINESS_THEME, preset: "BAR", defaultMode: "DARK" },
      "LIGHT",
    );
    expect(theme.mode).toBe("LIGHT");
    expect(theme.tokens.primary).toBe("#6B21A8");
  });

  it("normalizes valid brand overrides and rejects non-hex values", () => {
    const valid = updateBusinessThemeSchema.parse({
      preset: "GROCERY",
      defaultMode: "LIGHT",
      allowUserModeChange: true,
      brandPrimary: "#137f3d",
      brandAccent: null,
      expectedRevision: 1,
    });
    expect(valid.brandPrimary).toBe("#137F3D");
    expect(() => updateBusinessThemeSchema.parse({ ...valid, brandPrimary: "green" })).toThrow();
  });
});
