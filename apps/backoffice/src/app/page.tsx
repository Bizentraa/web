import { createApiClient } from "@bizentra/api-client";
import {
  AppShell,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Kicker,
  KpiCard,
  OfflineBanner,
  PageHeader,
  StatusChip,
} from "@bizentra/design-system";
import { connection } from "next/server";
import Link from "next/link";

async function readApiStatus(): Promise<"ready" | "attention"> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  try {
    const health = await createApiClient(baseUrl).health();
    return health.status === "ok" ? "ready" : "attention";
  } catch {
    return "attention";
  }
}

export default async function Home() {
  await connection();
  const apiStatus = await readApiStatus();

  return (
    <AppShell
      eyebrow="Common Core · Phase P0"
      title="Bizentra Back Office"
      description="The first working foundation for Businesses, Branches, Locations, access control, audit records and document numbering."
    >
      <div className="surface-stack">
        <PageHeader
          eyebrow="Role dashboard"
          title="Common operating dashboard"
          description="This dashboard shows what is working now, what is only a planned phase, and where the next setup action belongs. It follows the common UI/UX rule that state must be visible."
          status={
            <StatusChip tone={apiStatus === "ready" ? "success" : "warning"}>
              {apiStatus === "ready" ? "API ready" : "API attention"}
            </StatusChip>
          }
          actions={
            <>
              <Link className="ui-button ui-button--primary surface-action-link" href="/catalog">
                Open catalog
              </Link>
              <Link
                className="ui-button ui-button--secondary surface-action-link"
                href="/appearance"
              >
                Appearance
              </Link>
            </>
          }
        />

        <OfflineBanner state={apiStatus === "ready" ? "online" : "needs-review"} />

        <section className="surface-grid" aria-label="Common Core progress">
          <KpiCard
            label="P0 foundation"
            value="Usable"
            trend="Bootstrap, access, audit"
            comparison="Management UI remains"
            tone="success"
          />
          <KpiCard
            label="P1 master data"
            value="In progress"
            trend="Catalog create flow works"
            comparison="Edit/import remain"
            tone="information"
          />
          <KpiCard
            label="P2 POS"
            value="Planned"
            trend="UI readiness only"
            comparison="No sale posting yet"
            tone="warning"
          />
          <KpiCard
            label="Shared UI"
            value="Started"
            trend="Reusable primitives"
            comparison="Tables/drawers next"
            tone="information"
          />
        </section>

        <section className="surface-grid" aria-label="Common Core work areas">
          <Card>
            <CardHeader>
              <div>
                <Kicker>P0</Kicker>
                <CardTitle>Business foundation</CardTitle>
              </div>
              <StatusChip tone="success">Ready slice</StatusChip>
            </CardHeader>
            <CardDescription>
              The bootstrap endpoint creates the first Business, Branch, Location and owner access.
              Remaining P0 work is management UI for users, roles, approvals and numbering.
            </CardDescription>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <Kicker>P0 UI</Kicker>
                <CardTitle>Appearance and theme</CardTitle>
              </div>
              <StatusChip tone="success">Implemented</StatusChip>
            </CardHeader>
            <CardDescription>
              <Link href="/appearance">Choose the Business colour theme</Link>, default display mode
              and optional brand colours. The same saved Business theme is consumed by POS.
            </CardDescription>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <Kicker>P1</Kicker>
                <CardTitle>Master data</CardTitle>
              </div>
              <StatusChip tone="information">In progress</StatusChip>
            </CardHeader>
            <CardDescription>
              <Link href="/catalog">
                Create catalog defaults, items, prices, customers and suppliers
              </Link>
              . These records prepare POS and purchasing without creating sales or stock movements.
            </CardDescription>
          </Card>
        </section>

        <EmptyState
          title="P2 selling is intentionally not active yet"
          action={
            <Link className="ui-button ui-button--secondary surface-action-link" href="/catalog">
              Complete P1 catalog setup first
            </Link>
          }
        >
          POS sales, shifts, tenders, receipts, returns and exchanges remain P2 pending work until
          pricing, tax, stock and payment safety are ready.
        </EmptyState>
      </div>
    </AppShell>
  );
}
