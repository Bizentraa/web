"use client";

import type {
  PaymentMethodKind,
  PosCatalogEntry,
  SaleDetail,
  SaleListRow,
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
  OfflineBanner,
  ReceiptView,
  SelectField,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import {
  ConfirmDialog,
  createIdempotencyKey,
  Dialog,
  useMediaQuery,
  useScanFocus,
  useToasts,
} from "@bizentra/design-system/client";
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Minus,
  MonitorSmartphone,
  Plus,
  Printer,
  ScanBarcode,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react";

import { CloseShiftDrawer } from "@/components/close-shift-drawer";
import { HeldSaleRow } from "@/components/held-sale-row";
import { PaymentDrawer } from "@/components/payment-drawer";
import { CatalogSkeleton, SaleListSkeleton, SellScreenSkeleton } from "@/components/pos-skeletons";
import { PosTopbar } from "@/components/pos-topbar";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { readNumber, readText } from "./lib/forms";
import { errorMessage } from "./lib/pos-session";
import { usePosWorkspace } from "./lib/pos-workspace";

export default function PosPage() {
  const {
    api,
    busy,
    cart,
    cartOpen,
    categoryId,
    clearCart,
    closeOpen,
    coupon,
    customerId,
    customers,
    focusMode,
    held,
    heldLoading,
    heldOpen,
    holdsLoading,
    identity,
    lines,
    online,
    openHolds,
    payOpen,
    queue,
    quote,
    quoteError,
    receipt,
    reference,
    refreshHolds,
    refreshShift,
    register,
    results,
    resultsLoading,
    resumedSaleId,
    saleDiscount,
    setBusy,
    setCartOpen,
    setCategoryId,
    setCloseOpen,
    setCoupon,
    setCustomerId,
    setFocusMode,
    setHeld,
    setHeldLoading,
    setHeldOpen,
    setLines,
    setPayOpen,
    setReceipt,
    setRegister,
    setResumedSaleId,
    setSaleDiscount,
    setTenders,
    setTerm,
    shift,
    shiftLoading,
    tenders,
    term,
  } = usePosWorkspace();

  const toasts = useToasts();
  /* The ticket a cashier has asked to throw away, held until they have given a reason for it. */
  const [discarding, setDiscarding] = useState<SaleListRow | null>(null);

  const overlayOpen = payOpen || heldOpen || closeOpen || receipt !== null;
  /*
   * A hardware scanner types into whatever holds focus, so the scan field claims it. On a touch
   * screen that same claim throws up the on-screen keyboard over the product grid every time a
   * dialog closes, so a coarse pointer opts out and the cashier taps the field when they mean to
   * type. Scanners on tablets are wedge devices and still deliver to the focused field once tapped.
   */
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const scanRef = useScanFocus<HTMLInputElement>(Boolean(shift) && !overlayOpen && !coarsePointer);

  /* ----------------------------------------------------------------- cart */

  const addEntry = useCallback(
    (entry: PosCatalogEntry) => {
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
    },
    [setLines],
  );

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
    if (!Number.isFinite(quantity)) return;
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.itemId !== itemId)
        : current.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)),
    );
  };

  /* ------------------------------------------------------------- payments */

  const total = quote?.total ?? 0;
  const tendered = tenders.reduce((sum, tender) => sum + tender.amount, 0);
  const due = Math.max(Math.round((total - tendered) * 100) / 100, 0);
  const change = tenders.reduce(
    (sum, tender) => sum + Math.max(tender.tendered - tender.amount, 0),
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const inCart = useMemo(
    () => new Map(lines.map((line) => [line.itemId, line.quantity] as const)),
    [lines],
  );

  const addTender = (method: PaymentMethodKind, amount: number, tenderReference: string) => {
    const applied = Math.min(amount, due);
    if (applied <= 0) return;
    setTenders((current) => [
      ...current,
      {
        method,
        amount: applied,
        tendered: method === "CASH" ? amount : applied,
        reference: tenderReference,
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
      await refreshHolds();
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
      await refreshHolds();
    } catch (cause) {
      toasts.push({ title: "Cart not held", description: errorMessage(cause), tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const openHeld = async () => {
    if (!api || !identity) return;
    setHeldOpen(true);
    setHeldLoading(true);
    try {
      const page = await api.listSales(identity.businessId, { status: "HELD", pageSize: 25 });
      setHeld(page.rows);
    } catch (cause) {
      toasts.push({
        title: "Held carts not loaded",
        description: errorMessage(cause),
        tone: "danger",
      });
      setHeld([]);
    } finally {
      setHeldLoading(false);
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
      /* Resuming is also how a cashier clears a blocker from the close-shift drawer. */
      setCloseOpen(false);
      setCartOpen(false);
      await refreshHolds();
      toasts.push({ title: `Resumed ${sale.number}`, tone: "success" });
    } catch (cause) {
      toasts.push({ title: "Cart not resumed", description: errorMessage(cause), tone: "danger" });
    }
  };

  /**
   * Throwing a ticket away.
   *
   * Voiding is the only honest way to end an unfinished sale: the record stays, marked void, with
   * the reason attached, so a shift that closed with three tickets discarded can still say what
   * they were. The server refuses outright if any money has already been taken against it, which
   * is what keeps this from becoming a way to make a payment disappear.
   */
  const discardHold = async (saleId: string, reason: string) => {
    if (!api || !identity) return;
    setBusy(true);
    try {
      await api.voidSale(identity.businessId, saleId, { reason });
      setDiscarding(null);
      setHeld((current) => current.filter((row) => row.id !== saleId));
      await refreshHolds();
      toasts.push({
        title: "Ticket discarded",
        description: "It no longer holds the shift open.",
        tone: "success",
      });
    } catch (cause) {
      toasts.push({
        title: "Ticket not discarded",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
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

  const closeShift = async (countedCash: number, varianceReason: string) => {
    if (!api || !identity || !shift) return;
    setBusy(true);
    try {
      await api.closeShift(identity.businessId, shift.id, {
        countedCash,
        ...(varianceReason ? { varianceReason } : {}),
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

  /* ----------------------------------------------------------- focus mode */

  /*
   * Full view hides the header so the products, the ticket and the amount due own the screen -
   * the state a till spends its day in. It also asks the browser for real fullscreen, which is
   * what removes the address bar on a wall-mounted terminal; that request can be refused (it needs
   * a user gesture, and some kiosk builds disable it) and the layout change stands either way, so
   * the feature never depends on it.
   */
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

  /* Leaving fullscreen by Escape or a system gesture has to bring the header back with it. */
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [setFocusMode]);

  /* ---------------------------------------------------------------- views */

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

  const categories = (reference?.categories ?? []).filter(
    (category) => category.status === "ACTIVE",
  );

  /*
   * `data-cartbar` is what makes the shell leave room for the fixed cart bar on a narrow screen.
   * The bar only exists once a shift is open, so the open-shift form does not sit above 76px of
   * nothing.
   */
  return (
    <main className="ui-pos-shell" data-cartbar={Boolean(shift)} data-focus={focusMode}>
      <PosTopbar
        active="sell"
        heldCount={openHolds.length}
        onCloseShift={() => setCloseOpen(true)}
        onHeld={() => void openHeld()}
        online={online}
        queue={{ count: queue.queue.length, syncing: queue.syncing, sync: () => void queue.sync() }}
        register={register}
        setRegister={setRegister}
        shift={shift}
      />

      {!online || queue.queue.length ? (
        <OfflineBanner
          pendingCount={queue.queue.length}
          state={queue.needsReview.length ? "needs-review" : online ? "syncing" : "offline"}
        />
      ) : null}

      {shiftLoading ? (
        <SellScreenSkeleton />
      ) : !shift ? (
        <div className="ui-pos-fallback">
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
        </div>
      ) : (
        <>
          <div className="ui-pos-layout">
            {/* -------------------------------------------------- products */}

            <section className="ui-pos-panel">
              <form className="ui-pos-scan" onSubmit={(event) => void scan(event)}>
                <div className="ui-pos-scan-field">
                  <ScanBarcode aria-hidden="true" className="size-5" />
                  <input
                    aria-label="Scan a barcode or search an item"
                    autoComplete="off"
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Scan barcode or search item"
                    ref={scanRef}
                    value={term}
                  />
                  {term ? (
                    <button
                      aria-label="Clear the search"
                      className="ui-pos-scan-clear"
                      onClick={() => setTerm("")}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </div>
                <Button type="submit">
                  <Plus aria-hidden="true" className="size-4" />
                  Add
                </Button>
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
              </form>

              {categories.length ? (
                <div className="ui-pos-chips" role="group" aria-label="Filter by category">
                  <button
                    aria-pressed={categoryId === ""}
                    className="ui-pos-chip"
                    data-active={categoryId === ""}
                    onClick={() => setCategoryId("")}
                    type="button"
                  >
                    All items
                  </button>
                  {categories.map((category) => (
                    <button
                      aria-pressed={categoryId === category.id}
                      className="ui-pos-chip"
                      data-active={categoryId === category.id}
                      key={category.id}
                      onClick={() => setCategoryId(category.id === categoryId ? "" : category.id)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {/*
                The skeleton is only for the first fill. Once the grid holds something, a refine
                leaves it on screen and swaps the rows underneath, because blanking a grid a
                cashier is reading is worse than a moment of slightly stale prices.
              */}
              {resultsLoading && !results.length ? (
                <CatalogSkeleton />
              ) : results.length ? (
                <div className="ui-pos-results">
                  {results.map((entry) => {
                    const quantity = inCart.get(entry.itemId) ?? 0;
                    return (
                      <button
                        className="ui-pos-tile"
                        data-in-cart={quantity > 0}
                        key={`${entry.itemId}-${entry.variantId ?? "base"}`}
                        onClick={() => addEntry(entry)}
                        type="button"
                      >
                        {quantity > 0 ? (
                          <span className="ui-pos-tile-count">{formatQuantity(quantity)}</span>
                        ) : null}
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.code} · {entry.unitCode}
                        </span>
                        <b>{formatMoney(entry.unitPrice)}</b>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <StatePanel state="empty" title="No items match">
                  {term || categoryId
                    ? "Clear the search or pick another category. Only active, sellable items with a price appear here."
                    : "Scan a barcode or type part of an item name. Only active, sellable items with a price appear here."}
                </StatePanel>
              )}
            </section>

            {/* ---------------------------------------------------- ticket */}

            <section className="ui-pos-panel ui-pos-ticket ui-pos-summoned" data-open={cartOpen}>
              <div className="ui-pos-panel-head">
                <h2 className="ui-pos-panel-title">
                  <ShoppingCart aria-hidden="true" className="size-4" />
                  Ticket
                  {itemCount > 0 ? <small>{formatQuantity(itemCount)}</small> : null}
                </h2>
                <div className="ui-row">
                  {resumedSaleId ? <Badge tone="warning">Resumed hold</Badge> : null}
                  {/* Only rendered as a control below the ticket breakpoint, where the panel
                      is a sheet; the stylesheet hides it at every wider size. */}
                  <button
                    aria-label="Close the ticket"
                    className="ui-pos-icon-button ui-pos-ticket-close"
                    onClick={() => setCartOpen(false)}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>

              <label className="ui-pos-ticket-customer">
                <User aria-hidden="true" className="size-4" />
                <select
                  aria-label="Customer"
                  onChange={(event) => setCustomerId(event.target.value)}
                  value={customerId}
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.storeCredit > 0
                        ? ` (credit ${formatMoney(customer.storeCredit)})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              {lines.length ? (
                <div className="ui-pos-cart">
                  {lines.map((line) => (
                    <div className="ui-pos-cart-line" key={line.itemId}>
                      <strong>{line.name}</strong>
                      <div className="ui-pos-qty">
                        <button
                          aria-label={`Reduce ${line.name}`}
                          onClick={() => setQuantity(line.itemId, line.quantity - 1)}
                          type="button"
                        >
                          <Minus aria-hidden="true" className="size-3.5" />
                        </button>
                        <input
                          aria-label={`Quantity for ${line.name}`}
                          inputMode="decimal"
                          onChange={(event) =>
                            setQuantity(line.itemId, Number(event.target.value || 0))
                          }
                          value={line.quantity}
                        />
                        <button
                          aria-label={`Add another ${line.name}`}
                          onClick={() => setQuantity(line.itemId, line.quantity + 1)}
                          type="button"
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                        </button>
                      </div>
                      <small>
                        {formatMoney(line.unitPrice)} / {line.unitCode}
                      </small>
                      <strong className="ui-money">
                        {formatMoney(line.unitPrice * line.quantity)}
                      </strong>
                      <button
                        aria-label={`Remove ${line.name}`}
                        className="ui-pos-line-remove"
                        onClick={() => setQuantity(line.itemId, 0)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <StatePanel state="empty" title="The ticket is empty">
                  Scan a barcode or tap a product. Items appear here with their price and quantity.
                </StatePanel>
              )}

              <details className="ui-pos-options">
                <summary>
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                  Discount and coupon
                  {saleDiscount || coupon ? <Badge tone="information">Applied</Badge> : null}
                  <ChevronDown aria-hidden="true" className="size-4" />
                </summary>
                <div className="ui-pos-options-body">
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
                </div>
              </details>

              {quoteError ? (
                <StatePanel state="error" title="This ticket cannot be priced">
                  {quoteError}
                </StatePanel>
              ) : null}

              {quote ? (
                <>
                  <div className="ui-pos-totals">
                    <div>
                      <span>Subtotal</span>
                      <b>{formatMoney(quote.subtotal)}</b>
                    </div>
                    {quote.discountTotal > 0 ? (
                      <div data-tone="saving">
                        <span>Discount</span>
                        <b>{formatMoney(-quote.discountTotal)}</b>
                      </div>
                    ) : null}
                    <div>
                      <span>Tax</span>
                      <b>{formatMoney(quote.taxTotal)}</b>
                    </div>
                  </div>

                  {quote.appliedPromotions.length || quote.warnings.length ? (
                    <div className="ui-row">
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
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="ui-pos-due">
                <span>Amount due</span>
                <strong>{formatMoney(due, quote?.currencyCode)}</strong>
              </div>

              <div className="ui-pos-actions">
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
                  className="ui-pos-pay"
                  disabled={!quote || !lines.length || busy}
                  onClick={() => {
                    setCartOpen(false);
                    setPayOpen(true);
                  }}
                  size="large"
                >
                  Pay {formatMoney(due, quote?.currencyCode)}
                </Button>
              </div>
            </section>
          </div>

          {/* --------------------------------- compact ticket summoning bar */}

          <div
            aria-hidden="true"
            className="ui-pos-scrim"
            data-open={cartOpen}
            onClick={() => setCartOpen(false)}
          />

          <div className="ui-pos-cartbar">
            <div className="ui-pos-cartbar-summary">
              <span>
                {itemCount > 0
                  ? `${formatQuantity(itemCount)} item${itemCount === 1 ? "" : "s"}`
                  : "Ticket empty"}
              </span>
              <strong>{formatMoney(due, quote?.currencyCode)}</strong>
            </div>
            <Button onClick={() => setCartOpen(true)}>
              <ShoppingCart aria-hidden="true" className="size-4" />
              Open ticket
            </Button>
          </div>
        </>
      )}

      {/* ------------------------------------------------------- payment */}

      <PaymentDrawer
        busy={busy}
        change={change}
        currencyCode={quote?.currencyCode}
        due={due}
        offline={!online}
        onAddTender={addTender}
        onClose={() => setPayOpen(false)}
        onComplete={() => void completeSale()}
        onRemoveTender={(index) => setTenders((current) => current.filter((_, at) => at !== index))}
        open={payOpen}
        tendered={tendered}
        tenders={tenders}
        total={total}
      />

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
                <Printer aria-hidden="true" className="size-4" />
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
        {heldLoading ? (
          <SaleListSkeleton rows={4} />
        ) : held.length ? (
          <div className="ui-pos-list">
            {held.map((sale) => (
              <HeldSaleRow
                busy={busy}
                key={sale.id}
                onDiscard={setDiscarding}
                onResume={(saleId) => void resumeHeld(saleId)}
                sale={sale}
              />
            ))}
          </div>
        ) : (
          <StatePanel state="empty" title="No held carts">
            Hold a cart when a customer steps away, then resume it here.
          </StatePanel>
        )}
      </Dialog>

      {/* -------------------------------------------------- close shift */}

      <CloseShiftDrawer
        busy={busy}
        holds={openHolds}
        holdsLoading={holdsLoading}
        onClose={() => setCloseOpen(false)}
        onDiscard={setDiscarding}
        onResume={(saleId) => void resumeHeld(saleId)}
        onSubmit={(countedCash, varianceReason) => void closeShift(countedCash, varianceReason)}
        open={closeOpen}
        shift={shift}
      />

      {/* ------------------------------------------------ discard a ticket */}

      <ConfirmDialog
        busy={busy}
        confirmLabel="Discard this ticket"
        consequence={
          discarding
            ? `${discarding.receiptNumber ?? discarding.number} and its ${discarding.lineCount} line(s) worth ${formatMoney(discarding.total)} will be voided. The record stays with your reason attached, nothing is removed from stock, and the ticket stops holding this shift open.`
            : ""
        }
        onCancel={() => setDiscarding(null)}
        onConfirm={(reason) => {
          if (discarding) void discardHold(discarding.id, reason);
        }}
        open={discarding !== null}
        reasonLabel="Why is this ticket being discarded?"
        title="Discard this unfinished ticket?"
      />
    </main>
  );
}
