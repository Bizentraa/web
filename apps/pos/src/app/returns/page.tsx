"use client";

import type { RefundMethod, StockDisposition } from "@bizentra/contracts";
import {
  Button,
  Field,
  formatDateTime,
  formatMoney,
  formatQuantity,
  Kicker,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import { createIdempotencyKey, useToasts } from "@bizentra/design-system/client";
import {
  Banknote,
  ChevronDown,
  Maximize2,
  Minimize2,
  Minus,
  MonitorSmartphone,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Undo2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { PosTopbar } from "@/components/pos-topbar";
import { ReturnDetailSkeleton, SaleListSkeleton } from "@/components/pos-skeletons";
import { useMemo, useState, type FormEvent } from "react";

import { errorMessage } from "../lib/pos-session";
import { usePosWorkspace } from "../lib/pos-workspace";

const REFUND_METHODS: Array<{ method: RefundMethod; label: string; icon: LucideIcon }> = [
  { method: "ORIGINAL_METHOD", label: "Original method", icon: RotateCcw },
  { method: "CASH", label: "Cash", icon: Banknote },
  { method: "STORE_CREDIT", label: "Store credit", icon: Wallet },
];

const DISPOSITIONS: Array<{ value: StockDisposition; label: string }> = [
  { value: "RESELLABLE", label: "Back on sale" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "QUARANTINE", label: "Quarantine" },
];
const DEFAULT_DISPOSITION: StockDisposition = "RESELLABLE";

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Returns and refunds.
 *
 * The screen is built the way the counter conversation runs: find the sale, agree what is coming
 * back, agree what the customer gets. The lines are chosen with the same stepper used in the
 * ticket, the refund is calculated line by line as they are chosen, and the money is on screen
 * before anything is committed.
 *
 * Every piece of state here belongs to the workspace provider in the layout, not to this
 * component, so stepping back to selling and returning does not re-run the search or lose the
 * sale that was already open.
 */
export default function ReturnsPage() {
  const {
    api,
    closeSale,
    dispositions,
    focusMode,
    identity,
    online,
    openSale,
    queue,
    refundMethod,
    register,
    returnQuantities,
    returnReason,
    saleSearch,
    sale,
    saleLoading,
    sales,
    salesLoading,
    setDispositions,
    setFocusMode,
    setRefundMethod,
    setRegister,
    setReturnQuantities,
    setReturnReason,
    setSaleSearch,
    shift,
    loadSales,
  } = usePosWorkspace();

  const toasts = useToasts();
  const [busy, setBusy] = useState(false);

  /* What the customer is getting back, priced line by line from what they actually paid. */
  const estimate = useMemo(() => {
    if (!sale) return 0;
    return round2(
      sale.lines.reduce((sum, line) => {
        const quantity = returnQuantities[line.id] ?? 0;
        if (quantity <= 0 || line.quantity <= 0) return sum;
        return sum + (line.lineTotal / line.quantity) * quantity;
      }, 0),
    );
  }, [returnQuantities, sale]);

  const selectedCount = Object.values(returnQuantities).reduce((sum, value) => sum + value, 0);
  const refundable = sale ? Math.max(round2(sale.paidTotal - sale.refundedTotal), 0) : 0;
  const overRefund = estimate > refundable + 0.001;

  const setQuantity = (lineId: string, quantity: number, available: number) => {
    const next = Math.min(Math.max(quantity, 0), available);
    setReturnQuantities((current) => {
      if (next > 0) return { ...current, [lineId]: next };
      const rest = { ...current };
      delete rest[lineId];
      return rest;
    });
  };

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    try {
      if (next) {
        void document.documentElement.requestFullscreen?.().catch(() => undefined);
      } else if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
    } catch {
      /* Layout still changes; only the browser chrome stays. */
    }
  };

  const submitReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !sale) return;
    const lines = sale.lines
      .map((line) => ({
        saleLineId: line.id,
        quantity: returnQuantities[line.id] ?? 0,
        disposition: dispositions[line.id] ?? DEFAULT_DISPOSITION,
      }))
      .filter((line) => line.quantity > 0);

    if (!lines.length) {
      toasts.push({
        title: "Nothing selected",
        description: "Choose how many units are coming back on at least one line.",
        tone: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await api.createReturn(identity.businessId, sale.id, {
        idempotencyKey: createIdempotencyKey("return"),
        reason: returnReason.trim(),
        refundMethod,
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
      await loadSales(saleSearch);
    } catch (cause) {
      toasts.push({ title: "Return refused", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  if (!identity) {
    return (
      <main className="ui-pos-shell">
        <div className="ui-pos-blank">
          <div className="ui-pos-blank-card">
            <MonitorSmartphone aria-hidden="true" />
            <Kicker>Terminal not set up</Kicker>
            <h1>This till has no Business yet</h1>
            <p>
              Open the Back Office appearance screen and enter the Business and user IDs. The till
              keeps that identity until production sign-in is connected.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ui-pos-shell" data-focus={focusMode}>
      <PosTopbar
        active="returns"
        online={online}
        queue={{ count: queue.queue.length, syncing: queue.syncing, sync: () => void queue.sync() }}
        register={register}
        setRegister={setRegister}
        shift={shift}
      />

      <div className="ui-pos-layout">
        {/* ------------------------------------------------- find the sale */}

        <section className="ui-pos-panel">
          <div className="ui-pos-panel-head">
            <h2 className="ui-pos-panel-title">
              <Receipt aria-hidden="true" className="size-4" />
              Find the original sale
            </h2>
            <div className="ui-row">
              <StatusChip tone="information">Latest 15</StatusChip>
              <button
                aria-label={focusMode ? "Leave full view" : "Full view"}
                aria-pressed={focusMode}
                className="ui-pos-icon-button"
                data-active={focusMode}
                onClick={toggleFocusMode}
                title={focusMode ? "Leave full view" : "Full view: hide the header"}
                type="button"
              >
                {focusMode ? (
                  <Minimize2 aria-hidden="true" className="size-4" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </div>

          <form
            className="ui-pos-scan"
            onSubmit={(event) => {
              event.preventDefault();
              void loadSales(saleSearch);
            }}
          >
            <div className="ui-pos-scan-field">
              <Search aria-hidden="true" className="size-5" />
              <input
                aria-label="Receipt or sale number"
                autoComplete="off"
                onChange={(event) => setSaleSearch(event.target.value)}
                placeholder="Scan or type the receipt number"
                value={saleSearch}
              />
              {saleSearch ? (
                <button
                  aria-label="Clear the search"
                  className="ui-pos-scan-clear"
                  onClick={() => {
                    setSaleSearch("");
                    void loadSales("");
                  }}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
            <Button type="submit">Search</Button>
          </form>

          {salesLoading && !sales.length ? (
            <SaleListSkeleton />
          ) : sales.length ? (
            <div className="ui-pos-list">
              {sales.map((row) => (
                <button
                  className="ui-pos-sale-row"
                  data-active={sale?.id === row.id}
                  key={row.id}
                  onClick={() => void openSale(row.id)}
                  type="button"
                >
                  <strong>{row.receiptNumber ?? row.number}</strong>
                  <small>
                    {row.customerName ?? "Walk-in"} · {formatDateTime(row.createdAt)}
                    {row.refundedTotal > 0 ? ` · refunded ${formatMoney(row.refundedTotal)}` : ""}
                  </small>
                  <strong className="ui-money">{formatMoney(row.total)}</strong>
                </button>
              ))}
            </div>
          ) : (
            <StatePanel state="empty" title="No sales found">
              Try the receipt number printed at the top of the customer&rsquo;s receipt.
            </StatePanel>
          )}
        </section>

        {/* ------------------------------------------------ what comes back */}

        {/*
          Below the ticket breakpoint this panel is a sheet, summoned by choosing a sale, exactly
          as the selling ticket is. Stacked in flow it was clipped by the shell, which is what put
          the accept button under the bottom edge of the screen on a narrow till.
        */}
        <section className="ui-pos-panel ui-pos-summoned" data-open={sale !== null || saleLoading}>
          {saleLoading ? (
            <>
              <div className="ui-pos-panel-head">
                <h2 className="ui-pos-panel-title">
                  <Undo2 aria-hidden="true" className="size-4" />
                  Opening the sale
                </h2>
              </div>
              <ReturnDetailSkeleton />
            </>
          ) : sale ? (
            <>
              <div className="ui-pos-panel-head">
                <h2 className="ui-pos-panel-title">
                  <Undo2 aria-hidden="true" className="size-4" />
                  <span className="ui-code">{sale.receiptNumber ?? sale.number}</span>
                  {selectedCount > 0 ? <small>{formatQuantity(selectedCount)}</small> : null}
                </h2>
                <div className="ui-row">
                  <StatusChip tone="information">{sale.status}</StatusChip>
                  <button
                    aria-label="Close this sale"
                    className="ui-pos-icon-button ui-pos-ticket-close"
                    onClick={closeSale}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>

              <form className="ui-pos-form" onSubmit={(event) => void submitReturn(event)}>
                <div className="ui-pos-scrollbody">
                  <p className="ui-card-description">
                    {sale.branchName} · {formatDateTime(sale.createdAt)} ·{" "}
                    {sale.customerName ?? "Walk-in"} · paid {formatMoney(sale.paidTotal)}
                  </p>

                  <div className="ui-pos-lines">
                    {sale.lines.map((line) => {
                      const available = line.quantity - line.returnedQuantity;
                      const chosen = returnQuantities[line.id] ?? 0;
                      return (
                        <div
                          className="ui-pos-return-line"
                          data-selected={chosen > 0}
                          key={line.id}
                        >
                          <strong>{line.description}</strong>
                          <strong className="ui-money">
                            {chosen > 0
                              ? formatMoney(round2((line.lineTotal / line.quantity) * chosen))
                              : formatMoney(line.lineTotal)}
                          </strong>
                          <div className="ui-pos-qty">
                            <button
                              aria-label={`Return one fewer ${line.description}`}
                              disabled={chosen <= 0}
                              onClick={() => setQuantity(line.id, chosen - 1, available)}
                              type="button"
                            >
                              <Minus aria-hidden="true" className="size-3.5" />
                            </button>
                            <input
                              aria-label={`Units of ${line.description} coming back`}
                              disabled={available <= 0}
                              inputMode="decimal"
                              onChange={(event) =>
                                setQuantity(line.id, Number(event.target.value || 0), available)
                              }
                              value={chosen}
                            />
                            <button
                              aria-label={`Return one more ${line.description}`}
                              disabled={chosen >= available}
                              onClick={() => setQuantity(line.id, chosen + 1, available)}
                              type="button"
                            >
                              <Plus aria-hidden="true" className="size-3.5" />
                            </button>
                          </div>
                          <div className="ui-pos-return-line-stock">
                            <small>
                              {available > 0
                                ? `${formatQuantity(available)} of ${formatQuantity(line.quantity)} returnable`
                                : "Already fully returned"}
                            </small>
                            {chosen > 0 ? (
                              <select
                                aria-label={`Where ${line.description} goes`}
                                onChange={(event) =>
                                  setDispositions((current) => ({
                                    ...current,
                                    [line.id]: event.target.value as StockDisposition,
                                  }))
                                }
                                value={dispositions[line.id] ?? "RESELLABLE"}
                              >
                                {DISPOSITIONS.map((disposition) => (
                                  <option key={disposition.value} value={disposition.value}>
                                    {disposition.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="ui-pay-methods">
                    {REFUND_METHODS.map((candidate) => (
                      <button
                        aria-pressed={candidate.method === refundMethod}
                        className="ui-pay-method"
                        data-active={candidate.method === refundMethod}
                        key={candidate.method}
                        onClick={() => setRefundMethod(candidate.method)}
                        type="button"
                      >
                        <candidate.icon aria-hidden="true" className="size-5" />
                        {candidate.label}
                      </button>
                    ))}
                  </div>

                  <Field
                    hint="Recorded on the return and visible in Back Office."
                    label="Reason"
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="Wrong size"
                    required
                    value={returnReason}
                  />

                  <div className="ui-pos-totals">
                    <div>
                      <span>Sale total</span>
                      <b>{formatMoney(sale.total)}</b>
                    </div>
                    {sale.refundedTotal > 0 ? (
                      <div>
                        <span>Already refunded</span>
                        <b>{formatMoney(-sale.refundedTotal)}</b>
                      </div>
                    ) : null}
                    <div>
                      <span>Refundable now</span>
                      <b>{formatMoney(refundable)}</b>
                    </div>
                  </div>

                  <div className="ui-pos-due">
                    <span>Refund estimate</span>
                    <strong>{formatMoney(estimate)}</strong>
                  </div>

                  {overRefund ? (
                    <StatusChip tone="danger">
                      That is more than is left to refund on this sale
                    </StatusChip>
                  ) : null}

                  {refundMethod === "STORE_CREDIT" && !sale.customerId ? (
                    <StatusChip tone="warning">
                      Store credit needs a customer on the sale; this one is a walk-in
                    </StatusChip>
                  ) : null}

                  <p className="ui-card-description">
                    The estimate is priced from what was paid on each line. The server settles
                    promotions, tax and rounding, and a refund above the Business approval threshold
                    needs an approved request first.
                  </p>

                  {sale.returns.length ? (
                    <div className="ui-pos-lines">
                      <h3 className="ui-pos-panel-title">Returns already accepted</h3>
                      {sale.returns.map((saleReturn) => (
                        <div className="ui-pos-sale-row" key={saleReturn.id}>
                          <strong>{saleReturn.number}</strong>
                          <small>{saleReturn.reason}</small>
                          <strong className="ui-money">
                            {formatMoney(saleReturn.refundTotal + saleReturn.storeCreditTotal)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="ui-pos-actions">
                  <Button
                    disabled={!selectedCount || busy}
                    onClick={() => setReturnQuantities({})}
                    variant="secondary"
                  >
                    Clear selection
                  </Button>
                  <Button
                    className="ui-pos-pay"
                    disabled={busy || !selectedCount || !returnReason.trim() || overRefund}
                    size="large"
                    type="submit"
                  >
                    {busy ? "Posting..." : `Accept return of ${formatMoney(estimate)}`}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <StatePanel state="empty" title="No sale selected">
              Search for the original sale, then choose the lines that are coming back. A return
              always references the sale it came from, so stock and money reverse against the right
              record.
            </StatePanel>
          )}
        </section>
      </div>

      <div
        aria-hidden="true"
        className="ui-pos-scrim"
        data-open={sale !== null}
        onClick={closeSale}
      />
    </main>
  );
}
