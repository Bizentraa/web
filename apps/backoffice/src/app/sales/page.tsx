"use client";

import type { Paginated, SaleDetail, SaleListRow, ShiftSummary } from "@bizentra/contracts";
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
  FilterBar,
  formatDateTime,
  formatMoney,
  formatQuantity,
  FormFooter,
  FormGrid,
  Grid,
  Kicker,
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

import { readOptionalNumber, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface SalesData {
  sales: Paginated<SaleListRow>;
  shifts: ShiftSummary[];
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
      return { sales, shifts };
    },
    [debounced, statusFilter],
  );

  const [tab, setTab] = useState("sales");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
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
  const openShifts = shifts.filter((shift) => shift.status === "OPEN");
  const todayTotal = sales?.rows.reduce((sum, sale) => sum + sale.total, 0) ?? 0;
  const refunded = sales?.rows.reduce((sum, sale) => sum + sale.refundedTotal, 0) ?? 0;

  return (
    <Workspace
      requirements="CC-P2-001 to CC-P2-011"
      status={
        <StatusChip tone={openShifts.length ? "success" : "neutral"}>
          {openShifts.length ? `${openShifts.length} shift open` : "No open shift"}
        </StatusChip>
      }
      description="Sales, tenders, receipts, returns and the POS shifts they belong to."
      eyebrow="Common Core · P2"
      title="Sales and shifts"
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
            <FilterBar
              onSearchChange={setSearch}
              searchPlaceholder="Search by sale number, receipt number or customer"
              value={search}
              chips={
                statusFilter
                  ? [{ label: `Status: ${statusFilter}`, onClear: () => setStatusFilter("") }]
                  : []
              }
            >
              <SelectField
                label="Status"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="">Every status</option>
                {["CONFIRMED", "HELD", "PARTIALLY_RETURNED", "RETURNED", "VOIDED"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectField>
            </FilterBar>

            <ResourceState error={error} onRetry={reload} state={state} title="Sales">
              {sales ? (
                <Card flush>
                  <DataTable
                    caption={`${sales.total} sale(s). Click a row to open the sale.`}
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
                </Card>
              ) : null}
            </ResourceState>
          </Stack>
        ) : null}

        {tab === "shifts" ? (
          <ResourceState error={error} onRetry={reload} state={state} title="Shifts">
            <Stack>
              {shifts.map((shift) => (
                <Card key={shift.id}>
                  <CardHeader>
                    <div>
                      <Kicker>{shift.branchName}</Kicker>
                      <CardTitle>
                        <span className="ui-code">{shift.number}</span> · Register{" "}
                        <span className="ui-code">{shift.registerCode}</span>
                      </CardTitle>
                    </div>
                    <StatusChip tone={shift.status === "OPEN" ? "success" : "neutral"}>
                      {shift.status}
                    </StatusChip>
                  </CardHeader>
                  <DescriptionList
                    items={[
                      {
                        label: "Opened by",
                        value: `${shift.openedBy} · ${formatDateTime(shift.openedAt)}`,
                      },
                      {
                        label: "Closed by",
                        value: shift.closedBy
                          ? `${shift.closedBy} · ${formatDateTime(shift.closedAt)}`
                          : "Still open",
                      },
                      { label: "Opening float", value: formatMoney(shift.openingFloat) },
                      { label: "Expected cash", value: formatMoney(shift.expectedCash) },
                      {
                        label: "Counted cash",
                        value: shift.countedCash === null ? "-" : formatMoney(shift.countedCash),
                      },
                      {
                        label: "Difference",
                        value:
                          shift.cashVariance === null ? (
                            "-"
                          ) : (
                            <Badge tone={shift.cashVariance === 0 ? "success" : "warning"}>
                              {formatMoney(shift.cashVariance)}
                            </Badge>
                          ),
                      },
                      {
                        label: "Sales",
                        value: `${shift.saleCount} · ${formatMoney(shift.salesTotal)}`,
                      },
                      { label: "Refunds", value: formatMoney(shift.refundTotal) },
                    ]}
                  />
                  {shift.varianceReason ? (
                    <CardDescription>Reason given: {shift.varianceReason}</CardDescription>
                  ) : null}
                  <DataTable
                    caption="Tenders taken during this shift."
                    getRowKey={(tender) => tender.method}
                    rows={shift.tenders}
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
                </Card>
              ))}
              {!shifts.length ? (
                <Card>
                  <CardTitle>No shifts yet</CardTitle>
                  <CardDescription>
                    A shift is opened in the POS application before selling starts, and closed with
                    a counted cash reconciliation at the end of the day.
                  </CardDescription>
                </Card>
              ) : null}
            </Stack>
          </ResourceState>
        ) : null}
      </Stack>

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
                caption="What was sold, at what price and with what tax."
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
                caption="Every payment attempt against this sale."
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
                  caption="Returns accepted against this sale."
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
  if (status === "HELD" || status === "DRAFT") return "warning";
  if (status === "VOIDED") return "danger";
  if (status === "RETURNED" || status === "PARTIALLY_RETURNED") return "information";
  return "neutral";
}
