import type {
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
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-text-primary)",
        transition: "background-color 180ms ease, color 180ms ease",
      }}
    >
      <header
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
          color: "var(--color-primary-foreground)",
          padding: "48px clamp(24px, 6vw, 88px)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {props.eyebrow}
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            {props.title}
          </h1>
          <p style={{ maxWidth: 720, margin: 0, fontSize: "1.1rem", lineHeight: 1.6 }}>
            {props.description}
          </p>
        </div>
      </header>
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(24px, 5vw, 64px)",
        }}
      >
        {props.children}
      </section>
    </main>
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
