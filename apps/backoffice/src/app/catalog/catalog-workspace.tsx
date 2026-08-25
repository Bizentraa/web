"use client";

import { ApiClientError, createApiClient } from "@bizentra/api-client";
import type { CatalogSummary, P1DefaultsCreated } from "@bizentra/contracts";
import { useBusinessTheme } from "@bizentra/design-system/theme";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type SaveState = "idle" | "loading" | "saving" | "error";

interface ItemDraft {
  code: string;
  name: string;
  barcode: string;
  price: string;
}

const emptySummary: CatalogSummary = {
  counts: {
    units: 0,
    categories: 0,
    brands: 0,
    taxCategories: 0,
    priceLists: 0,
    items: 0,
    promotions: 0,
    customers: 0,
    suppliers: 0,
    importBatches: 0,
  },
  items: [],
  customers: [],
  suppliers: [],
};

export function CatalogWorkspace() {
  const theme = useBusinessTheme();
  const identity = theme.identity;
  const api = useMemo(
    () =>
      identity
        ? createApiClient(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1", {
            businessId: identity.businessId,
            userId: identity.userId,
          })
        : null,
    [identity],
  );
  const [summary, setSummary] = useState<CatalogSummary>(emptySummary);
  const [defaults, setDefaults] = useState<P1DefaultsCreated | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [item, setItem] = useState<ItemDraft>({
    code: "MILK-1L",
    name: "Fresh Milk 1L",
    barcode: "955000000001",
    price: "450",
  });
  const [customer, setCustomer] = useState({ code: "WALK-IN", name: "Walk-in Customer" });
  const [supplier, setSupplier] = useState({ code: "SUP-001", name: "Main Supplier" });

  const refreshSummary = useCallback(async () => {
    if (!api || !identity) return;
    setState("loading");
    try {
      setSummary(await api.getCatalogSummary(identity.businessId));
      setMessage(null);
      setState("idle");
    } catch (error) {
      setMessage(errorMessage(error));
      setState("error");
    }
  }, [api, identity]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  if (!identity) {
    return (
      <section className="theme-panel catalog-empty-state">
        <span className="theme-kicker">Local development only</span>
        <h2>Load a Business identity first</h2>
        <p className="theme-help">
          Open Appearance and enter the Business and owner user IDs. The catalog page will use the
          same local identity until production sign-in is connected.
        </p>
        <Link className="theme-primary-button catalog-link-button" href="/appearance">
          Open Appearance
        </Link>
      </section>
    );
  }

  const initializeDefaults = async () => {
    if (!api) return;
    await run("Default P1 setup is ready.", async () => {
      const nextDefaults = await api.ensureP1Defaults(identity.businessId);
      setDefaults(nextDefaults);
      setSummary(await api.getCatalogSummary(identity.businessId));
    });
  };

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!api) return;
    await run("Item, barcode and price saved.", async () => {
      const activeDefaults = defaults ?? (await api.ensureP1Defaults(identity.businessId));
      setDefaults(activeDefaults);
      await api.createItem(identity.businessId, {
        code: item.code,
        name: item.name,
        kind: "PRODUCT",
        baseUnitId: activeDefaults.unitId,
        taxCategoryId: activeDefaults.taxCategoryId,
        sellable: true,
        purchasable: true,
        stockTracked: true,
        identifiers: item.barcode ? [{ kind: "BARCODE", value: item.barcode }] : [],
        variants: [],
        price: {
          priceListId: activeDefaults.priceListId,
          unitPrice: Number(item.price || 0),
          minQuantity: 1,
        },
      });
      setSummary(await api.getCatalogSummary(identity.businessId));
    });
  };

  const createCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!api) return;
    await run("Customer saved.", async () => {
      await api.createCustomer(identity.businessId, customer);
      setSummary(await api.getCatalogSummary(identity.businessId));
    });
  };

  const createSupplier = async (event: FormEvent) => {
    event.preventDefault();
    if (!api) return;
    await run("Supplier saved.", async () => {
      await api.createSupplier(identity.businessId, supplier);
      setSummary(await api.getCatalogSummary(identity.businessId));
    });
  };

  async function run(successMessage: string, work: () => Promise<void>) {
    setState("saving");
    setMessage(null);
    try {
      await work();
      setMessage(successMessage);
      setState("idle");
    } catch (error) {
      setMessage(errorMessage(error));
      setState("error");
    }
  }

  const foundationCount =
    summary.counts.units +
    summary.counts.categories +
    summary.counts.taxCategories +
    summary.counts.priceLists;
  const partyCount = summary.counts.customers + summary.counts.suppliers;
  const readySteps = [
    foundationCount >= 4,
    summary.counts.items > 0,
    partyCount >= 2,
    summary.counts.importBatches >= 0,
  ].filter(Boolean).length;
  const readinessScore = Math.round((readySteps / 4) * 100);
  const isBusy = state === "saving" || state === "loading";
  const defaultsReady = foundationCount >= 4;
  const totalRecords = Object.values(summary.counts).reduce((total, count) => total + count, 0);

  return (
    <div className="catalog-workspace">
      <section className="theme-panel catalog-command-center">
        <div className="catalog-command-copy">
          <span className="theme-kicker">Common Core · P1 workspace</span>
          <h2>Catalog foundation for POS, purchasing and reporting</h2>
          <p className="theme-help">
            Set up reusable master data once, then later phases can sell, buy, count and report from
            the same clean records.
          </p>
          <div className="catalog-business-strip" aria-label="Active catalog context">
            <span>Business</span>
            <strong>{identity.businessId}</strong>
            <span className={`catalog-state-pill catalog-state-pill--${state}`}>
              {state === "loading"
                ? "Loading"
                : state === "saving"
                  ? "Saving"
                  : state === "error"
                    ? "Needs attention"
                    : "Ready"}
            </span>
          </div>
        </div>
        <div className="catalog-command-score" aria-label="P1 readiness score">
          <span>Readiness</span>
          <strong>{readinessScore}%</strong>
          <div className="catalog-progress" aria-hidden="true">
            <span style={{ width: `${readinessScore}%` }} />
          </div>
          <small>{totalRecords} records tracked</small>
        </div>
        <div className="catalog-command-actions">
          <button
            className="theme-text-button catalog-secondary-action"
            disabled={isBusy}
            type="button"
            onClick={() => void refreshSummary()}
          >
            Refresh
          </button>
          <button
            className="theme-primary-button"
            disabled={state === "saving"}
            type="button"
            onClick={() => void initializeDefaults()}
          >
            {state === "saving"
              ? "Working..."
              : defaultsReady
                ? "Defaults ready"
                : "Initialize P1 defaults"}
          </button>
        </div>
      </section>

      {message ? (
        <p className={`theme-message theme-message--${state === "error" ? "error" : "success"}`}>
          {message}
        </p>
      ) : null}

      <section className="catalog-score-grid" aria-label="P1 master data readiness">
        <CatalogScoreCard
          label="Setup foundation"
          value={foundationCount}
          status={defaultsReady ? "Ready" : "Setup needed"}
          tone={defaultsReady ? "success" : "warning"}
          details={[
            ["Units", summary.counts.units],
            ["Categories", summary.counts.categories],
            ["Tax", summary.counts.taxCategories],
            ["Price lists", summary.counts.priceLists],
          ]}
        />
        <CatalogScoreCard
          label="Sellable catalog"
          value={summary.counts.items}
          status={summary.counts.items ? "POS ready" : "No items yet"}
          tone={summary.counts.items ? "success" : "neutral"}
          details={[
            ["Items", summary.counts.items],
            ["Brands", summary.counts.brands],
            ["Promotions", summary.counts.promotions],
          ]}
        />
        <CatalogScoreCard
          label="Business parties"
          value={partyCount}
          status={partyCount >= 2 ? "Customer and supplier ready" : "Add parties"}
          tone={partyCount >= 2 ? "success" : "neutral"}
          details={[
            ["Customers", summary.counts.customers],
            ["Suppliers", summary.counts.suppliers],
          ]}
        />
        <CatalogScoreCard
          label="Import control"
          value={summary.counts.importBatches}
          status="Audit-ready path"
          tone="information"
          details={[["Import batches", summary.counts.importBatches]]}
        />
      </section>

      <section className="catalog-main-grid">
        <form className="theme-panel catalog-form" onSubmit={(event) => void createItem(event)}>
          <div className="catalog-section-title">
            <div>
              <span className="theme-kicker">CC-P1-001 to CC-P1-008</span>
              <h2>Create sellable item</h2>
            </div>
            <span className="catalog-chip">Required before POS sales</span>
          </div>
          <p className="theme-help">
            This creates the first item record with barcode and selling price. P2 POS can later
            search, scan and sell from this same catalog.
          </p>
          <div className="catalog-form-grid">
            <CatalogField
              label="Item code"
              hint="Short unique code used by staff and imports."
              value={item.code}
              onChange={(code) => setItem({ ...item, code })}
            />
            <CatalogField
              label="Item name"
              hint="Clear customer-facing name."
              value={item.name}
              onChange={(name) => setItem({ ...item, name })}
            />
            <CatalogField
              label="Barcode"
              hint="Scanner value for checkout."
              value={item.barcode}
              onChange={(barcode) => setItem({ ...item, barcode })}
            />
            <CatalogField
              label="Selling price"
              hint="Default retail price in business currency."
              value={item.price}
              onChange={(price) => setItem({ ...item, price })}
            />
          </div>
          <div className="catalog-form-footer">
            <span>Defaults are created automatically when needed.</span>
            <button className="theme-primary-button" disabled={state === "saving"} type="submit">
              Save item
            </button>
          </div>
        </form>

        <aside className="catalog-side-stack">
          <section className="theme-panel catalog-readiness-panel">
            <span className="theme-kicker">P1 completion path</span>
            <h2>What this phase unlocks</h2>
            <ChecklistItem
              done={defaultsReady}
              title="Default setup"
              text="Units, categories, tax and price list are available."
            />
            <ChecklistItem
              done={summary.counts.items > 0}
              title="First sellable item"
              text="Catalog item can be scanned or selected later in POS."
            />
            <ChecklistItem
              done={summary.counts.customers > 0}
              title="Customer record"
              text="Walk-in or named customer can be attached to sales."
            />
            <ChecklistItem
              done={summary.counts.suppliers > 0}
              title="Supplier record"
              text="Purchasing can later receive stock from known suppliers."
            />
          </section>

          <RecentList
            title="Recent items"
            description="Latest saved catalog records."
            rows={summary.items.map((row) => ({
              key: row.code,
              title: row.name,
              meta: row.code,
            }))}
          />
        </aside>
      </section>

      <section className="catalog-party-grid">
        <form className="theme-panel catalog-form" onSubmit={(event) => void createCustomer(event)}>
          <div className="catalog-section-title">
            <div>
              <span className="theme-kicker">CC-P1-009</span>
              <h2>Customer</h2>
            </div>
            <span className="catalog-chip catalog-chip--soft">Sales party</span>
          </div>
          <CatalogField
            label="Customer code"
            hint="Use WALK-IN for default counter sales."
            value={customer.code}
            onChange={(code) => setCustomer({ ...customer, code })}
          />
          <CatalogField
            label="Customer name"
            hint="Shown in sales, ledgers and reports."
            value={customer.name}
            onChange={(name) => setCustomer({ ...customer, name })}
          />
          <div className="catalog-form-footer catalog-form-footer--single">
            <button className="theme-primary-button" disabled={state === "saving"} type="submit">
              Save customer
            </button>
          </div>
        </form>

        <form className="theme-panel catalog-form" onSubmit={(event) => void createSupplier(event)}>
          <div className="catalog-section-title">
            <div>
              <span className="theme-kicker">CC-P1-010</span>
              <h2>Supplier</h2>
            </div>
            <span className="catalog-chip catalog-chip--soft">Purchase party</span>
          </div>
          <CatalogField
            label="Supplier code"
            hint="Short code used on purchase documents."
            value={supplier.code}
            onChange={(code) => setSupplier({ ...supplier, code })}
          />
          <CatalogField
            label="Supplier name"
            hint="Official name used by purchasing and payables."
            value={supplier.name}
            onChange={(name) => setSupplier({ ...supplier, name })}
          />
          <div className="catalog-form-footer catalog-form-footer--single">
            <button className="theme-primary-button" disabled={state === "saving"} type="submit">
              Save supplier
            </button>
          </div>
        </form>
      </section>

      <section className="catalog-party-grid">
        <RecentList
          title="Recent customers"
          description="Customer records ready for sales and credit workflows."
          rows={summary.customers.map((row) => ({
            key: row.code,
            title: row.name,
            meta: row.code,
          }))}
        />
        <RecentList
          title="Recent suppliers"
          description="Supplier records ready for future purchasing flows."
          rows={summary.suppliers.map((row) => ({
            key: row.code,
            title: row.name,
            meta: row.code,
          }))}
        />
      </section>
    </div>
  );
}

