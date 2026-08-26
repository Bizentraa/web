import { AppShell } from "@bizentra/design-system";
import Link from "next/link";

import { CatalogWorkspace } from "./catalog-workspace";

export default function CatalogPage() {
  return (
    <AppShell
      activeHref="/catalog"
      eyebrow="Common Core · Phase P1"
      title="Master data"
      description="Create the first reusable items, prices, tax setup, customers and suppliers that later POS and purchasing phases will consume."
    >
      <p className="theme-back-link">
        <Link href="/">Back to Common Core</Link>
      </p>
      <CatalogWorkspace />
    </AppShell>
  );
}
