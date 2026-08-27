"use client";

import type { ImportBatchSummary, ImportEntityKind, ImportPreview } from "@bizentra/contracts";
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
  FormFooter,
  Grid,
  Kicker,
  KpiCard,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
  TextareaField,
} from "@bizentra/design-system";
import { ConfirmDialog, Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

const ENTITY_KINDS: Array<{ value: ImportEntityKind; label: string; help: string }> = [
  { value: "ITEMS", label: "Items", help: "Products, services and their first price and barcode." },
  { value: "CUSTOMERS", label: "Customers", help: "Contacts and groups." },
  { value: "SUPPLIERS", label: "Suppliers", help: "Contacts, terms and lead times." },
  {
    value: "OPENING_DATA",
    label: "Opening stock",
    help: "Needs the P3 inventory phase; validation explains this clearly.",
  },
];

export default function ImportPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const { data, state, error, reload } = useResource<ImportBatchSummary[]>((client, businessId) =>
    client.listImportBatches(businessId),
  );

  const [entityKind, setEntityKind] = useState<ImportEntityKind>("ITEMS");
  const [fileName, setFileName] = useState("items.csv");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<ImportBatchSummary | null>(null);
  const [tab, setTab] = useState("import");

  const template = async () => {
    if (!api || !identity) return;
    try {
      const result = await api.getImportTemplate(identity.businessId, entityKind);
      setContent(result.content);
      setFileName(result.fileName);
      toasts.push({
        title: "Template loaded",
        description: "Replace the example row with your own data, or paste an exported CSV file.",
        tone: "success",
      });
    } catch (cause) {
      toasts.push({
        title: "Template not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
    }
  };

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setContent(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  };

  const validate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await api.validateImport(identity.businessId, {
        entityKind,
        fileName: readText(form, "fileName", fileName),
        content,
        delimiter: readText(form, "delimiter", ",") as "," | ";" | "\t",
      });
      setPreview(result);
      await reload();
      toasts.push({
        title: `${result.validRows} row(s) are ready to import`,
        description: result.invalidRows
          ? `${result.invalidRows} row(s) need attention before they can be applied.`
          : "Nothing needs fixing.",
        tone: result.invalidRows ? "warning" : "success",
      });
    } catch (cause) {
      toasts.push({ title: "Validation failed", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!api || !identity || !preview) return;
    setBusy(true);
    try {
      const result = await api.applyImport(identity.businessId, preview.id);
      setPreview({ ...preview, ...result });
      await reload();
      toasts.push({
        title: `${result.appliedRows} record(s) created`,
        description: "The import can still be rolled back while the records are untouched.",
        tone: "success",
      });
    } catch (cause) {
      toasts.push({ title: "Apply failed", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (batchId: string) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await api.rollbackImport(identity.businessId, batchId);
      await reload();
      if (preview?.id === batchId) setPreview(null);
      toasts.push({ title: "Import rolled back", tone: "success" });
    } catch (cause) {
      toasts.push({ title: "Rollback refused", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
      setRollbackTarget(null);
    }
  };

  const batches = data ?? [];

  return (
    <Workspace
      requirements="CC-P1-011"
      status={<StatusChip tone="success">{batches.length} import(s)</StatusChip>}
      description="Bring existing items, customers and suppliers in from a CSV or spreadsheet export, safely."
      eyebrow="Common Core · P1"
      title="Import"
    >
      <Stack>
        <Grid>
          <KpiCard
            label="Imports run"
            value={String(batches.length)}
            trend={`${batches.filter((batch) => batch.status === "APPLIED").length} applied`}
            tone="information"
          />
          <KpiCard
            label="Rows created"
            value={String(batches.reduce((sum, batch) => sum + batch.appliedRows, 0))}
            trend="Across every import"
            tone="success"
          />
          <KpiCard
            label="Rows refused"
            value={String(batches.reduce((sum, batch) => sum + batch.invalidRows, 0))}
            trend="Never written to the Business"
            tone="warning"
          />
        </Grid>

        <Tabs
          onChange={setTab}
          value={tab}
          tabs={[
            { value: "import", label: "Import" },
            { value: "history", label: "History", badge: String(batches.length) },
          ]}
        />

        {tab === "import" ? (
          <Stack>
            <Card>
              <CardHeader>
                <div>
                  <Kicker>Step 1</Kicker>
                  <CardTitle>Choose a file</CardTitle>
                </div>
                <Button onClick={() => void template()} size="quiet" variant="secondary">
                  Load template
                </Button>
              </CardHeader>
              <CardDescription>
                {ENTITY_KINDS.find((kind) => kind.value === entityKind)?.help}
              </CardDescription>
              <form className="ui-stack" onSubmit={(event) => void validate(event)}>
                <div className="ui-form-grid">
                  <SelectField
                    label="What are you importing"
                    onChange={(event) => setEntityKind(event.target.value as ImportEntityKind)}
                    value={entityKind}
                  >
                    {ENTITY_KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    label="File name"
                    name="fileName"
                    onChange={(event) => setFileName(event.target.value)}
                    value={fileName}
                  />
                  <SelectField label="Separator" name="delimiter" defaultValue=",">
                    <option value=",">Comma</option>
                    <option value=";">Semicolon</option>
                    <option value={"\t"}>Tab</option>
                  </SelectField>
                  <label className="ui-field">
                    <span>Upload a CSV file</span>
                    <input accept=".csv,.tsv,.txt" onChange={readFile} type="file" />
                    <small>The file is read in your browser and sent as text for validation.</small>
                  </label>
                </div>
                <TextareaField
                  hint="You can also paste rows directly from a spreadsheet."
                  label="File content"
                  onChange={(event) => setContent(event.target.value)}
                  rows={8}
                  value={content}
                />
                <FormFooter>
                  <span className="ui-card-description">
                    Validation never creates records. It only tells you what would happen.
                  </span>
                  <Button disabled={busy || !content.trim()} type="submit">
                    {busy ? "Checking..." : "Validate file"}
                  </Button>
                </FormFooter>
              </form>
            </Card>

            {preview ? (
              <DataTable
                caption="Preview"
                kicker="Step 2"
                toolbar={
                  <div className="ui-row">
                    <Badge tone="success">{preview.validRows} ready</Badge>
                    {preview.invalidRows ? (
                      <Badge tone="danger">{preview.invalidRows} refused</Badge>
                    ) : null}
                    <Badge tone="neutral">{preview.status}</Badge>
                    <Button
                      disabled={busy || preview.invalidRows > 0 || preview.status !== "VALIDATED"}
                      onClick={() => void apply()}
                    >
                      Apply
                    </Button>
                  </div>
                }
                getRowKey={(row) => String(row.rowNumber)}
                rows={preview.rows.slice(0, 100)}
                empty="No rows were found in this file."
                columns={[
                  { header: "Row", align: "right", render: (row) => row.rowNumber },
                  {
                    header: "Result",
                    render: (row) =>
                      row.valid ? (
                        <Badge tone="success">Will be created</Badge>
                      ) : (
                        <Badge tone="danger">Refused</Badge>
                      ),
                  },
                  {
                    header: "Values",
                    render: (row) =>
                      Object.entries(row.values)
                        .filter(([, value]) => value)
                        .slice(0, 4)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · "),
                  },
                  {
                    header: "Why refused",
                    render: (row) => (row.errors.length ? row.errors.join(" ") : "-"),
                  },
                ]}
              />
            ) : (
              <StatePanel state="empty" title="No file checked yet">
                Load a template or paste a CSV export, then validate it. Nothing is written until
                you apply the preview.
              </StatePanel>
            )}
          </Stack>
        ) : null}

        {tab === "history" ? (
          <ResourceState error={error} onRetry={reload} state={state} title="Import history">
            <DataTable
              caption="Past imports"
              kicker="Every run"
              getRowKey={(batch) => batch.id}
              rows={batches}
              empty="No imports have been run yet."
              columns={[
                { header: "File", render: (batch) => <strong>{batch.fileName}</strong> },
                { header: "Type", render: (batch) => batch.entityKind },
                { header: "When", render: (batch) => formatDateTime(batch.createdAt) },
                { header: "Rows", align: "right", render: (batch) => batch.totalRows },
                { header: "Created", align: "right", render: (batch) => batch.appliedRows },
                {
                  header: "Status",
                  render: (batch) => (
                    <Badge
                      tone={
                        batch.status === "APPLIED"
                          ? "success"
                          : batch.status === "FAILED"
                            ? "danger"
                            : batch.status === "ROLLED_BACK"
                              ? "warning"
                              : "information"
                      }
                    >
                      {batch.status}
                    </Badge>
                  ),
                },
                {
                  header: "Actions",
                  align: "right",
                  render: (batch) => (
                    <div className="ui-row">
                      <Button
                        onClick={() => {
                          if (!api || !identity) return;
                          void api
                            .getImportPreview(identity.businessId, batch.id)
                            .then(setPreview)
                            .catch((cause: unknown) =>
                              toasts.push({
                                title: "Preview not loaded",
                                description: errorMessage(cause),
                                tone: "danger",
                              }),
                            );
                        }}
                        size="quiet"
                        variant="secondary"
                      >
                        Open
                      </Button>
                      {batch.status === "APPLIED" ? (
                        <Button
                          onClick={() => setRollbackTarget(batch)}
                          size="quiet"
                          variant="ghost"
                        >
                          Roll back
                        </Button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          </ResourceState>
        ) : null}
      </Stack>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Roll back import"
        consequence={`Every record this import created will be removed. Records that are already used on a sale cannot be removed, and the roll back will stop with an explanation instead.`}
        onCancel={() => setRollbackTarget(null)}
        onConfirm={() => {
          if (rollbackTarget) void rollback(rollbackTarget.id);
        }}
        open={rollbackTarget !== null}
        title="Roll back this import?"
      />
    </Workspace>
  );
}
