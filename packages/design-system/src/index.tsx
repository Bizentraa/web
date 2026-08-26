import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type Tone = "default" | "success" | "warning" | "danger" | "information" | "neutral";

function cn(...classes: Array<false | null | string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  activeHref?: string;
  context?: {
    business?: string;
    branch?: string;
  };
  navigation?: Array<{
    href: string;
    label: string;
    description: string;
    phase: string;
    status?: "ready" | "in-progress" | "planned";
  }>;
}) {
  const navigation = props.navigation ?? defaultNavigation;

  return (
    <main className="ui-app-shell">
      <aside className="ui-sidebar" aria-label="Primary navigation">
        <a className="ui-brand" href="/">
          <span aria-hidden="true">B</span>
          <strong>Bizentra</strong>
        </a>
        <nav className="ui-sidebar-nav">
          {navigation.map((item) => (
            <ShellNavLink
              active={props.activeHref === item.href}
              href={item.href}
              key={item.href}
              status={item.status ?? "planned"}
            >
              <span>{item.label}</span>
              <small>
                {item.phase} · {item.description}
              </small>
            </ShellNavLink>
          ))}
        </nav>
      </aside>

      <section className="ui-app-main">
        <header className="ui-topbar">
          <div className="ui-topbar-context" aria-label="Active context">
            <span>Business</span>
            <strong>{props.context?.business ?? "Development Business"}</strong>
            <span>Branch</span>
            <strong>{props.context?.branch ?? "Main Branch"}</strong>
          </div>
          <a className="ui-command-trigger" href="#global-command-palette">
            <span>Search or command</span>
            <kbd>Ctrl K</kbd>
          </a>
        </header>

        <nav className="ui-mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 4).map((item) => (
            <a
              aria-current={props.activeHref === item.href ? "page" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <header className="ui-hero">
          <div>
            <p>{props.eyebrow}</p>
            <h1>{props.title}</h1>
            <span>{props.description}</span>
          </div>
        </header>
        <section className="ui-content">{props.children}</section>
      </section>
    </main>
  );
}

const defaultNavigation = [
  {
    href: "/",
    label: "Dashboard",
    description: "foundation status",
    phase: "P0",
    status: "ready",
  },
  {
    href: "/appearance",
    label: "Appearance",
    description: "Business theme",
    phase: "P0",
    status: "ready",
  },
  {
    href: "/catalog",
    label: "Catalog",
    description: "master data",
    phase: "P1",
    status: "in-progress",
  },
  {
    href: "/pos-readiness",
    label: "POS readiness",
    description: "sales planning",
    phase: "P2",
    status: "planned",
  },
] as const;

function ShellNavLink({
  active,
  children,
  href,
  status = "planned",
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  active: boolean;
  children: ReactNode;
  status?: "ready" | "in-progress" | "planned";
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn("ui-sidebar-link", `ui-sidebar-link--${status}`)}
      href={href}
    >
      <span aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}

export function StatusCard(props: {
  title: string;
  status: "ready" | "planned" | "attention";
  children: ReactNode;
}) {
  const colors = {
    ready: {
      background: "color-mix(in srgb, var(--color-success) 14%, var(--color-surface))",
      foreground: "var(--color-success)",
      label: "Ready",
    },
    planned: {
      background: "color-mix(in srgb, var(--color-information) 14%, var(--color-surface))",
      foreground: "var(--color-information)",
      label: "Planned",
    },
    attention: {
      background: "color-mix(in srgb, var(--color-warning) 14%, var(--color-surface))",
      foreground: "var(--color-warning)",
      label: "Check",
    },
  } as const;
  const color = colors[props.status];

  return (
    <article
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{props.title}</h2>
        <span
          style={{
            alignSelf: "start",
            background: color.background,
            borderRadius: 999,
            color: color.foreground,
            fontSize: ".8rem",
            fontWeight: 700,
            padding: "5px 10px",
          }}
        >
          {color.label}
        </span>
      </div>
      <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{props.children}</div>
    </article>
  );
}

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  status,
  title,
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  status?: ReactNode;
  title: string;
}) {
  return (
    <header className={cn("ui-page-header", className)}>
      <div>
        {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
        <div className="ui-page-header-title-row">
          <h2>{title}</h2>
          {status}
        </div>
        <p>{description}</p>
      </div>
      {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({
  asForm = false,
  className,
  ...props
}: (HTMLAttributes<HTMLElement> | FormHTMLAttributes<HTMLFormElement>) & {
  asForm?: boolean;
  children: ReactNode;
}) {
  const Component = asForm ? "form" : "section";

  return <Component className={cn("ui-card", className)} {...props} />;
}

export function KpiCard({
  className,
  comparison,
  label,
  tone = "neutral",
  trend,
  value,
}: HTMLAttributes<HTMLElement> & {
  comparison?: string;
  label: string;
  tone?: Tone;
  trend?: string;
  value: string;
}) {
  return (
    <article className={cn("ui-card", "ui-kpi-card", className)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {trend || comparison ? (
        <small className={cn("ui-kpi-card-meta", `ui-kpi-card-meta--${tone}`)}>
          {[trend, comparison].filter(Boolean).join(" · ")}
        </small>
      ) : null}
    </article>
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("ui-card-header", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("ui-card-content", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return <h2 className={cn("ui-card-title", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return <p className={cn("ui-card-description", className)} {...props} />;
}

export function Kicker({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <span className={cn("ui-kicker", className)} {...props} />;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return <button className={cn("ui-button", `ui-button--${variant}`, className)} {...props} />;
}

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: Tone }) {
  return <span className={cn("ui-badge", `ui-badge--${tone}`, className)} {...props} />;
}

export function StatusChip({
  children,
  className,
  tone = "neutral",
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={cn("ui-status-chip", `ui-status-chip--${tone}`, className)}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}

export function Progress({
  className,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("ui-progress", className)}
      role="progressbar"
      {...props}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function OfflineBanner({
  className,
  pendingCount = 0,
  state = "online",
}: HTMLAttributes<HTMLDivElement> & {
  pendingCount?: number;
  state?: "online" | "offline" | "syncing" | "needs-review";
}) {
  const copy = {
    online: {
      description: "Cloud sync is available. Operational changes can be saved normally.",
      label: "Online",
      tone: "success",
    },
    offline: {
      description: "Approved offline actions can continue locally. Cloud confirmation is paused.",
      label: "Offline",
      tone: "warning",
    },
    syncing: {
      description: "Local actions are being uploaded. Keep this surface open until sync completes.",
      label: "Syncing",
      tone: "information",
    },
    "needs-review": {
      description: "One or more actions need review before they can be trusted as final.",
      label: "Needs review",
      tone: "danger",
    },
  } as const;
  const selected = copy[state];

  return (
    <aside className={cn("ui-offline-banner", className)}>
      <StatusChip tone={selected.tone}>{selected.label}</StatusChip>
      <p>
        {selected.description}
        {pendingCount > 0 ? ` Pending actions: ${pendingCount}.` : ""}
      </p>
    </aside>
  );
}

export function Field({
  className,
  hint,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  hint?: string;
  label: string;
}) {
  return (
    <label className={cn("ui-field", className)}>
      <span>{label}</span>
      <input {...props} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function EmptyState({
  action,
  children,
  className,
  title,
}: HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className={cn("ui-empty-state", className)}>
      <div aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function FilterBar({
  actions,
  children,
  className,
  searchLabel = "Search",
  searchPlaceholder = "Search records",
  value,
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children?: ReactNode;
  searchLabel?: string;
  searchPlaceholder?: string;
  value?: string;
}) {
  return (
    <section className={cn("ui-filter-bar", className)} aria-label="List filters">
      <label>
        <span>{searchLabel}</span>
        <input defaultValue={value} placeholder={searchPlaceholder} type="search" />
      </label>
      {children ? <div className="ui-filter-bar-controls">{children}</div> : null}
      {actions ? <div className="ui-filter-bar-actions">{actions}</div> : null}
    </section>
  );
}

export function DataTable<T>({
  caption,
  columns,
  empty,
  getRowKey,
  rows,
}: {
  caption: string;
  columns: Array<{
    header: string;
    render: (row: T) => ReactNode;
  }>;
  empty?: ReactNode;
  getRowKey: (row: T) => string;
  rows: T[];
}) {
  if (!rows.length) {
    return (
      <StatePanel state="empty" title="No records found">
        {empty ?? "Create or import records, then they will appear in this list."}
      </StatePanel>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.header}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EntityHeader({
  actions,
  className,
  eyebrow,
  meta,
  status,
  title,
}: HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  status?: ReactNode;
  title: string;
}) {
  return (
    <section className={cn("ui-entity-header", className)}>
      <div>
        {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
        <div className="ui-entity-title-row">
          <h2>{title}</h2>
          {status}
        </div>
        {meta ? <div className="ui-entity-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="ui-entity-actions">{actions}</div> : null}
    </section>
  );
}

export function Timeline({
  events,
}: {
  events: Array<{
    at: string;
    by: string;
    description: string;
    title: string;
  }>;
}) {
  return (
    <ol className="ui-timeline">
      {events.map((event) => (
        <li key={`${event.at}-${event.title}`}>
          <span aria-hidden="true" />
          <div>
            <strong>{event.title}</strong>
            <p>{event.description}</p>
            <small>
              {event.at} · {event.by}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StatePanel({
  action,
  children,
  className,
  state,
  title,
}: HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  children: ReactNode;
  state: "empty" | "loading" | "error" | "permission" | "offline" | "needs-review";
  title: string;
}) {
  return (
    <section className={cn("ui-state-panel", `ui-state-panel--${state}`, className)}>
      <StatusChip tone={stateTone(state)}>{stateLabel(state)}</StatusChip>
      <h2>{title}</h2>
      <p>{children}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function MoneySummary({
  rows,
  totalLabel = "Total",
}: {
  rows: Array<{ label: string; value: string }>;
  totalLabel?: string;
}) {
  const total = rows.at(-1);

  return (
    <dl className="ui-money-summary">
      {rows.map((row) => (
        <div className={row === total ? "ui-money-summary-total" : undefined} key={row.label}>
          <dt>{row.label === total?.label ? totalLabel : row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StockBadge({ quantity, unit }: { quantity: number; unit: string }) {
  const tone = quantity <= 0 ? "danger" : quantity < 5 ? "warning" : "success";
  return (
    <Badge tone={tone}>
      {quantity} {unit}
    </Badge>
  );
}

export function IntegrationState({
  detail,
  name,
  state,
}: {
  detail: string;
  name: string;
  state: "connected" | "pending" | "failed" | "disabled";
}) {
  const tone =
    state === "connected"
      ? "success"
      : state === "failed"
        ? "danger"
        : state === "pending"
          ? "warning"
          : "neutral";

  return (
    <article className="ui-integration-state">
      <div>
        <strong>{name}</strong>
        <p>{detail}</p>
      </div>
      <StatusChip tone={tone}>{stateLabel(state)}</StatusChip>
    </article>
  );
}

export function ApprovalDrawer({
  children,
  title = "Approval required",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <aside className="ui-drawer" aria-label={title}>
      <Kicker>Approval</Kicker>
      <h2>{title}</h2>
      <div>{children}</div>
    </aside>
  );
}

export function DangerConfirmation({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="ui-danger-confirmation" role="alert">
      <strong>{title}</strong>
      <p>{children}</p>
    </section>
  );
}

export function PaymentSheet({
  children,
  title = "Payment",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="ui-sheet" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SerialPicker({ children }: { children: ReactNode }) {
  return <section className="ui-picker ui-picker--serial">{children}</section>;
}

export function BatchExpiryPicker({ children }: { children: ReactNode }) {
  return <section className="ui-picker ui-picker--batch">{children}</section>;
}

export function BookingCalendar({ children }: { children: ReactNode }) {
  return <section className="ui-calendar">{children}</section>;
}

export function WorkBoard({ children }: { children: ReactNode }) {
  return <section className="ui-work-board">{children}</section>;
}

export function WorkTicketPanel({ children }: { children: ReactNode }) {
  return <article className="ui-work-ticket-panel">{children}</article>;
}

function stateTone(
  state: "empty" | "loading" | "error" | "permission" | "offline" | "needs-review",
): Tone {
  const tones = {
    empty: "neutral",
    loading: "information",
    error: "danger",
    permission: "warning",
    offline: "warning",
    "needs-review": "danger",
  } as const;
  return tones[state];
}

function stateLabel(state: string): string {
  return state
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
