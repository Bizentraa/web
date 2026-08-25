"use client";

import { createApiClient } from "@bizentra/api-client";
import { BusinessThemeProvider, type ThemeIdentity } from "@bizentra/design-system/theme";
import type { ReactNode } from "react";
import { useCallback } from "react";

export function AppThemeProvider({
  children,
  apiBaseUrl,
  initialDevelopmentIdentity,
}: {
  children: ReactNode;
  apiBaseUrl: string;
  initialDevelopmentIdentity: ThemeIdentity | null;
}) {
  const loadTheme = useCallback(
    (identity: ThemeIdentity) =>
      createApiClient(apiBaseUrl, identity).getBusinessTheme(identity.businessId),
    [apiBaseUrl],
  );
  const updateTheme = useCallback(
    (
      identity: ThemeIdentity,
      input: Parameters<ReturnType<typeof createApiClient>["updateBusinessTheme"]>[1],
    ) => createApiClient(apiBaseUrl, identity).updateBusinessTheme(identity.businessId, input),
    [apiBaseUrl],
  );

  return (
    <BusinessThemeProvider
      initialDevelopmentIdentity={initialDevelopmentIdentity}
      loadTheme={loadTheme}
      updateTheme={updateTheme}
    >
      {children}
    </BusinessThemeProvider>
  );
}
