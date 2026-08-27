import { z } from "zod";

export const THEME_PRESET_CODES = [
  "GENERAL_RETAIL",
  "GROCERY",
  "FASHION",
  "ELECTRONICS",
  "HARDWARE",
  "BOOKSTORE",
  "COSMETICS",
  "FURNITURE",
  "JEWELRY",
  "AUTO_PARTS",
  "RESTAURANT",
  "CAFE",
  "BAKERY",
  "FOOD_TRUCK",
  "BAR",
  "HOTEL_REVENUE",
  "SALON",
  "GARAGE",
  "COMPUTER_REPAIR",
  "LAUNDRY",
  "TAILORING",
  "FIELD_SERVICES",
  "DISTRIBUTION",
  "VAN_SALES",
  "RENTAL",
  "B2B_TRADE",
  "PHARMACY",
  "FUEL",
  "HOTEL",
  "HEALTHCARE",
] as const;

export const THEME_MODE_CODES = ["LIGHT", "DARK", "SYSTEM"] as const;
export const DEVICE_THEME_MODE_CODES = ["BUSINESS_DEFAULT", ...THEME_MODE_CODES] as const;

export const themePresetSchema = z.enum(THEME_PRESET_CODES);
export const themeModeSchema = z.enum(THEME_MODE_CODES);
export const deviceThemeModeSchema = z.enum(DEVICE_THEME_MODE_CODES);
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hexadecimal colour such as #15803D.")
  .transform((value) => value.toUpperCase());

export type ThemePreset = z.infer<typeof themePresetSchema>;
export type ThemeMode = z.infer<typeof themeModeSchema>;
export type DeviceThemeMode = z.infer<typeof deviceThemeModeSchema>;
export type ResolvedThemeMode = "LIGHT" | "DARK";

export interface ThemePresetDefinition {
  code: ThemePreset;
  label: string;
  character: string;
  lightPrimary: string;
  darkPrimary: string;
  accent: string;
  defaultMode: ThemeMode;
}

export const THEME_PALETTE_NAMES: Record<ThemePreset, string> = {
  GENERAL_RETAIL: "Executive Blue",
  GROCERY: "Fresh Market Green",
  FASHION: "Boutique Violet",
  ELECTRONICS: "Digital Cyan",
  HARDWARE: "Industrial Orange",
  BOOKSTORE: "Library Indigo",
  COSMETICS: "Rose Luxe",
  FURNITURE: "Natural Amber",
  JEWELRY: "Violet Gold",
  AUTO_PARTS: "Graphite Orange",
  RESTAURANT: "Warm Dining",
  CAFE: "Coffee Amber",
  BAKERY: "Golden Crust",
  FOOD_TRUCK: "Street Orange",
  BAR: "Night Gold",
  HOTEL_REVENUE: "Hospitality Navy",
  SALON: "Magenta Luxe",
  GARAGE: "Workshop Graphite",
  COMPUTER_REPAIR: "Service Cyan",
  LAUNDRY: "Clean Sky",
  TAILORING: "Craft Violet",
  FIELD_SERVICES: "Mobile Blue Green",
  DISTRIBUTION: "Logistics Blue",
  VAN_SALES: "Route Blue Orange",
  RENTAL: "Asset Teal",
  B2B_TRADE: "Trade Navy Green",
  PHARMACY: "Clinical Emerald",
  FUEL: "Fast Blue Amber",
  HOTEL: "Premium Navy Gold",
  HEALTHCARE: "Calm Teal",
};

export function getThemePaletteName(code: ThemePreset): string {
  return THEME_PALETTE_NAMES[code];
}

