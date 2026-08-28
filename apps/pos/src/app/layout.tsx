import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import type { ThemeIdentity } from "@bizentra/design-system/theme";
import { THEME_BOOTSTRAP_SCRIPT } from "@bizentra/themes";

import { ToastProvider } from "@bizentra/design-system/client";

import { AppThemeProvider } from "./app-theme-provider";
import { PosWorkspaceProvider } from "./lib/pos-workspace";
import "./globals.css";

/*
 * The stylesheet has always asked for Inter, but nothing ever loaded it, so every Windows client
 * silently fell back to Segoe UI. The heading tracking (-0.02em) and kicker tracking (0.08em) are
 * tuned to Inter's metrics and read as stretched and loose in a fallback face, which is why the
 * type looked slightly wrong everywhere rather than in one place.
 *
 * next/font self-hosts both faces at build time: no runtime request to Google, no layout shift.
 */
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/* Identifiers, codes and register numbers, where 0/O and 1/l have to be told apart at a glance. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Bizentra POS",
  description: "Fast, reliable selling with shifts, tenders, receipts and returns",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialDevelopmentIdentity = readInitialDevelopmentIdentity();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  return (
    <html className={`${sans.variable} ${mono.variable}`} lang="en" suppressHydrationWarning>
      <head>
        {/*
          A raw inline script, not next/script. `beforeInteractive` is hoisted into the framework
          bootstrap and runs after the first paint, so the saved Business theme was applied one
          frame late and every reload flashed the default light palette first. An inline script in
          <head> is executed synchronously while the document is being parsed, before anything is
          painted.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
          id="bizentra-theme-bootstrap"
        />
      </head>
      {/* Extensions such as Grammarly stamp attributes onto <body> before React
          hydrates, which React reports as a mismatch it cannot patch. */}
      <body suppressHydrationWarning>
        <AppThemeProvider
          apiBaseUrl={apiBaseUrl}
          initialDevelopmentIdentity={initialDevelopmentIdentity}
        >
          <ToastProvider>
            {/*
              The till's state lives here, not in the pages.

              A layout survives a change of route while its children do not, so holding the
              register, the shift, the reference data, the catalogue and the open ticket at this
              level is what stops a step across to Returns from re-running every request and
              throwing away the ticket.
            */}
            <PosWorkspaceProvider>{children}</PosWorkspaceProvider>
          </ToastProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}

function readInitialDevelopmentIdentity(): ThemeIdentity | null {
  const businessId =
    process.env.DEVELOPMENT_BUSINESS_ID ?? process.env.NEXT_PUBLIC_DEVELOPMENT_BUSINESS_ID;
  const userId = process.env.DEVELOPMENT_USER_ID ?? process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID;

  if (!businessId || !userId) return null;

  const developmentMode =
    process.env.AUTH_MODE === "development" ||
    process.env.NEXT_PUBLIC_AUTH_MODE === "development" ||
    Boolean(
      process.env.NEXT_PUBLIC_DEVELOPMENT_BUSINESS_ID &&
      process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID,
    );

  if (!developmentMode) return null;

  return businessId && userId ? { businessId, userId } : null;
}
