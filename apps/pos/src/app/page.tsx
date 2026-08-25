import { AppShell, StatusCard } from "@bizentra/design-system";

import { ThemeStatusCard } from "./theme-status-card";

export default function Home() {
  return (
    <AppShell
      eyebrow="POS application"
      title="Store operations begin after P0"
      description="This deployable stays separate from Back Office so store reliability and release timing can evolve independently."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        <StatusCard title="P0 Business context" status="ready">
          <p>The data and API foundation can identify the active Business and Branch.</p>
        </StatusCard>
        <ThemeStatusCard />
        <StatusCard title="P1 catalog" status="planned">
          <p>Items, variants, barcodes, pricing and tax are built after the P0 exit gate.</p>
        </StatusCard>
        <StatusCard title="P2 selling" status="planned">
          <p>Shifts, sales, tenders, receipts, returns and exchanges belong to P2.</p>
        </StatusCard>
      </div>
    </AppShell>
  );
}
