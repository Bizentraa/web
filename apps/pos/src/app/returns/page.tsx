"use client";

import type { SaleDetail, SaleListRow } from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EntityHeader,
  Field,
  formatDateTime,
  formatMoney,
  formatQuantity,
  FormFooter,
  FormGrid,
  Kicker,
  MoneySummary,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { createIdempotencyKey, useToasts } from "@bizentra/design-system/client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { readNumber, readText } from "../lib/forms";
import { errorMessage, useCurrentShift, usePosApi, useRegister } from "../lib/pos-session";

export default function ReturnsPage() {
  const { api, identity } = usePosApi();
  const toasts = useToasts();
  const { register } = useRegister();
  const { shift } = useCurrentShift(api, identity?.businessId, register);

  const [search, setSearch] = useState("");
  const [sales, setSales] = useState<SaleListRow[]>([]);
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSales = async (term: string) => {
    if (!api || !identity) return;
    try {
      const page = await api.listSales(identity.businessId, {
        pageSize: 15,
        ...(term ? { search: term } : {}),
      });
      setSales(page.rows.filter((row) => row.status !== "HELD" && row.status !== "VOIDED"));
    } catch (cause) {
      toasts.push({ title: "Sales not loaded", description: errorMessage(cause), tone: "danger" });
    }
  };

  useEffect(() => {
    void loadSales("");
  }, [api, identity]);

  const openSale = async (saleId: string) => {
    if (!api || !identity) return;
    try {
      setSale(await api.getSale(identity.businessId, saleId));
    } catch (cause) {
      toasts.push({ title: "Sale not loaded", description: errorMessage(cause), tone: "danger" });
    }
  };

  const submitReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !sale) return;
    const form = new FormData(event.currentTarget);
    const lines = sale.lines
      .map((line) => ({
        saleLineId: line.id,
        quantity: readNumber(form, `quantity-${line.id}`, 0),
        disposition: readText(form, `disposition-${line.id}`, "RESELLABLE") as "RESELLABLE",
      }))
      .filter((line) => line.quantity > 0);

    if (!lines.length) {
      toasts.push({
        title: "Nothing selected",
        description: "Enter how many units are coming back on at least one line.",
        tone: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await api.createReturn(identity.businessId, sale.id, {
        idempotencyKey: createIdempotencyKey("return"),
        reason: readText(form, "reason"),
        refundMethod: readText(form, "refundMethod", "ORIGINAL_METHOD") as "ORIGINAL_METHOD",
        lines,
        ...(shift ? { shiftId: shift.id } : {}),
      });
      toasts.push({
        title: `Return ${result.number} accepted`,
        description:
          result.refundTotal > 0
            ? `${formatMoney(result.refundTotal)} refunded to the customer.`
            : `${formatMoney(result.storeCreditTotal)} issued as store credit.`,
        tone: "success",
      });
      await openSale(sale.id);
      await loadSales(search);
    } catch (cause) {
      toasts.push({ title: "Return refused", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ui-pos-shell">
      <header className="ui-pos-topbar">
        <div className="ui-row">
          <Kicker>Returns and refunds</Kicker>
          <strong>
            {register ? `${register.branchName} · ${register.registerCode}` : "No register"}
          </strong>
          {shift ? <StatusChip tone="success">Shift {shift.number}</StatusChip> : null}
        </div>
        <Link className="ui-button ui-button--secondary" href="/">
          Back to selling
        </Link>
      </header>

      <Card>
        <CardHeader>
          <div>
            <Kicker>CC-P2-009</Kicker>
            <CardTitle>Find the original sale</CardTitle>
          </div>
          <CardDescription>
            A return always references the sale it came from, so stock and money reverse against the
            right record.
          </CardDescription>
        </CardHeader>
        <form
          className="ui-row"
          onSubmit={(event) => {
            event.preventDefault();
            void loadSales(search);
          }}
        >
          <Field
            label="Receipt or sale number"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Scan or type the receipt number"
            value={search}
          />
          <Button type="submit">Search</Button>
        </form>
        <DataTable
          caption="Recent sales that can still be returned."
          getRowKey={(row) => row.id}
          onRowSelect={(row) => void openSale(row.id)}
          rows={sales}
          empty="No sales found. Try the receipt number printed at the top of the receipt."
          columns={[
            {
              header: "Number",
              render: (row) => <strong>{row.receiptNumber ?? row.number}</strong>,
            },
            { header: "Customer", render: (row) => row.customerName ?? "Walk-in" },
            { header: "Total", align: "right", render: (row) => formatMoney(row.total) },
            { header: "Refunded", align: "right", render: (row) => formatMoney(row.refundedTotal) },
            { header: "When", hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      </Card>

      {sale ? (
        <Card>
          <EntityHeader
            eyebrow={`${sale.branchName} · ${formatDateTime(sale.createdAt)}`}
            title={sale.receiptNumber ?? sale.number}
            status={<StatusChip tone="information">{sale.status}</StatusChip>}
            meta={
              <>
                <span>{sale.customerName ?? "Walk-in"}</span>
                <span>Paid {formatMoney(sale.paidTotal)}</span>
                <span>Already refunded {formatMoney(sale.refundedTotal)}</span>
              </>
            }
          />
          <form className="ui-stack" onSubmit={(event) => void submitReturn(event)}>
            {sale.lines.map((line) => {
              const available = line.quantity - line.returnedQuantity;
              return (
                <div className="ui-pos-cart-line" key={line.id}>
                  <div>
                    <strong>{line.description}</strong>
                    <small>
                      Sold {formatQuantity(line.quantity)} · {formatMoney(line.lineTotal)} ·{" "}
                      {formatQuantity(available)} returnable
                    </small>
                  </div>
                  <Field
                    disabled={available <= 0}
                    label="Return"
                    max={available}
                    min={0}
                    name={`quantity-${line.id}`}
                    placeholder="0"
                    type="number"
                  />
                  <SelectField
                    disabled={available <= 0}
                    label="Stock"
                    name={`disposition-${line.id}`}
                    defaultValue="RESELLABLE"
                  >
                    <option value="RESELLABLE">Back on sale</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="QUARANTINE">Quarantine</option>
                  </SelectField>
                </div>
              );
            })}

            <FormGrid>
              <SelectField label="Refund to" name="refundMethod" defaultValue="ORIGINAL_METHOD">
                <option value="ORIGINAL_METHOD">The original payment method</option>
                <option value="CASH">Cash</option>
                <option value="STORE_CREDIT">Store credit</option>
              </SelectField>
              <Field label="Reason" name="reason" placeholder="Wrong size" required />
            </FormGrid>

            <MoneySummary
              rows={[
                { label: "Sale total", value: formatMoney(sale.total) },
                { label: "Paid", value: formatMoney(sale.paidTotal) },
                { label: "Already refunded", value: formatMoney(sale.refundedTotal) },
                {
                  label: "Refundable now",
                  value: formatMoney(Math.max(sale.paidTotal - sale.refundedTotal, 0)),
                },
              ]}
              totalLabel="Refundable now"
            />

            <FormFooter>
              <span className="ui-card-description">
                A refund above the Business approval threshold needs an approved request first, and
                store credit needs a customer on the sale.
              </span>
              <Button disabled={busy} size="large" type="submit">
                {busy ? "Posting..." : "Accept return"}
              </Button>
            </FormFooter>
          </form>

          {sale.returns.length ? (
            <Stack tight>
              <CardTitle>Returns already accepted</CardTitle>
              {sale.returns.map((saleReturn) => (
                <div className="ui-row ui-row--between" key={saleReturn.id}>
                  <span>
                    {saleReturn.number} · {saleReturn.reason}
                  </span>
                  <Badge tone="information">
                    {formatMoney(saleReturn.refundTotal + saleReturn.storeCreditTotal)}
                  </Badge>
                </div>
              ))}
            </Stack>
          ) : null}
        </Card>
      ) : (
        <StatePanel state="empty" title="No sale selected">
          Search for the original sale, then choose the lines that are coming back.
        </StatePanel>
      )}
    </main>
  );
}
