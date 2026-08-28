"use client";

import type {
  CatalogReferenceData,
  CatalogSummary,
  ItemListRow,
  Paginated,
  PromotionRow,
  SaleQuote,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DescriptionList,
  Field,
  formatMoney,
  FormFooter,
  FormGrid,
  Grid,
  Kicker,
  KpiCard,
  MoneySummary,
  SelectField,
  Stack,
  StatePanel,
  StatusChip,
} from "@bizentra/design-system";
import {
  Dialog,
  Drawer,
  Tabs,
  useDebouncedValue,
  useToasts,
  VerticalTabs,
} from "@bizentra/design-system/client";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { readOptionalNumber, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface CatalogData {
  summary: CatalogSummary;
  reference: CatalogReferenceData;
  items: Paginated<ItemListRow>;
  promotions: PromotionRow[];
}

/** One row of a reference table, carrying the fields its drawer shows. */
interface ReferenceRecord {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
  status: "ACTIVE" | "INACTIVE";
  details: Array<{ label: string; value: string }>;
}

interface ReferenceSection {
  value: string;
  label: string;
  description: string;
  onAdd: () => void;
  rows: ReferenceRecord[];
}

export default function CatalogPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, state, error, reload } = useResource<CatalogData>(
    async (client, businessId) => {
      const [summary, reference, items, promotions] = await Promise.all([
        client.getCatalogSummary(businessId),
        client.getCatalogReference(businessId),
        client.listItems(businessId, {
          pageSize: 25,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter ? { status: statusFilter as "ACTIVE" | "INACTIVE" } : {}),
        }),
        client.listPromotions(businessId),
      ]);
      return { summary, reference, items, promotions };
    },
    [debouncedSearch, statusFilter],
  );

  const [tab, setTab] = useState("items");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<
    | "item"
    | "unit"
    | "category"
    | "brand"
    | "tag"
    | "attribute"
    | "conversion"
    | "priceList"
    | "taxCategory"
    | "taxRate"
    | "promotion"
    | null
  >(null);
  const [preview, setPreview] = useState<SaleQuote | null>(null);
  const [organizationSection, setOrganizationSection] = useState("units");
  const [pricingSection, setPricingSection] = useState("lists");
  const [taxSection, setTaxSection] = useState("categories");
  const [record, setRecord] = useState<ReferenceRecord | null>(null);

  const run = async (message: string, work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: message, tone: "success" });
      return true;
    } catch (cause) {
      toasts.push({
        title: "That change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit =
    (handler: (form: FormData) => Promise<unknown>, message: string) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const ok = await run(message, () => handler(form));
      if (ok) setDialog(null);
    };

  const reference = data?.reference;

  /*
   * The six reference types behind an item. They were six cards side by side, which meant six
   * short tables competing for width and none of them readable; as a rail the selected one gets
   * the full table and a row opens into the drawer.
   */
  const organizationSections: ReferenceSection[] = [
    {
      value: "units",
      label: "Units",
      description: "Units of measure",
      onAdd: () => setDialog("unit"),
      rows: (reference?.units ?? []).map((unit) => ({
        id: unit.id,
        primary: unit.code,
        secondary: unit.name,
        meta: `${unit.precision} decimal(s)`,
        status: unit.status,
        details: [
          { label: "Code", value: unit.code },
          { label: "Name", value: unit.name },
          { label: "Decimal places", value: String(unit.precision) },
          { label: "Status", value: unit.status },
        ],
      })),
    },
    {
      value: "conversions",
      label: "Unit conversions",
      description: "How one unit converts into another",
      onAdd: () => setDialog("conversion"),
      rows: (reference?.unitConversions ?? []).map((conversion) => {
        const from = reference?.units.find((unit) => unit.id === conversion.fromUnitId);
        const to = reference?.units.find((unit) => unit.id === conversion.toUnitId);
        return {
          id: conversion.id,
          primary: `${from?.code ?? "?"} to ${to?.code ?? "?"}`,
          secondary: `1 ${from?.code ?? "?"} = ${conversion.factor} ${to?.code ?? "?"}`,
          meta: "",
          status: "ACTIVE" as const,
          details: [
            { label: "From unit", value: from ? `${from.code} · ${from.name}` : "Unknown" },
            { label: "To unit", value: to ? `${to.code} · ${to.name}` : "Unknown" },
            { label: "Factor", value: String(conversion.factor) },
          ],
        };
      }),
    },
    {
      value: "categories",
      label: "Categories",
      description: "Item categories",
      onAdd: () => setDialog("category"),
      rows: (reference?.categories ?? []).map((category) => ({
        id: category.id,
        primary: category.code,
        secondary: category.name,
        meta: category.parentId ? "Sub-category" : "Top level",
        status: category.status,
        details: [
          { label: "Code", value: category.code },
          { label: "Name", value: category.name },
          {
            label: "Parent",
            value:
              reference?.categories.find((parent) => parent.id === category.parentId)?.name ??
              "Top level",
          },
          { label: "Status", value: category.status },
        ],
      })),
    },
    {
      value: "brands",
      label: "Brands",
      description: "Brands",
      onAdd: () => setDialog("brand"),
      rows: (reference?.brands ?? []).map((brand) => ({
        id: brand.id,
        primary: brand.code,
        secondary: brand.name,
        meta: "",
        status: brand.status,
        details: [
          { label: "Code", value: brand.code },
          { label: "Name", value: brand.name },
          { label: "Status", value: brand.status },
        ],
      })),
    },
    {
      value: "tags",
      label: "Tags",
      description: "Tags used to group items across categories",
      onAdd: () => setDialog("tag"),
      rows: (reference?.tags ?? []).map((tag) => ({
        id: tag.id,
        primary: tag.code,
        secondary: tag.name,
        meta: "",
        status: tag.status,
        details: [
          { label: "Code", value: tag.code },
          { label: "Name", value: tag.name },
          { label: "Status", value: tag.status },
        ],
      })),
    },
    {
      value: "attributes",
      label: "Custom attributes",
      description: "Extra fields this Business needs on its items",
      onAdd: () => setDialog("attribute"),
      rows: (reference?.attributes ?? []).map((attribute) => ({
        id: attribute.id,
        primary: attribute.code,
        secondary: attribute.name,
        meta: `${attribute.appliesTo} · ${attribute.dataType}`,
        status: attribute.status,
        details: [
          { label: "Code", value: attribute.code },
          { label: "Name", value: attribute.name },
          { label: "Applies to", value: attribute.appliesTo },
          { label: "Data type", value: attribute.dataType },
          { label: "Status", value: attribute.status },
        ],
      })),
    },
  ];
  const readiness = data
    ? Math.round(
        ([
          data.summary.counts.units > 0,
          data.summary.counts.taxCategories > 0,
          data.summary.counts.priceLists > 0,
          data.summary.counts.items > 0,
          data.summary.counts.customers > 0,
          data.summary.counts.suppliers > 0,
        ].filter(Boolean).length /
          6) *
          100,
      )
    : 0;

  const runPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    const itemId = readText(form, "itemId");
    const branchId = readText(form, "branchId");
    if (!itemId || !branchId) return;
    try {
      setPreview(
        await api.quoteSale(identity.businessId, {
          branchId,
          lines: [{ itemId, quantity: readOptionalNumber(form, "quantity") ?? 1 }],
        }),
      );
    } catch (cause) {
      toasts.push({ title: "Preview failed", description: errorMessage(cause), tone: "danger" });
    }
  };

  return (
    <Workspace
      status={
        <StatusChip tone={readiness >= 80 ? "success" : "warning"}>Setup {readiness}%</StatusChip>
      }
      description="Items, units, categories, prices, promotions and tax. These records are definitions; they never move stock or money by themselves."
      title="Catalog and pricing"
      headerActions={
        <>
          <Button
            disabled={busy || !api}
            onClick={() =>
              api && identity
                ? void run("Catalog defaults are ready.", () =>
                    api.ensureP1Defaults(identity.businessId),
                  )
                : undefined
            }
            variant="secondary"
          >
            Repair defaults
          </Button>
          <Button onClick={() => setDialog("item")}>New item</Button>
        </>
      }
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Catalog">
          {data && reference ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Items"
                  value={String(data.summary.counts.items)}
                  trend={`${data.items.total} matching`}
                  tone="information"
                />
                <KpiCard
                  label="Price lists"
                  value={String(data.summary.counts.priceLists)}
                  trend={`${data.summary.counts.promotions} promotion(s)`}
                  tone="information"
                />
                <KpiCard
                  label="Tax categories"
                  value={String(data.summary.counts.taxCategories)}
                  trend={`${reference.taxCategories.reduce((sum, category) => sum + category.rates.length, 0)} rate(s)`}
                  tone="information"
                />
                <KpiCard
                  label="Units"
                  value={String(data.summary.counts.units)}
                  trend={`${reference.unitConversions.length} conversion(s)`}
                  tone="information"
                />
              </Grid>

              <Tabs
                onChange={setTab}
                value={tab}
                tabs={[
                  { value: "items", label: "Items", badge: String(data.items.total) },
                  { value: "organization", label: "Organization" },
                  { value: "pricing", label: "Prices and promotions" },
                  { value: "tax", label: "Tax and preview" },
                ]}
              />

              {tab === "items" ? (
                <Stack>
                  <DataTable
                    caption="Items"
                    search={{
                      value: search,
                      onChange: setSearch,
                      placeholder: "Search by name, code or barcode",
                    }}
                    filters={
                      <SelectField
                        label="Status"
                        onChange={(event) => setStatusFilter(event.target.value)}
                        value={statusFilter}
                      >
                        <option value="">Every status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </SelectField>
                    }
                    chips={
                      statusFilter
                        ? [{ label: `Status: ${statusFilter}`, onClear: () => setStatusFilter("") }]
                        : []
                    }
                    toolbar={<Button onClick={() => setDialog("item")}>New item</Button>}
                    summary={`${data.items.total} item(s). Click a row to open the item.`}
                    getRowKey={(item) => item.id}
                    rows={data.items.rows}
                    empty="No items match this search. Create an item or import a CSV file."
                    footer={
                      <>
                        <span>
                          Showing {data.items.rows.length} of {data.items.total}
                        </span>
                        <Link className="ui-button ui-button--quiet" href="/import">
                          Import items
                        </Link>
                      </>
                    }
                    columns={[
                      {
                        header: "Item",
                        render: (item) => (
                          <Link href={`/catalog/${item.id}`}>
                            <strong>{item.name}</strong>
                          </Link>
                        ),
                      },
                      { header: "Code", render: (item) => item.code },
                      { header: "Kind", hideOnMobile: true, render: (item) => item.kind },
                      {
                        header: "Category",
                        hideOnMobile: true,
                        render: (item) => item.categoryName ?? "-",
                      },
                      { header: "Unit", render: (item) => item.unitCode },
                      {
                        header: "Price",
                        align: "right",
                        render: (item) =>
                          item.price === null ? "No price" : formatMoney(item.price),
                      },
                      {
                        header: "Status",
                        render: (item) => (
                          <Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>
                            {item.status}
                          </Badge>
                        ),
                      },
                    ]}
                  />
                </Stack>
              ) : null}

              {tab === "organization" ? (
                <VerticalTabs
                  onChange={setOrganizationSection}
                  value={organizationSection}
                  tabs={organizationSections.map((section) => ({
                    value: section.value,
                    label: section.label,
                    description: section.description,
                    badge: String(section.rows.length),
                  }))}
                >
                  {organizationSections
                    .filter((section) => section.value === organizationSection)
                    .map((section) => (
                      <DataTable
                        key={section.value}
                        caption={section.label}
                        toolbar={<Button onClick={section.onAdd}>Add</Button>}
                        getRowKey={(row) => row.id}
                        rows={section.rows}
                        onRowSelect={setRecord}
                        empty="Nothing here yet."
                        summary={`${section.description}. ${section.rows.length} record(s) — select a row to see its detail.`}
                        columns={[
                          {
                            header: "Code",
                            render: (row) => <span className="ui-code">{row.primary}</span>,
                          },
                          { header: "Name", render: (row) => row.secondary },
                          { header: "Detail", hideOnMobile: true, render: (row) => row.meta },
                          {
                            header: "Status",
                            render: (row) => (
                              <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>
                                {row.status}
                              </Badge>
                            ),
                          },
                        ]}
                      />
                    ))}
                </VerticalTabs>
              ) : null}

              {tab === "pricing" ? (
                <VerticalTabs
                  onChange={setPricingSection}
                  value={pricingSection}
                  tabs={[
                    {
                      value: "lists",
                      label: "Price lists",
                      description: "What each customer group pays",
                      badge: String(reference.priceLists.length),
                    },
                    {
                      value: "promotions",
                      label: "Promotions",
                      description: "Time-boxed price rules",
                      badge: String(data.promotions.length),
                    },
                  ]}
                >
                  {pricingSection === "lists" ? (
                    <DataTable
                      caption="Price lists"
                      summary="A customer group can point at its own price list, and a price can be set for one Branch or from a quantity break upward."
                      toolbar={
                        <Button onClick={() => setDialog("priceList")}>New price list</Button>
                      }
                      getRowKey={(priceList) => priceList.id}
                      rows={reference.priceLists}
                      columns={[
                        {
                          header: "Code",
                          render: (priceList) => <strong>{priceList.code}</strong>,
                        },
                        { header: "Name", render: (priceList) => priceList.name },
                        { header: "Currency", render: (priceList) => priceList.currencyCode },
                        {
                          header: "Default",
                          render: (priceList) =>
                            priceList.isDefault ? <Badge tone="success">Default</Badge> : "-",
                        },
                        {
                          header: "Status",
                          render: (priceList) => (
                            <Badge tone={priceList.status === "ACTIVE" ? "success" : "neutral"}>
                              {priceList.status}
                            </Badge>
                          ),
                        },
                        {
                          header: "Actions",
                          align: "right",
                          render: (priceList) => (
                            <Button
                              disabled={busy || priceList.isDefault}
                              onClick={() =>
                                api && identity
                                  ? void run("Default price list changed.", () =>
                                      api.updatePriceList(identity.businessId, priceList.id, {
                                        isDefault: true,
                                      }),
                                    )
                                  : undefined
                              }
                              size="quiet"
                              variant="secondary"
                            >
                              Make default
                            </Button>
                          ),
                        },
                      ]}
                    />
                  ) : null}

                  {pricingSection === "promotions" ? (
                    <DataTable
                      caption="Promotions"
                      summary="The POS applies the promotion that gives the customer the best price and explains any promotion it skipped."
                      toolbar={
                        <Button onClick={() => setDialog("promotion")}>New promotion</Button>
                      }
                      getRowKey={(promotion) => promotion.id}
                      rows={data.promotions}
                      empty="No promotions yet. Percentage, fixed, coupon and buy-X-get-Y offers are supported."
                      columns={[
                        {
                          header: "Code",
                          render: (promotion) => <strong>{promotion.code}</strong>,
                        },
                        { header: "Name", render: (promotion) => promotion.name },
                        {
                          header: "Discount",
                          align: "right",
                          render: (promotion) =>
                            promotion.discountKind === "PERCENTAGE"
                              ? `${promotion.discountValue}%`
                              : formatMoney(promotion.discountValue),
                        },
                        {
                          header: "Applies to",
                          hideOnMobile: true,
                          render: (promotion) => promotion.conditions?.scope ?? "SALE",
                        },
                        {
                          header: "Overlaps",
                          render: (promotion) =>
                            promotion.conflicts.length ? (
                              <Badge tone="warning">{promotion.conflicts.join(", ")}</Badge>
                            ) : (
                              <span className="ui-card-description">None</span>
                            ),
                        },
                        {
                          header: "Status",
                          render: (promotion) => (
                            <Badge tone={promotion.status === "ACTIVE" ? "success" : "neutral"}>
                              {promotion.status}
                            </Badge>
                          ),
                        },
                        {
                          header: "Actions",
                          align: "right",
                          render: (promotion) => (
                            <Button
                              disabled={busy}
                              onClick={() =>
                                api && identity
                                  ? void run("Promotion updated.", () =>
                                      api.updatePromotion(identity.businessId, promotion.id, {
                                        status:
                                          promotion.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                      }),
                                    )
                                  : undefined
                              }
                              size="quiet"
                              variant="secondary"
                            >
                              {promotion.status === "ACTIVE" ? "Stop" : "Start"}
                            </Button>
                          ),
                        },
                      ]}
                    />
                  ) : null}
                </VerticalTabs>
              ) : null}

              {tab === "tax" ? (
                <VerticalTabs
                  onChange={setTaxSection}
                  value={taxSection}
                  tabs={[
                    {
                      value: "categories",
                      label: "Tax categories",
                      description: "Categories and their rates",
                      badge: String(reference.taxCategories.length),
                    },
                    {
                      value: "preview",
                      label: "Price and tax preview",
                      description: "What a cashier will see",
                    },
                  ]}
                >
                  {taxSection === "categories" ? (
                    <DataTable
                      caption="Tax categories and rates"
                      toolbar={
                        <div className="ui-row">
                          <Button onClick={() => setDialog("taxCategory")}>New category</Button>
                          <Button
                            onClick={() => setDialog("taxRate")}

                            variant="secondary"
                          >
                            New rate
                          </Button>
                        </div>
                      }
                      getRowKey={(row) => row.id}
                      rows={reference.taxCategories.flatMap((category) =>
                        category.rates.map((rate) => ({
                          ...rate,
                          categoryName: category.name,
                          categoryCode: category.code,
                        })),
                      )}
                      empty="Add a tax category and its rate, for example VAT 15%."
                      columns={[
                        {
                          header: "Category",
                          render: (row) => <strong>{row.categoryName}</strong>,
                        },
                        { header: "Rate name", render: (row) => row.name },
                        {
                          header: "Rate",
                          align: "right",
                          render: (row) => `${(row.rate * 100).toFixed(2)}%`,
                        },
                        { header: "Used for", render: (row) => row.kind },
                        { header: "From", render: (row) => row.effectiveFrom },
                        {
                          header: "To",
                          hideOnMobile: true,
                          render: (row) => row.effectiveTo ?? "Open",
                        },
                      ]}
                    />
                  ) : null}

                  {taxSection === "preview" ? (
                    <Card>
                      <CardHeader>
                        <div>
                          <Kicker>Preview</Kicker>
                          <CardTitle>Price and tax preview</CardTitle>
                        </div>
                        <CardDescription>
                          Uses exactly the same calculation the POS uses, so what you see here is
                          what a cashier will see.
                        </CardDescription>
                      </CardHeader>
                      <form className="ui-stack" onSubmit={(event) => void runPreview(event)}>
                        <FormGrid>
                          <SelectField label="Item" name="itemId" required>
                            {data.items.rows.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </SelectField>
                          <SelectField label="Branch" name="branchId" required>
                            {reference.branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </SelectField>
                          <Field
                            label="Quantity"
                            name="quantity"
                            defaultValue="1"
                            inputMode="decimal"
                          />
                        </FormGrid>
                        <FormFooter>
                          <span className="ui-card-description">
                            Promotions, quantity breaks and tax rules are all applied.
                          </span>
                          <Button type="submit">Preview price</Button>
                        </FormFooter>
                      </form>
                      {preview ? (
                        <Stack tight>
                          <MoneySummary
                            rows={[
                              {
                                label: "Subtotal",
                                value: formatMoney(preview.subtotal, preview.currencyCode),
                              },
                              { label: "Discount", value: formatMoney(-preview.discountTotal) },
                              { label: "Tax", value: formatMoney(preview.taxTotal) },
                              {
                                label: "Total",
                                value: formatMoney(preview.total, preview.currencyCode),
                              },
                            ]}
                          />
                          {preview.appliedPromotions.map((promotion) => (
                            <Badge key={promotion.id} tone="success">
                              {promotion.code} saved {formatMoney(promotion.amount)}
                            </Badge>
                          ))}
                          {preview.warnings.map((warning) => (
                            <Badge key={warning} tone="warning">
                              {warning}
                            </Badge>
                          ))}
                        </Stack>
                      ) : (
                        <StatePanel state="empty" title="No preview yet">
                          Choose an item and a Branch to see the price, discount and tax a customer
                          would be charged.
                        </StatePanel>
                      )}
                    </Card>
                  ) : null}
                </VerticalTabs>
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>

      {/* ---------------------------------------------------------- dialogs */}

      <Dialog
        description="An item can be a product, service, ingredient, part, bundle, fee or rental item."
        onClose={() => setDialog(null)}
        open={dialog === "item"}
        title="New item"
        wide
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(
              (form) =>
                api && identity
                  ? api.createItem(identity.businessId, {
                      code: readText(form, "code"),
                      name: readText(form, "name"),
                      kind: readText(form, "kind", "PRODUCT") as "PRODUCT",
                      baseUnitId: readText(form, "baseUnitId"),
                      ...(readText(form, "categoryId")
                        ? { categoryId: readText(form, "categoryId") }
                        : {}),
                      ...(readText(form, "brandId") ? { brandId: readText(form, "brandId") } : {}),
                      ...(readText(form, "taxCategoryId")
                        ? { taxCategoryId: readText(form, "taxCategoryId") }
                        : {}),
                      sellable: form.get("sellable") !== null,
                      purchasable: form.get("purchasable") !== null,
                      stockTracked: form.get("stockTracked") !== null,
                      identifiers: readText(form, "barcode")
                        ? [{ kind: "BARCODE" as const, value: readText(form, "barcode") }]
                        : [],
                      variants: [],
                      ...(readOptionalNumber(form, "unitPrice") === undefined
                        ? {}
                        : {
                            price: {
                              unitPrice: readOptionalNumber(form, "unitPrice") ?? 0,
                              minQuantity: 1,
                              ...(readOptionalNumber(form, "costPrice") === undefined
                                ? {}
                                : { costPrice: readOptionalNumber(form, "costPrice") }),
                            },
                          }),
                    })
                  : Promise.resolve(),
              "Item created.",
            )(event)
          }
        >
          <FormGrid>
            <Field label="Item code" name="code" placeholder="MILK-1L" required />
            <Field label="Item name" name="name" placeholder="Fresh Milk 1L" required />
            <SelectField label="Kind" name="kind" defaultValue="PRODUCT">
              {["PRODUCT", "SERVICE", "INGREDIENT", "PART", "BUNDLE", "FEE", "RENTAL"].map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ),
              )}
            </SelectField>
            <SelectField label="Base unit" name="baseUnitId" required>
              {(reference?.units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Category" name="categoryId" defaultValue="">
              <option value="">No category</option>
              {(reference?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Brand" name="brandId" defaultValue="">
              <option value="">No brand</option>
              {(reference?.brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Tax category" name="taxCategoryId" defaultValue="">
              <option value="">No tax</option>
              {(reference?.taxCategories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <Field label="Barcode" name="barcode" hint="Must be unique in this Business" />
            <Field label="Selling price" name="unitPrice" inputMode="decimal" />
            <Field
              label="Cost price"
              name="costPrice"
              inputMode="decimal"
              hint="Used for margin reporting"
            />
          </FormGrid>
          <FormGrid>
            <label className="ui-check-field">
              <input defaultChecked name="sellable" type="checkbox" />
              <span>
                <strong>Can be sold</strong>
                <small>Appears in the POS search and grid.</small>
              </span>
            </label>
            <label className="ui-check-field">
              <input name="purchasable" type="checkbox" />
              <span>
                <strong>Can be purchased</strong>
                <small>Appears in purchasing when inventory purchasing is enabled.</small>
              </span>
            </label>
            <label className="ui-check-field">
              <input name="stockTracked" type="checkbox" />
              <span>
                <strong>Track stock</strong>
                <small>A sale emits a stock event for this item.</small>
              </span>
            </label>
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create item
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Unit code", name: "code", placeholder: "BOX" },
          { label: "Unit name", name: "name", placeholder: "Box of 12" },
          { label: "Decimals", name: "precision", placeholder: "0" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createUnit(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                  precision: readOptionalNumber(form, "precision") ?? 0,
                })
              : Promise.resolve(),
          "Unit created.",
        )}
        open={dialog === "unit"}
        title="New unit"
      />

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Category code", name: "code", placeholder: "DAIRY" },
          { label: "Category name", name: "name", placeholder: "Dairy" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createCategory(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                })
              : Promise.resolve(),
          "Category created.",
        )}
        open={dialog === "category"}
        title="New category"
      />

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Brand code", name: "code", placeholder: "ANCHOR" },
          { label: "Brand name", name: "name", placeholder: "Anchor" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createBrand(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                })
              : Promise.resolve(),
          "Brand created.",
        )}
        open={dialog === "brand"}
        title="New brand"
      />

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Tag code", name: "code", placeholder: "PROMO" },
          { label: "Tag name", name: "name", placeholder: "Promoted" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createItemTag(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                })
              : Promise.resolve(),
          "Tag created.",
        )}
        open={dialog === "tag"}
        title="New tag"
      />

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Attribute code", name: "code", placeholder: "SHELF_LIFE" },
          { label: "Attribute name", name: "name", placeholder: "Shelf life" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createAttribute(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                  appliesTo: "ITEM",
                  dataType: "TEXT",
                })
              : Promise.resolve(),
          "Attribute created.",
        )}
        open={dialog === "attribute"}
        title="New custom attribute"
      />

      <Dialog
        description="For example, one Box equals 12 Each."
        onClose={() => setDialog(null)}
        open={dialog === "conversion"}
        title="New unit conversion"
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(
              (form) =>
                api && identity
                  ? api.createUnitConversion(identity.businessId, {
                      fromUnitId: readText(form, "fromUnitId"),
                      toUnitId: readText(form, "toUnitId"),
                      factor: readOptionalNumber(form, "factor") ?? 1,
                    })
                  : Promise.resolve(),
              "Unit conversion saved.",
            )(event)
          }
        >
          <FormGrid>
            <SelectField label="From unit" name="fromUnitId" required>
              {(reference?.units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code}
                </option>
              ))}
            </SelectField>
            <SelectField label="To unit" name="toUnitId" required>
              {(reference?.units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code}
                </option>
              ))}
            </SelectField>
            <Field label="Factor" name="factor" defaultValue="12" inputMode="decimal" required />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Save conversion
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Price list code", name: "code", placeholder: "WHOLESALE" },
          { label: "Price list name", name: "name", placeholder: "Wholesale" },
          { label: "Currency", name: "currencyCode", placeholder: "LKR" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createPriceList(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                  currencyCode: readText(form, "currencyCode"),
                  isDefault: false,
                })
              : Promise.resolve(),
          "Price list created.",
        )}
        open={dialog === "priceList"}
        title="New price list"
      />

      <SimpleDialog
        busy={busy}
        fields={[
          { label: "Tax category code", name: "code", placeholder: "VAT15" },
          { label: "Tax category name", name: "name", placeholder: "VAT 15%" },
        ]}
        onClose={() => setDialog(null)}
        onSubmit={submit(
          (form) =>
            api && identity
              ? api.createTaxCategory(identity.businessId, {
                  code: readText(form, "code"),
                  name: readText(form, "name"),
                })
              : Promise.resolve(),
          "Tax category created.",
        )}
        open={dialog === "taxCategory"}
        title="New tax category"
      />

      <Dialog
        description="A rate applies from its start date. Add a new rate instead of editing history when the law changes."
        onClose={() => setDialog(null)}
        open={dialog === "taxRate"}
        title="New tax rate"
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(
              (form) =>
                api && identity
                  ? api.createTaxRate(identity.businessId, {
                      taxCategoryId: readText(form, "taxCategoryId"),
                      code: readText(form, "code"),
                      name: readText(form, "name"),
                      rate: (readOptionalNumber(form, "percent") ?? 0) / 100,
                      kind: readText(form, "kind", "BOTH") as "BOTH",
                      effectiveFrom: readText(form, "effectiveFrom"),
                    })
                  : Promise.resolve(),
              "Tax rate created.",
            )(event)
          }
        >
          <FormGrid>
            <SelectField label="Tax category" name="taxCategoryId" required>
              {(reference?.taxCategories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <Field label="Rate code" name="code" placeholder="VAT15_STD" required />
            <Field label="Rate name" name="name" placeholder="VAT 15% standard" required />
            <Field label="Percent" name="percent" placeholder="15" inputMode="decimal" required />
            <SelectField label="Used for" name="kind" defaultValue="BOTH">
              <option value="BOTH">Sales and purchases</option>
              <option value="SALES">Sales only</option>
              <option value="PURCHASE">Purchases only</option>
            </SelectField>
            <Field
              label="Effective from"
              name="effectiveFrom"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create rate
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Choose what the promotion applies to and when it runs."
        onClose={() => setDialog(null)}
        open={dialog === "promotion"}
        title="New promotion"
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(
              (form) =>
                api && identity
                  ? api.createPromotion(identity.businessId, {
                      code: readText(form, "code"),
                      name: readText(form, "name"),
                      discountKind: readText(form, "discountKind", "PERCENTAGE") as "PERCENTAGE",
                      discountValue: readOptionalNumber(form, "discountValue") ?? 0,
                      startsAt: new Date(readText(form, "startsAt")).toISOString(),
                      ...(readText(form, "endsAt")
                        ? { endsAt: new Date(readText(form, "endsAt")).toISOString() }
                        : {}),
                      conditions: {
                        scope: readText(form, "scope", "SALE") as "SALE",
                        itemIds: [],
                        categoryIds: readText(form, "categoryId")
                          ? [readText(form, "categoryId")]
                          : [],
                        minimumQuantity: readOptionalNumber(form, "minimumQuantity") ?? 0,
                        minimumAmount: readOptionalNumber(form, "minimumAmount") ?? 0,
                        buyQuantity: readOptionalNumber(form, "buyQuantity") ?? 0,
                        getQuantity: readOptionalNumber(form, "getQuantity") ?? 0,
                        priority: 50,
                        ...(readText(form, "couponCode")
                          ? { couponCode: readText(form, "couponCode") }
                          : {}),
                      },
                    })
                  : Promise.resolve(),
              "Promotion created.",
            )(event)
          }
        >
          <FormGrid>
            <Field label="Promotion code" name="code" placeholder="DAIRY10" required />
            <Field label="Promotion name" name="name" placeholder="10% off dairy" required />
            <SelectField label="Discount kind" name="discountKind" defaultValue="PERCENTAGE">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </SelectField>
            <Field
              label="Discount value"
              name="discountValue"
              defaultValue="10"
              inputMode="decimal"
              required
            />
            <SelectField label="Applies to" name="scope" defaultValue="SALE">
              <option value="SALE">Whole sale</option>
              <option value="CATEGORY">One category</option>
            </SelectField>
            <SelectField label="Category" name="categoryId" defaultValue="">
              <option value="">Not category specific</option>
              {(reference?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <Field label="Minimum amount" name="minimumAmount" inputMode="decimal" />
            <Field
              label="Coupon code"
              name="couponCode"
              hint="Leave empty for an automatic offer"
            />
            <Field
              label="Buy quantity"
              name="buyQuantity"
              inputMode="numeric"
              hint="For buy X get Y"
            />
            <Field label="Free quantity" name="getQuantity" inputMode="numeric" />
            <Field
              label="Starts"
              name="startsAt"
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              required
            />
            <Field label="Ends" name="endsAt" type="datetime-local" />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Create promotion
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Drawer
        eyebrow="Reference record"
        onClose={() => setRecord(null)}
        open={Boolean(record)}
        title={record ? `${record.primary} · ${record.secondary}` : ""}
      >
        {record ? (
          <Stack>
            <DescriptionList
              items={record.details.map((detail) => ({
                label: detail.label,
                value: detail.value,
              }))}
            />
            <Badge tone={record.status === "ACTIVE" ? "success" : "neutral"}>{record.status}</Badge>
          </Stack>
        ) : null}
      </Drawer>
    </Workspace>
  );
}

function SimpleDialog({
  busy,
  fields,
  onClose,
  onSubmit,
  open,
  title,
}: {
  busy: boolean;
  fields: Array<{ label: string; name: string; placeholder?: string }>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog onClose={onClose} open={open} title={title}>
      <form className="ui-stack" onSubmit={(event) => void onSubmit(event)}>
        <FormGrid>
          {fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              name={field.name}
              placeholder={field.placeholder}
            />
          ))}
        </FormGrid>
        <FormFooter>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={busy} type="submit">
            Save
          </Button>
        </FormFooter>
      </form>
    </Dialog>
  );
}
