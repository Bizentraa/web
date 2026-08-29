"use client";

import type {
  CatalogReferenceData,
  CustomerListRow,
  Paginated,
  PosCatalogEntry,
  SaleDetail,
  SaleListRow,
  ShiftSummary,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DescriptionList,
  EntityHeader,
  Field,
  formatDateTime,
  formatMoney,
  formatQuantity,
  FormFooter,
  FormGrid,
  Grid,
  KpiCard,
  MoneySummary,
  ReceiptView,
  SelectField,
  Stack,
  StatusChip,
  Timeline,
} from "@bizentra/design-system";
import {
  ConfirmDialog,
  createIdempotencyKey,
  Dialog,
  Drawer,
  Tabs,
  useDebouncedValue,
  useToasts,
} from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readOptionalNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface SalesData {
  sales: Paginated<SaleListRow>;
  shifts: ShiftSummary[];
  reference: CatalogReferenceData;
  customers: Paginated<CustomerListRow>;
  catalog: PosCatalogEntry[];
}

export default function SalesPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const { data, state, error, reload } = useResource<SalesData>(
    async (client, businessId) => {
      const [sales, shifts] = await Promise.all([
        client.listSales(businessId, {
          pageSize: 25,
          ...(debounced ? { search: debounced } : {}),
          ...(statusFilter ? { status: statusFilter as SaleListRow["status"] } : {}),
        }),
        client.listShifts(businessId),
      ]);
      const reference = await client.getCatalogReference(businessId);
      const activeBranch = reference.branches.find((branch) => branch.status === "ACTIVE");
      const [customers, catalog] = await Promise.all([
        client.listCustomers(businessId, { pageSize: 50, status: "ACTIVE" }),
        activeBranch
          ? client.searchPosCatalog(businessId, { branchId: activeBranch.id, limit: 50 })
          : Promise.resolve([]),
      ]);
      return { sales, shifts, reference, customers, catalog };
    },
    [debounced, statusFilter],
  );

  const [tab, setTab] = useState("sales");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [shiftDetail, setShiftDetail] = useState<ShiftSummary | null>(null);
  const [shiftSearch, setShiftSearch] = useState("");
  const [shiftStatus, setShiftStatus] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<SaleDetail | null>(null);
  const [receipt, setReceipt] = useState<Awaited<
    ReturnType<NonNullable<typeof api>["getReceipt"]>
  > | null>(null);

  const openSale = async (row: SaleListRow) => {
    if (!api || !identity) return;
    try {
      setDetail(await api.getSale(identity.businessId, row.id));
    } catch (cause) {
      toasts.push({ title: "Sale not loaded", description: errorMessage(cause), tone: "danger" });
    }
  };

  const refreshDetail = async (saleId: string) => {
    if (!api || !identity) return;
    setDetail(await api.getSale(identity.businessId, saleId));
    await reload();
  };

  const createReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !detail) return;
    const form = new FormData(event.currentTarget);
    const lines = detail.lines
      .map((line) => ({
        saleLineId: line.id,
        quantity: readOptionalNumber(form, `quantity-${line.id}`) ?? 0,
        disposition: readText(form, `disposition-${line.id}`, "RESELLABLE") as "RESELLABLE",
      }))
      .filter((line) => line.quantity > 0);

    if (!lines.length) {
      toasts.push({
        title: "Nothing to return",
        description: "Enter the quantity being returned on at least one line.",
        tone: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await api.createReturn(identity.businessId, detail.id, {
        idempotencyKey: createIdempotencyKey("return"),
        reason: readText(form, "reason"),
        refundMethod: readText(form, "refundMethod", "ORIGINAL_METHOD") as "ORIGINAL_METHOD",
        lines,
      });
      toasts.push({
        title: `Return ${result.number} accepted`,
        description:
          result.refundTotal > 0
            ? `${formatMoney(result.refundTotal)} refunded.`
            : `${formatMoney(result.storeCreditTotal)} issued as store credit.`,
        tone: "success",
      });
      setReturnOpen(false);
      await refreshDetail(detail.id);
    } catch (cause) {
      toasts.push({ title: "Return refused", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const createCommercialDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const documentType = readText(form, "documentType", "QUOTATION") as "QUOTATION" | "ORDER";
    const branchId = readText(form, "branchId");
    const [itemId, variantId] = readText(form, "itemId").split(":");
    const quantity = readOptionalNumber(form, "quantity") ?? 1;
    const customerId = readOptionalText(form, "customerId");
    const note = readOptionalText(form, "note");

    if (!branchId || !itemId) {
      toasts.push({
        title: "Document not created",
        description: "Choose a Branch and an item before saving.",
        tone: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const input = {
        branchId,
        customerId,
        idempotencyKey: createIdempotencyKey(documentType === "ORDER" ? "order" : "quote"),
        note,
        lines: [{ itemId, variantId: variantId || undefined, quantity }],
      };
      const sale =
        documentType === "ORDER"
          ? await api.createSalesOrder(identity.businessId, input)
          : await api.createQuotation(identity.businessId, input);
      toasts.push({
        title: `${documentType === "ORDER" ? "Sales order" : "Quotation"} ${sale.number} created`,
        tone: "success",
      });
      setCreateOpen(false);
      setDetail(sale);
      await reload();
    } catch (cause) {
      toasts.push({
        title: "Document not created",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const convertQuotation = async () => {
    if (!api || !identity || !detail) return;
    setBusy(true);
    try {
      const sale = await api.convertQuotationToOrder(identity.businessId, detail.id, {});
      toasts.push({ title: `Sales order ${sale.number} created`, tone: "success" });
      setDetail(sale);
      await reload();
    } catch (cause) {
      toasts.push({
        title: "Quotation not converted",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmOrder = async () => {
    if (!api || !identity || !detail) return;
    setBusy(true);
    try {
      const sale = await api.confirmSalesOrder(identity.businessId, detail.id, {});
      toasts.push({ title: `Sale ${sale.number} confirmed`, tone: "success" });
      setDetail(sale);
      await reload();
    } catch (cause) {
      toasts.push({
        title: "Order not confirmed",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const showReceipt = async (saleId: string) => {
    if (!api || !identity) return;
    try {
      setReceipt(await api.getReceipt(identity.businessId, saleId));
    } catch (cause) {
      toasts.push({
        title: "Receipt not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
    }
  };

  const sales = data?.sales;
  const shifts = data?.shifts ?? [];
  const branches = data?.reference.branches.filter((branch) => branch.status === "ACTIVE") ?? [];
  const customers = data?.customers.rows ?? [];
  const catalog = data?.catalog ?? [];
  const openShifts = shifts.filter((shift) => shift.status === "OPEN");
  /* Shifts arrive as one list; the screen filters them rather than asking the API again. */
  const visibleShifts = shifts.filter((shift) => {
    if (shiftStatus && shift.status !== shiftStatus) return false;
    const term = shiftSearch.trim().toLowerCase();
    if (!term) return true;
    return [shift.number, shift.registerCode, shift.branchName, shift.openedBy]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const todayTotal = sales?.rows.reduce((sum, sale) => sum + sale.total, 0) ?? 0;
  const refunded = sales?.rows.reduce((sum, sale) => sum + sale.refundedTotal, 0) ?? 0;

  return (
    <Workspace
      status={
        <StatusChip tone={openShifts.length ? "success" : "neutral"}>
          {openShifts.length ? `${openShifts.length} shift open` : "No open shift"}
        </StatusChip>
      }
      description="Sales, tenders, receipts, returns and the POS shifts they belong to."
      title="Sales and shifts"
      headerActions={<Button onClick={() => setCreateOpen(true)}>Create document</Button>}
    >
      <Stack>
        <Grid>
          <KpiCard
            label="Sales listed"
            value={String(sales?.total ?? 0)}
            trend="Matching the filter"
            tone="information"
          />
          <KpiCard
            label="Value"
            value={formatMoney(todayTotal)}
            trend="Sum of listed sales"
            tone="success"
          />
          <KpiCard
            label="Refunded"
            value={formatMoney(refunded)}
            trend="On listed sales"
            tone={refunded ? "warning" : "neutral"}
          />
          <KpiCard
            label="Shifts"
            value={String(shifts.length)}
            trend={`${openShifts.length} open`}
            tone="information"
          />
        </Grid>

        <Tabs
          onChange={setTab}
          value={tab}
          tabs={[
            { value: "sales", label: "Sales", badge: String(sales?.total ?? 0) },
            { value: "shifts", label: "Shifts", badge: String(shifts.length) },
          ]}
        />

        {tab === "sales" ? (
          <Stack>
            <ResourceState error={error} onRetry={reload} state={state} title="Sales">
              {sales ? (
                <DataTable
                  caption="Sales"
                  search={{
                    value: search,
                    onChange: setSearch,
                    placeholder: "Search by sale number, receipt number or customer",
                  }}
                  filters={
                    <SelectField
                      label="Status"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
                    >
                      <option value="">Every status</option>
                      {[
                        "QUOTATION",
                        "ORDER",
                        "CONFIRMED",
                        "HELD",
                        "PARTIALLY_RETURNED",
                        "RETURNED",
                        "VOIDED",
                      ].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </SelectField>
                  }
                  chips={
                    statusFilter
                      ? [{ label: `Status: ${statusFilter}`, onClear: () => setStatusFilter("") }]
                      : []
                  }
                  summary={`${sales.total} sale(s). Click a row to open the sale.`}
                  getRowKey={(sale) => sale.id}
                  onRowSelect={(sale) => void openSale(sale)}
                  rows={sales.rows}
                  empty="No sales match this filter. Sales appear here as soon as the POS confirms one."
                  columns={[
                    {
                      header: "Number",
                      render: (sale) => <strong>{sale.receiptNumber ?? sale.number}</strong>,
                    },
                    { header: "Branch", hideOnMobile: true, render: (sale) => sale.branchName },
                    { header: "Customer", render: (sale) => sale.customerName ?? "Walk-in" },
                    { header: "Lines", align: "right", render: (sale) => sale.lineCount },
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
                      header: "Status",
                      render: (sale) => <Badge tone={saleTone(sale.status)}>{sale.status}</Badge>,
                    },
                    {
                      header: "When",
                      hideOnMobile: true,
                      render: (sale) => formatDateTime(sale.createdAt),
                    },
                  ]}
                />
              ) : null}
            </ResourceState>
          </Stack>
        ) : null}

        {tab === "shifts" ? (
          <ResourceState error={error} onRetry={reload} state={state} title="Shifts">
            <DataTable
              caption="Shifts"
              search={{
                value: shiftSearch,
                onChange: setShiftSearch,
                placeholder: "Search by shift number, register, Branch or cashier",
              }}
              filters={
                <SelectField
                  label="Status"
                  onChange={(event) => setShiftStatus(event.target.value)}
                  value={shiftStatus}
                >
                  <option value="">Every shift</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </SelectField>
              }
              chips={
                shiftStatus
                  ? [{ label: `Status: ${shiftStatus}`, onClear: () => setShiftStatus("") }]
                  : []
              }
              summary={`${visibleShifts.length} of ${shifts.length} shift(s). Click a row to see the reconciliation.`}
              getRowKey={(shift) => shift.id}
              onRowSelect={setShiftDetail}
              rows={visibleShifts}
              empty="A shift is opened in the POS before selling starts, and closed with a counted cash reconciliation at the end of the day."
              columns={[
                {
                  header: "Shift",
                  render: (shift) => <span className="ui-code">{shift.number}</span>,
                },
                { header: "Branch", render: (shift) => shift.branchName },
                {
                  header: "Register",
                  render: (shift) => <span className="ui-code">{shift.registerCode}</span>,
                },
                {
                  header: "Opened",
                  hideOnMobile: true,
                  render: (shift) => `${shift.openedBy} · ${formatDateTime(shift.openedAt)}`,
                },
                { header: "Sales", align: "right", render: (shift) => shift.saleCount },
                {
                  header: "Sales total",
                  align: "right",
                  render: (shift) => formatMoney(shift.salesTotal),
                },
                {
                  header: "Expected cash",
                  align: "right",
                  hideOnMobile: true,
                  render: (shift) => formatMoney(shift.expectedCash),
                },
                {
                  header: "Difference",
                  align: "right",
                  render: (shift) =>
                    shift.cashVariance === null ? (
                      "-"
                    ) : (
                      <Badge tone={shift.cashVariance === 0 ? "success" : "warning"}>
                        {formatMoney(shift.cashVariance)}
                      </Badge>
                    ),
                },
                {
                  header: "Status",
                  render: (shift) => (
                    <StatusChip tone={shift.status === "OPEN" ? "success" : "neutral"}>
                      {shift.status}
                    </StatusChip>
                  ),
                },
              ]}
            />
          </ResourceState>
        ) : null}
      </Stack>

      <Drawer
        eyebrow="Shift"
        onClose={() => setShiftDetail(null)}
        open={shiftDetail !== null}
        title={shiftDetail ? shiftDetail.number : "Shift"}
      >
        {shiftDetail ? (
          <Stack>
            <EntityHeader
              eyebrow={`${shiftDetail.branchName} · Register ${shiftDetail.registerCode}`}
              title={shiftDetail.number}
              status={
                <StatusChip tone={shiftDetail.status === "OPEN" ? "success" : "neutral"}>
                  {shiftDetail.status}
                </StatusChip>
              }
              meta={
                <>
                  <span>{shiftDetail.saleCount} sale(s)</span>
                  <span>{formatMoney(shiftDetail.salesTotal)}</span>
                  <span>Opened {formatDateTime(shiftDetail.openedAt)}</span>
                </>
              }
            />

            <DescriptionList
              items={[
                {
                  label: "Opened by",
                  value: `${shiftDetail.openedBy} · ${formatDateTime(shiftDetail.openedAt)}`,
                },
                {
                  label: "Closed by",
                  value: shiftDetail.closedBy
                    ? `${shiftDetail.closedBy} · ${formatDateTime(shiftDetail.closedAt)}`
                    : "Still open",
                },
                { label: "Opening float", value: formatMoney(shiftDetail.openingFloat) },
                { label: "Expected cash", value: formatMoney(shiftDetail.expectedCash) },
                {
                  label: "Counted cash",
                  value:
                    shiftDetail.countedCash === null ? "-" : formatMoney(shiftDetail.countedCash),
                },
                {
                  label: "Difference",
                  value:
                    shiftDetail.cashVariance === null ? (
                      "-"
                    ) : (
                      <Badge tone={shiftDetail.cashVariance === 0 ? "success" : "warning"}>
                        {formatMoney(shiftDetail.cashVariance)}
                      </Badge>
                    ),
                },
                { label: "Refunds", value: formatMoney(shiftDetail.refundTotal) },
                {
                  label: "Reason given",
                  value: shiftDetail.varianceReason ?? "No difference to explain",
                },
              ]}
            />

            <DataTable
              caption="Tenders"
              summary="What was taken, by payment method, during this shift."
              getRowKey={(tender) => tender.method}
              rows={shiftDetail.tenders}
              empty="No payments were taken in this shift."
              columns={[
                { header: "Method", render: (tender) => tender.method },
                { header: "Count", align: "right", render: (tender) => tender.count },
                {
                  header: "Amount",
                  align: "right",
                  render: (tender) => formatMoney(tender.amount),
                },
              ]}
            />

            <DataTable
              caption="Cash movements"
              summary="Pay-ins, pay-outs and drops against the drawer. These are what move expected cash away from sales alone."
              getRowKey={(movement) => movement.id}
              rows={shiftDetail.cashMovements}
              empty="No cash was moved in or out of the drawer during this shift."
              columns={[
                {
                  header: "Kind",
                  render: (movement) => movement.kind.replaceAll("_", " "),
                },
                { header: "Reason", render: (movement) => movement.reason },
                {
                  header: "Amount",
                  align: "right",
                  render: (movement) => formatMoney(movement.amount),
                },
                {
                  header: "When",
                  hideOnMobile: true,
                  render: (movement) => formatDateTime(movement.createdAt),
                },
              ]}
            />
          </Stack>
        ) : null}
      </Drawer>

      <Drawer
        eyebrow="Sale"
        onClose={() => setDetail(null)}
        open={detail !== null}
        title={detail ? (detail.receiptNumber ?? detail.number) : "Sale"}
      >
        {detail ? (
          <Stack>
            <EntityHeader
              eyebrow={`${detail.branchName} · ${formatDateTime(detail.createdAt)}`}
              title={detail.receiptNumber ?? detail.number}
              status={<StatusChip tone={saleTone(detail.status)}>{detail.status}</StatusChip>}
              meta={
                <>
                  <span>{detail.customerName ?? "Walk-in"}</span>
                  <span>{detail.lineCount} line(s)</span>
                  <span>{formatMoney(detail.total, detail.currencyCode)}</span>
                </>
              }
              actions={
                <>
                  <Button onClick={() => void showReceipt(detail.id)} variant="secondary">
                    Receipt
                  </Button>
                  {detail.status === "QUOTATION" ? (
                    <Button disabled={busy} onClick={() => void convertQuotation()}>
                      Convert to order
                    </Button>
                  ) : null}
                  {detail.status === "ORDER" ? (
                    <Button disabled={busy} onClick={() => void confirmOrder()}>
                      Confirm order
                    </Button>
                  ) : null}
                  {detail.status === "CONFIRMED" || detail.status === "PARTIALLY_RETURNED" ? (
                    <Button onClick={() => setReturnOpen(true)}>Return items</Button>
                  ) : null}
                  {detail.paidTotal === 0 && detail.status !== "VOIDED" ? (
                    <Button onClick={() => setVoidTarget(detail)} variant="ghost">
                      Void
                    </Button>
                  ) : null}
                </>
              }
            />

            <Card>
              <CardTitle>Lines</CardTitle>
              <DataTable
                caption="Lines"
                summary="What was sold, at what price and with what tax."
                getRowKey={(line) => line.id}
                rows={detail.lines}
                columns={[
                  { header: "Item", render: (line) => line.description },
                  {
                    header: "Qty",
                    align: "right",
                    render: (line) => formatQuantity(line.quantity),
                  },
                  {
                    header: "Price",
                    align: "right",
                    render: (line) => formatMoney(line.unitPrice),
                  },
                  {
                    header: "Discount",
                    align: "right",
                    render: (line) => formatMoney(line.discountAmount),
                  },
                  { header: "Tax", align: "right", render: (line) => formatMoney(line.taxAmount) },
                  {
                    header: "Total",
                    align: "right",
                    render: (line) => formatMoney(line.lineTotal),
                  },
                  {
                    header: "Returned",
                    align: "right",
                    render: (line) =>
                      line.returnedQuantity > 0 ? (
                        <Badge tone="warning">{formatQuantity(line.returnedQuantity)}</Badge>
                      ) : (
                        "-"
                      ),
                  },
                ]}
              />
              <MoneySummary
                rows={[
                  { label: "Subtotal", value: formatMoney(detail.subtotal) },
                  { label: "Discount", value: formatMoney(-detail.discountTotal) },
                  { label: "Tax", value: formatMoney(detail.taxTotal) },
                  { label: "Paid", value: formatMoney(detail.paidTotal) },
                  { label: "Due", value: formatMoney(detail.dueTotal) },
                  { label: "Total", value: formatMoney(detail.total, detail.currencyCode) },
                ]}
              />
            </Card>

            <Card>
              <CardTitle>Tenders</CardTitle>
              <DataTable
                caption="Payments"
                summary="Every payment attempt against this sale."
                getRowKey={(payment) => payment.id}
                rows={detail.payments}
                empty="No payment has been taken yet."
                columns={[
                  { header: "Method", render: (payment) => payment.method },
                  {
                    header: "Direction",
                    render: (payment) => (payment.direction === "IN" ? "Received" : "Refunded"),
                  },
                  {
                    header: "Amount",
                    align: "right",
                    render: (payment) => formatMoney(payment.amount),
                  },
                  {
                    header: "Change",
                    align: "right",
                    render: (payment) => formatMoney(payment.changeAmount),
                  },
                  {
                    header: "State",
                    render: (payment) => (
                      <Badge
                        tone={
                          payment.status === "SUCCEEDED"
                            ? "success"
                            : payment.status === "UNKNOWN"
                              ? "warning"
                              : payment.status === "FAILED"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {payment.status === "UNKNOWN" ? "Checking payment" : payment.status}
                      </Badge>
                    ),
                  },
                  {
                    header: "Reference",
                    hideOnMobile: true,
                    render: (payment) => payment.reference ?? "-",
                  },
                ]}
              />
            </Card>

            {detail.returns.length ? (
              <Card>
                <CardTitle>Returns</CardTitle>
                <DataTable
                  caption="Returns"
                  summary="Returns accepted against this sale."
                  getRowKey={(saleReturn) => saleReturn.id}
                  rows={detail.returns}
                  columns={[
                    { header: "Number", render: (saleReturn) => saleReturn.number },
                    { header: "Reason", render: (saleReturn) => saleReturn.reason },
                    {
                      header: "Refunded",
                      align: "right",
                      render: (saleReturn) => formatMoney(saleReturn.refundTotal),
                    },
                    {
                      header: "Store credit",
                      align: "right",
                      render: (saleReturn) => formatMoney(saleReturn.storeCreditTotal),
                    },
                    {
                      header: "When",
                      render: (saleReturn) => formatDateTime(saleReturn.acceptedAt),
                    },
                  ]}
                />
              </Card>
            ) : null}

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
            </Card>
          </Stack>
        ) : null}
      </Drawer>

      <Dialog
        description="Create a quotation or sales order from the current catalogue. Orders can be confirmed later when they become a real sale."
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Create sales document"
      >
        <form onSubmit={createCommercialDocument}>
          <FormGrid>
            <SelectField label="Document type" name="documentType">
              <option value="QUOTATION">Quotation</option>
              <option value="ORDER">Sales order</option>
            </SelectField>
            <SelectField label="Branch" name="branchId" required>
              <option value="">Choose Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Customer" name="customerId">
              <option value="">Walk-in</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Item" name="itemId" required>
              <option value="">Choose item</option>
              {catalog.map((item) => (
                <option
                  key={`${item.itemId}:${item.variantId ?? "base"}`}
                  value={`${item.itemId}:${item.variantId ?? ""}`}
                >
                  {item.code} - {item.name}
                </option>
              ))}
            </SelectField>
            <Field
              defaultValue="1"
              label="Quantity"
              min="0.0001"
              name="quantity"
              step="0.0001"
              type="number"
            />
            <Field label="Note" name="note" />
          </FormGrid>
          <FormFooter>
            <Button disabled={busy || !branches.length || !catalog.length} type="submit">
              Save document
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Enter the quantity being returned on each line. The refund is the exact share of what was charged, including its tax."
        onClose={() => setReturnOpen(false)}
        open={returnOpen}
        title="Return items"
        wide
      >
        {detail ? (
          <form className="ui-stack" onSubmit={(event) => void createReturn(event)}>
            {detail.lines.map((line) => {
              const available = line.quantity - line.returnedQuantity;
              return (
                <Card key={line.id}>
                  <CardHeader>
                    <div>
                      <strong>{line.description}</strong>
                      <CardDescription>
                        Sold {formatQuantity(line.quantity)} · {formatMoney(line.lineTotal)} ·{" "}
                        {formatQuantity(available)} still returnable
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <FormGrid>
                    <Field
                      disabled={available <= 0}
                      inputMode="decimal"
                      label="Quantity to return"
                      max={available}
                      min={0}
                      name={`quantity-${line.id}`}
                      placeholder="0"
                      type="number"
                    />
                    <SelectField
                      disabled={available <= 0}
                      label="Stock disposition"
                      name={`disposition-${line.id}`}
                      defaultValue="RESELLABLE"
                    >
                      <option value="RESELLABLE">Back on sale</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="QUARANTINE">Quarantine</option>
                    </SelectField>
                  </FormGrid>
                </Card>
              );
            })}
            <FormGrid>
              <SelectField label="Refund to" name="refundMethod" defaultValue="ORIGINAL_METHOD">
                <option value="ORIGINAL_METHOD">The original payment method</option>
                <option value="CASH">Cash</option>
                <option value="STORE_CREDIT">Store credit</option>
              </SelectField>
              <Field
                label="Reason"
                name="reason"
                placeholder="Customer changed their mind"
                required
              />
            </FormGrid>
            <FormFooter>
              <span className="ui-card-description">
                A refund above the approval threshold needs an approved request first.
              </span>
              <div className="ui-row">
                <Button onClick={() => setReturnOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button disabled={busy} type="submit">
                  Accept return
                </Button>
              </div>
            </FormFooter>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        onClose={() => setReceipt(null)}
        open={receipt !== null}
        title="Receipt"
        description="This is the same document the POS prints."
      >
        {receipt ? (
          <ReceiptView
            branch={`${receipt.branch.code} · ${receipt.branch.name}`}
            business={receipt.business.name}
            lines={receipt.lines}
            meta={[
              receipt.sale.receiptNumber ?? receipt.sale.number,
              formatDateTime(receipt.sale.confirmedAt),
              receipt.sale.cashier,
              receipt.sale.customer ?? "Walk-in",
            ]}
            payments={receipt.payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
            }))}
            taxLines={receipt.taxLines.map((tax) => ({ name: tax.name, amount: tax.amount }))}
            totals={[
              { label: "Subtotal", value: receipt.totals.subtotal },
              { label: "Discount", value: -receipt.totals.discountTotal },
              { label: "Total", value: receipt.totals.total },
              { label: "Paid", value: receipt.totals.paidTotal },
              { label: "Change", value: receipt.totals.changeTotal },
            ]}
          />
        ) : null}
      </Dialog>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Void this sale"
        consequence="Voiding cancels a sale that has not received any money. A sale that was paid must be reversed with a return and refund instead, so the money trail stays visible."
        onCancel={() => setVoidTarget(null)}
        onConfirm={(reason) => {
          if (!api || !identity || !voidTarget) return;
          setBusy(true);
          void api
            .voidSale(identity.businessId, voidTarget.id, { reason })
            .then(async () => {
              toasts.push({ title: "Sale voided", tone: "success" });
              setVoidTarget(null);
              await refreshDetail(voidTarget.id);
            })
            .catch((cause: unknown) =>
              toasts.push({
                title: "Void refused",
                description: errorMessage(cause),
                tone: "danger",
              }),
            )
            .finally(() => setBusy(false));
        }}
        open={voidTarget !== null}
        reasonLabel="Why is this sale being voided?"
        title="Void this sale?"
      />
    </Workspace>
  );
}

function saleTone(
  status: SaleListRow["status"],
): "success" | "warning" | "danger" | "neutral" | "information" {
  if (status === "CONFIRMED") return "success";
  if (status === "HELD" || status === "DRAFT" || status === "QUOTATION" || status === "ORDER")
    return "warning";
  if (status === "VOIDED") return "danger";
  if (status === "RETURNED" || status === "PARTIALLY_RETURNED") return "information";
  return "neutral";
}