export const THEME_PRESETS: readonly ThemePresetDefinition[] = [
  preset(
    "GENERAL_RETAIL",
    "General Retail",
    "Universal and dependable",
    "#2563EB",
    "#60A5FA",
    "#4F46E5",
    "LIGHT",
  ),
  preset(
    "GROCERY",
    "Grocery / Supermarket",
    "Fresh, natural and efficient",
    "#15803D",
    "#4ADE80",
    "#84CC16",
    "LIGHT",
  ),
  preset(
    "FASHION",
    "Fashion / Footwear",
    "Premium and expressive",
    "#7C3AED",
    "#A78BFA",
    "#DB2777",
    "LIGHT",
  ),
  preset(
    "ELECTRONICS",
    "Electronics / Mobile",
    "Technical and modern",
    "#0369A1",
    "#38BDF8",
    "#06B6D4",
    "SYSTEM",
  ),
  preset(
    "HARDWARE",
    "Hardware / Building Materials",
    "Industrial and strong",
    "#C2410C",
    "#FB923C",
    "#475569",
    "LIGHT",
  ),
  preset(
    "BOOKSTORE",
    "Bookstore / Stationery",
    "Knowledgeable and calm",
    "#4338CA",
    "#818CF8",
    "#B7791F",
    "LIGHT",
  ),
  preset(
    "COSMETICS",
    "Cosmetics / Beauty Retail",
    "Elegant and soft-premium",
    "#BE185D",
    "#F472B6",
    "#9333EA",
    "LIGHT",
  ),
  preset(
    "FURNITURE",
    "Furniture / Homeware",
    "Warm and natural",
    "#B45309",
    "#F59E0B",
    "#667C5B",
    "LIGHT",
  ),
  preset("JEWELRY", "Jewelry", "Luxury and premium", "#6D28D9", "#A78BFA", "#D4A72C", "LIGHT"),
  preset(
    "AUTO_PARTS",
    "Auto Parts",
    "Technical and automotive",
    "#334155",
    "#94A3B8",
    "#EA580C",
    "SYSTEM",
  ),
  preset(
    "RESTAURANT",
    "Restaurant",
    "Warm and appetising",
    "#B45309",
    "#FB923C",
    "#DC6B28",
    "SYSTEM",
  ),
  preset("CAFE", "Cafe / QSR", "Friendly and energetic", "#92400E", "#F59E0B", "#D97706", "SYSTEM"),
  preset("BAKERY", "Bakery", "Warm and handcrafted", "#A16207", "#FBBF24", "#BE5C72", "LIGHT"),
  preset(
    "FOOD_TRUCK",
    "Food Truck",
    "Energetic and mobile",
    "#EA580C",
    "#FB923C",
    "#0F766E",
    "SYSTEM",
  ),
  preset("BAR", "Bar / Pub", "Evening and premium", "#6B21A8", "#C084FC", "#D4A72C", "DARK"),
  preset(
    "HOTEL_REVENUE",
    "Hotel Revenue Centers",
    "Premium hospitality",
    "#1E3A8A",
    "#60A5FA",
    "#D4A72C",
    "SYSTEM",
  ),
  preset(
    "SALON",
    "Salon / Spa / Barber",
    "Elegant and personal",
    "#A21CAF",
    "#E879F9",
    "#DB2777",
    "LIGHT",
  ),
  preset(
    "GARAGE",
    "Garage / Auto Repair",
    "Industrial and technical",
    "#334155",
    "#94A3B8",
    "#F97316",
    "SYSTEM",
  ),
  preset(
    "COMPUTER_REPAIR",
    "Electronics / Computer Repair",
    "Technical and service-led",
    "#0E7490",
    "#67E8F9",
    "#2563EB",
    "SYSTEM",
  ),
  preset(
    "LAUNDRY",
    "Laundry / Dry Cleaning",
    "Clean and fresh",
    "#0284C7",
    "#7DD3FC",
    "#06B6D4",
    "LIGHT",
  ),
  preset(
    "TAILORING",
    "Tailoring / Alterations",
    "Crafted and premium",
    "#7E22CE",
    "#C084FC",
    "#BE185D",
    "LIGHT",
  ),
  preset(
    "FIELD_SERVICES",
    "Field / Home Services",
    "Professional and mobile",
    "#0369A1",
    "#38BDF8",
    "#0F766E",
    "LIGHT",
  ),
  preset(
    "DISTRIBUTION",
    "Wholesale / Distribution",
    "Corporate and logistical",
    "#1D4ED8",
    "#60A5FA",
    "#0891B2",
    "LIGHT",
  ),
  preset(
    "VAN_SALES",
    "Van Sales",
    "Mobile and operational",
    "#1D4ED8",
    "#60A5FA",
    "#F97316",
    "SYSTEM",
  ),
  preset(
    "RENTAL",
    "Rental / Hire",
    "Asset and availability focused",
    "#0F766E",
    "#5EEAD4",
    "#7C3AED",
    "LIGHT",
  ),
  preset(
    "B2B_TRADE",
    "B2B Trade Counter",
    "Professional and reliable",
    "#1E3A8A",
    "#60A5FA",
    "#15803D",
    "LIGHT",
  ),
  preset(
    "PHARMACY",
    "Pharmacy",
    "Clinical and restrained",
    "#047857",
    "#34D399",
    "#0891B2",
    "LIGHT",
  ),
  preset(
    "FUEL",
    "Fuel / Convenience",
    "Fast and operational",
    "#075985",
    "#38BDF8",
    "#F59E0B",
    "SYSTEM",
  ),
  preset(
    "HOTEL",
    "Hotel / PMS",
    "Premium and corporate",
    "#1E3A8A",
    "#60A5FA",
    "#B7791F",
    "SYSTEM",
  ),
  preset(
    "HEALTHCARE",
    "Clinic / Healthcare Billing",
    "Calm, clinical and trusted",
    "#0F766E",
    "#5EEAD4",
    "#2563EB",
    "LIGHT",
  ),
] as const;

