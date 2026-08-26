import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type Tone = "default" | "success" | "warning" | "danger" | "information" | "neutral";

export function cn(...classes: Array<false | null | string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Money is always shown with tabular numbers so columns line up. */
export function formatMoney(value: number, currencyCode?: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return currencyCode ? `${currencyCode} ${amount}` : amount;
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/* Application shell                                                          */
/* -------------------------------------------------------------------------- */

export interface ShellNavigationItem {
  href: string;
  label: string;
  description?: string;
  phase?: string;
  group?: string;
  status?: "ready" | "in-progress" | "planned";
}

/**
 * The Back Office shell from section 3 of the UI/UX specification: sidebar, sticky top bar with
 * Business and Branch context, and mobile bottom navigation. Navigation is supplied by the app so
 * it can be filtered by Role and enabled features.
 */
export function AppShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  activeHref?: string;
  navigation?: ShellNavigationItem[];
  context?: { business?: string; branch?: string };
  topbarActions?: ReactNode;
  headerActions?: ReactNode;
}) {
  const navigation = props.navigation ?? DEFAULT_NAVIGATION;
  const groups = new Map<string, ShellNavigationItem[]>();
  for (const item of navigation) {
    const group = item.group ?? "Workspace";
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }

  return (
    <main className="ui-app-shell">
      <aside className="ui-sidebar" aria-label="Primary navigation">
        <a className="ui-brand" href="/">
          <span aria-hidden="true">B</span>
          <strong>Bizentra</strong>
        </a>
        {[...groups.entries()].map(([group, items]) => (
          <div className="ui-sidebar-group" key={group}>
            <p>{group}</p>
            <nav className="ui-sidebar-nav">
              {items.map((item) => (
                <ShellNavLink
                  active={props.activeHref === item.href}
                  href={item.href}
                  key={item.href}
                  status={item.status}
                  title={`${item.phase ? `${item.phase} · ` : ""}${item.description ?? item.label}`}
                >
                  <span>{item.label}</span>
                  {item.description ? (
                    <small>
                      {item.phase ? `${item.phase} · ` : ""}
                      {item.description}
                    </small>
                  ) : null}
                </ShellNavLink>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      <section className="ui-app-main">
        <header className="ui-topbar">
          <div className="ui-topbar-context" aria-label="Active context">
            <span>Business</span>
            <strong>{props.context?.business ?? "Development Business"}</strong>
            <span>Branch</span>
            <strong>{props.context?.branch ?? "Main Branch"}</strong>
          </div>
          <div className="ui-topbar-actions">
            {props.topbarActions}
            <a className="ui-command-trigger" href="#global-command-palette">
              <span>Search or command</span>
              <kbd>Ctrl K</kbd>
            </a>
          </div>
        </header>

        <nav className="ui-mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 5).map((item) => (
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
          {props.headerActions ? (
            <div className="ui-page-header-actions">{props.headerActions}</div>
          ) : null}
        </header>
        <section className="ui-content">{props.children}</section>
      </section>
    </main>
  );
}

const DEFAULT_NAVIGATION: ShellNavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "daily overview",
    phase: "P0",
    group: "Run",
    status: "ready",
  },
  {
    href: "/sales",
    label: "Sales",
    description: "sales and shifts",
    phase: "P2",
    group: "Run",
    status: "ready",
  },
  {
    href: "/catalog",
    label: "Catalog",
    description: "items and prices",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/inventory",
    label: "Inventory",
    description: "stock and purchasing",
    phase: "P3",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/customers",
    label: "Customers",
    description: "people who buy",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    description: "who supplies us",
    phase: "P1",
    group: "Manage",
    status: "ready",
  },
  {
    href: "/setup",
    label: "Business setup",
    description: "branches and locations",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/access",
    label: "Users and roles",
    description: "who can do what",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/controls",
    label: "Controls",
    description: "approvals, features, audit",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
  {
    href: "/appearance",
    label: "Appearance",
    description: "Business theme",
    phase: "P0",
    group: "Settings",
    status: "ready",
  },
];

function ShellNavLink({
  active,
  children,
  href,
  status,
  title,
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  active: boolean;
  children: ReactNode;
  status?: "ready" | "in-progress" | "planned" | undefined;
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn("ui-sidebar-link", `ui-sidebar-link--${status ?? "planned"}`)}
      href={href}
      title={title}
    >
      <span aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

export function Stack({
  className,
  tight = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; tight?: boolean }) {
  return <div className={cn("ui-stack", tight && "ui-stack--tight", className)} {...props} />;
}

export function Row({
  between = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; between?: boolean }) {
  return <div className={cn("ui-row", between && "ui-row--between", className)} {...props} />;
}

export function Grid({
  className,
  wide = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; wide?: boolean }) {
  return <div className={cn("ui-grid", wide && "ui-grid--wide", className)} {...props} />;
}

export function Split({
  className,
  even = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; even?: boolean }) {
  return <div className={cn("ui-split", even && "ui-split--even", className)} {...props} />;
}

export function Toolbar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("ui-toolbar", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  flush = false,
  ...props
}: HTMLAttributes<HTMLElement> & { flush?: boolean; children: ReactNode }) {
  return <section className={cn("ui-card", flush && "ui-card--flush", className)} {...props} />;
}

/** A card that is also the form element, so a screen can submit without an extra wrapper. */
export function FormCard({
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) {
  return <form className={cn("ui-card", className)} {...props} />;
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

export function StatusCard(props: {
  title: string;
  status: "ready" | "planned" | "attention";
  children: ReactNode;
}) {
  const tone: Tone =
    props.status === "ready" ? "success" : props.status === "attention" ? "warning" : "information";
  const label =
    props.status === "ready" ? "Ready" : props.status === "attention" ? "Check" : "Planned";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <StatusChip tone={tone}>{label}</StatusChip>
      </CardHeader>
      <CardDescription>{props.children}</CardDescription>
    </Card>
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

export function DescriptionList({
  className,
  items,
}: HTMLAttributes<HTMLDListElement> & {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className={cn("ui-description-list", className)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

export function Button({
  className,
  size = "normal",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "normal" | "quiet" | "large";
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "ui-button",
        `ui-button--${variant}`,
        size !== "normal" && `ui-button--${size}`,
        className,
      )}
      type={props.type ?? "button"}
      {...props}
    />
  );
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
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: Tone }) {
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

export function Field({
  className,
  error,
  hint,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className={cn("ui-field", error && "ui-field--invalid", className)}>
      <span>{label}</span>
      <input aria-invalid={error ? true : undefined} {...props} />
      {error ? <small className="ui-field-error">{error}</small> : null}
      {!error && hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function SelectField({
  children,
  className,
  hint,
  label,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { hint?: string; label: string }) {
  return (
    <label className={cn("ui-field", className)}>
      <span>{label}</span>
      <select {...props}>{children}</select>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function TextareaField({
  className,
  hint,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { hint?: string; label: string }) {
  return (
    <label className={cn("ui-field", className)}>
      <span>{label}</span>
      <textarea {...props} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function CheckField({
  className,
  description,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { description?: string; label: string }) {
  return (
    <label className={cn("ui-check-field", className)}>
      <input type="checkbox" {...props} />
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

export function FormGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("ui-form-grid", className)} {...props} />;
}

export function FormFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("ui-form-footer", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

export function FilterBar({
  actions,
  children,
  chips,
  className,
  onSearchChange,
  searchLabel = "Search",
  searchPlaceholder = "Search records",
  value,
}: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  actions?: ReactNode;
  children?: ReactNode;
  chips?: Array<{ label: string; onClear?: () => void }>;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  value?: string;
}) {
  return (
    <section className={cn("ui-filter-bar", className)} aria-label="List filters">
      <label>
        <span>{searchLabel}</span>
        <input
          onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
          placeholder={searchPlaceholder}
          type="search"
          value={onSearchChange ? (value ?? "") : undefined}
          defaultValue={onSearchChange ? undefined : value}
        />
      </label>
      {children ? <div className="ui-filter-bar-controls">{children}</div> : null}
      {actions ? <div className="ui-filter-bar-actions">{actions}</div> : null}
      {chips?.length ? (
        <div className="ui-filter-chips">
          {chips.map((chip) => (
            <span className="ui-filter-chip" key={chip.label}>
              {chip.label}
              {chip.onClear ? (
                <button aria-label={`Clear ${chip.label}`} onClick={chip.onClear} type="button">
                  x
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  hideOnMobile?: boolean;
}

/**
 * Back-office list from section 5.2 of the UI/UX specification. Below the phone breakpoint the
 * table becomes task cards instead of a shrunken table, as the specification requires.
 */
export function DataTable<T>({
  caption,
  columns,
  empty,
  footer,
  getRowKey,
  onRowSelect,
  rows,
}: {
  caption: string;
  columns: Array<DataTableColumn<T>>;
  empty?: ReactNode;
  footer?: ReactNode;
  getRowKey: (row: T) => string;
  onRowSelect?: (row: T) => void;
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
    <>
      <div className="ui-table-wrap">
        <table className="ui-data-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={column.align === "right" ? "ui-cell--numeric" : undefined}
                  key={column.header}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                style={onRowSelect ? { cursor: "pointer" } : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={column.align === "right" ? "ui-cell--numeric" : undefined}
                    key={column.header}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {footer ? <div className="ui-table-footer">{footer}</div> : null}
      </div>

      <div className="ui-card-rows">
        {rows.map((row) => {
          const [first, ...rest] = columns;
          return (
            <article className="ui-card-row" key={getRowKey(row)}>
              <strong>{first?.render(row)}</strong>
              <dl>
                {rest
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.header}>
                      <dt>{column.header}</dt>
                      <dd>{column.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </article>
          );
        })}
        {footer ? <div className="ui-table-footer">{footer}</div> : null}
      </div>
    </>
  );
}

export function Timeline({
  events,
}: {
  events: Array<{ at: string; by: string; description: string; title: string }>;
}) {
  if (!events.length) {
    return (
      <StatePanel state="empty" title="No history yet">
        Business events, approvals and changes appear here as soon as this record is used.
      </StatePanel>
    );
  }

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
          <dt>{row === total ? totalLabel : row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StockBadge({ quantity, unit }: { quantity: number; unit: string }) {
  const tone: Tone = quantity <= 0 ? "danger" : quantity < 5 ? "warning" : "success";
  return (
    <Badge tone={tone}>
      {formatQuantity(quantity)} {unit}
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
  const tone: Tone =
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

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

export function OfflineBanner({
  className,
  lastSyncedAt,
  pendingCount = 0,
  state = "online",
  action,
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  lastSyncedAt?: string;
  pendingCount?: number;
  state?: "online" | "offline" | "syncing" | "needs-review";
}) {
  const copy = {
    online: {
      description: "Cloud sync is available. Operational changes are saved as they happen.",
      label: "Online",
      tone: "success",
    },
    offline: {
      description:
        "Approved offline actions continue locally. Nothing is confirmed in the cloud yet.",
      label: "Offline",
      tone: "warning",
    },
    syncing: {
      description: "Local actions are being uploaded. Keep this screen open until sync completes.",
      label: "Syncing",
      tone: "information",
    },
    "needs-review": {
      description: "One or more actions could not be reconciled automatically and need review.",
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
        {lastSyncedAt ? ` Last sync ${lastSyncedAt}.` : ""}
      </p>
      {action}
    </aside>
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

export type PanelState = "empty" | "loading" | "error" | "permission" | "offline" | "needs-review";

export function StatePanel({
  action,
  children,
  className,
  state,
  title,
}: HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  children: ReactNode;
  state: PanelState;
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

export function Skeleton({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-skeleton", className)} style={style} {...props} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ui-skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} style={{ width: `${100 - index * 8}%` }} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Operational patterns                                                       */
/* -------------------------------------------------------------------------- */

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

export function ReceiptView({
  business,
  branch,
  lines,
  meta,
  payments,
  taxLines,
  totals,
}: {
  business: string;
  branch: string;
  lines: Array<{ description: string; quantity: number; lineTotal: number }>;
  meta: string[];
  payments: Array<{ method: string; amount: number }>;
  taxLines: Array<{ name: string; amount: number }>;
  totals: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="ui-receipt">
      <h3>{business}</h3>
      <p className="ui-receipt-meta">{branch}</p>
      <p className="ui-receipt-meta">{meta.join(" · ")}</p>
      <table>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.description}-${index}`}>
              <td>
                {formatQuantity(line.quantity)} x {line.description}
              </td>
              <td>{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <tbody>
          {totals.map((total) => (
            <tr key={total.label}>
              <td>{total.label}</td>
              <td>{formatMoney(total.value)}</td>
            </tr>
          ))}
          {taxLines.map((tax) => (
            <tr key={tax.name}>
              <td>{tax.name}</td>
              <td>{formatMoney(tax.amount)}</td>
            </tr>
          ))}
          {payments.map((payment, index) => (
            <tr key={`${payment.method}-${index}`}>
              <td>{payment.method}</td>
              <td>{formatMoney(payment.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function stateTone(state: PanelState): Tone {
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
    .map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1))
    .join(" ");
}
