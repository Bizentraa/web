"use client";

import {
  ACTIVE_THEME_CACHE_KEY,
  businessThemeCacheKey,
  businessThemeSettingsSchema,
  DEFAULT_BUSINESS_THEME,
  DEVELOPMENT_IDENTITY_CACHE_KEY,
  deviceThemeModeCacheKey,
  deviceThemeModeSchema,
  resolveTheme,
  THEME_CACHE_VERSION,
  themeTokensToCss,
  type BusinessThemeSettings,
  type DeviceThemeMode,
  type ResolvedThemeMode,
  type UpdateBusinessThemeInput,
} from "@bizentra/themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ThemeIdentity {
  businessId: string;
  userId: string;
}

type ThemeStatus = "idle" | "loading" | "ready" | "saving" | "cached" | "error";

interface ThemeContextValue {
  identity: ThemeIdentity | null;
  settings: BusinessThemeSettings;
  deviceMode: DeviceThemeMode;
  resolvedMode: ResolvedThemeMode;
  status: ThemeStatus;
  error: string | null;
  setDevelopmentIdentity: (identity: ThemeIdentity) => void;
  clearDevelopmentIdentity: () => void;
  setDeviceMode: (mode: DeviceThemeMode) => void;
  refreshTheme: () => Promise<void>;
  saveTheme: (input: UpdateBusinessThemeInput) => Promise<BusinessThemeSettings>;
}

