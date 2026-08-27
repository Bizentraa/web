"use client";

import type { ShiftSummary } from "@bizentra/contracts";
import { ConfirmDialog } from "@bizentra/design-system/client";
import { ChevronDown, Lock, MapPin, MonitorSmartphone } from "lucide-react";
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
            <ChevronDown className="ml-1 size-4 shrink-0" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={6} className="min-w-64 rounded-lg">
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
