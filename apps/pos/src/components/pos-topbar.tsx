"use client";

import type { ShiftSummary } from "@bizentra/contracts";
import { Button, StatusChip } from "@bizentra/design-system";
import {
  Clock,
  LockKeyhole,
  Pause,
  RefreshCw,
  ShoppingCart,
  Undo2,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RegisterBar } from "@/components/register-bar";
import type { RegisterSelection } from "@/app/lib/pos-session";

/**
 * The till header.
 *
 * A cashier is not an administrator: the header answers the four questions asked at a counter -
 * which register am I, is a shift open, am I online, and what time is it - and offers only the
 * moves that belong to a till. Selling and returns are a two-stop segmented control rather than a
 * menu, because a cashier reaches for them with a thumb and without reading.
 *
 * It is laid out as a three-column grid so that control keeps the same position on both screens,
 * whatever the side groups happen to hold. Every action keeps its icon and its accessible name at
 * every width; only the visible words fold away, so the bar never wraps and nothing moves.
 *
 * The shift is not stated here. A chip wide enough to read "Shift COLA2-SHIFT-000003" spent the
 * left half of the bar on something checked twice a day, and read as an alarm - "No shift" in
 * warning orange - during the second before the terminal had asked. It lives in the register menu
 * instead, behind a dot on that control which is lit when a shift is open.
 *
 * The bar is shared by selling and returns, and disappears entirely in focus mode.
 */
export function PosTopbar({
  active,
  heldCount = 0,
  onCloseShift,
  onHeld,
  online,
  queue,
  register,
  setRegister,
  shift,
}: {
  active: "sell" | "returns";
  /** Open tickets on this shift. Stated here because they are what blocks the shift closing. */
  heldCount?: number;
  onCloseShift?: () => void;
  onHeld?: () => void;
  online: boolean;
  queue?: { count: number; syncing: boolean; sync: () => void };
  register: RegisterSelection | null;
  setRegister: (register: RegisterSelection | null) => void;
  shift: ShiftSummary | null;
}) {
  const clock = useClock();

  return (
    <header className="ui-pos-topbar">
      <div className="ui-pos-topbar-group ui-pos-topbar-group--start">
        <RegisterBar onUnbind={() => setRegister(null)} register={register} shift={shift} />
      </div>

      <nav aria-label="Till" className="ui-pos-nav">
        <Link aria-current={active === "sell" ? "page" : undefined} href="/">
          <ShoppingCart aria-hidden="true" className="size-4" />
          <span>Sell</span>
        </Link>
        <Link aria-current={active === "returns" ? "page" : undefined} href="/returns">
          <Undo2 aria-hidden="true" className="size-4" />
          <span>Returns</span>
        </Link>
      </nav>

      <div className="ui-pos-topbar-group ui-pos-topbar-group--end">
        <span className="ui-pos-clock">
          <Clock aria-hidden="true" className="size-4" />
          <strong>{clock ?? "--:--"}</strong>
        </span>

        <StatusChip tone={online ? "success" : "warning"} title={online ? "Online" : "Offline"}>
          {online ? (
            <Wifi aria-hidden="true" className="size-3.5" />
          ) : (
            <WifiOff aria-hidden="true" className="size-3.5" />
          )}
          <span className="ui-pos-label">{online ? "Online" : "Offline"}</span>
        </StatusChip>

        {queue && queue.count > 0 ? (
          <Button
            onClick={queue.sync}
            title={`Send ${queue.count} queued sale${queue.count === 1 ? "" : "s"}`}
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            <span className="ui-pos-label">{queue.syncing ? "Syncing..." : "Sync"}</span>
            {queue.count}
          </Button>
        ) : null}

        {onHeld ? (
          <Button
            aria-label={heldCount ? `Held carts (${heldCount} open)` : "Held carts"}
            onClick={onHeld}
            title={
              heldCount
                ? `${heldCount} open ticket${heldCount === 1 ? "" : "s"} on this shift`
                : "Held carts"
            }
            variant="secondary"
          >
            <Pause aria-hidden="true" className="size-4" />
            <span className="ui-pos-label">Held carts</span>
            {heldCount ? heldCount : null}
          </Button>
        ) : null}

        {onCloseShift && shift ? (
          <Button
            aria-label="Close shift"
            onClick={onCloseShift}
            title="Close shift"
            variant="ghost"
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            <span className="ui-pos-label">Close shift</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The wall clock, to the minute.
 *
 * It starts empty so the server and the first client render agree; a time rendered on the server
 * would be stale by the time it reached the screen and would trip hydration anyway.
 */
function useClock(): string | null {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
