import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import type { ThemeIdentity } from "@bizentra/design-system/theme";
import { THEME_BOOTSTRAP_SCRIPT } from "@bizentra/themes";

import { AppThemeProvider } from "./app-theme-provider";
import { GlobalCommandPalette } from "./global-command-palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bizentra Back Office",
  description: "Business setup and management",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialDevelopmentIdentity = readInitialDevelopmentIdentity();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="bizentra-theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
      </head>
      <body>
        <AppThemeProvider
          apiBaseUrl={apiBaseUrl}
          initialDevelopmentIdentity={initialDevelopmentIdentity}
        >
          {children}
          <GlobalCommandPalette />
        </AppThemeProvider>
      </body>
    </html>
  );
}

function readInitialDevelopmentIdentity(): ThemeIdentity | null {
  if (process.env.AUTH_MODE !== "development") return null;
  const businessId = process.env.DEVELOPMENT_BUSINESS_ID;
  const userId = process.env.DEVELOPMENT_USER_ID;
  return businessId && userId ? { businessId, userId } : null;
}
