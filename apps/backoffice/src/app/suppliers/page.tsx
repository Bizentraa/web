"use client";

import type { ItemListRow, Paginated, SupplierDetail, SupplierListRow } from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  DataTable,
  DescriptionList,
  EntityHeader,
  Field,
  formatDateTime,
  formatMoney,
  FormFooter,
  FormGrid,
  SelectField,
  Stack,
  StatusChip,
  Timeline,
} from "@bizentra/design-system";
import { Dialog, Drawer, useDebouncedValue, useToasts } from "@bizentra/design-system/client";
import { useState } from "react";

import { readOptionalNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface SuppliersData {
  suppliers: Paginated<SupplierListRow>;
  items: Paginated<ItemListRow>;
}

export default function SuppliersPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const { data, state, error, reload } = useResource<SuppliersData>(
    async (client, businessId) => {
      const [suppliers, items] = await Promise.all([
        client.listSuppliers(businessId, {
          pageSize: 25,
          ...(debounced ? { search: debounced } : {}),
        }),
        client.listItems(businessId, { pageSize: 100, status: "ACTIVE" }),
      ]);
      return { suppliers, items };
    },
    [debounced],
  );

  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);

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

  const openDetail = async (row: SupplierListRow) => {
    if (!api || !identity) return;
    try {
      setDetail(await api.getSupplier(identity.businessId, row.id));
    } catch (cause) {
      toasts.push({
        title: "Supplier not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
    }
  };

  const refreshDetail = async (supplierId: string) => {
    if (!api || !identity) return;
    setDetail(await api.getSupplier(identity.businessId, supplierId));
  };

  return (
    <Workspace
      status={<StatusChip tone="success">{data?.suppliers.total ?? 0} supplier(s)</StatusChip>}
      description="Supplier contacts, payment terms, lead times and the items each supplier provides."
      title="Suppliers"
      headerActions={<Button onClick={() => setCreateOpen(true)}>New supplier</Button>}
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Suppliers">
          {data ? (
            <DataTable
              caption="Suppliers"
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Search by supplier name or code",
              }}
              summary={`${data.suppliers.total} supplier(s). Click a row to open the record.`}
              getRowKey={(supplier) => supplier.id}
              onRowSelect={(supplier) => void openDetail(supplier)}
              rows={data.suppliers.rows}
              empty="No suppliers yet. Create one or import a CSV file."
              columns={[
                { header: "Name", render: (supplier) => <strong>{supplier.name}</strong> },
                { header: "Code", render: (supplier) => supplier.code },
                { header: "Phone", render: (supplier) => supplier.phone ?? "-" },
                {
                  header: "Terms",
                  hideOnMobile: true,
                  render: (supplier) => supplier.paymentTerms ?? "-",
                },
                {
                  header: "Lead time",
                  align: "right",
                  render: (supplier) =>
                    supplier.leadTimeDays === null ? "-" : `${supplier.leadTimeDays} day(s)`,
                },
                { header: "Items", align: "right", render: (supplier) => supplier.itemCount },
                {
                  header: "Status",
                  render: (supplier) => (
                    <Badge tone={supplier.status === "ACTIVE" ? "success" : "neutral"}>
                      {supplier.status}
                    </Badge>
                  ),
                },
              ]}
            />
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description="Payment terms and lead time drive purchasing suggestions later."
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="New supplier"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity) return;
            const form = new FormData(event.currentTarget);
            void run("Supplier created.", () =>
              api.createSupplier(identity.businessId, {
                code: readText(form, "code"),
                name: readText(form, "name"),
                ...(readOptionalText(form, "email") ? { email: readText(form, "email") } : {}),
                ...(readOptionalText(form, "phone") ? { phone: readText(form, "phone") } : {}),
                ...(readOptionalNumber(form, "leadTimeDays") === undefined
                  ? {}
                  : { leadTimeDays: readOptionalNumber(form, "leadTimeDays") }),
                ...(readOptionalText(form, "paymentTerms")
                  ? { paymentTerms: readText(form, "paymentTerms") }
                  : {}),
                ...(readOptionalText(form, "notes") ? { notes: readText(form, "notes") } : {}),
              }),
            ).then((ok) => {
              if (ok) setCreateOpen(false);
            });
          }}
        >
          <FormGrid>
            <Field label="Supplier code" name="code" placeholder="SUP-0001" required />
            <Field label="Supplier name" name="name" placeholder="Island Distributors" required />
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
            <Field label="Lead time (days)" name="leadTimeDays" inputMode="numeric" />
            <Field label="Payment terms" name="paymentTerms" placeholder="30 days" />
          </FormGrid>
          <Field label="Notes" name="notes" />
          <FormFooter>
            <Button onClick={() => setCreateOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create supplier
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Drawer
        eyebrow="Supplier"
        onClose={() => setDetail(null)}
        open={detail !== null}
        title={detail?.name ?? "Supplier"}
      >
        {detail ? (
          <Stack>
            <EntityHeader
              eyebrow={detail.code}
              title={detail.name}
              status={
                <StatusChip tone={detail.status === "ACTIVE" ? "success" : "neutral"}>
                  {detail.status}
                </StatusChip>
              }
              meta={
                <>
                  <span>{detail.itemCount} item(s)</span>
                  <span>{detail.paymentTerms ?? "No terms recorded"}</span>
                  <span>
                    {detail.leadTimeDays === null
                      ? "No lead time"
                      : `${detail.leadTimeDays} day lead time`}
                  </span>
                </>
              }
              actions={
                <Button onClick={() => setLinkOpen(true)} variant="secondary">
                  Link an item
                </Button>
              }
            />

            <form
              className="ui-stack"
              onSubmit={(event) => {
                event.preventDefault();
                if (!api || !identity) return;
                const form = new FormData(event.currentTarget);
                void run("Supplier saved.", () =>
                  api.updateSupplier(identity.businessId, detail.id, {
                    name: readText(form, "name"),
                    email: readOptionalText(form, "email") ?? null,
                    phone: readOptionalText(form, "phone") ?? null,
                    paymentTerms: readOptionalText(form, "paymentTerms") ?? null,
                    leadTimeDays: readOptionalNumber(form, "leadTimeDays") ?? null,
                    notes: readOptionalText(form, "notes") ?? null,
                    status: readText(form, "status", "ACTIVE") as "ACTIVE" | "INACTIVE",
                  }),
                ).then((ok) => {
                  if (ok) void refreshDetail(detail.id);
                });
              }}
            >
              <FormGrid>
                <Field label="Name" name="name" defaultValue={detail.name} required />
                <Field label="Phone" name="phone" defaultValue={detail.phone ?? ""} />
                <Field label="Email" name="email" type="email" defaultValue={detail.email ?? ""} />
                <Field
                  label="Lead time (days)"
                  name="leadTimeDays"
                  defaultValue={detail.leadTimeDays ?? ""}
                  inputMode="numeric"
                />
                <Field
                  label="Payment terms"
                  name="paymentTerms"
                  defaultValue={detail.paymentTerms ?? ""}
                />
                <SelectField label="Status" name="status" defaultValue={detail.status}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </SelectField>
              </FormGrid>
              <Field label="Notes" name="notes" defaultValue={detail.notes ?? ""} />
              <FormFooter>
                <Button onClick={() => setDetail(null)} variant="secondary">
                  Close
                </Button>
                <Button disabled={busy} type="submit">
                  Save supplier
                </Button>
              </FormFooter>
            </form>

            <DataTable
              caption="Supplied items"
              summary="Each link keeps the supplier code, cost and lead time that purchasing will use."
              toolbar={<Button onClick={() => setLinkOpen(true)}>Link item</Button>}
              getRowKey={(supplierItem) => supplierItem.itemId}
              rows={detail.items}
              empty="No items are linked to this supplier yet."
              columns={[
                { header: "Item", render: (supplierItem) => supplierItem.itemName },
                {
                  header: "Their code",
                  render: (supplierItem) => supplierItem.supplierCode ?? "-",
                },
                {
                  header: "Cost",
                  align: "right",
                  render: (supplierItem) =>
                    supplierItem.costPrice === null ? "-" : formatMoney(supplierItem.costPrice),
                },
                {
                  header: "Lead time",
                  align: "right",
                  render: (supplierItem) =>
                    supplierItem.leadTimeDays === null
                      ? "-"
                      : `${supplierItem.leadTimeDays} day(s)`,
                },
              ]}
            />

            <Card>
              <CardTitle>History</CardTitle>
              <Timeline
                events={detail.timeline.map((entry) => ({
                  at: formatDateTime(entry.occurredAt),
                  by: entry.actor,
                  description: entry.entityType,
                  title: entry.summary,
                }))}
              />
              <DescriptionList
                items={[
                  { label: "Supplier code", value: detail.code },
                  {
                    label: "Address",
                    value: detail.address
                      ? Object.values(detail.address).filter(Boolean).join(", ")
                      : "Not recorded",
                  },
                ]}
              />
            </Card>
          </Stack>
        ) : null}
      </Drawer>

      <Dialog
        description="Record what this supplier calls the item, what it costs and how long it takes."
        onClose={() => setLinkOpen(false)}
        open={linkOpen}
        title="Link an item to this supplier"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity || !detail) return;
            const form = new FormData(event.currentTarget);
            void run("Supplier item saved.", () =>
              api.upsertSupplierItem(identity.businessId, detail.id, {
                itemId: readText(form, "itemId"),
                ...(readOptionalText(form, "supplierCode")
                  ? { supplierCode: readText(form, "supplierCode") }
                  : {}),
                ...(readOptionalNumber(form, "costPrice") === undefined
                  ? {}
                  : { costPrice: readOptionalNumber(form, "costPrice") }),
                ...(readOptionalNumber(form, "leadTimeDays") === undefined
                  ? {}
                  : { leadTimeDays: readOptionalNumber(form, "leadTimeDays") }),
              }),
            ).then((ok) => {
              if (ok) {
                setLinkOpen(false);
                void refreshDetail(detail.id);
              }
            });
          }}
        >
          <FormGrid>
            <SelectField label="Item" name="itemId" required>
              {(data?.items.rows ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <Field label="Supplier code" name="supplierCode" placeholder="ID-MILK" />
            <Field label="Cost price" name="costPrice" inputMode="decimal" />
            <Field label="Lead time (days)" name="leadTimeDays" inputMode="numeric" />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setLinkOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Save link
            </Button>
          </FormFooter>
        </form>
      </Dialog>
    </Workspace>
  );
}
