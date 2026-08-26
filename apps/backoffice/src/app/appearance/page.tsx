import { AppShell } from "@bizentra/design-system";
import Link from "next/link";

import { AppearanceSettings } from "./appearance-settings";

export default function AppearancePage() {
  return (
    <AppShell
      activeHref="/appearance"
      eyebrow="Business settings · Appearance"
      title="Colour theme"
      description="Choose one controlled industry preset, optionally add brand colours, and define how light and dark modes behave across Bizentra."
    >
      <p className="theme-back-link">
        <Link href="/">← Back to Common Core</Link>
      </p>
      <AppearanceSettings />
    </AppShell>
  );
}