export const updateBusinessThemeSchema = z
  .object({
    preset: themePresetSchema,
    defaultMode: themeModeSchema,
    allowUserModeChange: z.boolean(),
    brandPrimary: hexColorSchema.nullable(),
    brandAccent: hexColorSchema.nullable(),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

export type UpdateBusinessThemeInput = z.input<typeof updateBusinessThemeSchema>;

export interface BusinessThemeSettings {
  businessId: string;
  preset: ThemePreset;
  defaultMode: ThemeMode;
  allowUserModeChange: boolean;
  brandPrimary: string | null;
  brandAccent: string | null;
  revision: number;
  updatedAt: string;
}

export const businessThemeSettingsSchema = z.object({
  businessId: z.uuid(),
  preset: themePresetSchema,
  defaultMode: themeModeSchema,
  allowUserModeChange: z.boolean(),
  brandPrimary: hexColorSchema.nullable(),
  brandAccent: hexColorSchema.nullable(),
  revision: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  inputBackground: string;
  hoverBackground: string;
  disabledBackground: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryForeground: string;
  accent: string;
  accentSoft: string;
  accentForeground: string;
  success: string;
  warning: string;
  danger: string;
  information: string;
  pending: string;
  focus: string;
  selection: string;
}

export const DEFAULT_BUSINESS_THEME: BusinessThemeSettings = {
  businessId: "platform",
  preset: "GENERAL_RETAIL",
  defaultMode: "LIGHT",
  allowUserModeChange: true,
  brandPrimary: null,
  brandAccent: null,
  revision: 1,
  updatedAt: "1970-01-01T00:00:00.000Z",
};

/*
 * Bumped when the token values themselves change. The boot script paints from the cached tokens
 * before React runs, so without this a returning device would flash the previous border colours
 * for a frame before the provider recomputed them.
 */
export const THEME_CACHE_VERSION = 2;
export const ACTIVE_THEME_CACHE_KEY = "bizentra.theme.active.v1";
export const DEVELOPMENT_IDENTITY_CACHE_KEY = "bizentra.development.identity.v1";
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem('${ACTIVE_THEME_CACHE_KEY}')||'null');if(!c||c.version!==${THEME_CACHE_VERSION}||!c.tokens)return;var r=document.documentElement;Object.keys(c.tokens).forEach(function(k){var v=c.tokens[k];if(k.indexOf('--color-')===0&&typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v))r.style.setProperty(k,v)});if(c.mode==='LIGHT'||c.mode==='DARK'){r.dataset.colorMode=c.mode.toLowerCase();r.style.colorScheme=c.mode.toLowerCase()}}catch(e){}})();`;

export function businessThemeCacheKey(businessId: string): string {
  return `bizentra.theme.business.${businessId}.v1`;
}

export function deviceThemeModeCacheKey(businessId: string): string {
  return `bizentra.theme.device-mode.${businessId}.v1`;
}

export function getThemePreset(code: ThemePreset): ThemePresetDefinition {
  return THEME_PRESETS.find((candidate) => candidate.code === code) ?? THEME_PRESETS[0]!;
}

export function resolveTheme(
  settings: BusinessThemeSettings,
  deviceMode: DeviceThemeMode = "BUSINESS_DEFAULT",
  systemPrefersDark = false,
): { mode: ResolvedThemeMode; tokens: ThemeTokens } {
  const requestedMode =
    settings.allowUserModeChange && deviceMode !== "BUSINESS_DEFAULT"
      ? deviceMode
      : settings.defaultMode;
  const mode: ResolvedThemeMode =
    requestedMode === "SYSTEM" ? (systemPrefersDark ? "DARK" : "LIGHT") : requestedMode;
  const presetDefinition = getThemePreset(settings.preset);
  const neutral = mode === "DARK" ? DARK_NEUTRAL : LIGHT_NEUTRAL;
  const primary =
    settings.brandPrimary ??
    (mode === "DARK" ? presetDefinition.darkPrimary : presetDefinition.lightPrimary);
  const accent = settings.brandAccent ?? presetDefinition.accent;
  const mixTarget = mode === "DARK" ? "#FFFFFF" : "#000000";

  return {
    mode,
    tokens: {
      ...neutral,
      primary,
      primaryHover: mixHex(primary, mixTarget, mode === "DARK" ? 0.18 : 0.14),
      primarySoft: mixHex(primary, neutral.background, 0.84),
      primaryForeground: readableForeground(primary),
      accent,
      accentSoft: mixHex(accent, neutral.background, 0.84),
      accentForeground: readableForeground(accent),
      success: mode === "DARK" ? "#4ADE80" : "#15803D",
      warning: mode === "DARK" ? "#FBBF24" : "#B45309",
      danger: mode === "DARK" ? "#F87171" : "#DC2626",
      information: mode === "DARK" ? "#60A5FA" : "#2563EB",
      pending: mode === "DARK" ? "#A78BFA" : "#7C3AED",
      focus: primary,
      selection: mixHex(primary, neutral.background, 0.84),
    },
  };
}

export function themeTokensToCss(tokens: ThemeTokens): Record<string, string> {
  return {
    "--color-background": tokens.background,
    "--color-surface": tokens.surface,
    "--color-surface-secondary": tokens.surfaceSecondary,
    "--color-surface-elevated": tokens.surfaceElevated,
    "--color-text-primary": tokens.textPrimary,
    "--color-text-secondary": tokens.textSecondary,
    "--color-text-muted": tokens.textMuted,
    "--color-border": tokens.border,
    "--color-border-strong": tokens.borderStrong,
    "--color-input-background": tokens.inputBackground,
    "--color-hover-background": tokens.hoverBackground,
    "--color-disabled-background": tokens.disabledBackground,
    "--color-primary": tokens.primary,
    "--color-primary-hover": tokens.primaryHover,
    "--color-primary-soft": tokens.primarySoft,
    "--color-primary-foreground": tokens.primaryForeground,
    "--color-accent": tokens.accent,
    "--color-accent-soft": tokens.accentSoft,
    "--color-accent-foreground": tokens.accentForeground,
    "--color-success": tokens.success,
    "--color-warning": tokens.warning,
    "--color-danger": tokens.danger,
    "--color-information": tokens.information,
    "--color-pending": tokens.pending,
    "--color-focus": tokens.focus,
    "--color-selection": tokens.selection,
  };
}

function preset(
  code: ThemePreset,
  label: string,
  character: string,
  lightPrimary: string,
  darkPrimary: string,
  accent: string,
  defaultMode: ThemeMode,
): ThemePresetDefinition {
  return { code, label, character, lightPrimary, darkPrimary, accent, defaultMode };
}

const LIGHT_NEUTRAL = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  surfaceElevated: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  inputBackground: "#FFFFFF",
  hoverBackground: "#F1F5F9",
  disabledBackground: "#E2E8F0",
} as const;

const DARK_NEUTRAL = {
  background: "#0B1220",
  surface: "#111827",
  surfaceSecondary: "#1F2937",
  surfaceElevated: "#182235",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  /*
   * Dark borders were louder than light ones, not equivalent: #334155 on the #111827 surface is
   * 1.71:1, where light's #E2E8F0 on #FFFFFF is 1.23:1. Every card, table and input therefore read
   * as outlined in dark and merely separated in light. These sit at 1.38:1 and 1.71:1 - softer
   * than before, still above the point where a dark border stops being perceptible at all.
   */
  border: "#26324A",
  borderStrong: "#334155",
  inputBackground: "#111827",
  hoverBackground: "#1E293B",
  disabledBackground: "#334155",
} as const;

function readableForeground(background: string): string {
  const [red, green, blue] = hexToRgb(background).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  return luminance > 0.36 ? "#0F172A" : "#FFFFFF";
}

function mixHex(first: string, second: string, secondWeight: number): string {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);
  const channels = firstRgb.map((channel, index) =>
    Math.round(channel * (1 - secondWeight) + secondRgb[index]! * secondWeight),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}
