import type { ReactNode } from "react";

export function AppShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#132238" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #0f766e, #115e59)",
          color: "white",
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
    ready: { background: "#dcfce7", foreground: "#166534", label: "Ready" },
    planned: { background: "#e0e7ff", foreground: "#3730a3", label: "Planned" },
    attention: { background: "#fef3c7", foreground: "#92400e", label: "Check" },
  } as const;
  const color = colors[props.status];

  return (
    <article
      style={{
        background: "white",
        border: "1px solid #dce4ee",
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
      <div style={{ color: "#52637a", lineHeight: 1.6 }}>{props.children}</div>
    </article>
  );
}
