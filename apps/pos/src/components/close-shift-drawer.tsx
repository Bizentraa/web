"use client";

import type { SaleListRow, ShiftSummary } from "@bizentra/contracts";
import { Button, Field, formatMoney, StatusChip } from "@bizentra/design-system";
import { Drawer, NumberPad } from "@bizentra/design-system/client";
import { Delete, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { HeldSaleRow } from "./held-sale-row";
import { SaleListSkeleton } from "./pos-skeletons";
import { tenderMethod } from "./payment-drawer";

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Closing the drawer.
 *
 * The old dialog pre-filled the counted cash with the expected figure, which quietly invites a
 * cashier to accept it without counting: the one number the close exists to capture was the one
 * already filled in. Here the field starts empty, the count is entered on the pad, and the
 * difference is computed and named the moment it stops being zero - over, short, or balanced -
 * so nobody works it out in their head and nobody discovers it the next morning.
 *
 * A difference always carries a reason, and the button says so rather than failing on submit.
 *
 * The same principle covers the other rule the server enforces here: a shift cannot close while a
 * ticket is still open on it. That used to arrive as a red toast after the count was entered -
 * "3 held sale(s) are still open on this shift" - a number with no way to act on it. The tickets
 * themselves are now listed at the top of this drawer with the two ways each can end, and the
 * close button states what is standing in the way instead of failing when pressed.
 */
export function CloseShiftDrawer({
  busy,
  holds,
  holdsLoading,
  onClose,
  onDiscard,
  onResume,
  onSubmit,
  open,
  shift,
}: {
  busy: boolean;
  holds: SaleListRow[];
  holdsLoading: boolean;
  onClose: () => void;
  onDiscard: (sale: SaleListRow) => void;
  onResume: (saleId: string) => void;
  onSubmit: (countedCash: number, varianceReason: string) => void;
  open: boolean;
  shift: ShiftSummary | null;
}) {
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setCounted("");
    setReason("");
  }, [open]);

  if (!shift) return null;

  /* NaN rather than null while nothing is counted: the value stays a number, so the variance and
     the display need no narrowing and cannot silently read as a zero count. */
  const countedCash = counted === "" ? Number.NaN : Number(counted);
  const valid = Number.isFinite(countedCash);
  const variance = valid ? round2(countedCash - shift.expectedCash) : 0;
  const tone = !valid ? "pending" : variance === 0 ? "balanced" : variance > 0 ? "over" : "short";
  const needsReason = valid && variance !== 0 && reason.trim() === "";
  const blocked = holds.length > 0;

  const press = (key: string) => {
    setCounted((current) => {
      if (key === "back") return current.slice(0, -1);
      if (key === ".")
        return current.includes(".") ? current : `${current === "" ? "0" : current}.`;
      if (current.replace(".", "").length >= 9) return current;
      if (current === "0") return key;
      return current + key;
    });
  };

  return (
    <Drawer
      eyebrow={`${shift.branchName} · register ${shift.registerCode}`}
      onClose={onClose}
      open={open}
      title="Close this shift"
      wide
    >
      <span className="ui-pos-shift-id">
        Shift
        <b className="ui-code">{shift.number}</b>
      </span>

      {holdsLoading && !holds.length ? (
        <SaleListSkeleton rows={2} />
      ) : blocked ? (
        <section className="ui-pos-blockers">
          <div className="ui-pos-blockers-head">
            <TriangleAlert aria-hidden="true" className="size-5" />
            <div>
              <strong>
                {holds.length} {holds.length === 1 ? "ticket is" : "tickets are"} still open on this
                shift
              </strong>
              <p>
                The drawer cannot be reconciled while a sale on it is unfinished. Resume each one to
                take payment, or discard it with a reason.
              </p>
            </div>
          </div>
          {holds.map((sale) => (
            <HeldSaleRow
              busy={busy}
              key={sale.id}
              onDiscard={onDiscard}
              onResume={onResume}
              sale={sale}
            />
          ))}
        </section>
      ) : null}

      <div className="ui-pay">
        <div className="ui-pay-column">
          <div className="ui-pos-totals">
            <div>
              <span>Opening float</span>
              <b>{formatMoney(shift.openingFloat)}</b>
            </div>
            <div>
              <span>
                Sales ({shift.saleCount} {shift.saleCount === 1 ? "sale" : "sales"})
              </span>
              <b>{formatMoney(shift.salesTotal)}</b>
            </div>
            <div>
              <span>Refunds</span>
              <b>{formatMoney(-shift.refundTotal)}</b>
            </div>
          </div>

          {shift.tenders.length ? (
            <div className="ui-pos-tender-breakdown">
              {shift.tenders.map((tender) => (
                <div key={tender.method}>
                  <span>
                    {tenderMethod(tender.method).label} · {tender.count}
                  </span>
                  <strong>{formatMoney(tender.amount)}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="ui-pos-due">
            <span>Cash the drawer should hold</span>
            <strong>{formatMoney(shift.expectedCash)}</strong>
          </div>

          <div className="ui-pay-amount">
            <span>Counted in the drawer</span>
            <strong>{valid ? formatMoney(countedCash) : "\u2014"}</strong>
          </div>

          <div className="ui-pos-variance" data-tone={tone}>
            <div>
              <span>Difference</span>
              <strong>
                {!valid
                  ? "Count the drawer"
                  : variance === 0
                    ? "Balanced"
                    : `${variance > 0 ? "Over" : "Short"} ${formatMoney(Math.abs(variance))}`}
              </strong>
            </div>
            {valid && variance !== 0 ? (
              <StatusChip tone={variance > 0 ? "warning" : "danger"}>Needs a reason</StatusChip>
            ) : null}
          </div>

          {valid && variance !== 0 ? (
            <Field
              hint="Recorded against the shift and visible in Back Office."
              label="Reason for the difference"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Two twenties handed over at the end of the queue"
              value={reason}
            />
          ) : null}
        </div>

        <div className="ui-pay-column ui-pay-numberpad">
          <NumberPad onInput={press} />
          <Button onClick={() => setCounted("")} variant="secondary">
            <Delete aria-hidden="true" className="size-4" />
            Clear count
          </Button>
        </div>
      </div>

      <div className="ui-pos-actions">
        <Button onClick={onClose} variant="secondary">
          Keep selling
        </Button>
        <Button
          className="ui-pos-pay"
          disabled={busy || blocked || !valid || needsReason}
          onClick={() => {
            if (valid && !blocked) onSubmit(countedCash, reason.trim());
          }}
          size="large"
        >
          {busy
            ? "Closing..."
            : blocked
              ? `Finish or discard ${holds.length} open ${holds.length === 1 ? "ticket" : "tickets"}`
              : needsReason
                ? "Add a reason to close"
                : !valid
                  ? "Enter the counted cash"
                  : "Close the shift"}
        </Button>
      </div>
    </Drawer>
  );
}
