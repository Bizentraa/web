"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  FileInput,
  Gauge,
  Grid2X2,
  KeyRound,
  Layers3,
  ListChecks,
  PackageSearch,
  ReceiptText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button, cn, Kicker } from "./index.js";

/* -------------------------------------------------------------------------- */
/* Overlays                                                                   */
/* -------------------------------------------------------------------------- */

type OverlayPlacement = "center" | "end" | "bottom";

function useOverlayBehaviour(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstControl = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, [href], [tabindex]:not([tabindex='-1'])",
    );
    firstControl?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return panelRef;
}

/**
 * Shared overlay used by dialogs, drawers and the POS payment sheet. Escape closes it, the
 * background is inert while it is open and focus moves to the first control inside it.
 */
export function Overlay({
  children,
  className,
  label,
  onClose,
  open,
  placement = "center",
  panelClassName,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
  open: boolean;
  placement?: OverlayPlacement;
  panelClassName: string;
}) {
  const panelRef = useOverlayBehaviour(open, onClose);
  if (!open) return null;

  return (
    <div
      className={cn(
        "ui-overlay",
        placement === "end" && "ui-overlay--end",
        placement === "bottom" && "ui-overlay--bottom",
        className,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        aria-label={label}
        aria-modal="true"
        className={panelClassName}
        ref={panelRef}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

export function Dialog({
  children,
  description,
  footer,
  onClose,
  open,
  title,
  wide = false,
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  wide?: boolean;
}) {
  return (
    <Overlay
      label={title}
      onClose={onClose}
      open={open}
      panelClassName={cn("ui-dialog", wide && "ui-dialog--wide")}
    >
      <div className="ui-dialog-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <Button aria-label="Close" onClick={onClose} size="quiet" variant="ghost">
          Close
        </Button>
      </div>
      {children}
      {footer ? <div className="ui-dialog-footer">{footer}</div> : null}
    </Overlay>
  );
}

export function Drawer({
  children,
  eyebrow,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Overlay label={title} onClose={onClose} open={open} placement="end" panelClassName="ui-drawer">
      <div className="ui-dialog-header">
        <div>
          {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
          <h2>{title}</h2>
        </div>
        <Button aria-label="Close" onClick={onClose} size="quiet" variant="ghost">
          Close
        </Button>
      </div>
      {children}
    </Overlay>
  );
}

export function Sheet({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Overlay
      label={title}
      onClose={onClose}
      open={open}
      placement="bottom"
      panelClassName="ui-sheet"
    >
      <div className="ui-dialog-header">
        <h2>{title}</h2>
        <Button aria-label="Close" onClick={onClose} size="quiet" variant="ghost">
          Close
        </Button>
      </div>
      {children}
    </Overlay>
  );
}

/**
 * CC-P0-007 and section 18 of the UI/UX specification: a destructive or financial action states
 * its consequence and collects a reason before it can be confirmed.
 */
export function ConfirmDialog({
  busy = false,
  confirmLabel = "Confirm",
  consequence,
  onCancel,
  onConfirm,
  open,
  reasonLabel,
  title,
}: {
  busy?: boolean;
  confirmLabel?: string;
  consequence: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  open: boolean;
  reasonLabel?: string;
  title: string;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  const needsReason = Boolean(reasonLabel);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog
      onClose={onCancel}
      open={open}
      title={title}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Keep as it is
          </Button>
          <Button
            disabled={busy || (needsReason && reason.trim().length < 3)}
            onClick={() => onConfirm(reason.trim())}
            variant="danger"
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </>
      }
    >
      <section className="ui-danger-confirmation" role="alert">
        <strong>What happens next</strong>
        <p>{consequence}</p>
      </section>
      {needsReason ? (
        <label className="ui-field" htmlFor={reasonId}>
          <span>{reasonLabel}</span>
          <textarea
            id={reasonId}
            onChange={(event) => setReason(event.target.value)}
            placeholder="This reason is kept in the audit history."
            value={reason}
          />
          <small>At least 3 characters. The reason is stored with the audit record.</small>
        </label>
      ) : null}
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

export function Tabs({
  onChange,
  tabs,
  value,
}: {
  onChange: (value: string) => void;
  tabs: Array<{ value: string; label: string; badge?: string; icon?: LucideIcon }>;
  value: string;
}) {
  return (
    <div className="ui-section-nav" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon ?? tabIcon(tab.value, tab.label);
        return (
          <button
            aria-selected={tab.value === value}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" size={17} />
            <span>{tab.label}</span>
            {tab.badge ? <small>{tab.badge}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Section navigation as a left-hand rail, for a screen whose sections are a list of record types
 * rather than a short row of views. A horizontal `Tabs` row stops working once there are six or
 * more sections or the labels are long ("Prices and promotions"); a rail keeps every section
 * readable, shows counts, and leaves the table beside it full width.
 *
 * Implements the tablist keyboard contract: up/down move, home/end jump, and only the selected
 * tab is in the tab order, so the rail is one stop rather than one per section.
 */
export function VerticalTabs({
  children,
  onChange,
  tabs,
  value,
}: {
  children: ReactNode;
  onChange: (value: string) => void;
  tabs: Array<{
    value: string;
    label: string;
    badge?: string;
    description?: string;
    icon?: LucideIcon;
  }>;
  value: string;
}) {
  const move = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = tabs.findIndex((tab) => tab.value === value);
    const last = tabs.length - 1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowDown"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;

    const target = tabs[next];
    if (!target) return;
    onChange(target.value);
    const rail = event.currentTarget;
    rail.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="ui-vertical-tabs">
      <div
        aria-orientation="vertical"
        className="ui-vertical-tabs-nav"
        onKeyDown={move}
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon ?? tabIcon(tab.value, tab.label);
          const selected = tab.value === value;
          return (
            <button
              aria-selected={selected}
              key={tab.value}
              onClick={() => onChange(tab.value)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <Icon aria-hidden="true" size={17} />
              <span>
                <strong>{tab.label}</strong>
                {tab.description ? <small>{tab.description}</small> : null}
              </span>
              {tab.badge ? <em>{tab.badge}</em> : null}
            </button>
          );
        })}
      </div>
      <div className="ui-vertical-tabs-panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
}

function tabIcon(value: string, label: string): LucideIcon {
  const key = `${value} ${label}`.toLowerCase();
  if (key.includes("analytics") || key.includes("report")) return BarChart3;
  if (key.includes("approval") || key.includes("control")) return SlidersHorizontal;
  if (key.includes("audit") || key.includes("history")) return ListChecks;
  if (key.includes("business") || key.includes("branch") || key.includes("setup")) return Building2;
  if (key.includes("catalog") || key.includes("item") || key.includes("price")) return Boxes;
  if (key.includes("customer")) return UsersRound;
  if (key.includes("engine") || key.includes("booking") || key.includes("ticket")) return Store;
  if (key.includes("finance") || key.includes("money") || key.includes("payment")) {
    return CircleDollarSign;
  }
  if (key.includes("import")) return FileInput;
  if (key.includes("inventory") || key.includes("stock")) return PackageSearch;
  if (key.includes("notification") || key.includes("alert")) return Bell;
  if (key.includes("permission") || key.includes("role") || key.includes("user")) return KeyRound;
  if (key.includes("production") || key.includes("security") || key.includes("ready")) {
    return ShieldCheck;
  }
  if (key.includes("sale") || key.includes("shift") || key.includes("return")) return ReceiptText;
  if (key.includes("store") || key.includes("offline") || key.includes("device")) {
    return ClipboardCheck;
  }
  if (key.includes("supplier") || key.includes("purchase")) return Truck;
  if (key.includes("setting") || key.includes("configuration")) return Settings2;
  if (key.includes("layer") || key.includes("variant")) return Layers3;
  if (key.includes("dashboard") || key.includes("overview")) return Gauge;
  return Grid2X2;
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

interface ToastContextValue {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.tone === "danger" ? 8000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [dismiss, push, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="ui-toast-stack">
        {toasts.map((toast) => (
          <article
            className={cn("ui-toast", `ui-toast--${toast.tone ?? "default"}`)}
            key={toast.id}
          >
            <div>
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button aria-label="Dismiss" onClick={() => dismiss(toast.id)} type="button">
              x
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToasts must be used inside a ToastProvider.");
  return context;
}

/* -------------------------------------------------------------------------- */
/* POS helpers                                                                */
/* -------------------------------------------------------------------------- */

export function NumberPad({ onInput }: { onInput: (value: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  return (
    <div className="ui-numberpad">
      {keys.map((key) => (
        <button key={key} onClick={() => onInput(key)} type="button">
          {key === "back" ? "<-" : key}
        </button>
      ))}
    </div>
  );
}

/** Keeps the scan input focused, which is the first POS rule in section 6. */
export function useScanFocus<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const focus = () => ref.current?.focus();
    focus();
    const onWindowFocus = () => focus();
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [active]);

  return ref;
}

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

/** Reports browser connectivity so operational surfaces can show it at all times. */
export function useOnlineState(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

/** A stable idempotency key for one POS action, so a retry never posts twice. */
export function createIdempotencyKey(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
