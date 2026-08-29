"use client";

import type {
  BusinessFoundationSummary,
  CatalogReferenceData,
  CustomerListRow,
  FinanceOverview,
  ItemListRow,
  Paginated,
  SupplierListRow,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Field,
  FormFooter,
  FormCard,
  FormGrid,
  Grid,
  Kicker,
  KpiCard,
  SelectField,
  Stack,
  StatusChip,
  formatDateTime,
  formatMoney,
} from "@bizentra/design-system";
import { Tabs, useToasts } from "@bizentra/design-system/client";
import { useMemo, useState, type FormEvent } from "react";

import { readNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface FinanceData {
  foundation: BusinessFoundationSummary;
  reference: CatalogReferenceData;
  finance: FinanceOverview;
  customers: Paginated<CustomerListRow>;
  suppliers: Paginated<SupplierListRow>;
  items: Paginated<ItemListRow>;
}

export default function FinancePage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("receivables");
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<FinanceData>(async (client, businessId) => {
    const [foundation, reference, finance, customers, suppliers, items] = await Promise.all([
      client.getBusinessFoundation(businessId),
      client.getCatalogReference(businessId),
      client.getFinanceOverview(businessId),
      client.listCustomers(businessId, { pageSize: 100, status: "ACTIVE" }),
      client.listSuppliers(businessId, { pageSize: 100, status: "ACTIVE" }),
      client.listItems(businessId, { pageSize: 100, status: "ACTIVE" }),
    ]);
    return { foundation, reference, finance, customers, suppliers, items };
  });

  const firstBranch = data?.foundation.branches[0];
  const firstCustomer = data?.customers.rows[0];
  const firstSupplier = data?.suppliers.rows[0];
  const firstItem = data?.items.rows[0];
  const defaultCurrency = data?.foundation.business.defaultCurrency ?? "USD";
  const firstExpenseCategory = data?.finance.expenseCategories[0];
  const firstBankAccount = data?.finance.bankAccounts[0];
  const secondBankAccount = data?.finance.bankAccounts.find(
    (account) => account.id !== firstBankAccount?.id,
  );
  const expenseCategoryOptions = useMemo(() => data?.finance.expenseCategories ?? [], [data]);
  const creditHolds = data?.finance.customerCredits.filter((row) => row.creditHold).length ?? 0;
  const overdueCredit =
    data?.finance.customerCredits.reduce((sum, row) => sum + row.overdueBalance, 0) ?? 0;

  const run = async (success: string, work: () => Promise<unknown>) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: success, tone: "success" });
    } catch (cause) {
      toasts.push({
        title: "Finance change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Workspace
      status={<StatusChip tone="information">Finance records active</StatusChip>}
      description="Customer invoices, supplier bills, expenses, cash and bank, loyalty and accounting events."
      title="Finance foundation"
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Finance">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Receivables"
                  value={formatMoney(data.finance.totals.receivables, defaultCurrency)}
                  trend={`${formatMoney(overdueCredit, defaultCurrency)} overdue`}
                  tone={data.finance.totals.receivables > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Payables"
                  value={formatMoney(data.finance.totals.payables, defaultCurrency)}
                  trend={`${data.finance.supplierBills.length} bill(s)`}
                  tone={data.finance.totals.payables > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Cash and bank"
                  value={formatMoney(data.finance.totals.cashAndBank, defaultCurrency)}
                  trend={`${data.finance.bankAccounts.length} account(s)`}
                  tone="information"
                />
                <KpiCard
                  label="Credit holds"
                  value={String(creditHolds)}
                  trend={`${data.finance.customerCredits.length} credit account(s)`}
                  tone={creditHolds > 0 ? "danger" : "success"}
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "receivables", label: "Receivables" },
                  { value: "credit", label: "Credit" },
                  { value: "payables", label: "Payables" },
                  { value: "expenses", label: "Expenses" },
                  { value: "cash", label: "Cash / bank" },
                  { value: "loyalty", label: "Loyalty" },
                  { value: "events", label: "Accounting events" },
                ]}
              />

              {tab === "receivables" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Invoices and collection status"
                      className="ui-scroll-panel"
                      empty="No customer invoice exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.finance.customerInvoices}
                      columns={[
                        { header: "Invoice", render: (row) => row.number },
                        { header: "Customer", render: (row) => row.customerName },
                        { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                        {
                          header: "Due",
                          hideOnMobile: true,
                          render: (row) => row.dueDate ?? "-",
                        },
                        {
                          header: "Ageing",
                          hideOnMobile: true,
                          render: (row) =>
                            row.daysOverdue > 0 ? (
                              <Badge tone="warning">{row.ageingBucket.replace("_", "-")}</Badge>
                            ) : (
                              <Badge tone="success">Current</Badge>
                            ),
                        },
                        {
                          header: "Balance",
                          align: "right",
                          render: (row) => formatMoney(row.balanceAmount, row.currencyCode),
                        },
                        {
                          header: "Posted",
                          hideOnMobile: true,
                          render: (row) => formatDateTime(row.postedAt),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <QuickCustomerInvoice
                      busy={busy}
                      currency={defaultCurrency}
                      customerId={firstCustomer?.id ?? ""}
                      {...(firstItem ? { itemId: firstItem.id } : {})}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Customer invoice posted", () =>
                          api!.createCustomerInvoice(identity!.businessId, {
                            branchId: firstBranch?.id,
                            customerId: readText(form, "customerId"),
                            currencyCode: readText(form, "currencyCode", defaultCurrency),
                            notes: readOptionalText(form, "notes"),
                            lines: [
                              {
                                itemId: readOptionalText(form, "itemId"),
                                description: readText(form, "description", "Finance invoice line"),
                                quantity: readNumber(form, "quantity", 1),
                                unitAmount: readNumber(form, "unitAmount", 0),
                                taxAmount: readNumber(form, "taxAmount", 0),
                              },
                            ],
                          }),
                        );
                      }}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "credit" ? (
                <DataTable
                  caption="Customer credit controls"
                  className="ui-scroll-panel"
                  empty="No customer credit exposure exists yet."
                  getRowKey={(row) => row.customerId}
                  rows={data.finance.customerCredits}
                  columns={[
                    { header: "Customer", render: (row) => row.customerName },
                    {
                      header: "Limit",
                      align: "right",
                      render: (row) => formatMoney(row.creditLimit, defaultCurrency),
                    },
                    {
                      header: "Receivable",
                      align: "right",
                      render: (row) => formatMoney(row.receivableBalance, defaultCurrency),
                    },
                    {
                      header: "Available",
                      align: "right",
                      render: (row) => formatMoney(row.availableCredit, defaultCurrency),
                    },
                    {
                      header: "Overdue",
                      align: "right",
                      render: (row) => formatMoney(row.overdueBalance, defaultCurrency),
                    },
                    {
                      header: "Terms",
                      hideOnMobile: true,
                      render: (row) =>
                        row.creditTermsDays === null ? "-" : `${row.creditTermsDays} day(s)`,
                    },
                    {
                      header: "Hold",
                      render: (row) =>
                        row.creditHold ? (
                          <Badge tone="danger">Hold</Badge>
                        ) : (
                          <Badge tone="success">Clear</Badge>
                        ),
                    },
                  ]}
                />
              ) : null}

              {tab === "payables" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Bills and payment status"
                      className="ui-scroll-panel"
                      empty="No supplier bill exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.finance.supplierBills}
                      columns={[
                        { header: "Bill", render: (row) => row.number },
                        { header: "Supplier", render: (row) => row.supplierName },
                        { header: "Status", render: (row) => row.status.replaceAll("_", " ") },
                        {
                          header: "Balance",
                          align: "right",
                          render: (row) => formatMoney(row.balanceAmount, row.currencyCode),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <QuickSupplierBill
                      busy={busy}
                      currency={defaultCurrency}
                      supplierId={firstSupplier?.id ?? ""}
                      {...(firstItem ? { itemId: firstItem.id } : {})}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Supplier bill posted", () =>
                          api!.createSupplierBill(identity!.businessId, {
                            branchId: firstBranch?.id,
                            supplierId: readText(form, "supplierId"),
                            currencyCode: readText(form, "currencyCode", defaultCurrency),
                            supplierDocument: readOptionalText(form, "supplierDocument"),
                            lines: [
                              {
                                itemId: readOptionalText(form, "itemId"),
                                description: readText(form, "description", "Supplier bill line"),
                                quantity: readNumber(form, "quantity", 1),
                                unitAmount: readNumber(form, "unitAmount", 0),
                                taxAmount: readNumber(form, "taxAmount", 0),
                              },
                            ],
                          }),
                        );
                      }}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "expenses" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Posted business expenses"
                      className="ui-scroll-panel"
                      empty="No expense exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.finance.expenses}
                      columns={[
                        { header: "Description", render: (row) => row.description },
                        { header: "Category", render: (row) => row.categoryName },
                        {
                          header: "Amount",
                          align: "right",
                          render: (row) => formatMoney(row.amount, row.currencyCode),
                        },
                        {
                          header: "Method",
                          hideOnMobile: true,
                          render: (row) => row.paymentMethod,
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <QuickExpense
                      busy={busy}
                      currency={defaultCurrency}
                      categories={expenseCategoryOptions}
                      {...(firstExpenseCategory ? { categoryId: firstExpenseCategory.id } : {})}
                      onCreateCategory={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Expense category created", () =>
                          api!.createExpenseCategory(identity!.businessId, {
                            code: readText(form, "code"),
                            name: readText(form, "name"),
                          }),
                        );
                      }}
                      onCreateExpense={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        const categoryId = readText(form, "categoryId");
                        void run("Expense posted", () =>
                          api!.createExpense(identity!.businessId, {
                            branchId: firstBranch?.id,
                            categoryId,
                            amount: readNumber(form, "amount", 0),
                            taxAmount: readNumber(form, "taxAmount", 0),
                            currencyCode: readText(form, "currencyCode", defaultCurrency),
                            paymentMethod: readText(form, "paymentMethod", "Cash"),
                            supplierName: readOptionalText(form, "supplierName"),
                            description: readText(form, "description", "Business expense"),
                          }),
                        );
                      }}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "cash" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Accounts and latest movements"
                      className="ui-scroll-panel"
                      empty="No cash or bank account exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.finance.bankAccounts}
                      columns={[
                        { header: "Code", render: (row) => row.code },
                        { header: "Account", render: (row) => row.name },
                        { header: "Type", render: (row) => row.type },
                        {
                          header: "Balance",
                          align: "right",
                          render: (row) => formatMoney(row.currentBalance, row.currencyCode),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <QuickBankAccount
                      busy={busy}
                      currency={defaultCurrency}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Cash or bank account created", () =>
                          api!.createBankAccount(identity!.businessId, {
                            code: readText(form, "code"),
                            name: readText(form, "name"),
                            type: readText(form, "type", "CASH") as "CASH",
                            currencyCode: readText(form, "currencyCode", defaultCurrency),
                            openingBalance: readNumber(form, "openingBalance", 0),
                          }),
                        );
                      }}
                    />
                    <QuickBankTransfer
                      accounts={data.finance.bankAccounts}
                      busy={busy}
                      currency={defaultCurrency}
                      fromAccountId={firstBankAccount?.id ?? ""}
                      toAccountId={secondBankAccount?.id ?? ""}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Cash or bank transfer posted", () =>
                          api!.postBankTransfer(identity!.businessId, {
                            branchId: firstBranch?.id,
                            fromAccountId: readText(form, "fromAccountId"),
                            toAccountId: readText(form, "toAccountId"),
                            amount: readNumber(form, "amount", 0),
                            currencyCode: readText(form, "currencyCode", defaultCurrency),
                            reference: readOptionalText(form, "reference"),
                            description: readText(form, "description", "Account transfer"),
                          }),
                        );
                      }}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "loyalty" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Customer points and tiers"
                      className="ui-scroll-panel"
                      empty="No loyalty balance exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.finance.loyaltyAccounts}
                      columns={[
                        { header: "Customer", render: (row) => row.customerName },
                        { header: "Tier", render: (row) => row.tier },
                        { header: "Points", align: "right", render: (row) => row.pointsBalance },
                        {
                          header: "Activity",
                          hideOnMobile: true,
                          render: (row) => formatDateTime(row.lastActivityAt),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <QuickLoyalty
                      busy={busy}
                      customerId={firstCustomer?.id ?? ""}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void run("Loyalty points adjusted", () =>
                          api!.adjustLoyalty(identity!.businessId, {
                            customerId: readText(form, "customerId"),
                            kind: readText(form, "kind", "EARN") as "EARN",
                            points: readNumber(form, "points", 0),
                            tier: readOptionalText(form, "tier"),
                            reference: readOptionalText(form, "reference"),
                            reason: readText(form, "reason", "Manual loyalty adjustment"),
                          }),
                        );
                      }}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "events" ? (
                <DataTable
                  caption="Finance event queue"
                  className="ui-scroll-panel"
                  empty="No accounting event exists yet."
                  getRowKey={(row) => row.id}
                  rows={data.finance.accountingEvents}
                  columns={[
                    { header: "Event", render: (row) => row.eventType },
                    { header: "Source", render: (row) => `${row.sourceType} · ${row.sourceId}` },
                    { header: "Status", render: (row) => row.status },
                    {
                      header: "Amount",
                      align: "right",
                      render: (row) =>
                        row.amount === null
                          ? "-"
                          : formatMoney(row.amount, row.currencyCode ?? defaultCurrency),
                    },
                    {
                      header: "Created",
                      hideOnMobile: true,
                      render: (row) => formatDateTime(row.createdAt),
                    },
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

function QuickCustomerInvoice({
  busy,
  currency,
  customerId,
  itemId,
  onSubmit,
}: {
  busy: boolean;
  currency: string;
  customerId: string;
  itemId?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormCard onSubmit={onSubmit}>
      <CardHeader>
        <div>
          <Kicker>Quick action</Kicker>
          <CardTitle>Post customer invoice</CardTitle>
          <CardDescription>Use this to record money owed by a customer.</CardDescription>
        </div>
      </CardHeader>
      <FormGrid>
        <Field label="Customer ID" name="customerId" defaultValue={customerId} required />
        <Field label="Item ID" name="itemId" defaultValue={itemId ?? ""} />
        <Field
          label="Description"
          name="description"
          defaultValue="Customer invoice line"
          required
        />
        <Field label="Quantity" name="quantity" defaultValue="1" inputMode="decimal" required />
        <Field
          label="Unit amount"
          name="unitAmount"
          defaultValue="100"
          inputMode="decimal"
          required
        />
        <Field label="Tax amount" name="taxAmount" defaultValue="0" inputMode="decimal" />
        <Field label="Currency" name="currencyCode" defaultValue={currency} required />
      </FormGrid>
      <FormFooter>
        <Button disabled={busy || !customerId} type="submit">
          Post invoice
        </Button>
      </FormFooter>
    </FormCard>
  );
}

function QuickSupplierBill({
  busy,
  currency,
  itemId,
  supplierId,
  onSubmit,
}: {
  busy: boolean;
  currency: string;
  itemId?: string;
  supplierId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormCard onSubmit={onSubmit}>
      <CardHeader>
        <div>
          <Kicker>Quick action</Kicker>
          <CardTitle>Post supplier bill</CardTitle>
          <CardDescription>Use this to record money owed to a supplier.</CardDescription>
        </div>
      </CardHeader>
      <FormGrid>
        <Field label="Supplier ID" name="supplierId" defaultValue={supplierId} required />
        <Field label="Supplier document" name="supplierDocument" placeholder="INV-1001" />
        <Field label="Item ID" name="itemId" defaultValue={itemId ?? ""} />
        <Field label="Description" name="description" defaultValue="Supplier bill line" required />
        <Field label="Quantity" name="quantity" defaultValue="1" inputMode="decimal" required />
        <Field label="Unit cost" name="unitAmount" defaultValue="60" inputMode="decimal" required />
        <Field label="Tax amount" name="taxAmount" defaultValue="0" inputMode="decimal" />
        <Field label="Currency" name="currencyCode" defaultValue={currency} required />
      </FormGrid>
      <FormFooter>
        <Button disabled={busy || !supplierId} type="submit">
          Post bill
        </Button>
      </FormFooter>
    </FormCard>
  );
}

function QuickExpense({
  busy,
  categories,
  categoryId,
  currency,
  onCreateCategory,
  onCreateExpense,
}: {
  busy: boolean;
  categories: Array<{ id: string; code: string; name: string }>;
  categoryId?: string;
  currency: string;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateExpense: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Stack>
      <FormCard onSubmit={onCreateCategory}>
        <CardHeader>
          <div>
            <Kicker>Setup</Kicker>
            <CardTitle>Create expense category</CardTitle>
          </div>
        </CardHeader>
        <FormGrid>
          <Field label="Code" name="code" defaultValue="UTILITIES" required />
          <Field label="Name" name="name" defaultValue="Utilities" required />
        </FormGrid>
        <FormFooter>
          <Button disabled={busy} type="submit" variant="secondary">
            Create category
          </Button>
        </FormFooter>
      </FormCard>
      <FormCard onSubmit={onCreateExpense}>
        <CardHeader>
          <div>
            <Kicker>Quick action</Kicker>
            <CardTitle>Post expense</CardTitle>
            <CardDescription>Create a category first, then use its ID for posting.</CardDescription>
          </div>
        </CardHeader>
        <FormGrid>
          <SelectField label="Category" name="categoryId" defaultValue={categoryId ?? ""} required>
            <option value="">Choose category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.code} · {category.name}
              </option>
            ))}
          </SelectField>
          <Field label="Description" name="description" defaultValue="Business expense" required />
          <Field label="Amount" name="amount" defaultValue="25" inputMode="decimal" required />
          <Field label="Tax amount" name="taxAmount" defaultValue="0" inputMode="decimal" />
          <Field label="Payment method" name="paymentMethod" defaultValue="Cash" required />
          <Field label="Supplier name" name="supplierName" placeholder="Optional" />
          <Field label="Currency" name="currencyCode" defaultValue={currency} required />
        </FormGrid>
        <FormFooter>
          <Button disabled={busy} type="submit">
            Post expense
          </Button>
        </FormFooter>
      </FormCard>
    </Stack>
  );
}

function QuickBankAccount({
  busy,
  currency,
  onSubmit,
}: {
  busy: boolean;
  currency: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormCard onSubmit={onSubmit}>
      <CardHeader>
        <div>
          <Kicker>Setup</Kicker>
          <CardTitle>Create cash or bank account</CardTitle>
        </div>
      </CardHeader>
      <FormGrid>
        <Field label="Code" name="code" defaultValue="MAIN-CASH" required />
        <Field label="Name" name="name" defaultValue="Main Cash" required />
        <SelectField label="Type" name="type" defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
          <option value="GATEWAY">Gateway</option>
          <option value="WALLET">Wallet</option>
        </SelectField>
        <Field label="Opening balance" name="openingBalance" defaultValue="0" inputMode="decimal" />
        <Field label="Currency" name="currencyCode" defaultValue={currency} required />
      </FormGrid>
      <FormFooter>
        <Button disabled={busy} type="submit">
          Create account
        </Button>
      </FormFooter>
    </FormCard>
  );
}

function QuickBankTransfer({
  accounts,
  busy,
  currency,
  fromAccountId,
  onSubmit,
  toAccountId,
}: {
  accounts: FinanceOverview["bankAccounts"];
  busy: boolean;
  currency: string;
  fromAccountId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  toAccountId: string;
}) {
  return (
    <FormCard onSubmit={onSubmit}>
      <CardHeader>
        <div>
          <Kicker>Transfer</Kicker>
          <CardTitle>Move between accounts</CardTitle>
          <CardDescription>Creates both sides of the cash or bank movement.</CardDescription>
        </div>
      </CardHeader>
      <FormGrid>
        <BankAccountSelect
          accounts={accounts}
          label="From account"
          name="fromAccountId"
          defaultValue={fromAccountId}
        />
        <BankAccountSelect
          accounts={accounts}
          label="To account"
          name="toAccountId"
          defaultValue={toAccountId}
        />
        <Field label="Amount" name="amount" defaultValue="100" inputMode="decimal" required />
        <Field label="Currency" name="currencyCode" defaultValue={currency} required />
        <Field label="Reference" name="reference" placeholder="Optional" />
        <Field label="Description" name="description" defaultValue="Account transfer" required />
      </FormGrid>
      <FormFooter>
        <Button disabled={busy || accounts.length < 2} type="submit">
          Post transfer
        </Button>
      </FormFooter>
    </FormCard>
  );
}

function QuickLoyalty({
  busy,
  customerId,
  onSubmit,
}: {
  busy: boolean;
  customerId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormCard onSubmit={onSubmit}>
      <CardHeader>
        <div>
          <Kicker>Quick action</Kicker>
          <CardTitle>Adjust loyalty</CardTitle>
          <CardDescription>
            Earn adds points. Redeem, adjust and expire reduce points.
          </CardDescription>
        </div>
      </CardHeader>
      <FormGrid>
        <Field label="Customer ID" name="customerId" defaultValue={customerId} required />
        <SelectField label="Action" name="kind" defaultValue="EARN">
          <option value="EARN">Earn</option>
          <option value="REDEEM">Redeem</option>
          <option value="ADJUST">Adjust down</option>
          <option value="EXPIRE">Expire</option>
        </SelectField>
        <Field label="Points" name="points" defaultValue="10" inputMode="decimal" required />
        <Field label="Tier" name="tier" placeholder="STANDARD" />
        <Field label="Reference" name="reference" placeholder="Optional" />
        <Field label="Reason" name="reason" defaultValue="Manual loyalty adjustment" required />
      </FormGrid>
      <FormFooter>
        <Button disabled={busy || !customerId} type="submit">
          Adjust points
        </Button>
      </FormFooter>
    </FormCard>
  );
}

function BankAccountSelect({
  accounts,
  defaultValue,
  label,
  name,
}: {
  accounts: FinanceOverview["bankAccounts"];
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <SelectField label={label} name={name} defaultValue={defaultValue} required>
      <option value="">Choose account</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.code} · {account.name}
        </option>
      ))}
    </SelectField>
  );
}