function CatalogField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="theme-field">
      <span>{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} />
      <small>{hint}</small>
    </label>
  );
}

function CatalogScoreCard({
  label,
  value,
  status,
  tone,
  details,
}: {
  label: string;
  value: number;
  status: string;
  tone: "success" | "warning" | "information" | "neutral";
  details: Array<[string, number]>;
}) {
  return (
    <article className="theme-panel catalog-score-card">
      <div className="catalog-score-heading">
        <span>{label}</span>
        <em className={`catalog-score-status catalog-score-status--${tone}`}>{status}</em>
      </div>
      <strong>{value}</strong>
      <dl>
        {details.map(([name, count]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function ChecklistItem({ done, title, text }: { done: boolean; title: string; text: string }) {
  return (
    <article className="catalog-checklist-item">
      <span aria-hidden="true">{done ? "✓" : "•"}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function RecentList({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ key: string; title: string; meta: string }>;
}) {
  return (
    <section className="theme-panel catalog-recent-list">
      <div className="catalog-section-title">
        <div>
          <span className="theme-kicker">Recent records</span>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="theme-help">{description}</p>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.key}>
              <span>{row.title}</span>
              <small>{row.meta}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="theme-help">No records yet.</p>
      )}
    </section>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.body.message;
  if (error instanceof Error) return error.message;
  return "The catalog request failed.";
}
