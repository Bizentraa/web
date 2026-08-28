"use client";

import type {
  BusinessFoundationSummary,
  DeviceKind,
  StoreReliabilityOverview,
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
import { useState, type FormEvent } from "react";

import { readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface ReliabilityData {
  foundation: BusinessFoundationSummary;
  reliability: StoreReliabilityOverview;
}

export default function StoreReliabilityPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("devices");
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<ReliabilityData>(
    async (client, businessId) => {
      const [foundation, reliability] = await Promise.all([
        client.getBusinessFoundation(businessId),
        client.getStoreReliabilityOverview(businessId),
      ]);
      return { foundation, reliability };
    },
  );

  const firstBranch = data?.foundation.branches[0];
  const firstDevice = data?.reliability.devices[0];
  const firstQueueItem = data?.reliability.queue.find((item) => item.status === "QUEUED");

  const run = async (success: string, work: () => Promise<unknown>) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: success, tone: "success" });
    } catch (cause) {
      toasts.push({
        title: "Reliability change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Workspace
      status={<StatusChip tone="information">Reliability controls active</StatusChip>}
      description="Store devices, POS terminal health, offline queue and sync conflicts."
      title="Store reliability"
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Store reliability">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Devices"
                  value={String(data.reliability.counts.devices)}
                  trend={`${data.reliability.counts.activeDevices} active`}
                  tone="information"
                />
                <KpiCard
                  label="Offline queue"
                  value={String(data.reliability.counts.queuedOfflineItems)}
                  trend="Waiting to sync"
                  tone={data.reliability.counts.queuedOfflineItems > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Conflicts"
                  value={String(data.reliability.counts.openConflicts)}
                  trend="Needs review"
                  tone={data.reliability.counts.openConflicts > 0 ? "danger" : "success"}
                />
                <KpiCard
                  label="Health"
                  value={firstDevice?.lastSeenAt ? "Online" : "Not seen"}
                  trend="Latest terminal signal"
                  tone={firstDevice?.lastSeenAt ? "success" : "warning"}
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "devices", label: "Devices" },
                  { value: "queue", label: "Offline queue" },
                  { value: "conflicts", label: "Conflicts" },
                ]}
              />

              {tab === "devices" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Terminals and connected hardware"
                      className="ui-scroll-panel"
                      summary="Register POS terminals, printers, scanners, cash drawers and payment terminals."
                      empty="No devices registered yet."
                      getRowKey={(row) => row.id}
                      rows={data.reliability.devices}
                      columns={[
                        { header: "Device", render: (row) => row.name },
                        { header: "Kind", render: (row) => row.kind.replaceAll("_", " ") },
                        { header: "Branch", render: (row) => row.branchName ?? "Business" },
                        { header: "Status", render: (row) => row.status },
                        {
                          header: "Last seen",
                          hideOnMobile: true,
                          render: (row) => (row.lastSeenAt ? formatDateTime(row.lastSeenAt) : "—"),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Device registered", () =>
                          api!.registerDevice(identity!.businessId, {
                            branchId: firstBranch?.id,
                            code: readText(form, "code", "POS-01"),
                            name: readText(form, "name"),
                            kind: readText(form, "kind", "POS_TERMINAL") as DeviceKind,
                            hardwareId: readOptionalText(form, "hardwareId"),
                            capabilities: { receipt: true, offline: true },
                          }),
                        );
                      }}
                    >
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Register device</CardTitle>
                          <CardDescription>Registers or updates a device by code.</CardDescription>
                        </div>
                      </CardHeader>
                      <Field label="Code" name="code" defaultValue="POS-01" required />
                      <Field label="Name" name="name" placeholder="Front counter POS" required />
                      <SelectField label="Kind" name="kind">
                        {[
                          "POS_TERMINAL",
                          "RECEIPT_PRINTER",
                          "BARCODE_SCANNER",
                          "CASH_DRAWER",
                          "PAYMENT_TERMINAL",
                        ].map((value) => (
                          <option key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </option>
                        ))}
                      </SelectField>
                      <Field
                        label="Hardware ID"
                        name="hardwareId"
                        placeholder="Optional serial or browser fingerprint"
                      />
                      <FormFooter>
                        <Button disabled={busy}>Register device</Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "queue" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Queued offline operations"
                      className="ui-scroll-panel"
                      summary="Each offline action has a unique key so replay does not duplicate sales or stock movement."
                      empty="No offline queue items yet."
                      getRowKey={(row) => row.id}
                      rows={data.reliability.queue}
                      columns={[
                        { header: "Operation", render: (row) => row.operationType },
                        { header: "Status", render: (row) => row.status },
                        { header: "Risk", render: (row) => row.riskLevel },
                        { header: "Created", render: (row) => formatDateTime(row.createdAt) },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const key = `offline:${Date.now()}`;
                        void run("Offline queue item created", () =>
                          api!.queueOfflineOperation(identity!.businessId, {
                            branchId: firstBranch?.id,
                            deviceId: firstDevice?.id,
                            idempotencyKey: key,
                            operationType: "POS_HELD_SALE",
                            payload: { source: "backoffice-smoke", key },
                            riskLevel: "NORMAL",
                          }),
                        );
                      }}
                    >
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Queue offline test</CardTitle>
                          <CardDescription>
                            Creates an idempotent offline queue item for validation.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <p className="ui-muted">
                        The system will generate a unique idempotency key for this sample operation.
                      </p>
                      <FormFooter>
                        <Button disabled={busy}>Queue sample</Button>
                      </FormFooter>
                    </FormCard>
                    <FormCard>
                      <CardHeader>
                        <div>
                          <Kicker>Quick action</Kicker>
                          <CardTitle>Mark first queued item</CardTitle>
                          <CardDescription>
                            Marks the oldest visible queued item as synced.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <FormFooter>
                        <Button
                          variant="secondary"
                          disabled={busy || !firstQueueItem}
                          onClick={() =>
                            void run("Offline item marked as synced", () =>
                              api!.markOfflineQueueItem(identity!.businessId, firstQueueItem!.id, {
                                status: "SYNCED",
                              }),
                            )
                          }
                        >
                          Mark synced
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "conflicts" ? (
                <DataTable
                  caption="Conflict queue"
                  className="ui-scroll-panel"
                  summary="Conflicts stay visible until an authorized user resolves or ignores them."
                  empty="No sync conflicts."
                  getRowKey={(row) => row.id}
                  rows={data.reliability.conflicts}
                  columns={[
                    { header: "Entity", render: (row) => row.entityType },
                    { header: "Reason", render: (row) => row.reason },
                    { header: "Status", render: (row) => row.status },
                    { header: "Created", render: (row) => formatDateTime(row.createdAt) },
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
