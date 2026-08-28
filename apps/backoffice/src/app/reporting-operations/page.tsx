"use client";

import type { ReportingOperationsOverview } from "@bizentra/contracts";
import {
  Button,
  DataTable,
  Field,
  FormCard,
  FormFooter,
  FormGrid,
  Grid,
  KpiCard,
  SelectField,
  Stack,
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@bizentra/design-system";
import { Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

export default function ReportingOperationsPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("reports");
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<ReportingOperationsOverview>(
    async (client, businessId) => client.getReportingOperationsOverview(businessId),
  );

  const run = async (success: string, work: () => Promise<unknown>) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: success, tone: "success" });
    } catch (cause) {
      toasts.push({
        title: "Reporting change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const createReportView = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Report view saved", () =>
      api!.createSavedReportView(identity!.businessId, {
        code: readText(form, "code"),
        name: readText(form, "name"),
        reportType: readText(form, "reportType"),
        filters: { dateRange: readText(form, "dateRange", "TODAY") },
      }),
    );
    event.currentTarget.reset();
  };

  const requestExport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Export request queued", () =>
      api!.requestDataExport(identity!.businessId, {
        exportType: readText(form, "exportType"),
        format: readText(form, "format", "CSV") as "CSV",
        filters: { reason: readOptionalText(form, "reason") ?? "Management review" },
      }),
    );
    event.currentTarget.reset();
  };

  const createWebhook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Webhook subscription created", () =>
      api!.createWebhookSubscription(identity!.businessId, {
        name: readText(form, "name"),
        endpointUrl: readText(form, "endpointUrl"),
        eventTypes: readText(form, "eventTypes")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        secretHint: readOptionalText(form, "secretHint"),
      }),
    );
    event.currentTarget.reset();
  };

  const createMigration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const totalRows = readNumber(form, "totalRows");
    const invalidRows = readNumber(form, "invalidRows");
    void run("Migration validation recorded", () =>
      api!.createMigrationValidation(identity!.businessId, {
        sourceName: readText(form, "sourceName"),
        entityKind: readText(form, "entityKind", "ITEMS") as "ITEMS",
        totalRows,
        validRows: Math.max(0, totalRows - invalidRows),
        invalidRows,
        warningRows: readNumber(form, "warningRows"),
        reconciliation: {
          expectedRows: totalRows,
          acceptedRows: Math.max(0, totalRows - invalidRows),
        },
      }),
    );
    event.currentTarget.reset();
  };

  return (
    <Workspace
      status={<StatusChip tone="information">Reporting foundation active</StatusChip>}
      description="Reports, exports, webhooks, integration delivery and migration validation."
      title="Reports and integrations"
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Reporting operations">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Sales"
                  value={formatMoney(
                    data.salesSummary.totalRevenue,
                    data.salesSummary.currencyCode,
                  )}
                  trend={`${data.salesSummary.totalSales} confirmed sale(s)`}
                  tone="success"
                />
                <KpiCard
                  label="Stock available"
                  value={String(data.stockSummary.totalAvailable)}
                  trend={`${data.stockSummary.lowStockItems} low/empty stock row(s)`}
                  tone={data.stockSummary.lowStockItems > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Queued exports"
                  value={String(data.counts.queuedExports)}
                  trend={`${data.counts.savedReportViews} saved view(s)`}
                  tone="information"
                />
                <KpiCard
                  label="Webhook failures"
                  value={String(data.counts.failedDeliveries)}
                  trend={`${data.counts.activeWebhooks} active webhook(s)`}
                  tone={data.counts.failedDeliveries > 0 ? "danger" : "success"}
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "reports", label: "Reports" },
                  { value: "exports", label: "Exports" },
                  { value: "webhooks", label: "Webhooks" },
                  { value: "migration", label: "Migration" },
                ]}
              />

              {tab === "reports" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Reusable report filters"
                      className="ui-scroll-panel"
                      empty="No saved report view exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.savedViews}
                      columns={[
                        { header: "Code", render: (row) => row.code },
                        { header: "Name", render: (row) => row.name },
                        { header: "Report", render: (row) => row.reportType },
                        {
                          header: "Created",
                          hideOnMobile: true,
                          render: (row) => formatDateTime(row.createdAt),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Save report view" onSubmit={createReportView}>
                      <FormGrid>
                        <Field name="code" label="Code" placeholder="DAILY-SALES" required />
                        <Field name="name" label="Name" placeholder="Daily sales" required />
                        <SelectField name="reportType" label="Report type" defaultValue="SALES">
                          <option value="SALES">Sales</option>
                          <option value="STOCK">Stock</option>
                          <option value="FINANCE">Finance</option>
                          <option value="CUSTOMER">Customer</option>
                          <option value="WORKFORCE">Workforce</option>
                        </SelectField>
                        <SelectField name="dateRange" label="Date range" defaultValue="TODAY">
                          <option value="TODAY">Today</option>
                          <option value="THIS_WEEK">This week</option>
                          <option value="THIS_MONTH">This month</option>
                        </SelectField>
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Save view
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "exports" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Auditable data export requests"
                      className="ui-scroll-panel"
                      empty="No export has been requested yet."
                      getRowKey={(row) => row.id}
                      rows={data.exports}
                      columns={[
                        { header: "Type", render: (row) => row.exportType },
                        { header: "Format", render: (row) => row.format },
                        { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                        {
                          header: "Requested",
                          hideOnMobile: true,
                          render: (row) => formatDateTime(row.requestedAt),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Request export" onSubmit={requestExport}>
                      <FormGrid>
                        <SelectField name="exportType" label="Export type" defaultValue="SALES">
                          <option value="SALES">Sales</option>
                          <option value="STOCK">Stock</option>
                          <option value="FINANCE">Finance</option>
                          <option value="CUSTOMERS">Customers</option>
                        </SelectField>
                        <SelectField name="format" label="Format" defaultValue="CSV">
                          <option value="CSV">CSV</option>
                          <option value="XLSX">XLSX</option>
                          <option value="JSON">JSON</option>
                          <option value="PDF">PDF</option>
                        </SelectField>
                        <Field name="reason" label="Reason" placeholder="Monthly review" />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Queue export
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "webhooks" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Stack>
                      <DataTable
                        className="ui-scroll-panel"
                        caption="Subscriptions"
                        empty="No webhook is configured yet."
                        getRowKey={(row) => row.id}
                        rows={data.webhooks}
                        columns={[
                          { header: "Name", render: (row) => row.name },
                          { header: "Endpoint", render: (row) => row.endpointUrl },
                          { header: "Events", render: (row) => row.eventTypes.join(", ") },
                          { header: "Status", render: (row) => row.status },
                        ]}
                      />
                      <DataTable
                        caption="Delivery failures"
                        empty="No webhook delivery exists yet."
                        getRowKey={(row) => row.id}
                        rows={data.deliveries}
                        columns={[
                          { header: "Event", render: (row) => row.eventType },
                          { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                          { header: "Attempts", align: "right", render: (row) => row.attempts },
                          {
                            header: "Error",
                            hideOnMobile: true,
                            render: (row) => row.lastError ?? "—",
                          },
                        ]}
                      />
                    </Stack>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Create webhook" onSubmit={createWebhook}>
                      <FormGrid>
                        <Field name="name" label="Name" placeholder="Accounting sync" required />
                        <Field
                          name="endpointUrl"
                          label="Endpoint URL"
                          placeholder="https://example.com/webhooks/bizentra"
                          required
                        />
                        <Field
                          name="eventTypes"
                          label="Events"
                          placeholder="sale.confirmed, stock.changed"
                          required
                        />
                        <Field name="secretHint" label="Secret hint" placeholder="ends with 1234" />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Create webhook
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "migration" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Preview before final import commit"
                      className="ui-scroll-panel"
                      empty="No migration validation exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.migrations}
                      columns={[
                        { header: "Source", render: (row) => row.sourceName },
                        { header: "Entity", render: (row) => row.entityKind },
                        { header: "Status", render: (row) => row.status },
                        { header: "Rows", align: "right", render: (row) => row.totalRows },
                        { header: "Invalid", align: "right", render: (row) => row.invalidRows },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Record validation" onSubmit={createMigration}>
                      <FormGrid>
                        <Field
                          name="sourceName"
                          label="Source name"
                          placeholder="Legacy item file"
                          required
                        />
                        <SelectField name="entityKind" label="Entity" defaultValue="ITEMS">
                          <option value="ITEMS">Items</option>
                          <option value="CUSTOMERS">Customers</option>
                          <option value="SUPPLIERS">Suppliers</option>
                          <option value="OPENING_DATA">Opening data</option>
                        </SelectField>
                        <Field
                          name="totalRows"
                          label="Total rows"
                          type="number"
                          defaultValue="100"
                          required
                        />
                        <Field
                          name="invalidRows"
                          label="Invalid rows"
                          type="number"
                          defaultValue="0"
                          required
                        />
                        <Field
                          name="warningRows"
                          label="Warning rows"
                          type="number"
                          defaultValue="0"
                        />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Record validation
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>
    </Workspace>
  );
}
