"use client";

import type {
  BusinessFoundationSummary,
  CatalogSummary,
  Paginated,
  SaleListRow,
  ShiftSummary,
} from "@bizentra/contracts";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  formatDateTime,
  formatMoney,
  Grid,
  Kicker,
  KpiCard,
  OfflineBanner,
  PageHeader,
  Progress,
  Split,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { useOnlineState } from "@bizentra/design-system/client";
import Link from "next/link";

import { ResourceState, useResource, Workspace } from "./lib/workspace";

interface DashboardData {
  foundation: BusinessFoundationSummary;
  catalog: CatalogSummary;
  sales: Paginated<SaleListRow>;
  shifts: ShiftSummary[];
}

const SETUP_STEPS: Array<{
  key: keyof BusinessFoundationSummary["setup"];
  label: string;
  href: string;
  help: string;
}> = [
  {
    key: "hasCatalogDefaults",
    label: "Catalog defaults",
    href: "/catalog",
    help: "Unit, tax category and default price list.",
  },
  {
    key: "hasSellableItems",
    label: "Something to sell",
    href: "/catalog",
    help: "At least one active item with a price.",
  },
  {
    key: "hasAdditionalUsers",
    label: "Team access",
    href: "/access",
    help: "Invite the people who will use the system.",
  },
  {
    key: "hasApprovalPolicies",
    label: "Approval rules",
    href: "/controls",
    help: "Protect discounts, refunds and voids.",
  },
  {
    key: "hasOpenShift",
    label: "Open POS shift",
    href: "/sales",
    help: "A shift must be open before selling.",
  },
  {
    key: "hasConfirmedSale",
    label: "First sale",
    href: "/sales",
    help: "Confirms the whole flow works end to end.",
  },
];

