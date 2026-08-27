"use client";

import type {
  CatalogReferenceData,
  CustomerListRow,
  PaymentMethodKind,
  PosCatalogEntry,
  ReceiptDocument,
  SaleCartInput,
  SaleDetail,
  SaleListRow,
  SaleQuote,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  formatMoney,
  formatQuantity,
  FormFooter,
  FormGrid,
  Kicker,
  MoneySummary,
  OfflineBanner,
  ReceiptView,
  SelectField,
  SkeletonScreen,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import {
  createIdempotencyKey,
  Dialog,
  Sheet,
  useDebouncedValue,
  useOnlineState,
  useScanFocus,
  useToasts,
} from "@bizentra/design-system/client";
import Link from "next/link";

import { RegisterBar } from "@/components/register-bar";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { readNumber, readText } from "./lib/forms";
import {
  errorMessage,
  useCurrentShift,
  useOfflineQueue,
  usePosApi,
  useRegister,
} from "./lib/pos-session";

interface CartLine {
  itemId: string;
  code: string;
  name: string;
  unitCode: string;
  unitPrice: number;
  quantity: number;
}

interface Tender {
  method: PaymentMethodKind;
  amount: number;
  tendered: number;
  reference: string;
  idempotencyKey: string;
}

const TENDER_METHODS: Array<{ method: PaymentMethodKind; label: string }> = [
  { method: "CASH", label: "Cash" },
  { method: "CARD", label: "Card" },
  { method: "TRANSFER", label: "Transfer" },
  { method: "QR_WALLET", label: "QR / wallet" },
  { method: "STORE_CREDIT", label: "Store credit" },
];

export default function PosPage() {
  const { api, identity } = usePosApi();
  const toasts = useToasts();
  const online = useOnlineState();
  const { register, setRegister } = useRegister();
  const {
    shift,
    loading: shiftLoading,
    refresh: refreshShift,
  } = useCurrentShift(api, identity?.businessId, register);
  const queue = useOfflineQueue(api, identity?.businessId);

  const [reference, setReference] = useState<CatalogReferenceData | null>(null);
  const [customers, setCustomers] = useState<CustomerListRow[]>([]);
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 200);
  const [results, setResults] = useState<PosCatalogEntry[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [saleDiscount, setSaleDiscount] = useState("");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<SaleQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [held, setHeld] = useState<SaleListRow[]>([]);
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const scanRef = useScanFocus<HTMLInputElement>(Boolean(shift) && !payOpen && !receipt);

  /* ------------------------------------------------------------ reference */

  useEffect(() => {
    if (!api || !identity) return;
    void api
      .getCatalogReference(identity.businessId)
      .then(setReference)
      .catch(() => setReference(null));
    void api
      .listCustomers(identity.businessId, { pageSize: 50, status: "ACTIVE" })
      .then((page) => setCustomers(page.rows))
      .catch(() => setCustomers([]));
  }, [api, identity]);

  useEffect(() => {
    if (!api || !identity || !register) return;
    void api
      .searchPosCatalog(identity.businessId, {
        term: debouncedTerm,
        branchId: register.branchId,
        limit: 24,
        ...(customerId ? { customerId } : {}),
      })
      .then(setResults)
      .catch(() => setResults([]));
  }, [api, identity, register, debouncedTerm, customerId]);

  /* ---------------------------------------------------------------- quote */

  const cart: SaleCartInput | null = useMemo(() => {
    if (!register || !lines.length) return null;
    const discountValue = Number(saleDiscount);
    return {
      branchId: register.branchId,
      lines: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      ...(customerId ? { customerId } : {}),
      ...(coupon ? { couponCode: coupon } : {}),
      ...(Number.isFinite(discountValue) && discountValue > 0
        ? { saleDiscountKind: "FIXED_AMOUNT" as const, saleDiscountValue: discountValue }
        : {}),
    };
  }, [coupon, customerId, lines, register, saleDiscount]);

  useEffect(() => {
    if (!api || !identity || !cart) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    void api
      .quoteSale(identity.businessId, cart)
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setQuoteError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(errorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, identity, cart]);

  /* ----------------------------------------------------------------- cart */

  const addEntry = useCallback((entry: PosCatalogEntry) => {
    setLines((current) => {
      const existing = current.find((line) => line.itemId === entry.itemId);
      if (existing) {
        return current.map((line) =>
          line.itemId === entry.itemId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          itemId: entry.itemId,
          code: entry.code,
          name: entry.name,
          unitCode: entry.unitCode,
          unitPrice: entry.unitPrice,
          quantity: 1,
        },
      ];
    });
  }, []);

  const scan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !register) return;
    const value = term.trim();
    if (!value) return;

    const exact = results.find(
      (entry) =>
        entry.identifiers.includes(value) || entry.code.toUpperCase() === value.toUpperCase(),
    );
    if (exact) {
      addEntry(exact);
      setTerm("");
      return;
    }

    try {
      const matches = await api.searchPosCatalog(identity.businessId, {
        term: value,
        branchId: register.branchId,
        limit: 1,
      });
      const match = matches[0];
      if (match) {
        addEntry(match);
        setTerm("");
      } else {
        toasts.push({
          title: "Nothing found",
          description: `No item uses the code ${value}. Search by name instead.`,
          tone: "warning",
        });
      }
    } catch (cause) {
      toasts.push({ title: "Search failed", description: errorMessage(cause), tone: "danger" });
    }
  };

  const setQuantity = (itemId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.itemId !== itemId)
        : current.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)),
    );
  };

  const clearCart = () => {
    setLines([]);
    setTenders([]);
    setCustomerId("");
    setSaleDiscount("");
    setCoupon("");
    setQuote(null);
    setResumedSaleId(null);
  };

  /* ------------------------------------------------------------- payments */

  const total = quote?.total ?? 0;
  const tendered = tenders.reduce((sum, tender) => sum + tender.amount, 0);
  const due = Math.max(Math.round((total - tendered) * 100) / 100, 0);
  const change = tenders.reduce(
    (sum, tender) => sum + Math.max(tender.tendered - tender.amount, 0),
    0,
  );

  const addTender = (method: PaymentMethodKind, amount: number, reference: string) => {
    const applied = Math.min(amount, due);
    if (applied <= 0) return;
    setTenders((current) => [
      ...current,
      {
        method,
        amount: applied,
        tendered: method === "CASH" ? amount : applied,
        reference,
        idempotencyKey: createIdempotencyKey("pay"),
      },
    ]);
  };

  const completeSale = async () => {
    if (!api || !identity || !register || !shift || !cart || !quote) return;
    setBusy(true);
    const idempotencyKey = createIdempotencyKey("sale");
    const payload = {
      ...cart,
      idempotencyKey,
      shiftId: shift.id,
      channel: "POS" as const,
      hold: false,
      payments: tenders.map((tender) => ({
        method: tender.method,
        amount: tender.amount,
        tenderedAmount: tender.tendered,
        idempotencyKey: tender.idempotencyKey,
        ...(tender.reference ? { reference: tender.reference } : {}),
      })),
    };

    if (!online) {
      queue.enqueue(payload);
      toasts.push({
        title: "Saved on this terminal",
        description: "The sale is queued and will be sent when the connection returns.",
        tone: "warning",
      });
      setPayOpen(false);
      clearCart();
      setBusy(false);
      return;
    }

    try {
      let sale: SaleDetail;
      if (resumedSaleId) {
        await api.updateHeldSale(identity.businessId, resumedSaleId, cart);
        sale = await api.confirmSale(identity.businessId, resumedSaleId, { shiftId: shift.id });
        for (const tender of tenders) {
          sale = await api.addPayment(identity.businessId, sale.id, {
            method: tender.method,
            amount: tender.amount,
            tenderedAmount: tender.tendered,
            idempotencyKey: tender.idempotencyKey,
            markUnknown: false,
            ...(tender.reference ? { reference: tender.reference } : {}),
          });
        }
      } else {
        sale = await api.createSale(identity.businessId, payload);
      }

      setReceipt(await api.getReceipt(identity.businessId, sale.id));
      setPayOpen(false);
      clearCart();
      await refreshShift();
      toasts.push({
        title: `Sale ${sale.receiptNumber ?? sale.number} completed`,
        tone: "success",
      });
    } catch (cause) {
      toasts.push({
        title: "Sale not completed",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------ hold flow */

  const holdCart = async () => {
    if (!api || !identity || !shift || !cart) return;
    setBusy(true);
    try {
      await api.createSale(identity.businessId, {
        ...cart,
        idempotencyKey: createIdempotencyKey("hold"),
        shiftId: shift.id,
        channel: "POS",
        hold: true,
        holdName: customers.find((customer) => customer.id === customerId)?.name ?? "Held cart",
        payments: [],
      });
      toasts.push({
        title: "Cart held",
        description: "Resume it from the Held carts button.",
        tone: "success",
      });
      clearCart();
    } catch (cause) {
      toasts.push({ title: "Cart not held", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const openHeld = async () => {
    if (!api || !identity) return;
    try {
      const page = await api.listSales(identity.businessId, { status: "HELD", pageSize: 25 });
      setHeld(page.rows);
      setHeldOpen(true);
    } catch (cause) {
      toasts.push({
        title: "Held carts not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
    }
  };

  const resumeHeld = async (saleId: string) => {
    if (!api || !identity) return;
    try {
      const sale = await api.getSale(identity.businessId, saleId);
      setLines(
        sale.lines.map((line) => ({
          itemId: line.itemId,
          code: line.code,
          name: line.description,
          unitCode: line.unitCode,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
      );
      setCustomerId(sale.customerId ?? "");
      setResumedSaleId(sale.id);
      setHeldOpen(false);
      toasts.push({ title: `Resumed ${sale.number}`, tone: "success" });
    } catch (cause) {
      toasts.push({ title: "Cart not resumed", description: errorMessage(cause), tone: "danger" });
    }
  };

  /* --------------------------------------------------------------- shift */

  const openShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const branchId = readText(form, "branchId");
    const registerCode = readText(form, "registerCode", "REG1").toUpperCase();
    const branch = reference?.branches.find((candidate) => candidate.id === branchId);
    if (!branch) return;

    setBusy(true);
    try {
      await api.openShift(identity.businessId, {
        branchId,
        registerCode,
        openingFloat: readNumber(form, "openingFloat", 0),
      });
      setRegister({ branchId, branchName: branch.name, registerCode });
      await refreshShift();
      toasts.push({ title: "Shift open", description: "You can start selling.", tone: "success" });
    } catch (cause) {
      toasts.push({ title: "Shift not opened", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const closeShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity || !shift) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.closeShift(identity.businessId, shift.id, {
        countedCash: readNumber(form, "countedCash", 0),
        varianceReason: readText(form, "varianceReason") || undefined,
      });
      setCloseOpen(false);
      await refreshShift();
      toasts.push({ title: "Shift closed", tone: "success" });
    } catch (cause) {
      toasts.push({ title: "Shift not closed", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- views */

  if (!identity) {
    return (
      <main className="ui-pos-shell">
        <StatePanel state="permission" title="This terminal has no Business identity yet">
          Open the Back Office appearance screen and enter the Business and user IDs. The POS uses
          the same saved identity until production sign-in is connected.
        </StatePanel>
      </main>
    );
  }

  return (
    <main className="ui-pos-shell">
      <header className="ui-pos-topbar">
        <div className="ui-row">
          <RegisterBar onUnbind={() => setRegister(null)} register={register} shift={shift} />
          {shift ? <StatusChip tone="success">Shift {shift.number}</StatusChip> : null}
        </div>
        <div className="ui-row">
          <StatusChip tone={online ? "success" : "warning"}>
            {online ? "Online" : "Offline"}
          </StatusChip>
          {queue.queue.length ? (
            <Button onClick={() => void queue.sync()} size="quiet" variant="secondary">
              {queue.syncing ? "Syncing..." : `Sync ${queue.queue.length} pending`}
            </Button>
          ) : null}
          <Button onClick={() => void openHeld()} size="quiet" variant="secondary">
            Held carts
          </Button>
          <Link className="ui-button ui-button--quiet" href="/returns">
            Returns
          </Link>
          {shift ? (
            <Button onClick={() => setCloseOpen(true)} size="quiet" variant="ghost">
              Close shift
            </Button>
          ) : null}
        </div>
      </header>

      {!online || queue.queue.length ? (
        <OfflineBanner
          pendingCount={queue.queue.length}
          state={queue.needsReview.length ? "needs-review" : online ? "syncing" : "offline"}
        />
      ) : null}

      {shiftLoading ? (
        <SkeletonScreen rows={5} />
      ) : !shift ? (
        <Card>
          <CardHeader>
            <div>
              <Kicker>CC-P2-001</Kicker>
              <CardTitle>Open a shift before selling</CardTitle>
            </div>
            <StatusChip tone="warning">No open shift</StatusChip>
          </CardHeader>
          <CardDescription>
            Every sale belongs to a shift so the cash drawer can be reconciled at the end of the
            day. Two shifts can never be open on the same register at once.
          </CardDescription>
          <form className="ui-stack" onSubmit={(event) => void openShift(event)}>
            <FormGrid>
              <SelectField
                label="Branch"
                name="branchId"
                defaultValue={register?.branchId ?? ""}
                required
              >
                {(reference?.branches ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Register"
                name="registerCode"
                defaultValue={register?.registerCode ?? "REG1"}
                required
              />
              <Field
                label="Opening cash float"
                name="openingFloat"
                defaultValue="0"
                inputMode="decimal"
              />
            </FormGrid>
            <FormFooter>
              <span className="ui-card-description">
                The opening float is counted into the drawer and appears in the closing count.
              </span>
              <Button disabled={busy} size="large" type="submit">
                Open shift
              </Button>
            </FormFooter>
          </form>
        </Card>
      ) : (
        <div className="ui-pos-layout">
          <section className="ui-pos-panel">
            <form className="ui-pos-scan" onSubmit={(event) => void scan(event)}>
              <input
                aria-label="Scan a barcode or search an item"
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Scan barcode or search item"
                ref={scanRef}
                value={term}
              />
              <Button size="large" type="submit">
                Add
              </Button>
            </form>

            {results.length ? (
              <div className="ui-pos-results">
                {results.map((entry) => (
                  <button
                    className="ui-pos-tile"
                    key={`${entry.itemId}-${entry.variantId ?? "base"}`}
                    onClick={() => addEntry(entry)}
                    type="button"
                  >
                    <strong>{entry.name}</strong>
                    <span>
                      {entry.code} · {entry.unitCode}
                    </span>
                    <b>{formatMoney(entry.unitPrice)}</b>
                  </button>
                ))}
              </div>
            ) : (
              <StatePanel state="empty" title="Nothing to show yet">
                Scan a barcode or type part of an item name. Only active, sellable items with a
                price appear here.
              </StatePanel>
            )}
          </section>

          <section className="ui-pos-panel">
            <div className="ui-row ui-row--between">
              <CardTitle>Cart</CardTitle>
              {resumedSaleId ? <Badge tone="warning">Resumed hold</Badge> : null}
            </div>

            {lines.length ? (
              <div className="ui-pos-cart">
                {lines.map((line) => (
                  <div className="ui-pos-cart-line" key={line.itemId}>
                    <div>
                      <strong>{line.name}</strong>
                      <small>
                        {formatMoney(line.unitPrice)} / {line.unitCode}
                      </small>
                    </div>
                    <div className="ui-pos-qty">
                      <button
                        aria-label={`Reduce ${line.name}`}
                        onClick={() => setQuantity(line.itemId, line.quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <input
                        aria-label={`Quantity for ${line.name}`}
                        onChange={(event) => setQuantity(line.itemId, Number(event.target.value))}
                        value={line.quantity}
                      />
                      <button
                        aria-label={`Add another ${line.name}`}
                        onClick={() => setQuantity(line.itemId, line.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <strong className="ui-money">
                      {formatMoney(line.unitPrice * line.quantity)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <StatePanel state="empty" title="The cart is empty">
                Scanned and selected items appear here with their price and quantity.
              </StatePanel>
            )}

            <FormGrid>
              <SelectField
                label="Customer"
                onChange={(event) => setCustomerId(event.target.value)}
                value={customerId}
              >
                <option value="">Walk-in</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.storeCredit > 0
                      ? ` (credit ${formatMoney(customer.storeCredit)})`
                      : ""}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Sale discount"
                inputMode="decimal"
                onChange={(event) => setSaleDiscount(event.target.value)}
                placeholder="0.00"
                value={saleDiscount}
              />
              <Field
                label="Coupon"
                onChange={(event) => setCoupon(event.target.value)}
                placeholder="SAVE10"
                value={coupon}
              />
            </FormGrid>

            {quoteError ? (
              <StatePanel state="error" title="This cart cannot be priced">
                {quoteError}
              </StatePanel>
            ) : null}

            {quote ? (
              <>
                <MoneySummary
                  rows={[
                    { label: "Subtotal", value: formatMoney(quote.subtotal) },
                    { label: "Discount", value: formatMoney(-quote.discountTotal) },
                    { label: "Tax", value: formatMoney(quote.taxTotal) },
                    { label: "Total", value: formatMoney(quote.total, quote.currencyCode) },
                  ]}
                />
                {quote.appliedPromotions.map((promotion) => (
                  <Badge key={promotion.id} tone="success">
                    {promotion.name} saved {formatMoney(promotion.amount)}
                  </Badge>
                ))}
                {quote.warnings.map((warning) => (
                  <Badge key={warning} tone="warning">
                    {warning}
                  </Badge>
                ))}
              </>
            ) : null}

            <div className="ui-pos-due">
              <span>Amount due</span>
              <strong>{formatMoney(due)}</strong>
            </div>

            <div className="ui-row">
              <Button
                disabled={!lines.length || busy}
                onClick={() => void holdCart()}
                variant="secondary"
              >
                Hold
              </Button>
              <Button disabled={!lines.length || busy} onClick={clearCart} variant="ghost">
                Clear
              </Button>
              <Button
                disabled={!quote || !lines.length || busy}
                onClick={() => setPayOpen(true)}
                size="large"
              >
                Pay {formatMoney(due)}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------- payment */}

      <Sheet onClose={() => setPayOpen(false)} open={payOpen} title="Payment">
        <MoneySummary
          rows={[
            { label: "Sale total", value: formatMoney(total) },
            { label: "Tendered", value: formatMoney(tendered) },
            { label: "Change", value: formatMoney(change) },
            { label: "Still due", value: formatMoney(due) },
          ]}
          totalLabel="Still due"
        />

        {tenders.length ? (
          <Stack tight>
            {tenders.map((tender, index) => (
              <div className="ui-row ui-row--between" key={tender.idempotencyKey}>
                <span>
                  {tender.method} {tender.reference ? `· ${tender.reference}` : ""}
                </span>
                <div className="ui-row">
                  <strong className="ui-money">{formatMoney(tender.amount)}</strong>
                  <Button
                    onClick={() => setTenders((current) => current.filter((_, at) => at !== index))}
                    size="quiet"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </Stack>
        ) : null}

        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const method = readText(form, "method", "CASH") as PaymentMethodKind;
            const amount = readNumber(form, "amount", 0);
            addTender(method, amount > 0 ? amount : due, readText(form, "reference"));
            event.currentTarget.reset();
          }}
        >
          <div className="ui-tender-grid">
            {TENDER_METHODS.map((tender) => (
              <Button
                key={tender.method}
                onClick={() => addTender(tender.method, due, "")}
                size="large"
                variant="secondary"
              >
                {tender.label}
                <br />
                {formatMoney(due)}
              </Button>
            ))}
          </div>
          <FormGrid>
            <SelectField label="Method" name="method" defaultValue="CASH">
              {TENDER_METHODS.map((tender) => (
                <option key={tender.method} value={tender.method}>
                  {tender.label}
                </option>
              ))}
            </SelectField>
            <Field
              hint="For cash you can enter more than the amount due to see the change."
              inputMode="decimal"
              label="Amount"
              name="amount"
              placeholder={String(due)}
            />
            <Field label="Reference" name="reference" placeholder="Card approval code" />
          </FormGrid>
          <FormFooter>
            <span className="ui-card-description">
              Split the payment across as many tenders as the customer needs.
            </span>
            <Button type="submit" variant="secondary">
              Add tender
            </Button>
          </FormFooter>
        </form>

        <FormFooter>
          <Button onClick={() => setPayOpen(false)} variant="secondary">
            Back to cart
          </Button>
          <Button
            disabled={busy || due > 0 || !tenders.length}
            onClick={() => void completeSale()}
            size="large"
          >
            {busy ? "Posting..." : "Complete sale"}
          </Button>
        </FormFooter>
      </Sheet>

      {/* ------------------------------------------------------- receipt */}

      <Dialog
        description="The sale is complete. Print or hand the receipt to the customer."
        onClose={() => setReceipt(null)}
        open={receipt !== null}
        title="Receipt"
      >
        {receipt ? (
          <>
            <ReceiptView
              branch={`${receipt.branch.code} · ${receipt.branch.name}`}
              business={receipt.business.name}
              lines={receipt.lines}
              meta={[
                receipt.sale.receiptNumber ?? receipt.sale.number,
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
            <FormFooter>
              <Button onClick={() => window.print()} variant="secondary">
                Print
              </Button>
              <Button onClick={() => setReceipt(null)} size="large">
                Next sale
              </Button>
            </FormFooter>
          </>
        ) : null}
      </Dialog>

      {/* --------------------------------------------------- held carts */}

      <Dialog
        description="A held cart keeps its customer and lines until it is resumed or discarded."
        onClose={() => setHeldOpen(false)}
        open={heldOpen}
        title="Held carts"
      >
        <Stack tight>
          {held.map((sale) => (
            <div className="ui-row ui-row--between" key={sale.id}>
              <div>
                <strong>{sale.number}</strong>
                <CardDescription>
                  {sale.customerName ?? "Walk-in"} · {sale.lineCount} line(s) ·{" "}
                  {formatMoney(sale.total)}
                </CardDescription>
              </div>
              <Button onClick={() => void resumeHeld(sale.id)} size="quiet">
                Resume
              </Button>
            </div>
          ))}
          {!held.length ? (
            <StatePanel state="empty" title="No held carts">
              Hold a cart when a customer steps away, then resume it here.
            </StatePanel>
          ) : null}
        </Stack>
      </Dialog>

      {/* -------------------------------------------------- close shift */}

      <Dialog
        description="Count the drawer and record any difference. A difference always needs a reason."
        onClose={() => setCloseOpen(false)}
        open={closeOpen}
        title="Close this shift"
      >
        {shift ? (
          <form className="ui-stack" onSubmit={(event) => void closeShift(event)}>
            <MoneySummary
              rows={[
                { label: "Opening float", value: formatMoney(shift.openingFloat) },
                { label: "Sales", value: `${shift.saleCount} · ${formatMoney(shift.salesTotal)}` },
                { label: "Refunds", value: formatMoney(shift.refundTotal) },
                { label: "Expected cash", value: formatMoney(shift.expectedCash) },
              ]}
              totalLabel="Expected cash"
            />
            <FormGrid>
              <Field
                inputMode="decimal"
                label="Counted cash"
                name="countedCash"
                defaultValue={String(shift.expectedCash)}
                required
              />
              <Field label="Reason for any difference" name="varianceReason" />
            </FormGrid>
            <FormFooter>
              <Button onClick={() => setCloseOpen(false)} variant="secondary">
                Keep selling
              </Button>
              <Button disabled={busy} type="submit">
                Close shift
              </Button>
            </FormFooter>
          </form>
        ) : null}
      </Dialog>
    </main>
  );
}

export function tenderTotal(tenders: Array<{ amount: number }>): number {
  return tenders.reduce((sum, tender) => sum + tender.amount, 0);
}

export function quantityLabel(quantity: number, unit: string): string {
  return `${formatQuantity(quantity)} ${unit}`;
}
