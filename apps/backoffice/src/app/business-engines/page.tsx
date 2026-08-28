"use client";

import type {
  BusinessEnginesOverview,
  BusinessFoundationSummary,
  CatalogReferenceData,
  CustomerListRow,
  ItemListRow,
  Paginated,
} from "@bizentra/contracts";
import {
  Button,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  FormFooter,
  FormCard,
  Grid,
  Kicker,
  KpiCard,
  SelectField,
  Stack,
  StatusChip,
  formatDateTime,
} from "@bizentra/design-system";
import { Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent, type ReactNode } from "react";

import { readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface EnginesData {
  foundation: BusinessFoundationSummary;
  reference: CatalogReferenceData;
  customers: Paginated<CustomerListRow>;
  items: Paginated<ItemListRow>;
  engines: BusinessEnginesOverview;
}

export default function BusinessEnginesPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("tickets");
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<EnginesData>(async (client, businessId) => {
    const [foundation, reference, customers, items, engines] = await Promise.all([
      client.getBusinessFoundation(businessId),
      client.getCatalogReference(businessId),
      client.listCustomers(businessId, { pageSize: 100, status: "ACTIVE" }),
      client.listItems(businessId, { pageSize: 100, status: "ACTIVE" }),
      client.getBusinessEnginesOverview(businessId),
    ]);
    return { foundation, reference, customers, items, engines };
  });

  const firstBranch = data?.foundation.branches[0];
  const firstCustomer = data?.customers.rows[0];
  const firstItem = data?.items.rows[0];
  const firstLocation = firstBranch?.locations[0];

  const run = async (success: string, work: () => Promise<unknown>) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: success, tone: "success" });
    } catch (cause) {
      toasts.push({
        title: "Business engine change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Workspace
      status={<StatusChip tone="information">Shared engines active</StatusChip>}
      description="Reusable workflow, ticket, booking, traceability, warranty, BOM, route and document engines."
      title="Business engines"
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Business engines">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Tickets"
                  value={String(data.engines.counts.workTickets)}
                  trend="Open work tracking"
                  tone="information"
                />
                <KpiCard
                  label="Bookings"
                  value={String(data.engines.counts.bookings)}
                  trend="Resource reservations"
                  tone="success"
                />
                <KpiCard
                  label="Traceability"
                  value={String(data.engines.counts.traceableUnits)}
                  trend="Serial / batch units"
                  tone="warning"
                />
                <KpiCard
                  label="Documents"
                  value={String(data.engines.counts.documents)}
                  trend="Attached evidence"
                  tone="information"
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "tickets", label: "Tickets" },
                  { value: "bookings", label: "Bookings" },
                  { value: "traceability", label: "Traceability" },
                  { value: "warranty", label: "Warranty" },
                  { value: "bom", label: "Recipe / BOM" },
                  { value: "routes", label: "Routes" },
                  { value: "messages", label: "Messages / docs" },
                ]}
              />

              {tab === "tickets" ? (
                <Screen
                  form={
                    <FormCard
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Work ticket created", () =>
                          api!.createWorkTicket(identity!.businessId, {
                            branchId: firstBranch?.id,
                            title: readText(form, "title"),
                            description: readOptionalText(form, "description"),
                            priority: readText(form, "priority", "NORMAL") as
                              "LOW" | "NORMAL" | "HIGH" | "URGENT",
                          }),
                        );
                      }}
                    >
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Create ticket</CardTitle>
                          <CardDescription>Creates one numbered work ticket.</CardDescription>
                        </div>
                      </CardHeader>
                      <Field
                        label="Title"
                        name="title"
                        required
                        placeholder="Repair counter printer"
                      />
                      <SelectField label="Priority" name="priority">
                        {["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => (
                          <option key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ))}
                      </SelectField>
                      <Field
                        label="Description"
                        name="description"
                        placeholder="Problem, checklist or notes"
                      />
                      <FormFooter>
                        <Button disabled={busy}>Create ticket</Button>
                      </FormFooter>
                    </FormCard>
                  }
                >
                  <DataTable
                    caption="Work tickets"
                    className="ui-scroll-panel"
                    summary="Reusable work tracking for repairs, service jobs, production work and internal tasks."
                    empty="No work tickets yet."
                    getRowKey={(row) => row.id}
                    rows={data.engines.workTickets}
                    columns={[
                      { header: "Ticket", render: (row) => row.number },
                      { header: "Title", render: (row) => row.title },
                      { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                      { header: "Priority", render: (row) => row.priority },
                      {
                        header: "Created",
                        hideOnMobile: true,
                        render: (row) => formatDateTime(row.createdAt),
                      },
                    ]}
                  />
                </Screen>
              ) : null}

              {tab === "bookings" ? (
                <Screen
                  form={
                    <FormCard
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        const startsAt = readText(form, "startsAt");
                        const endsAt = readText(form, "endsAt");
                        void run("Booking created", () =>
                          api!.createBooking(identity!.businessId, {
                            branchId: firstBranch!.id,
                            customerId: firstCustomer?.id,
                            resourceCode: readText(form, "resourceCode", "MAIN_RESOURCE"),
                            title: readText(form, "title"),
                            startsAt: new Date(startsAt).toISOString(),
                            endsAt: new Date(endsAt).toISOString(),
                            capacityUsed: 1,
                            depositAmount: 0,
                          }),
                        );
                      }}
                    >
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Create booking</CardTitle>
                          <CardDescription>
                            Books the selected resource if there is no overlap.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <Field
                        label="Title"
                        name="title"
                        required
                        placeholder="Service appointment"
                      />
                      <Field
                        label="Resource code"
                        name="resourceCode"
                        defaultValue="MAIN_RESOURCE"
                        required
                      />
                      <Field label="Starts at" name="startsAt" type="datetime-local" required />
                      <Field label="Ends at" name="endsAt" type="datetime-local" required />
                      <FormFooter>
                        <Button disabled={busy || !firstBranch}>Create booking</Button>
                      </FormFooter>
                    </FormCard>
                  }
                >
                  <DataTable
                    caption="Bookings"
                    className="ui-scroll-panel"
                    summary="Reserve a branch resource and prevent double booking for the same time range."
                    empty="No bookings yet."
                    getRowKey={(row) => row.id}
                    rows={data.engines.bookings}
                    columns={[
                      { header: "Booking", render: (row) => row.number },
                      { header: "Resource", render: (row) => row.resourceCode },
                      { header: "Title", render: (row) => row.title },
                      { header: "Starts", render: (row) => formatDateTime(row.startsAt) },
                      { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                    ]}
                  />
                </Screen>
              ) : null}

              {tab === "traceability" ? (
                <Screen
                  form={
                    <FormCard
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Traceable unit created", () =>
                          api!.createTraceableUnit(identity!.businessId, {
                            itemId: firstItem!.id,
                            locationId: firstLocation?.id,
                            serialNumber: readOptionalText(form, "serialNumber"),
                            batchNumber: readOptionalText(form, "batchNumber"),
                            expiryDate: readOptionalText(form, "expiryDate"),
                          }),
                        );
                      }}
                    >
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Register traceable unit</CardTitle>
                          <CardDescription>
                            Creates one unit trace record for a stock-tracked item.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <Field label="Serial number" name="serialNumber" placeholder="SN-1001" />
                      <Field label="Batch number" name="batchNumber" placeholder="BATCH-2026-01" />
                      <Field label="Expiry date" name="expiryDate" type="date" />
                      <FormFooter>
                        <Button disabled={busy || !firstItem}>Register unit</Button>
                      </FormFooter>
                    </FormCard>
                  }
                >
                  <DataTable
                    caption="Traceability"
                    className="ui-scroll-panel"
                    summary="Register exact units by serial, IMEI, batch, lot and expiry date."
                    empty="No traceable units yet."
                    getRowKey={(row) => row.id}
                    rows={data.engines.traceableUnits}
                    columns={[
                      { header: "Item", render: (row) => row.itemName },
                      { header: "Serial", render: (row) => row.serialNumber ?? "—" },
                      { header: "Batch", render: (row) => row.batchNumber ?? "—" },
                      { header: "Expiry", render: (row) => row.expiryDate ?? "—" },
                      { header: "Status", render: (row) => row.status },
                    ]}
                  />
                </Screen>
              ) : null}

              {tab === "warranty" ? (
                <ReadOnlyPanel
                  title="Warranty claims"
                  description="Warranty/RMA foundation is active. Use API/client methods for claim creation in this slice."
                  rows={data.engines.warrantyClaims}
                  columns={[
                    { header: "Claim", render: (row) => row.number },
                    { header: "Item", render: (row) => row.itemDescription },
                    { header: "Status", render: (row) => row.status },
                    { header: "Opened", render: (row) => formatDateTime(row.openedAt) },
                  ]}
                />
              ) : null}

              {tab === "bom" ? (
                <ReadOnlyPanel
                  title="Recipe / BOM"
                  description="BOM definitions are stored separately and do not change stock until a consumption event is posted."
                  rows={data.engines.boms}
                  columns={[
                    { header: "Code", render: (row) => row.code },
                    { header: "Name", render: (row) => row.name },
                    { header: "Output", render: (row) => row.outputItemName },
                    { header: "Components", render: (row) => String(row.componentCount) },
                  ]}
                />
              ) : null}

              {tab === "routes" ? (
                <ReadOnlyPanel
                  title="Routes and proof of delivery"
                  description="Routes and stops plan delivery. Stock still moves only through stock/fulfillment events."
                  rows={data.engines.deliveryRoutes}
                  columns={[
                    { header: "Code", render: (row) => row.code },
                    { header: "Name", render: (row) => row.name },
                    { header: "Branch", render: (row) => row.branchName },
                    { header: "Stops", render: (row) => String(row.stopCount) },
                  ]}
                />
              ) : null}

              {tab === "messages" ? (
                <ReadOnlyPanel
                  title="Notifications and documents"
                  description="Queued notifications and attached document metadata provide reviewable evidence for business records."
                  rows={data.engines.notifications}
                  columns={[
                    { header: "Channel", render: (row) => row.channel },
                    { header: "Recipient", render: (row) => row.recipient },
                    { header: "Subject", render: (row) => row.subject },
                    { header: "Status", render: (row) => row.status },
                  ]}
                />
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>
    </Workspace>
  );
}

/**
 * The two-column engine layout: records on the left, the create form on the right.
 *
 * It used to wrap the records in a card whose header repeated the title. The table states its own
 * identity, so the card is gone and the title and description are passed to it directly.
 */
function Screen({ children, form }: { children: ReactNode; form: ReactNode }) {
  return (
    <div className="ui-screen-grid">
      <main className="ui-screen-main">{children}</main>
      <aside className="ui-screen-side">{form}</aside>
    </div>
  );
}

function ReadOnlyPanel<T extends { id: string }>({
  columns,
  description,
  rows,
  title,
}: {
  columns: Array<{ header: string; render: (row: T) => ReactNode }>;
  description: string;
  rows: T[];
  title: string;
}) {
  return (
    <DataTable
      caption={title}
      className="ui-scroll-panel"
      summary={description}
      empty="No records yet."
      getRowKey={(row) => row.id}
      rows={rows}
      columns={columns}
    />
  );
}