export default function DashboardPage() {
  const online = useOnlineState();
  const { data, state, error, reload } = useResource<DashboardData>(async (api, businessId) => {
    const [foundation, catalog, sales, shifts] = await Promise.all([
      api.getBusinessFoundation(businessId),
      api.getCatalogSummary(businessId),
      api.listSales(businessId, { pageSize: 8 }),
      api.listShifts(businessId),
    ]);
    return { foundation, catalog, sales, shifts };
  });

  const completed = data ? SETUP_STEPS.filter((step) => data.foundation.setup[step.key]).length : 0;
  const readiness = Math.round((completed / SETUP_STEPS.length) * 100);
  const openShift = data?.shifts.find((shift) => shift.status === "OPEN");
  const todayTotal =
    data?.sales.rows
      .filter((sale) => sale.status !== "VOIDED" && isToday(sale.createdAt))
      .reduce((sum, sale) => sum + sale.total, 0) ?? 0;
  const currency = data?.foundation.business.defaultCurrency ?? "";

  return (
    <Workspace
      activeHref="/"
      description="What is ready to use today, what still needs setup, and where the next action belongs."
      eyebrow="Common Core"
      title="Operating dashboard"
      headerActions={
        <>
          <Link className="ui-button ui-button--primary" href="/sales">
            Open sales
          </Link>
          <Link className="ui-button ui-button--secondary" href="/catalog">
            Manage catalog
          </Link>
        </>
      }
    >
      <Stack>
        <OfflineBanner state={online ? "online" : "offline"} />

        <ResourceState error={error} onRetry={reload} state={state} title="Dashboard">
          {data ? (
            <Stack>
              <PageHeader
                eyebrow="Role dashboard"
                title={data.foundation.business.name}
                description="Owner and administrator view. Cashiers use the POS application, which stays a separate deployable."
                status={
                  <StatusChip tone={readiness === 100 ? "success" : "warning"}>
                    {readiness === 100 ? "Ready to trade" : `Setup ${readiness}%`}
                  </StatusChip>
                }
              />

              <Grid>
                <KpiCard
                  label="Sales today"
                  value={formatMoney(todayTotal, currency)}
                  trend={`${data.sales.total} sales in total`}
                  tone="success"
                />
                <KpiCard
                  label="Open shift"
                  value={openShift ? openShift.registerCode : "None"}
                  trend={
                    openShift
                      ? `Expected cash ${formatMoney(openShift.expectedCash)}`
                      : "Open a shift to sell"
                  }
                  tone={openShift ? "success" : "warning"}
                />
                <KpiCard
                  label="Sellable items"
                  value={String(data.catalog.counts.items)}
                  trend={`${data.catalog.counts.priceLists} price list(s)`}
                  tone={data.catalog.counts.items > 0 ? "information" : "warning"}
                />
                <KpiCard
                  label="Customers"
                  value={String(data.catalog.counts.customers)}
                  trend={`${data.catalog.counts.suppliers} suppliers`}
                  tone="information"
                />
              </Grid>

              <Split>
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>P2</Kicker>
                      <CardTitle>Recent sales</CardTitle>
                    </div>
                    <Link className="ui-button ui-button--quiet" href="/sales">
                      Open sales
                    </Link>
                  </CardHeader>
                  <DataTable
                    caption="The most recent sales across every Branch."
                    getRowKey={(sale) => sale.id}
                    empty="No sales yet. Open a shift in the POS and complete the first sale."
                    rows={data.sales.rows}
                    columns={[
                      {
                        header: "Number",
                        render: (sale) => (
                          <Link href={`/sales?sale=${sale.id}`}>
                            {sale.receiptNumber ?? sale.number}
                          </Link>
                        ),
                      },
                      { header: "Customer", render: (sale) => sale.customerName ?? "Walk-in" },
                      {
                        header: "Status",
                        render: (sale) => (
                          <Badge tone={saleTone(sale.status)}>{readable(sale.status)}</Badge>
                        ),
                      },
                      {
                        header: "Total",
                        align: "right",
                        render: (sale) => formatMoney(sale.total, sale.currencyCode),
                      },
                      {
                        header: "Due",
                        align: "right",
                        render: (sale) => formatMoney(sale.dueTotal),
                      },
                      {
                        header: "Time",
                        hideOnMobile: true,
                        render: (sale) => formatDateTime(sale.createdAt),
                      },
                    ]}
                  />
                </Card>

                <Stack>
                  <Card>
                    <CardHeader>
                      <div>
                        <Kicker>Setup</Kicker>
                        <CardTitle>Readiness</CardTitle>
                      </div>
                      <Badge tone={readiness === 100 ? "success" : "warning"}>{readiness}%</Badge>
                    </CardHeader>
                    <Progress value={readiness} />
                    <Stack tight>
                      {SETUP_STEPS.map((step) => {
                        const done = data.foundation.setup[step.key];
                        return (
                          <div className="ui-row ui-row--between" key={step.key}>
                            <div>
                              <strong>{step.label}</strong>
                              <CardDescription>{step.help}</CardDescription>
                            </div>
                            {done ? (
                              <StatusChip tone="success">Done</StatusChip>
                            ) : (
                              <Link className="ui-button ui-button--quiet" href={step.href}>
                                Set up
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </Stack>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div>
                        <Kicker>P0</Kicker>
                        <CardTitle>Business</CardTitle>
                      </div>
                      <Link className="ui-button ui-button--quiet" href="/setup">
                        Manage
                      </Link>
                    </CardHeader>
                    <CardDescription>
                      {data.foundation.branches.length} Branch(es) ·{" "}
                      {data.foundation.branches.reduce(
                        (sum, branch) => sum + branch.locations.length,
                        0,
                      )}{" "}
                      Location(s) · {data.foundation.memberships} user(s) · {data.foundation.roles}{" "}
                      Role(s)
                    </CardDescription>
                    <div className="ui-row">
                      {data.foundation.enabledFeatures.map((feature) => (
                        <Badge key={feature} tone="neutral">
                          {readable(feature)}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </Stack>
              </Split>

              {data.catalog.counts.items === 0 ? (
                <StatePanel
                  state="empty"
                  title="Add something to sell"
                  action={
                    <Link className="ui-button ui-button--primary" href="/catalog">
                      Open the catalog
                    </Link>
                  }
                >
                  The POS can only sell active items that have a price in the Business currency.
                </StatePanel>
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>
    </Workspace>
  );
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function readable(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1))
    .join(" ");
}

export function saleTone(
  status: SaleListRow["status"],
): "success" | "warning" | "danger" | "neutral" | "information" {
  if (status === "CONFIRMED") return "success";
  if (status === "HELD" || status === "DRAFT") return "warning";
  if (status === "VOIDED") return "danger";
  if (status === "RETURNED" || status === "PARTIALLY_RETURNED") return "information";
  return "neutral";
}
