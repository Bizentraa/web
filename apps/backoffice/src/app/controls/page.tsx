"use client";

import type {
  ApprovalOverview,
  AuditEventRow,
  DocumentSequenceRow,
  FeatureRow,
  Paginated,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  formatDateTime,
  formatMoney,
  FormCard,
  FormFooter,
  FormGrid,
  Kicker,
  PageHeader,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { Dialog, Drawer, Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readOptionalNumber, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface ControlsData {
  approvals: ApprovalOverview;
  features: FeatureRow[];
  sequences: DocumentSequenceRow[];
  audit: Paginated<AuditEventRow>;
}

export default function ControlsPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [auditFilter, setAuditFilter] = useState({ entityType: "", action: "" });
  const { data, state, error, reload } = useResource<ControlsData>(
    async (client, businessId) => {
      const [approvals, features, sequences, audit] = await Promise.all([
        client.getApprovals(businessId),
        client.listFeatures(businessId),
        client.listDocumentSequences(businessId),
        client.listAuditEvents(businessId, {
          pageSize: 25,
          ...(auditFilter.entityType ? { entityType: auditFilter.entityType } : {}),
          ...(auditFilter.action ? { action: auditFilter.action as AuditEventRow["action"] } : {}),
        }),
      ]);
      return { approvals, features, sequences, audit };
    },
    [auditFilter.entityType, auditFilter.action],
  );

  const [tab, setTab] = useState("approvals");
  const [busy, setBusy] = useState(false);
  const [policyDialog, setPolicyDialog] = useState<string | null>(null);
  const [sequenceDialog, setSequenceDialog] = useState<DocumentSequenceRow | null>(null);
  const [auditDetail, setAuditDetail] = useState<AuditEventRow | null>(null);

  const run = async (message: string, work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: message, tone: "success" });
      return true;
    } catch (cause) {
      toasts.push({
        title: "That change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !policyDialog) return;
    const form = new FormData(event.currentTarget);
    const threshold = readOptionalNumber(form, "thresholdAmount");
    const ok = await run("Approval rule saved.", () =>
      api.upsertApprovalPolicy(identity.businessId, {
        actionCode: policyDialog,
        name: readText(form, "name"),
        strategy: "ANY_APPROVER",
        minimumApprovers: 1,
        thresholdAmount: threshold ?? null,
        currencyCode: readText(form, "currencyCode") || null,
        enabled: form.get("enabled") !== null,
      }),
    );
    if (ok) setPolicyDialog(null);
  };

  const saveSequence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !sequenceDialog) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Number sequence saved.", () =>
      api.upsertDocumentSequence(identity.businessId, {
        documentType: sequenceDialog.documentType,
        branchId: sequenceDialog.branchId,
        prefix: readText(form, "prefix"),
        padding: readOptionalNumber(form, "padding") ?? sequenceDialog.padding,
        ...(readOptionalNumber(form, "nextValue") === undefined
          ? {}
          : { nextValue: readOptionalNumber(form, "nextValue") }),
      }),
    );
    if (ok) setSequenceDialog(null);
  };

  const approvals = data?.approvals;
  const pending = approvals?.requests.filter((request) => request.status === "PENDING") ?? [];
  const activePolicy = policyDialog
    ? approvals?.policies.find((policy) => policy.actionCode === policyDialog)
    : undefined;
  const activeAction = approvals?.approvableActions.find((action) => action.code === policyDialog);

  return (
    <Workspace
      activeHref="/controls"
      description="Approval rules, feature packs, document numbering and the audit history."
      eyebrow="Common Core · P0"
      title="Controls and audit"
    >
      <Stack>
        <PageHeader
          eyebrow="CC-P0-007 to CC-P0-010"
          title="Management controls"
          description="Sensitive actions can require a second person, features can be turned on per Business, numbers stay readable, and every important change is kept in an append-only history."
          status={
            <StatusChip tone={pending.length ? "warning" : "success"}>
              {pending.length ? `${pending.length} waiting approval` : "Nothing waiting"}
            </StatusChip>
          }
        />

        <Tabs
          onChange={setTab}
          value={tab}
          tabs={[
            { value: "approvals", label: "Approvals", badge: String(pending.length) },
            { value: "features", label: "Features" },
            { value: "numbering", label: "Numbering" },
            { value: "audit", label: "Audit" },
          ]}
        />

        <ResourceState error={error} onRetry={reload} state={state} title="Controls">
          {data && approvals ? (
            <>
              {tab === "approvals" ? (
                <Stack>
                  <Card>
                    <CardHeader>
                      <div>
                        <Kicker>CC-P0-007</Kicker>
                        <CardTitle>Approval rules</CardTitle>
                      </div>
                      <CardDescription>
                        A rule applies from its threshold upward. Leave the threshold empty to
                        require approval every time.
                      </CardDescription>
                    </CardHeader>
                    <DataTable
                      caption="Sensitive actions and the rule that protects each one."
                      getRowKey={(action) => action.code}
                      rows={approvals.approvableActions}
                      columns={[
                        { header: "Action", render: (action) => <strong>{action.name}</strong> },
                        {
                          header: "Decided with",
                          hideOnMobile: true,
                          render: (action) => <code>{action.decisionPermission}</code>,
                        },
                        {
                          header: "Threshold",
                          align: "right",
                          render: (action) => {
                            const policy = approvals.policies.find(
                              (candidate) => candidate.actionCode === action.code,
                            );
                            if (!policy) return "No rule";
                            return policy.thresholdAmount === null
                              ? "Always"
                              : formatMoney(policy.thresholdAmount, policy.currencyCode ?? "");
                          },
                        },
                        {
                          header: "State",
                          render: (action) => {
                            const policy = approvals.policies.find(
                              (candidate) => candidate.actionCode === action.code,
                            );
                            if (!policy) return <Badge tone="neutral">Not configured</Badge>;
                            return (
                              <Badge tone={policy.enabled ? "success" : "neutral"}>
                                {policy.enabled ? "Enforced" : "Disabled"}
                              </Badge>
                            );
                          },
                        },
                        {
                          header: "Actions",
                          align: "right",
                          render: (action) => (
                            <Button
                              onClick={() => setPolicyDialog(action.code)}
                              size="quiet"
                              variant="secondary"
                            >
                              Configure
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Card>

                  <Card>
                    <CardHeader>
                      <div>
                        <Kicker>Requests</Kicker>
                        <CardTitle>Approval requests</CardTitle>
                      </div>
                      <Badge tone={pending.length ? "warning" : "neutral"}>
                        {pending.length} waiting
                      </Badge>
                    </CardHeader>
                    <DataTable
                      caption="Requests raised by the POS and Back Office."
                      getRowKey={(request) => request.id}
                      rows={approvals.requests}
                      empty="Nothing has needed approval yet."
                      columns={[
                        { header: "Action", render: (request) => request.actionName },
                        {
                          header: "Amount",
                          align: "right",
                          render: (request) =>
                            request.amount === null
                              ? "-"
                              : formatMoney(request.amount, request.currencyCode ?? ""),
                        },
                        { header: "Reason", render: (request) => request.reason },
                        {
                          header: "Requested by",
                          hideOnMobile: true,
                          render: (request) => request.requestedBy,
                        },
                        {
                          header: "Status",
                          render: (request) => (
                            <Badge
                              tone={
                                request.status === "APPROVED"
                                  ? "success"
                                  : request.status === "PENDING"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {request.status}
                            </Badge>
                          ),
                        },
                        {
                          header: "Decision",
                          align: "right",
                          render: (request) =>
                            request.status === "PENDING" ? (
                              <div className="ui-row">
                                <Button
                                  disabled={busy}
                                  onClick={() =>
                                    api && identity
                                      ? void run("Request approved.", () =>
                                          api.decideApprovalRequest(
                                            identity.businessId,
                                            request.id,
                                            { decision: "APPROVED" },
                                          ),
                                        )
                                      : undefined
                                  }
                                  size="quiet"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={busy}
                                  onClick={() =>
                                    api && identity
                                      ? void run("Request rejected.", () =>
                                          api.decideApprovalRequest(
                                            identity.businessId,
                                            request.id,
                                            { decision: "REJECTED" },
                                          ),
                                        )
                                      : undefined
                                  }
                                  size="quiet"
                                  variant="ghost"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="ui-card-description">
                                {request.decidedBy ?? "-"}
                              </span>
                            ),
                        },
                      ]}
                    />
                  </Card>
                </Stack>
              ) : null}

              {tab === "features" ? (
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-008</Kicker>
                      <CardTitle>Feature packs</CardTitle>
                    </div>
                    <CardDescription>
                      Turning a pack off never deletes data. A pack that other packs depend on
                      cannot be turned off until they are.
                    </CardDescription>
                  </CardHeader>
                  <DataTable
                    caption="Features available to this Business."
                    getRowKey={(feature) => feature.key}
                    rows={data.features}
                    columns={[
                      { header: "Feature", render: (feature) => <strong>{feature.name}</strong> },
                      { header: "What it adds", render: (feature) => feature.description },
                      {
                        header: "Kind",
                        render: (feature) => <Badge tone="neutral">{feature.kind}</Badge>,
                      },
                      {
                        header: "State",
                        render: (feature) =>
                          feature.enabled ? (
                            <Badge tone="success">Enabled</Badge>
                          ) : feature.blockedBy.length ? (
                            <Badge tone="warning">Needs {feature.blockedBy.join(", ")}</Badge>
                          ) : (
                            <Badge tone="neutral">Disabled</Badge>
                          ),
                      },
                      {
                        header: "Actions",
                        align: "right",
                        render: (feature) => (
                          <Button
                            disabled={busy || (!feature.enabled && feature.blockedBy.length > 0)}
                            onClick={() =>
                              api && identity
                                ? void run(
                                    feature.enabled ? "Feature disabled." : "Feature enabled.",
                                    () =>
                                      api.setFeature(identity.businessId, {
                                        featureKey: feature.key,
                                        enabled: !feature.enabled,
                                      }),
                                  )
                                : undefined
                            }
                            size="quiet"
                            variant="secondary"
                          >
                            {feature.enabled ? "Disable" : "Enable"}
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Card>
              ) : null}

              {tab === "numbering" ? (
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-010</Kicker>
                      <CardTitle>Document numbers</CardTitle>
                    </div>
                    <CardDescription>
                      Numbers are allocated atomically, so two terminals never receive the same
                      number. A sequence can only move forward.
                    </CardDescription>
                  </CardHeader>
                  <DataTable
                    caption="Number sequences by Business and Branch."
                    getRowKey={(sequence) => sequence.id}
                    rows={data.sequences}
                    empty="Sequences are created with the Business and each Branch."
                    columns={[
                      {
                        header: "Document",
                        render: (sequence) => <strong>{sequence.documentType}</strong>,
                      },
                      { header: "Scope", render: (sequence) => sequence.branchName ?? "Business" },
                      { header: "Prefix", render: (sequence) => sequence.prefix },
                      {
                        header: "Next number",
                        align: "right",
                        render: (sequence) => <code>{sequence.nextNumberPreview}</code>,
                      },
                      {
                        header: "Actions",
                        align: "right",
                        render: (sequence) => (
                          <Button
                            onClick={() => setSequenceDialog(sequence)}
                            size="quiet"
                            variant="secondary"
                          >
                            Change
                          </Button>
                        ),
                      },
                    ]}
                  />
                </Card>
              ) : null}

              {tab === "audit" ? (
                <Stack>
                  <Card>
                    <CardHeader>
                      <div>
                        <Kicker>CC-P0-009</Kicker>
                        <CardTitle>Audit history</CardTitle>
                      </div>
                      <Badge tone="neutral">{data.audit.total} record(s)</Badge>
                    </CardHeader>
                    <FormGrid>
                      <SelectField
                        label="Record type"
                        onChange={(event) =>
                          setAuditFilter((current) => ({
                            ...current,
                            entityType: event.target.value,
                          }))
                        }
                        value={auditFilter.entityType}
                      >
                        <option value="">Everything</option>
                        {[
                          "Business",
                          "Branch",
                          "Location",
                          "BusinessMembership",
                          "Role",
                          "ApprovalRequest",
                          "Item",
                          "Customer",
                          "Supplier",
                          "Sale",
                          "SalePayment",
                          "SaleReturn",
                          "PosShift",
                          "ImportBatch",
                        ].map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="Action"
                        onChange={(event) =>
                          setAuditFilter((current) => ({ ...current, action: event.target.value }))
                        }
                        value={auditFilter.action}
                      >
                        <option value="">Every action</option>
                        {[
                          "CREATE",
                          "UPDATE",
                          "ACTIVATE",
                          "DEACTIVATE",
                          "APPROVE",
                          "REJECT",
                          "CANCEL",
                          "GENERATE",
                        ].map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </SelectField>
                    </FormGrid>
                    <DataTable
                      caption="Who changed what, and when."
                      getRowKey={(row) => row.id}
                      onRowSelect={setAuditDetail}
                      rows={data.audit.rows}
                      empty="No audit records match these filters."
                      columns={[
                        { header: "When", render: (row) => formatDateTime(row.occurredAt) },
                        { header: "Actor", render: (row) => row.actor },
                        {
                          header: "Action",
                          render: (row) => <Badge tone="neutral">{row.action}</Badge>,
                        },
                        { header: "Record", render: (row) => row.entityType },
                        {
                          header: "Branch",
                          hideOnMobile: true,
                          render: (row) => row.branchName ?? "-",
                        },
                      ]}
                    />
                  </Card>
                  {!data.audit.rows.length ? (
                    <StatePanel state="empty" title="Nothing recorded for this filter">
                      Audit records are written whenever an important change is made.
                    </StatePanel>
                  ) : null}
                </Stack>
              ) : null}
            </>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description={activeAction?.name ?? "Configure when this action needs approval."}
        onClose={() => setPolicyDialog(null)}
        open={policyDialog !== null}
        title="Approval rule"
      >
        <form className="ui-stack" onSubmit={(event) => void savePolicy(event)}>
          <Field
            label="Rule name"
            name="name"
            defaultValue={activePolicy?.name ?? activeAction?.name ?? ""}
            required
          />
          <FormGrid>
            <Field
              hint="Leave empty to require approval every time."
              label="Threshold amount"
              name="thresholdAmount"
              defaultValue={activePolicy?.thresholdAmount ?? ""}
              inputMode="decimal"
            />
            <Field
              label="Currency"
              name="currencyCode"
              defaultValue={activePolicy?.currencyCode ?? ""}
              maxLength={3}
            />
          </FormGrid>
          <label className="ui-check-field">
            <input defaultChecked={activePolicy?.enabled ?? true} name="enabled" type="checkbox" />
            <span>
              <strong>Enforce this rule</strong>
              <small>
                When enforced, the action is refused until an approved request exists for at least
                the same amount, decided by a different user.
              </small>
            </span>
          </label>
          <FormFooter>
            <Button onClick={() => setPolicyDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Save rule
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="A sequence can move forward but never backward, so numbers are never repeated."
        onClose={() => setSequenceDialog(null)}
        open={sequenceDialog !== null}
        title={`Numbering for ${sequenceDialog?.documentType ?? ""}`}
      >
        {sequenceDialog ? (
          <form className="ui-stack" onSubmit={(event) => void saveSequence(event)}>
            <FormGrid>
              <Field label="Prefix" name="prefix" defaultValue={sequenceDialog.prefix} required />
              <Field
                label="Digits"
                name="padding"
                defaultValue={sequenceDialog.padding}
                inputMode="numeric"
              />
              <Field
                hint={`Currently ${sequenceDialog.nextValue}.`}
                label="Next value"
                name="nextValue"
                defaultValue={sequenceDialog.nextValue}
                inputMode="numeric"
              />
            </FormGrid>
            <CardDescription>
              Preview: <code>{sequenceDialog.nextNumberPreview}</code>
            </CardDescription>
            <FormFooter>
              <Button onClick={() => setSequenceDialog(null)} variant="secondary">
                Cancel
              </Button>
              <Button disabled={busy} type="submit">
                Save sequence
              </Button>
            </FormFooter>
          </form>
        ) : null}
      </Dialog>

      <Drawer
        eyebrow="Audit record"
        onClose={() => setAuditDetail(null)}
        open={auditDetail !== null}
        title={auditDetail ? `${auditDetail.action} ${auditDetail.entityType}` : "Audit record"}
      >
        {auditDetail ? (
          <Stack>
            <FormCard onSubmit={(event) => event.preventDefault()}>
              <CardDescription>
                {auditDetail.actor} · {formatDateTime(auditDetail.occurredAt)}
              </CardDescription>
              <code style={{ wordBreak: "break-all" }}>{auditDetail.entityId}</code>
            </FormCard>
            {auditDetail.before ? (
              <Card>
                <CardTitle>Before</CardTitle>
                <pre style={{ margin: 0, overflowX: "auto" }}>
                  {JSON.stringify(auditDetail.before, null, 2)}
                </pre>
              </Card>
            ) : null}
            {auditDetail.after ? (
              <Card>
                <CardTitle>After</CardTitle>
                <pre style={{ margin: 0, overflowX: "auto" }}>
                  {JSON.stringify(auditDetail.after, null, 2)}
                </pre>
              </Card>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>
    </Workspace>
  );
}
