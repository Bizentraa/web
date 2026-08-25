"use client";

import { ApiClientError, createApiClient } from "@bizentra/api-client";
import type { CatalogSummary, P1DefaultsCreated } from "@bizentra/contracts";
import { useBusinessTheme } from "@bizentra/design-system/theme";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    if (!api || !identity) return;
    const client = api;
    const businessId = identity.businessId;
    void refresh();
    async function refresh() {
      setState("loading");
      try {
        setSummary(await client.getCatalogSummary(businessId));
        setMessage(null);
        setState("idle");
      } catch (error) {
        setMessage(errorMessage(error));
        setState("error");
      }
    }
  }, [api, identity]);

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

  return (
    <div className="catalog-workspace">
      <section className="theme-panel theme-context-panel">
        <div>
          <span className="theme-kicker">Active Business</span>
          <strong>{identity.businessId}</strong>
        </div>
        <button
          className="theme-primary-button"
          disabled={state === "saving"}
          type="button"
          onClick={() => void initializeDefaults()}
        >
          {state === "saving" ? "Working..." : "Initialize P1 defaults"}
        </button>
      </section>

      {message ? (
        <p className={`theme-message theme-message--${state === "error" ? "error" : "success"}`}>
          {message}
        </p>
      ) : null}

      <section className="catalog-counts" aria-label="P1 master data counts">
        {Object.entries(summary.counts).map(([key, value]) => (
          <article className="catalog-count" key={key}>
            <span>{key.replace(/([A-Z])/g, " $1")}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <div className="theme-two-column">
        <form className="theme-panel catalog-form" onSubmit={(event) => void createItem(event)}>
          <span className="theme-kicker">CC-P1-001 to CC-P1-008</span>
          <h2>Item, barcode and price</h2>
          <CatalogField
            label="Item code"
            value={item.code}
            onChange={(code) => setItem({ ...item, code })}
          />
          <CatalogField
            label="Item name"
            value={item.name}
            onChange={(name) => setItem({ ...item, name })}
          />
          <CatalogField
            label="Barcode"
            value={item.barcode}
            onChange={(barcode) => setItem({ ...item, barcode })}
          />
          <CatalogField
            label="Selling price"
            value={item.price}
            onChange={(price) => setItem({ ...item, price })}
          />
          <button className="theme-primary-button" disabled={state === "saving"} type="submit">
            Save item
          </button>
        </form>

        <section className="catalog-lists">
          <RecentList
            title="Recent items"
            rows={summary.items.map((row) => `${row.code} - ${row.name}`)}
          />
        </section>
      </div>

      <div className="theme-two-column">
        <form className="theme-panel catalog-form" onSubmit={(event) => void createCustomer(event)}>
          <span className="theme-kicker">CC-P1-009</span>
          <h2>Customer</h2>
          <CatalogField
            label="Customer code"
            value={customer.code}
            onChange={(code) => setCustomer({ ...customer, code })}
          />
          <CatalogField
            label="Customer name"
            value={customer.name}
            onChange={(name) => setCustomer({ ...customer, name })}
          />
          <button className="theme-primary-button" disabled={state === "saving"} type="submit">
            Save customer
          </button>
        </form>

        <form className="theme-panel catalog-form" onSubmit={(event) => void createSupplier(event)}>
          <span className="theme-kicker">CC-P1-010</span>
          <h2>Supplier</h2>
          <CatalogField
            label="Supplier code"
            value={supplier.code}
            onChange={(code) => setSupplier({ ...supplier, code })}
          />
          <CatalogField
            label="Supplier name"
            value={supplier.name}
            onChange={(name) => setSupplier({ ...supplier, name })}
          />
          <button className="theme-primary-button" disabled={state === "saving"} type="submit">
            Save supplier
          </button>
        </form>
      </div>

      <div className="theme-two-column">
        <RecentList
          title="Recent customers"
          rows={summary.customers.map((row) => `${row.code} - ${row.name}`)}
        />
        <RecentList
          title="Recent suppliers"
          rows={summary.suppliers.map((row) => `${row.code} - ${row.name}`)}
        />
      </div>
    </div>
  );
}

function CatalogField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="theme-field">
      <span>{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RecentList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="theme-panel catalog-recent-list">
      <h2>{title}</h2>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row}>{row}</li>
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
