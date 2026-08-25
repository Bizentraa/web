import {
  AppShell,
  Badge,
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

import { ThemeStatusCard } from "./theme-status-card";

export default function Home() {
  return (
    <AppShell
      eyebrow="POS application"
      title="Store operations begin after P0"
      description="This deployable stays separate from Back Office so store reliability and release timing can evolve independently."
    >
      <div className="pos-readiness-layout">
        <PageHeader
          eyebrow="P2 readiness"
          title="POS workspace preview"
          description="This screen uses the common POS UI pattern from the UI/UX specification: visible Branch/register context, online state, scan area, cart, totals and a clear P2 pending state."
          status={<StatusChip tone="warning">Selling not enabled</StatusChip>}
        />

        <OfflineBanner state="online" />

        <section className="surface-grid" aria-label="POS readiness status">
          <KpiCard
            label="Business context"
            value="Ready"
            trend="P0 foundation"
            comparison="Theme loaded"
            tone="success"
          />
          <KpiCard
            label="Catalog dependency"
            value="P1"
            trend="Items/prices/tax required"
            comparison="Used by scanner"
            tone="information"
          />
          <KpiCard
            label="Sales engine"
            value="P2"
            trend="Planned"
            comparison="No posting yet"
            tone="warning"
          />
        </section>

        <ThemeStatusCard />

        <section className="pos-workspace-preview" aria-label="POS workspace preview">
          <Card>
            <CardHeader>
              <div>
                <Kicker>Scan and search</Kicker>
                <CardTitle>Product area</CardTitle>
              </div>
              <Badge tone="neutral">Preview</Badge>
            </CardHeader>
            <CardDescription>
              P2 will keep barcode/search focus active here. Product results will come from the P1
              catalog and permission-aware pricing/tax rules.
            </CardDescription>
            <div className="pos-product-preview">
              <div className="pos-preview-row">
                <span>Scan barcode or search item</span>
                <StatusChip tone="information">Focused</StatusChip>
              </div>
              <div className="pos-preview-row">
                <span>Favorites and departments</span>
                <StatusChip tone="neutral">Planned</StatusChip>
              </div>
              <div className="pos-preview-row">
                <span>Promotion and tax resolution</span>
                <StatusChip tone="warning">Pending engine</StatusChip>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <Kicker>Cart</Kicker>
                <CardTitle>Sale summary</CardTitle>
              </div>
              <Badge tone="warning">P2 pending</Badge>
            </CardHeader>
            <div className="pos-cart-preview">
              <div className="pos-preview-row">
                <span>Items</span>
                <strong>0</strong>
              </div>
              <div className="pos-preview-row">
                <span>Customer</span>
                <strong>Walk-in</strong>
              </div>
              <div className="pos-preview-row">
                <span>Payment state</span>
                <StatusChip tone="neutral">Not started</StatusChip>
              </div>
              <div className="pos-preview-total">
                <span>Amount due</span>
                <strong>0.00</strong>
              </div>
            </div>
          </Card>
        </section>

        <EmptyState title="Complete P1 before live sales">
          The POS UI can show the intended P2 workspace shape now, but it must not complete sales
          until shifts, idempotent sale posting, payments, receipts, returns and stock events are
          implemented.
        </EmptyState>
      </div>
    </AppShell>
  );
}
