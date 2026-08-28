"use client";

import type { PaymentMethodKind } from "@bizentra/contracts";
import { Button, Field, formatMoney, StatusChip } from "@bizentra/design-system";
import { Drawer, NumberPad } from "@bizentra/design-system/client";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Delete,
  QrCode,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

export interface Tender {
  method: PaymentMethodKind;
  amount: number;
  tendered: number;
  reference: string;
  idempotencyKey: string;
}

interface TenderMethod {
  method: PaymentMethodKind;
  label: string;
  icon: LucideIcon;
  /** Card, transfer and wallet payments are reconciled against a number printed elsewhere. */
  reference: string | null;
}

export const TENDER_METHODS: TenderMethod[] = [
  { method: "CASH", label: "Cash", icon: Banknote, reference: null },
  { method: "CARD", label: "Card", icon: CreditCard, reference: "Approval code" },
  { method: "TRANSFER", label: "Transfer", icon: ArrowLeftRight, reference: "Transfer reference" },
  { method: "QR_WALLET", label: "QR / wallet", icon: QrCode, reference: "Wallet reference" },
  { method: "STORE_CREDIT", label: "Store credit", icon: Wallet, reference: null },
];

export function tenderMethod(method: PaymentMethodKind): TenderMethod {
  return TENDER_METHODS.find((candidate) => candidate.method === method) ?? TENDER_METHODS[0]!;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Taking the money.
 *
 * The old sheet asked a cashier to fill in a form: pick a method from a select, type an amount,
 * type a reference, press a button. A till does the opposite - it starts with the answer. The
 * amount is pre-loaded with what is still due, so the common case (one tender, exact) is a single
 * press, and the pad is only touched when the customer hands over something other than the total.
 *
 * Cash is treated as the special case it is: the notes a customer actually holds are offered as
 * one-press amounts, and the change is computed live and shown next to the amount, so it is read
 * off the screen rather than worked out while a queue waits.
 */
export function PaymentDrawer({
  busy,
  change,
  currencyCode,
  due,
  offline,
  onAddTender,
  onClose,
  onComplete,
  onRemoveTender,
  open,
  tendered,
  tenders,
  total,
}: {
  busy: boolean;
  change: number;
  currencyCode: string | undefined;
  due: number;
  offline: boolean;
  onAddTender: (method: PaymentMethodKind, amount: number, reference: string) => void;
  onClose: () => void;
  onComplete: () => void;
  onRemoveTender: (index: number) => void;
  open: boolean;
  tendered: number;
  tenders: Tender[];
  total: number;
}) {
  const [method, setMethod] = useState<PaymentMethodKind>("CASH");
  const [entry, setEntry] = useState("");
  const [reference, setReference] = useState("");

  /* Every visit starts from the same place, so the pad never carries the last sale's amount. */
  useEffect(() => {
    if (!open) return;
    setMethod("CASH");
    setEntry(formatAmountEntry(due));
    setReference("");
  }, [due, open]);

  const active = tenderMethod(method);
  /* An empty pad means "exactly what is due", which is what a cashier means by pressing Cash. */
  const typed = entry === "" ? Number.NaN : Number(entry);
  const amount = Number.isFinite(typed) && typed > 0 ? typed : due;
  const changePreview = method === "CASH" ? Math.max(round2(amount - due), 0) : 0;
  const canAdd = amount > 0 && due > 0;

  const press = (key: string) => {
    setEntry((current) => {
      if (key === "back") return current.slice(0, -1);
      if (key === ".")
        return current.includes(".") ? current : `${current === "" ? "0" : current}.`;
      if (current.replace(".", "").length >= 9) return current;
      /* A leading zero is a typing artefact, never an amount. */
      if (current === "0") return key;
      return current + key;
    });
  };

  const add = () => {
    if (!canAdd) return;
    onAddTender(method, amount, reference.trim());
    setEntry(formatAmountEntry(Math.max(round2(due - Math.min(amount, due)), 0)));
    setReference("");
  };

  return (
    <Drawer
      eyebrow={`${tenders.length} tender${tenders.length === 1 ? "" : "s"} on this sale`}
      onClose={onClose}
      open={open}
      title="Payment"
      wide
    >
      <div className="ui-pay">
        <div className="ui-pay-column">
          <div className="ui-pay-amount">
            <span>{due > 0 ? "Taking now" : "Fully tendered"}</span>
            <strong>{formatMoney(due > 0 ? amount : 0, currencyCode)}</strong>
            {changePreview > 0 ? <small>Change {formatMoney(changePreview)}</small> : null}
          </div>

          <Field
            autoFocus
            inputMode="decimal"
            label="Tender amount"
            onChange={(event) => setEntry(normalizeAmountEntry(event.target.value))}
            placeholder="0.00"
            value={entry}
          />

          <div className="ui-pay-methods">
            {TENDER_METHODS.map((candidate) => (
              <button
                aria-pressed={candidate.method === method}
                className="ui-pay-method"
                data-active={candidate.method === method}
                key={candidate.method}
                onClick={() => {
                  setMethod(candidate.method);
                  setReference("");
                }}
                type="button"
              >
                <candidate.icon aria-hidden="true" className="size-5" />
                {candidate.label}
              </button>
            ))}
          </div>

          {method === "CASH" && due > 0 ? (
            <div className="ui-pay-quick">
              <button onClick={() => setEntry(String(due))} type="button">
                Exact
              </button>
              {cashSuggestions(due).map((suggestion) => (
                <button key={suggestion} onClick={() => setEntry(String(suggestion))} type="button">
                  {formatMoney(suggestion)}
                </button>
              ))}
            </div>
          ) : null}

          {active.reference ? (
            <Field
              label={active.reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Printed on the terminal slip"
              value={reference}
            />
          ) : null}

          <Button disabled={!canAdd} onClick={add} size="large">
            Take {formatMoney(Math.min(amount, due))} by {active.label.toLowerCase()}
          </Button>

          {tenders.length ? (
            <div className="ui-pay-tenders">
              {tenders.map((tender, index) => {
                const shape = tenderMethod(tender.method);
                return (
                  <div className="ui-pos-tender-row" key={tender.idempotencyKey}>
                    <shape.icon aria-hidden="true" className="size-4" />
                    <div>
                      <strong>{shape.label}</strong>
                      <small>
                        {tender.reference
                          ? tender.reference
                          : tender.tendered > tender.amount
                            ? `Given ${formatMoney(tender.tendered)} · change ${formatMoney(
                                round2(tender.tendered - tender.amount),
                              )}`
                            : "Exact"}
                      </small>
                    </div>
                    <strong className="ui-money">{formatMoney(tender.amount)}</strong>
                    <Button
                      aria-label={`Remove the ${shape.label.toLowerCase()} tender`}
                      onClick={() => onRemoveTender(index)}
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="ui-pay-column ui-pay-numberpad">
          <NumberPad onInput={press} />
          <Button onClick={() => setEntry("")} variant="secondary">
            <Delete aria-hidden="true" className="size-4" />
            Clear amount
          </Button>
        </div>
      </div>

      <div className="ui-pos-totals">
        <div>
          <span>Sale total</span>
          <b>{formatMoney(total, currencyCode)}</b>
        </div>
        <div>
          <span>Tendered</span>
          <b>{formatMoney(tendered)}</b>
        </div>
        {change > 0 ? (
          <div data-tone="saving">
            <span>Change to give</span>
            <b>{formatMoney(change)}</b>
          </div>
        ) : null}
      </div>

      <div className="ui-pos-due">
        <span>{due > 0 ? "Still due" : "Ready to complete"}</span>
        <strong>{formatMoney(due, currencyCode)}</strong>
      </div>

      {offline ? (
        <StatusChip tone="warning">
          Offline: this sale is saved on the terminal and sent when the connection returns
        </StatusChip>
      ) : null}

      <div className="ui-pos-actions">
        <Button onClick={onClose} variant="secondary">
          Back to cart
        </Button>
        <Button
          className="ui-pos-pay"
          disabled={busy || due > 0 || !tenders.length}
          onClick={onComplete}
          size="large"
        >
          {busy ? "Posting..." : "Complete sale"}
        </Button>
      </div>
    </Drawer>
  );
}

/**
 * The notes a customer is likely to be holding for this amount.
 *
 * Rounding up to the next 5, 10, 20, 50 and 100 covers almost every real handover; anything the
 * list misses is still one pass on the pad.
 */
function cashSuggestions(due: number): number[] {
  const steps = [5, 10, 20, 50, 100];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const step of steps) {
    const value = Math.ceil(due / step) * step;
    if (value <= due || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length === 4) break;
  }
  return out;
}

function formatAmountEntry(value: number): string {
  return Number.isFinite(value) && value > 0 ? String(round2(value)) : "";
}

function normalizeAmountEntry(value: string): string {
  const [whole = "", fraction] = value.replace(/[^\d.]/g, "").split(".", 2);
  const decimals = fraction === undefined ? "" : `.${fraction.slice(0, 2)}`;
  return `${whole.slice(0, 9)}${decimals}`;
}
