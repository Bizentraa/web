"use client";

import { ApiClientError, createApiClient } from "@bizentra/api-client";
import type { CatalogSummary, P1DefaultsCreated } from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Kicker,
  Progress,
} from "@bizentra/design-system";
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
      <Card className="catalog-empty-state">
        <Kicker>Local development only</Kicker>
        <CardTitle>Load a Business identity first</CardTitle>
        <CardDescription>
          Open Appearance and enter the Business and owner user IDs. The catalog page will use the
          same local identity until production sign-in is connected.
        </CardDescription>
        <Link className="theme-primary-button catalog-link-button" href="/appearance">
          Open Appearance
        </Link>
      </Card>
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
      <Card className="catalog-command-center">
        <div className="catalog-command-copy">
          <Kicker>Common Core · P1 workspace</Kicker>
          <CardTitle>Catalog foundation for POS, purchasing and reporting</CardTitle>
          <CardDescription>
            Set up reusable master data once, then later phases can sell, buy, count and report from
            the same clean records.
          </CardDescription>
          <div className="catalog-business-strip" aria-label="Active catalog context">
            <span>Business</span>
            <strong>{identity.businessId}</strong>
            <Badge
              className={`catalog-state-pill catalog-state-pill--${state}`}
              tone={
                state === "error"
                  ? "danger"
                  : state === "loading" || state === "saving"
                    ? "warning"
                    : "information"
              }
            >
              {state === "loading"
                ? "Loading"
                : state === "saving"
                  ? "Saving"
                  : state === "error"
                    ? "Needs attention"
                    : "Ready"}
            </Badge>
          </div>
        </div>
        <div className="catalog-command-score" aria-label="P1 readiness score">
          <span>Readiness</span>
          <strong>{readinessScore}%</strong>
          <Progress value={readinessScore} />
          <small>{totalRecords} records tracked</small>
        </div>
        <div className="catalog-command-actions">
          <Button
            className="catalog-secondary-action"
            disabled={isBusy}
            type="button"
            variant="ghost"
            onClick={() => void refreshSummary()}
          >
            Refresh
          </Button>
          <Button
            disabled={state === "saving"}
            type="button"
            onClick={() => void initializeDefaults()}
          >
            {state === "saving"
              ? "Working..."
              : defaultsReady
                ? "Defaults ready"
                : "Initialize P1 defaults"}
          </Button>
        </div>
      </Card>

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
        <Card
          asForm
          className="catalog-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => void createItem(event)}
        >
          <CardHeader className="catalog-section-title">
            <div>
              <Kicker>CC-P1-001 to CC-P1-008</Kicker>
              <CardTitle>Create sellable item</CardTitle>
            </div>
            <Badge>Required before POS sales</Badge>
          </CardHeader>
          <CardDescription>
            This creates the first item record with barcode and selling price. P2 POS can later
            search, scan and sell from this same catalog.
          </CardDescription>
          <div className="catalog-form-grid">
            <Field
              label="Item code"
              hint="Short unique code used by staff and imports."
              required
              value={item.code}
              onChange={(event) => setItem({ ...item, code: event.target.value })}
            />
            <Field
              label="Item name"
              hint="Clear customer-facing name."
              required
              value={item.name}
              onChange={(event) => setItem({ ...item, name: event.target.value })}
            />
            <Field
              label="Barcode"
              hint="Scanner value for checkout."
              required
              value={item.barcode}
              onChange={(event) => setItem({ ...item, barcode: event.target.value })}
            />
            <Field
              label="Selling price"
              hint="Default retail price in business currency."
              required
              value={item.price}
              onChange={(event) => setItem({ ...item, price: event.target.value })}
            />
          </div>
          <div className="catalog-form-footer">
            <span>Defaults are created automatically when needed.</span>
            <Button disabled={state === "saving"} type="submit">
              Save item
            </Button>
          </div>
        </Card>

        <aside className="catalog-side-stack">
          <Card className="catalog-readiness-panel">
            <Kicker>P1 completion path</Kicker>
            <CardTitle>What this phase unlocks</CardTitle>
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
          </Card>

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
        <Card
          asForm
          className="catalog-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => void createCustomer(event)}
        >
          <CardHeader className="catalog-section-title">
            <div>
              <Kicker>CC-P1-009</Kicker>
              <CardTitle>Customer</CardTitle>
            </div>
            <Badge tone="neutral">Sales party</Badge>
          </CardHeader>
          <Field
            label="Customer code"
            hint="Use WALK-IN for default counter sales."
            required
            value={customer.code}
            onChange={(event) => setCustomer({ ...customer, code: event.target.value })}
          />
          <Field
            label="Customer name"
            hint="Shown in sales, ledgers and reports."
            required
            value={customer.name}
            onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
          />
          <div className="catalog-form-footer catalog-form-footer--single">
            <Button disabled={state === "saving"} type="submit">
              Save customer
            </Button>
          </div>
        </Card>

        <Card
          asForm
          className="catalog-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => void createSupplier(event)}
        >
          <CardHeader className="catalog-section-title">
            <div>
              <Kicker>CC-P1-010</Kicker>
              <CardTitle>Supplier</CardTitle>
            </div>
            <Badge tone="neutral">Purchase party</Badge>
          </CardHeader>
          <Field
            label="Supplier code"
            hint="Short code used on purchase documents."
            required
            value={supplier.code}
            onChange={(event) => setSupplier({ ...supplier, code: event.target.value })}
          />
          <Field
            label="Supplier name"
            hint="Official name used by purchasing and payables."
            required
            value={supplier.name}
            onChange={(event) => setSupplier({ ...supplier, name: event.target.value })}
          />
          <div className="catalog-form-footer catalog-form-footer--single">
            <Button disabled={state === "saving"} type="submit">
              Save supplier
            </Button>
          </div>
        </Card>
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
    <Card className="catalog-score-card">
      <div className="catalog-score-heading">
        <span>{label}</span>
        <Badge className="catalog-score-status" tone={tone}>
          {status}
        </Badge>
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
    </Card>
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
    <Card className="catalog-recent-list">
      <CardHeader className="catalog-section-title">
        <div>
          <Kicker>Recent records</Kicker>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardDescription>{description}</CardDescription>
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
    </Card>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.body.message;
  if (error instanceof Error) return error.message;
  return "The catalog request failed.";
}
