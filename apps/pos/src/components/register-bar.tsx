"use client";

import type { ShiftSummary } from "@bizentra/contracts";
import { formatDateTime, formatMoney } from "@bizentra/design-system";
import { ConfirmDialog } from "@bizentra/design-system/client";
import { ChevronDown, Lock, MapPin, MonitorSmartphone, Receipt } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RegisterSelection } from "@/app/lib/pos-session";

/**
 * The terminal identity in the POS topbar.
 *
 * A till belongs to one Branch, so this is a binding rather than a switcher: re-binding is a
 * deliberate, confirmed act and is refused outright while a shift is open, because every sale and
 * the cash drawer count belong to that shift's Branch and register.
 *
 * The shift lives in here too. It used to sit beside this control as a chip wide enough to read
 * "Shift COLA2-SHIFT-000003" across the header, which cost the bar its whole left half to say
 * something a cashier checks perhaps twice a day. The trigger now carries a dot - lit when a
 * shift is open - and the menu holds the number, when it opened and what has gone through it.
 */
export function RegisterBar({
  onUnbind,
  register,
  shift,
}: {
  onUnbind: () => void;
  register: RegisterSelection | null;
  shift: ShiftSummary | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const shiftOpen = Boolean(shift);

  if (!register) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
        <MonitorSmartphone className="size-4" aria-hidden="true" />
        Register not set
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="border-border bg-card hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <MonitorSmartphone className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium">{register.branchName}</span>
              <span className="text-muted-foreground truncate text-xs">
                Register <span className="ui-code">{register.registerCode}</span>
              </span>
            </span>
            {/* The one thing about the shift a cashier checks at a glance: is it open. */}
            <span
              aria-hidden="true"
              className="ui-pos-terminal-dot"
              data-open={shiftOpen}
              title={shiftOpen ? `Shift ${shift?.number ?? ""} is open` : "No shift open"}
            />
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        {/* Aligned to the trigger's start: the register bar is the leftmost control on the
            till header, so an end-aligned menu hung off the left edge of the screen. */}
        <DropdownMenuContent align="start" sideOffset={6} className="min-w-72 rounded-lg">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            This terminal
          </DropdownMenuLabel>

          <DropdownMenuItem disabled className="gap-2 p-2 opacity-100">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{register.branchName}</span>
              <span className="text-muted-foreground truncate text-xs">
                Register <span className="ui-code">{register.registerCode}</span>
              </span>
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-muted-foreground text-xs">Shift</DropdownMenuLabel>

          {shift ? (
            <DropdownMenuItem disabled className="gap-2 p-2 opacity-100">
              <Receipt className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="ui-code truncate font-medium">{shift.number}</span>
                <span className="text-muted-foreground text-xs">
                  Opened {formatDateTime(shift.openedAt)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {shift.saleCount} {shift.saleCount === 1 ? "sale" : "sales"} ·{" "}
                  {formatMoney(shift.salesTotal)} · drawer {formatMoney(shift.expectedCash)}
                </span>
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="gap-2 p-2 opacity-100">
              <Receipt className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span>No shift open</span>
                <span className="text-muted-foreground text-xs">
                  Open one on the selling screen before taking a sale
                </span>
              </span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {shiftOpen ? (
            <DropdownMenuItem disabled className="gap-2 p-2">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span>Change register</span>
                <span className="text-muted-foreground text-xs">
                  Close shift {shift?.number} first
                </span>
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="gap-2 p-2" onClick={() => setConfirmOpen(true)}>
              <MonitorSmartphone className="size-4 shrink-0" aria-hidden="true" />
              Change register
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        confirmLabel="Change register"
        consequence={`This terminal will stop being ${register.branchName} · ${register.registerCode}. Nothing already recorded changes, and the next shift must be opened against the Branch and register you pick.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onUnbind();
        }}
        open={confirmOpen}
        title="Change this terminal's register?"
      />
    </>
  );
}