interface BusinessThemeProviderProps {
  children: ReactNode;
  initialDevelopmentIdentity?: ThemeIdentity | null;
  loadTheme: (identity: ThemeIdentity) => Promise<BusinessThemeSettings>;
  updateTheme: (
    identity: ThemeIdentity,
    input: UpdateBusinessThemeInput,
  ) => Promise<BusinessThemeSettings>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function BusinessThemeProvider({
  children,
  initialDevelopmentIdentity = null,
  loadTheme,
  updateTheme,
}: BusinessThemeProviderProps) {
  const [identity, setIdentity] = useState<ThemeIdentity | null>(null);
  const [settings, setSettings] = useState<BusinessThemeSettings>(DEFAULT_BUSINESS_THEME);
  const [deviceMode, setDeviceModeState] = useState<DeviceThemeMode>("BUSINESS_DEFAULT");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [status, setStatus] = useState<ThemeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const resolved = useMemo(
    () => resolveTheme(settings, deviceMode, systemPrefersDark),
    [deviceMode, settings, systemPrefersDark],
  );

  const cacheAndUseTheme = useCallback((next: BusinessThemeSettings) => {
    setSettings(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(businessThemeCacheKey(next.businessId), JSON.stringify(next));
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    if (!identity) return;
    setStatus("loading");
    setError(null);
    try {
      const remote = await loadTheme(identity);
      cacheAndUseTheme(remote);
      setStatus("ready");
    } catch (cause) {
      setStatus(readCachedTheme(identity.businessId) ? "cached" : "error");
      setError(cause instanceof Error ? cause.message : "The Business theme could not be loaded.");
    }
  }, [cacheAndUseTheme, identity, loadTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemMode = () => setSystemPrefersDark(media.matches);
    updateSystemMode();
    media.addEventListener("change", updateSystemMode);
    return () => media.removeEventListener("change", updateSystemMode);
  }, []);

  useEffect(() => {
    const cachedIdentity = readCachedIdentity();
    const nextIdentity = cachedIdentity ?? initialDevelopmentIdentity;
    if (nextIdentity) {
      window.localStorage.setItem(DEVELOPMENT_IDENTITY_CACHE_KEY, JSON.stringify(nextIdentity));
      setIdentity(nextIdentity);
    }
  }, [initialDevelopmentIdentity]);

  useEffect(() => {
    if (!identity) return;

    const cachedTheme = readCachedTheme(identity.businessId);
    if (cachedTheme) {
      setSettings(cachedTheme);
      setStatus("cached");
    }
    const cachedMode = deviceThemeModeSchema.safeParse(
      window.localStorage.getItem(deviceThemeModeCacheKey(identity.businessId)),
    );
    setDeviceModeState(cachedMode.success ? cachedMode.data : "BUSINESS_DEFAULT");
    void refreshTheme();
  }, [identity, refreshTheme]);

  useEffect(() => {
    const cssTokens = themeTokensToCss(resolved.tokens);
    const root = document.documentElement;
    for (const [name, value] of Object.entries(cssTokens)) root.style.setProperty(name, value);
    root.dataset.colorMode = resolved.mode.toLowerCase();
    root.style.colorScheme = resolved.mode.toLowerCase();

    if (identity && settings.businessId === identity.businessId) {
      const cache = {
        version: THEME_CACHE_VERSION,
        businessId: identity.businessId,
        settings,
        mode: resolved.mode,
        tokens: cssTokens,
        cachedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(ACTIVE_THEME_CACHE_KEY, JSON.stringify(cache));
    }
  }, [identity, resolved, settings]);

  useEffect(() => {
    if (!identity) return;
    const synchronizeTabs = (event: StorageEvent) => {
      if (event.key !== businessThemeCacheKey(identity.businessId)) return;
      const synchronized = parseTheme(event.newValue);
      if (synchronized) setSettings(synchronized);
    };
    window.addEventListener("storage", synchronizeTabs);
    return () => window.removeEventListener("storage", synchronizeTabs);
  }, [identity]);

  const setDevelopmentIdentity = useCallback((next: ThemeIdentity) => {
    window.localStorage.setItem(DEVELOPMENT_IDENTITY_CACHE_KEY, JSON.stringify(next));
    setIdentity(next);
  }, []);

  const clearDevelopmentIdentity = useCallback(() => {
    window.localStorage.removeItem(DEVELOPMENT_IDENTITY_CACHE_KEY);
    window.localStorage.removeItem(ACTIVE_THEME_CACHE_KEY);
    setIdentity(null);
    setSettings(DEFAULT_BUSINESS_THEME);
    setDeviceModeState("BUSINESS_DEFAULT");
    setStatus("idle");
    setError(null);
  }, []);

  const setDeviceMode = useCallback(
    (mode: DeviceThemeMode) => {
      if (!identity || (!settings.allowUserModeChange && mode !== "BUSINESS_DEFAULT")) return;
      window.localStorage.setItem(deviceThemeModeCacheKey(identity.businessId), mode);
      setDeviceModeState(mode);
    },
    [identity, settings.allowUserModeChange],
  );

  const saveTheme = useCallback(
    async (input: UpdateBusinessThemeInput) => {
      if (!identity) throw new Error("Select a development Business identity first.");
      setStatus("saving");
      setError(null);
      try {
        const saved = await updateTheme(identity, input);
        cacheAndUseTheme(saved);
        setStatus("ready");
        return saved;
      } catch (cause) {
        setStatus("error");
        const message =
          cause instanceof Error ? cause.message : "The Business theme was not saved.";
        setError(message);
        throw cause;
      }
    },
    [cacheAndUseTheme, identity, updateTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      identity,
      settings,
      deviceMode,
      resolvedMode: resolved.mode,
      status,
      error,
      setDevelopmentIdentity,
      clearDevelopmentIdentity,
      setDeviceMode,
      refreshTheme,
      saveTheme,
    }),
    [
      clearDevelopmentIdentity,
      deviceMode,
      error,
      identity,
      refreshTheme,
      resolved.mode,
      saveTheme,
      setDevelopmentIdentity,
      setDeviceMode,
      settings,
      status,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useBusinessTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useBusinessTheme must be used inside BusinessThemeProvider.");
  return context;
}

function readCachedIdentity(): ThemeIdentity | null {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(DEVELOPMENT_IDENTITY_CACHE_KEY) ?? "null",
    ) as Partial<ThemeIdentity> | null;
    return value && typeof value.businessId === "string" && typeof value.userId === "string"
      ? { businessId: value.businessId, userId: value.userId }
      : null;
  } catch {
    return null;
  }
}

function readCachedTheme(businessId: string): BusinessThemeSettings | null {
  return parseTheme(window.localStorage.getItem(businessThemeCacheKey(businessId)));
}

function parseTheme(value: string | null): BusinessThemeSettings | null {
  try {
    const parsed = businessThemeSettingsSchema.safeParse(JSON.parse(value ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
