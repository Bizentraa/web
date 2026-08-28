"use client";

import type {
  CatalogReferenceData,
  CustomerDetail,
  CustomerListRow,
  Paginated,
} from "@bizentra/contracts";
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
import { useState, type FormEvent } from "react";

import { readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface CustomersData {
  customers: Paginated<CustomerListRow>;
  reference: CatalogReferenceData;
}

export default function CustomersPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const { data, state, error, reload } = useResource<CustomersData>(
    async (client, businessId) => {
      const [customers, reference] = await Promise.all([
        client.listCustomers(businessId, {
          pageSize: 25,
          ...(debounced ? { search: debounced } : {}),
          ...(statusFilter ? { status: statusFilter as "ACTIVE" | "INACTIVE" } : {}),
        }),
        client.getCatalogReference(businessId),
      ]);
      return { customers, reference };
    },
    [debounced, statusFilter],
  );

  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

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

  const openDetail = async (row: CustomerListRow) => {
    if (!api || !identity) return;
    try {
      setDetail(await api.getCustomer(identity.businessId, row.id));
    } catch (cause) {
      toasts.push({
        title: "Customer not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
    }
  };

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const groupId = readText(form, "groupId");
    const ok = await run("Customer created.", () =>
      api.createCustomer(identity.businessId, {
        code: readText(form, "code"),
        name: readText(form, "name"),
        ...(groupId ? { groupId } : {}),
        ...(readOptionalText(form, "email") ? { email: readText(form, "email") } : {}),
        ...(readOptionalText(form, "phone") ? { phone: readText(form, "phone") } : {}),
        ...(readOptionalText(form, "notes") ? { notes: readText(form, "notes") } : {}),
        ...(readOptionalText(form, "line1")
          ? {
              billingAddress: {
                line1: readText(form, "line1"),
                city: readText(form, "city"),
                postalCode: readText(form, "postalCode"),
              },
            }
          : {}),
      }),
    );
    if (ok) setCreateOpen(false);
  };

  const saveCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !detail) return;
    const form = new FormData(event.currentTarget);
    const ok = await run("Customer saved.", () =>
      api.updateCustomer(identity.businessId, detail.id, {
        name: readText(form, "name"),
        groupId: readText(form, "groupId") || null,
        email: readOptionalText(form, "email") ?? null,
        phone: readOptionalText(form, "phone") ?? null,
        notes: readOptionalText(form, "notes") ?? null,
        status: readText(form, "status", "ACTIVE") as "ACTIVE" | "INACTIVE",
      }),
    );
    if (ok) setDetail(null);
  };

  return (
    <Workspace
      status={<StatusChip tone="success">{data?.customers.total ?? 0} customer(s)</StatusChip>}
      description="Contacts, groups, purchase history and store credit for the people who buy from this Business."
      eyebrow="Customers"
      title="Customers"
      headerActions={
        <>
          <Button onClick={() => setGroupOpen(true)} variant="secondary">
            New group
          </Button>
          <Button onClick={() => setCreateOpen(true)}>New customer</Button>
        </>
      }
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Customers">
          {data ? (
            <DataTable
              caption="Customers"
              kicker="Customer records"
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Search by name, code, phone or email",
              }}
              filters={
                <SelectField
                  label="Status"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="">Every status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </SelectField>
              }
              chips={
                statusFilter
                  ? [{ label: `Status: ${statusFilter}`, onClear: () => setStatusFilter("") }]
                  : []
              }
              toolbar={<Button onClick={() => setCreateOpen(true)}>New customer</Button>}
              summary={`${data.customers.total} customer(s). Click a row to open the record.`}
              getRowKey={(customer) => customer.id}
              onRowSelect={(customer) => void openDetail(customer)}
              rows={data.customers.rows}
              empty="No customers match this search. Create one or import a CSV file."
              columns={[
                { header: "Name", render: (customer) => <strong>{customer.name}</strong> },
                { header: "Code", render: (customer) => customer.code },
                {
                  header: "Group",
                  hideOnMobile: true,
                  render: (customer) => customer.groupName ?? "-",
                },
                { header: "Phone", render: (customer) => customer.phone ?? "-" },
                { header: "Sales", align: "right", render: (customer) => customer.salesCount },
                {
                  header: "Spent",
                  align: "right",
                  render: (customer) => formatMoney(customer.salesTotal),
                },
                {
                  header: "Store credit",
                  align: "right",
                  render: (customer) =>
                    customer.storeCredit > 0 ? (
                      <Badge tone="success">{formatMoney(customer.storeCredit)}</Badge>
                    ) : (
                      "-"
                    ),
                },
                {
                  header: "Status",
                  render: (customer) => (
                    <Badge tone={customer.status === "ACTIVE" ? "success" : "neutral"}>
                      {customer.status}
                    </Badge>
                  ),
                },
              ]}
            />
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description="Only a code and a name are required. Everything else can be added later."
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="New customer"
      >
        <form className="ui-stack" onSubmit={(event) => void createCustomer(event)}>
          <FormGrid>
            <Field label="Customer code" name="code" placeholder="CUS-0001" required />
            <Field label="Name" name="name" placeholder="Nimal Perera" required />
            <SelectField label="Group" name="groupId" defaultValue="">
              <option value="">No group</option>
              {(data?.reference.customerGroups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </SelectField>
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
          </FormGrid>
          <FormGrid>
            <Field label="Address line" name="line1" />
            <Field label="City" name="city" />
            <Field label="Postal code" name="postalCode" />
          </FormGrid>
          <Field label="Notes" name="notes" />
          <FormFooter>
            <Button onClick={() => setCreateOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create customer
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Groups let a set of customers share one price list."
        onClose={() => setGroupOpen(false)}
        open={groupOpen}
        title="New customer group"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity) return;
            const form = new FormData(event.currentTarget);
            void run("Customer group created.", () =>
              api.createCustomerGroup(identity.businessId, {
                code: readText(form, "code"),
                name: readText(form, "name"),
              }),
            ).then((ok) => {
              if (ok) setGroupOpen(false);
            });
          }}
        >
          <FormGrid>
            <Field label="Group code" name="code" placeholder="WHOLESALE" required />
            <Field label="Group name" name="name" placeholder="Wholesale" required />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setGroupOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create group
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Drawer
        eyebrow="Customer"
        onClose={() => setDetail(null)}
        open={detail !== null}
        title={detail?.name ?? "Customer"}
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
                  <span>{detail.salesCount} sale(s)</span>
                  <span>{formatMoney(detail.salesTotal)} spent</span>
                  <span>{formatMoney(detail.storeCredit)} store credit</span>
                </>
              }
            />

            <form className="ui-stack" onSubmit={(event) => void saveCustomer(event)}>
              <FormGrid>
                <Field label="Name" name="name" defaultValue={detail.name} required />
                <SelectField label="Group" name="groupId" defaultValue={detail.groupId ?? ""}>
                  <option value="">No group</option>
                  {(data?.reference.customerGroups ?? []).map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </SelectField>
                <Field label="Phone" name="phone" defaultValue={detail.phone ?? ""} />
                <Field label="Email" name="email" type="email" defaultValue={detail.email ?? ""} />
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
                  Save customer
                </Button>
              </FormFooter>
            </form>

            <DataTable
              caption="Recent sales"
              summary="Store credit is issued by a refund and can be spent as a tender on a later sale."
              kicker="Sales"
              getRowKey={(sale) => sale.id}
              rows={detail.recentSales}
              empty="This customer has not bought anything yet."
              columns={[
                { header: "Number", render: (sale) => sale.receiptNumber ?? sale.number },
                { header: "When", render: (sale) => formatDateTime(sale.createdAt) },
                { header: "Total", align: "right", render: (sale) => formatMoney(sale.total) },
                { header: "Status", render: (sale) => sale.status },
              ]}
            />

            <DataTable
              caption="Store credit"
              kicker="Store credit"
              toolbar={
                <Badge tone={detail.storeCredit > 0 ? "success" : "neutral"}>
                  {formatMoney(detail.storeCredit)}
                </Badge>
              }
              getRowKey={(entry) => entry.id}
              rows={detail.storeCreditEntries}
              empty="No store credit has been issued to this customer."
              columns={[
                { header: "When", render: (entry) => formatDateTime(entry.createdAt) },
                { header: "Kind", render: (entry) => entry.kind },
                {
                  header: "Amount",
                  align: "right",
                  render: (entry) => formatMoney(entry.amount),
                },
                {
                  header: "Balance",
                  align: "right",
                  render: (entry) => formatMoney(entry.balanceAfter),
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
                  { label: "Customer code", value: detail.code },
                  {
                    label: "Billing address",
                    value: detail.billingAddress
                      ? Object.values(detail.billingAddress).filter(Boolean).join(", ")
                      : "Not recorded",
                  },
                ]}
              />
            </Card>
          </Stack>
        ) : null}
      </Drawer>
    </Workspace>
  );
}
