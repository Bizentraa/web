"use client";

import type { CatalogReferenceData, ItemDetail } from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  DescriptionList,
  EntityHeader,
  Field,
  formatDateTime,
  formatMoney,
  FormCard,
  FormFooter,
  FormGrid,
  Kicker,
  SelectField,
  Stack,
  StatusChip,
  Timeline,
} from "@bizentra/design-system";
import { Dialog, Tabs, useToasts } from "@bizentra/design-system/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { readOptionalNumber, readText } from "../../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../../lib/workspace";

interface ItemPageData {
  item: ItemDetail;
  reference: CatalogReferenceData;
}

export default function ItemDetailPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const { api, identity } = useApi();
  const toasts = useToasts();
  const { data, state, error, reload } = useResource<ItemPageData>(
    async (client, businessId) => {
      const [item, reference] = await Promise.all([
        client.getItem(businessId, itemId),
        client.getCatalogReference(businessId),
      ]);
      return { item, reference };
    },
    [itemId],
  );

  const [tab, setTab] = useState("summary");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"price" | "identifier" | "variant" | null>(null);

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

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!api || !identity) return;
    const form = new FormData(event.currentTarget);
    await run("Item saved.", () =>
      api.updateItem(identity.businessId, itemId, {
        name: readText(form, "name"),
        description: readText(form, "description") || null,
        categoryId: readText(form, "categoryId") || null,
        brandId: readText(form, "brandId") || null,
        taxCategoryId: readText(form, "taxCategoryId") || null,
        baseUnitId: readText(form, "baseUnitId"),
        sellable: form.get("sellable") !== null,
        purchasable: form.get("purchasable") !== null,
        stockTracked: form.get("stockTracked") !== null,
      }),
    );
  };

  const item = data?.item;
  const reference = data?.reference;

  return (
    <Workspace
      description="One item, everything it is used for, and the history of every change."
      eyebrow="Common Core · P1"
      title={item?.name ?? "Item"}
      headerActions={
        <Link className="ui-button ui-button--secondary" href="/catalog">
          Back to catalog
        </Link>
      }
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Item">
          {item && reference ? (
            <Stack>
              <EntityHeader
                eyebrow={`Item · ${item.code}`}
                title={item.name}
                status={
                  <StatusChip tone={item.status === "ACTIVE" ? "success" : "neutral"}>
                    {item.status === "ACTIVE" ? "Active" : "Inactive"}
                  </StatusChip>
                }
                meta={
                  <>
                    <span>{item.kind}</span>
                    <span>Unit {item.unitCode}</span>
                    <span>{item.categoryName ?? "No category"}</span>
                    <span>{item.taxCategoryName ?? "No tax category"}</span>
                    <span>{item.price === null ? "No price" : formatMoney(item.price)}</span>
                  </>
                }
                actions={
                  <>
                    <Button onClick={() => setDialog("price")} variant="secondary">
                      Add price
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        api && identity
                          ? void run(
                              item.status === "ACTIVE" ? "Item deactivated." : "Item activated.",
                              () =>
                                api.updateItem(identity.businessId, itemId, {
                                  status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                }),
                            )
                          : undefined
                      }
                      variant={item.status === "ACTIVE" ? "ghost" : "primary"}
                    >
                      {item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  </>
                }
              />

              <Tabs
                onChange={setTab}
                value={tab}
                tabs={[
                  { value: "summary", label: "Summary" },
                  { value: "prices", label: "Prices", badge: String(item.prices.length) },
                  {
                    value: "identifiers",
                    label: "Codes",
                    badge: String(item.identifierRecords.length),
                  },
                  { value: "variants", label: "Variants", badge: String(item.variants.length) },
                  { value: "suppliers", label: "Suppliers", badge: String(item.suppliers.length) },
                  { value: "history", label: "History" },
                ]}
              />

              {tab === "summary" ? (
                <FormCard onSubmit={(event) => void saveItem(event)}>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P1-001</Kicker>
                      <CardTitle>Item details</CardTitle>
                    </div>
                    <Badge tone="neutral">Updated {formatDateTime(item.updatedAt)}</Badge>
                  </CardHeader>
                  <FormGrid>
                    <Field label="Name" name="name" defaultValue={item.name} required />
                    <SelectField label="Base unit" name="baseUnitId" defaultValue={item.baseUnitId}>
                      {reference.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Category"
                      name="categoryId"
                      defaultValue={item.categoryId ?? ""}
                    >
                      <option value="">No category</option>
                      {reference.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField label="Brand" name="brandId" defaultValue={item.brandId ?? ""}>
                      <option value="">No brand</option>
                      {reference.brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Tax category"
                      name="taxCategoryId"
                      defaultValue={item.taxCategoryId ?? ""}
                    >
                      <option value="">No tax</option>
                      {reference.taxCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                    <Field
                      label="Description"
                      name="description"
                      defaultValue={item.description ?? ""}
                    />
                  </FormGrid>
                  <FormGrid>
                    <label className="ui-check-field">
                      <input defaultChecked={item.sellable} name="sellable" type="checkbox" />
                      <span>
                        <strong>Can be sold</strong>
                        <small>Only sellable items appear in the POS.</small>
                      </span>
                    </label>
                    <label className="ui-check-field">
                      <input defaultChecked={item.purchasable} name="purchasable" type="checkbox" />
                      <span>
                        <strong>Can be purchased</strong>
                        <small>Used by purchasing in P3.</small>
                      </span>
                    </label>
                    <label className="ui-check-field">
                      <input
                        defaultChecked={item.stockTracked}
                        name="stockTracked"
                        type="checkbox"
                      />
                      <span>
                        <strong>Track stock</strong>
                        <small>A paid sale emits a stock event for this item.</small>
                      </span>
                    </label>
                  </FormGrid>
                  <FormFooter>
                    <span className="ui-card-description">
                      Changes here do not affect sales that already happened.
                    </span>
                    <Button disabled={busy} type="submit">
                      Save item
                    </Button>
                  </FormFooter>
                </FormCard>
              ) : null}

              {tab === "prices" ? (
                <DataTable
                  caption="Prices"
                  kicker="CC-P1-006"
                  summary="A Branch price beats a Business-wide price, and the highest quantity break the customer qualifies for wins."
                  toolbar={<Button onClick={() => setDialog("price")}>Add price</Button>}
                  getRowKey={(price) => price.id}
                  rows={item.prices}
                  empty="This item has no price yet, so the POS cannot sell it."
                  columns={[
                    { header: "Price list", render: (price) => price.priceListName },
                    {
                      header: "Branch",
                      render: (price) =>
                        price.branchId
                          ? (reference.branches.find((branch) => branch.id === price.branchId)
                              ?.name ?? "Branch")
                          : "All Branches",
                    },
                    {
                      header: "From quantity",
                      align: "right",
                      render: (price) => price.minQuantity,
                    },
                    {
                      header: "Unit price",
                      align: "right",
                      render: (price) => formatMoney(price.unitPrice),
                    },
                    {
                      header: "Cost",
                      align: "right",
                      render: (price) =>
                        price.costPrice === null ? "-" : formatMoney(price.costPrice),
                    },
                    {
                      header: "Valid from",
                      hideOnMobile: true,
                      render: (price) => formatDateTime(price.validFrom),
                    },
                  ]}
                />
              ) : null}

              {tab === "identifiers" ? (
                <DataTable
                  caption="Barcodes and codes"
                  summary="A code can only belong to one item in the Business, so a scan is never ambiguous."
                  kicker="CC-P1-005"
                  toolbar={<Button onClick={() => setDialog("identifier")}>Add code</Button>}
                  getRowKey={(identifier) => identifier.id}
                  rows={item.identifierRecords}
                  empty="Add a barcode so the POS can scan this item."
                  columns={[
                    { header: "Kind", render: (identifier) => identifier.kind },
                    { header: "Value", render: (identifier) => <code>{identifier.value}</code> },
                    {
                      header: "Variant",
                      render: (identifier) =>
                        identifier.variantId
                          ? (item.variants.find((variant) => variant.id === identifier.variantId)
                              ?.name ?? "Variant")
                          : "Whole item",
                    },
                  ]}
                />
              ) : null}

              {tab === "variants" ? (
                <DataTable
                  caption="Variants"
                  summary="Variants describe size, colour, storage, style or pack size while sharing the same item definition."
                  kicker="CC-P1-003"
                  toolbar={<Button onClick={() => setDialog("variant")}>Add variant</Button>}
                  getRowKey={(variant) => variant.id}
                  rows={item.variants}
                  empty="This item has no variants."
                  columns={[
                    { header: "Code", render: (variant) => <strong>{variant.code}</strong> },
                    { header: "Name", render: (variant) => variant.name },
                    {
                      header: "Attributes",
                      render: (variant) =>
                        Object.entries(variant.attributes)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(", ") || "-",
                    },
                    {
                      header: "Status",
                      render: (variant) => (
                        <Badge tone={variant.status === "ACTIVE" ? "success" : "neutral"}>
                          {variant.status}
                        </Badge>
                      ),
                    },
                  ]}
                />
              ) : null}

              {tab === "suppliers" ? (
                <DataTable
                  caption="Who supplies this item"
                  kicker="CC-P1-010"
                  toolbar={
                    <Link className="ui-button ui-button--quiet" href="/suppliers">
                      Manage suppliers
                    </Link>
                  }
                  getRowKey={(supplier) => supplier.supplierId}
                  rows={item.suppliers}
                  empty="No supplier is linked to this item yet."
                  columns={[
                    { header: "Supplier", render: (supplier) => supplier.supplierName },
                    { header: "Their code", render: (supplier) => supplier.supplierCode ?? "-" },
                    {
                      header: "Cost",
                      align: "right",
                      render: (supplier) =>
                        supplier.costPrice === null ? "-" : formatMoney(supplier.costPrice),
                    },
                    {
                      header: "Lead time",
                      align: "right",
                      render: (supplier) =>
                        supplier.leadTimeDays === null ? "-" : `${supplier.leadTimeDays} day(s)`,
                    },
                  ]}
                />
              ) : null}

              {tab === "history" ? (
                <Card>
                  <CardHeader>
                    <div>
                      <Kicker>CC-P0-009</Kicker>
                      <CardTitle>History</CardTitle>
                    </div>
                  </CardHeader>
                  <Timeline
                    events={item.timeline.map((entry) => ({
                      at: formatDateTime(entry.occurredAt),
                      by: entry.actor,
                      description: `${entry.entityType} ${entry.entityId.slice(0, 8)}`,
                      title: entry.summary,
                    }))}
                  />
                  <DescriptionList
                    items={[
                      { label: "Item code", value: item.code },
                      { label: "Kind", value: item.kind },
                      {
                        label: "Created from",
                        value: item.identifiers.join(", ") || "Manual entry",
                      },
                    ]}
                  />
                </Card>
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog
        description="A price can apply to every Branch or to one Branch, and from a quantity break upward."
        onClose={() => setDialog(null)}
        open={dialog === "price"}
        title="Add or change a price"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity) return;
            const form = new FormData(event.currentTarget);
            void run("Price saved.", () =>
              api.upsertItemPrice(identity.businessId, itemId, {
                unitPrice: readOptionalNumber(form, "unitPrice") ?? 0,
                minQuantity: readOptionalNumber(form, "minQuantity") ?? 1,
                ...(readText(form, "priceListId")
                  ? { priceListId: readText(form, "priceListId") }
                  : {}),
                ...(readText(form, "branchId") ? { branchId: readText(form, "branchId") } : {}),
                ...(readOptionalNumber(form, "costPrice") === undefined
                  ? {}
                  : { costPrice: readOptionalNumber(form, "costPrice") }),
              }),
            ).then((ok) => {
              if (ok) setDialog(null);
            });
          }}
        >
          <FormGrid>
            <SelectField label="Price list" name="priceListId" defaultValue="">
              <option value="">Default price list</option>
              {(reference?.priceLists ?? []).map((priceList) => (
                <option key={priceList.id} value={priceList.id}>
                  {priceList.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Branch" name="branchId" defaultValue="">
              <option value="">Every Branch</option>
              {(reference?.branches ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </SelectField>
            <Field label="Unit price" name="unitPrice" inputMode="decimal" required />
            <Field label="Cost price" name="costPrice" inputMode="decimal" />
            <Field
              hint="Use 12 for a case price, for example."
              label="From quantity"
              name="minQuantity"
              defaultValue="1"
              inputMode="decimal"
            />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Save price
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Barcodes must be unique across the whole Business."
        onClose={() => setDialog(null)}
        open={dialog === "identifier"}
        title="Add a code"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity) return;
            const form = new FormData(event.currentTarget);
            void run("Code added.", () =>
              api.createItemIdentifier(identity.businessId, itemId, {
                kind: readText(form, "kind", "BARCODE") as "BARCODE",
                value: readText(form, "value"),
                ...(readText(form, "variantId") ? { variantId: readText(form, "variantId") } : {}),
              }),
            ).then((ok) => {
              if (ok) setDialog(null);
            });
          }}
        >
          <FormGrid>
            <SelectField label="Kind" name="kind" defaultValue="BARCODE">
              {["BARCODE", "SKU", "QR", "SUPPLIER_CODE", "OTHER"].map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </SelectField>
            <Field label="Value" name="value" required />
            <SelectField label="Variant" name="variantId" defaultValue="">
              <option value="">Whole item</option>
              {(item?.variants ?? []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </SelectField>
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Add code
            </Button>
          </FormFooter>
        </form>
      </Dialog>

      <Dialog
        description="Give the variant a code and a name that a cashier will recognise."
        onClose={() => setDialog(null)}
        open={dialog === "variant"}
        title="Add a variant"
      >
        <form
          className="ui-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!api || !identity) return;
            const form = new FormData(event.currentTarget);
            const attributeKey = readText(form, "attributeKey");
            void run("Variant added.", () =>
              api.createItemVariant(identity.businessId, itemId, {
                code: readText(form, "code"),
                name: readText(form, "name"),
                attributes: attributeKey
                  ? { [attributeKey]: readText(form, "attributeValue") }
                  : {},
              }),
            ).then((ok) => {
              if (ok) setDialog(null);
            });
          }}
        >
          <FormGrid>
            <Field label="Variant code" name="code" placeholder="RED-L" required />
            <Field label="Variant name" name="name" placeholder="Red, Large" required />
            <Field label="Attribute" name="attributeKey" placeholder="colour" />
            <Field label="Attribute value" name="attributeValue" placeholder="Red" />
          </FormGrid>
          <FormFooter>
            <Button onClick={() => setDialog(null)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              Add variant
            </Button>
          </FormFooter>
        </form>
      </Dialog>
    </Workspace>
  );
}
