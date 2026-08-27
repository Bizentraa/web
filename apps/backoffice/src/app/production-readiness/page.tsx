"use client";

import type { ProductionReadinessOverview } from "@bizentra/contracts";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  FormCard,
  FormFooter,
  FormGrid,
  Grid,
  Kicker,
  KpiCard,
  PageHeader,
  SelectField,
  Stack,
  StatusChip,
  formatDateTime,
} from "@bizentra/design-system";
import { Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readBoolean, readNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

export default function ProductionReadinessPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("security");
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<ProductionReadinessOverview>(
    async (client, businessId) => client.getProductionReadinessOverview(businessId),
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
        title: "Readiness change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const recordSecurityEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Security event recorded", () =>
      api!.recordSecurityEvent(identity!.businessId, {
        eventType: readText(form, "eventType"),
        severity: readText(form, "severity", "INFO") as "INFO",
        subjectType: readOptionalText(form, "subjectType"),
        subjectId: readOptionalText(form, "subjectId"),
        detail: readText(form, "detail"),
      }),
    );
    event.currentTarget.reset();
  };

  const recordBackup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Backup evidence recorded", () =>
      api!.recordBackupRun(identity!.businessId, {
        scope: readText(form, "scope"),
        status: readText(form, "status", "COMPLETED") as "COMPLETED",
        storageReference: readOptionalText(form, "storageReference"),
        sizeBytes: readNumber(form, "sizeBytes"),
        recoveryPointObjective: readOptionalText(form, "rpo"),
        recoveryTimeObjective: readOptionalText(form, "rto"),
        restoreTested: readBoolean(form, "restoreTested"),
      }),
    );
    event.currentTarget.reset();
  };

  const upsertReadiness = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Readiness check saved", () =>
      api!.upsertReadinessCheck(identity!.businessId, {
        area: readText(form, "area"),
        name: readText(form, "name"),
        status: readText(form, "status", "PASS") as "PASS",
        target: readOptionalText(form, "target"),
        measuredValue: readOptionalText(form, "measuredValue"),
        notes: readOptionalText(form, "notes"),
      }),
    );
    event.currentTarget.reset();
  };

  const createPrivacy = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Privacy request opened", () =>
      api!.createPrivacyRequest(identity!.businessId, {
        requestType: readText(form, "requestType"),
        requester: readText(form, "requester"),
        dueDate: readOptionalText(form, "dueDate"),
      }),
    );
    event.currentTarget.reset();
  };

  const createRelease = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run("Release readiness saved", () =>
      api!.createReleaseReadiness(identity!.businessId, {
        version: readText(form, "version"),
        status: readText(form, "status", "DRAFT") as "DRAFT",
        checklist: {
          tests: readText(form, "tests", "PASS"),
          migration: readText(form, "migration", "PASS"),
          backup: readText(form, "backup", "PASS"),
          rollback: "Documented",
        },
        rollbackPlan: readText(form, "rollbackPlan"),
        migrationPlan: readOptionalText(form, "migrationPlan"),
      }),
    );
    event.currentTarget.reset();
  };

  return (
    <Workspace
      activeHref="/production-readiness"
      description="Security events, backups, readiness checks, privacy requests and release controls."
      eyebrow="Common Core · P8"
      title="Production readiness"
    >
      <Stack>
        <PageHeader
          eyebrow="CC-P8-001 to CC-P8-010"
          title="Track the evidence needed before production go-live"
          description="P8 records security, backup, disaster recovery, observability, performance, privacy and release-readiness evidence without changing operational source records."
          status={<StatusChip tone="information">Readiness foundation active</StatusChip>}
        />

        <ResourceState error={error} onRetry={reload} state={state} title="Production readiness">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Critical security"
                  value={String(data.counts.criticalSecurityEvents)}
                  trend="Critical events"
                  tone={data.counts.criticalSecurityEvents > 0 ? "danger" : "success"}
                />
                <KpiCard
                  label="Failed backups"
                  value={String(data.counts.failedBackups)}
                  trend="Backup failures"
                  tone={data.counts.failedBackups > 0 ? "danger" : "success"}
                />
                <KpiCard
                  label="Failed checks"
                  value={String(data.counts.failedReadinessChecks)}
                  trend={`${data.counts.auditEvents} audit event(s)`}
                  tone={data.counts.failedReadinessChecks > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Privacy open"
                  value={String(data.counts.openPrivacyRequests)}
                  trend={`${data.counts.blockedReleases} blocked release(s)`}
                  tone={data.counts.openPrivacyRequests > 0 ? "warning" : "success"}
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "security", label: "Security" },
                  { value: "backup", label: "Backup / DR" },
                  { value: "checks", label: "Checks" },
                  { value: "privacy", label: "Privacy" },
                  { value: "release", label: "Release" },
                ]}
              />

              {tab === "security" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Card className="ui-scroll-panel">
                      <CardHeader>
                        <div>
                          <Kicker>Security events</Kicker>
                          <CardTitle>Sensitive activity and control evidence</CardTitle>
                        </div>
                      </CardHeader>
                      <DataTable
                        caption="Security events."
                        empty="No security event has been recorded yet."
                        getRowKey={(row) => row.id}
                        rows={data.securityEvents}
                        columns={[
                          { header: "Event", render: (row) => row.eventType },
                          { header: "Severity", render: (row) => row.severity },
                          { header: "Detail", render: (row) => row.detail },
                          {
                            header: "Time",
                            hideOnMobile: true,
                            render: (row) => formatDateTime(row.occurredAt),
                          },
                        ]}
                      />
                    </Card>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Record security event" onSubmit={recordSecurityEvent}>
                      <FormGrid>
                        <Field
                          name="eventType"
                          label="Event type"
                          placeholder="MFA_REQUIRED"
                          required
                        />
                        <SelectField name="severity" label="Severity" defaultValue="INFO">
                          <option value="INFO">Info</option>
                          <option value="WARNING">Warning</option>
                          <option value="CRITICAL">Critical</option>
                        </SelectField>
                        <Field name="subjectType" label="Subject type" placeholder="User" />
                        <Field name="subjectId" label="Subject id" placeholder="optional id" />
                        <Field
                          name="detail"
                          label="Detail"
                          placeholder="Privileged login reviewed"
                          required
                        />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Record event
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "backup" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Card className="ui-scroll-panel">
                      <CardHeader>
                        <div>
                          <Kicker>Backup and DR</Kicker>
                          <CardTitle>Backup runs and restore-test evidence</CardTitle>
                        </div>
                      </CardHeader>
                      <DataTable
                        caption="Backup runs."
                        empty="No backup evidence exists yet."
                        getRowKey={(row) => row.id}
                        rows={data.backupRuns}
                        columns={[
                          { header: "Scope", render: (row) => row.scope },
                          { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                          { header: "RPO", render: (row) => row.recoveryPointObjective ?? "—" },
                          { header: "RTO", render: (row) => row.recoveryTimeObjective ?? "—" },
                          {
                            header: "Started",
                            hideOnMobile: true,
                            render: (row) => formatDateTime(row.startedAt),
                          },
                        ]}
                      />
                    </Card>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Record backup" onSubmit={recordBackup}>
                      <FormGrid>
                        <Field
                          name="scope"
                          label="Scope"
                          placeholder="Primary PostgreSQL"
                          required
                        />
                        <SelectField name="status" label="Status" defaultValue="COMPLETED">
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="RUNNING">Running</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="FAILED">Failed</option>
                        </SelectField>
                        <Field
                          name="storageReference"
                          label="Storage reference"
                          placeholder="s3://..."
                        />
                        <Field name="sizeBytes" label="Size bytes" type="number" defaultValue="0" />
                        <Field name="rpo" label="RPO" placeholder="15 minutes" />
                        <Field name="rto" label="RTO" placeholder="2 hours" />
                        <label className="ui-checkbox">
                          <input name="restoreTested" type="checkbox" /> Restore tested
                        </label>
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Record backup
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "checks" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Card className="ui-scroll-panel">
                      <CardHeader>
                        <div>
                          <Kicker>Readiness checks</Kicker>
                          <CardTitle>Observability, performance and release gates</CardTitle>
                        </div>
                      </CardHeader>
                      <DataTable
                        caption="Readiness checks."
                        empty="No readiness check has been recorded yet."
                        getRowKey={(row) => row.id}
                        rows={data.readinessChecks}
                        columns={[
                          { header: "Area", render: (row) => row.area },
                          { header: "Name", render: (row) => row.name },
                          { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                          { header: "Measured", render: (row) => row.measuredValue ?? "—" },
                        ]}
                      />
                    </Card>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Save readiness check" onSubmit={upsertReadiness}>
                      <FormGrid>
                        <Field name="area" label="Area" placeholder="Performance" required />
                        <Field
                          name="name"
                          label="Check name"
                          placeholder="POS sale response"
                          required
                        />
                        <SelectField name="status" label="Status" defaultValue="PASS">
                          <option value="PASS">Pass</option>
                          <option value="WARNING">Warning</option>
                          <option value="FAIL">Fail</option>
                          <option value="NOT_RUN">Not run</option>
                        </SelectField>
                        <Field name="target" label="Target" placeholder="under 2 seconds" />
                        <Field name="measuredValue" label="Measured" placeholder="1.3 seconds" />
                        <Field name="notes" label="Notes" placeholder="Smoke passed" />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Save check
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "privacy" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Card className="ui-scroll-panel">
                      <CardHeader>
                        <div>
                          <Kicker>Privacy requests</Kicker>
                          <CardTitle>Customer-data request tracking</CardTitle>
                        </div>
                      </CardHeader>
                      <DataTable
                        caption="Privacy requests."
                        empty="No privacy request exists yet."
                        getRowKey={(row) => row.id}
                        rows={data.privacyRequests}
                        columns={[
                          { header: "Type", render: (row) => row.requestType },
                          { header: "Requester", render: (row) => row.requester },
                          { header: "Status", render: (row) => row.status },
                          { header: "Due", render: (row) => row.dueDate ?? "—" },
                        ]}
                      />
                    </Card>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Open privacy request" onSubmit={createPrivacy}>
                      <FormGrid>
                        <SelectField name="requestType" label="Request type" defaultValue="EXPORT">
                          <option value="ACCESS">Access</option>
                          <option value="EXPORT">Export</option>
                          <option value="DELETE">Delete</option>
                          <option value="RETENTION_REVIEW">Retention review</option>
                        </SelectField>
                        <Field
                          name="requester"
                          label="Requester"
                          placeholder="Customer email/name"
                          required
                        />
                        <Field name="dueDate" label="Due date" type="date" />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Open request
                        </Button>
                      </FormFooter>
                    </FormCard>
                  </aside>
                </div>
              ) : null}

              {tab === "release" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <Card className="ui-scroll-panel">
                      <CardHeader>
                        <div>
                          <Kicker>Release readiness</Kicker>
                          <CardTitle>Go-live checklist and rollback evidence</CardTitle>
                        </div>
                      </CardHeader>
                      <DataTable
                        caption="Release readiness."
                        empty="No release-readiness record exists yet."
                        getRowKey={(row) => row.id}
                        rows={data.releases}
                        columns={[
                          { header: "Version", render: (row) => row.version },
                          { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                          { header: "Rollback", render: (row) => row.rollbackPlan },
                          {
                            header: "Created",
                            hideOnMobile: true,
                            render: (row) => formatDateTime(row.createdAt),
                          },
                        ]}
                      />
                    </Card>
                  </main>
                  <aside className="ui-screen-side">
                    <FormCard title="Save release readiness" onSubmit={createRelease}>
                      <FormGrid>
                        <Field name="version" label="Version" placeholder="2026.08.27" required />
                        <SelectField name="status" label="Status" defaultValue="DRAFT">
                          <option value="DRAFT">Draft</option>
                          <option value="READY">Ready</option>
                          <option value="BLOCKED">Blocked</option>
                          <option value="RELEASED">Released</option>
                        </SelectField>
                        <SelectField name="tests" label="Tests" defaultValue="PASS">
                          <option value="PASS">Pass</option>
                          <option value="WARNING">Warning</option>
                          <option value="FAIL">Fail</option>
                        </SelectField>
                        <SelectField name="migration" label="Migration" defaultValue="PASS">
                          <option value="PASS">Pass</option>
                          <option value="WARNING">Warning</option>
                          <option value="FAIL">Fail</option>
                        </SelectField>
                        <SelectField name="backup" label="Backup" defaultValue="PASS">
                          <option value="PASS">Pass</option>
                          <option value="WARNING">Warning</option>
                          <option value="FAIL">Fail</option>
                        </SelectField>
                        <Field
                          name="rollbackPlan"
                          label="Rollback plan"
                          placeholder="Restore previous app version"
                          required
                        />
                        <Field
                          name="migrationPlan"
                          label="Migration plan"
                          placeholder="Deploy migration before API"
                        />
                      </FormGrid>
                      <FormFooter>
                        <Button type="submit" disabled={busy}>
                          Save release
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
