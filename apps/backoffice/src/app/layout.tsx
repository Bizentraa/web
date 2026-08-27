import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import type { ThemeIdentity } from "@bizentra/design-system/theme";
import { ToastProvider } from "@bizentra/design-system/client";
import { THEME_BOOTSTRAP_SCRIPT } from "@bizentra/themes";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

import { AppThemeProvider } from "./app-theme-provider";
import { ActiveBranchProvider } from "./lib/active-branch";
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
  title: "Bizentra Back Office",
  description: "Business setup, catalog, customers, suppliers and sales management",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialDevelopmentIdentity = readInitialDevelopmentIdentity();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  /* Rendering the saved sidebar state on the server stops the sidebar flashing open on load. */
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

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
          <ActiveBranchProvider>
            <ToastProvider>
              <SidebarProvider defaultOpen={sidebarOpen}>
                <AppSidebar />
                {children}
              </SidebarProvider>
            </ToastProvider>
          </ActiveBranchProvider>
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
