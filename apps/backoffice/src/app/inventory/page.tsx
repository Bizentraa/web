"use client";

import type {
  CatalogReferenceData,
  BusinessFoundationSummary,
  InventoryOverview,
  ItemListRow,
  Paginated,
  PurchaseOrderRow,
  StockCountRow,
  SupplierListRow,
} from "@bizentra/contracts";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  DataTable,
  Field,
  FormFooter,
  FormGrid,
  Grid,
  Kicker,
  KpiCard,
  SelectField,
  Stack,
  StatusChip,
  formatDateTime,
} from "@bizentra/design-system";
import { Dialog, Tabs, useToasts } from "@bizentra/design-system/client";
import { useState, type FormEvent } from "react";

import { readOptionalNumber, readOptionalText, readText } from "../lib/forms";
import { errorMessage, ResourceState, useApi, useResource, Workspace } from "../lib/workspace";

interface InventoryData {
  foundation: BusinessFoundationSummary;
  inventory: InventoryOverview;
  reference: CatalogReferenceData;
  items: Paginated<ItemListRow>;
  suppliers: Paginated<SupplierListRow>;
}

type DialogName =
  | "adjust"
  | "transfer"
  | "reorder"
  | "count"
  | "postCount"
  | "request"
  | "order"
  | "receive"
  | "fulfill";

export default function InventoryPage() {
  const { api, identity } = useApi();
  const toasts = useToasts();
  const [tab, setTab] = useState("stock");
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRow | null>(null);
  const [selectedCount, setSelectedCount] = useState<StockCountRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, state, error, reload } = useResource<InventoryData>(async (client, businessId) => {
    const [foundation, inventory, reference, items, suppliers] = await Promise.all([
      client.getBusinessFoundation(businessId),
      client.getInventoryOverview(businessId),
      client.getCatalogReference(businessId),
      client.listItems(businessId, { pageSize: 100, status: "ACTIVE" }),
      client.listSuppliers(businessId, { pageSize: 100, status: "ACTIVE" }),
    ]);
    return { foundation, inventory, reference, items, suppliers };
  });

  const firstBranch = data?.foundation.branches[0];
  const firstLocation = firstBranch?.locations[0]?.id ?? "";
  const stockItems = data?.items.rows.filter((item) => item.stockTracked) ?? [];
  const firstStockItem = stockItems[0];
  const firstSupplier = data?.suppliers.rows[0];

  const run = async (message: string, work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      await reload();
      toasts.push({ title: message, tone: "success" });
      setDialog(null);
    } catch (cause) {
      toasts.push({
        title: "Inventory change was not saved",
        description: errorMessage(cause),
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Workspace
      status={<StatusChip tone="information">Inventory ledger active</StatusChip>}
      description="Stock ledger, availability, receiving, transfers, reorder suggestions and fulfillment preparation."
      title="Inventory and purchasing"
      headerActions={
        <>
          <Button onClick={() => setDialog("adjust")} variant="secondary">
            Stock adjustment
          </Button>
          <Button onClick={() => setDialog("order")}>New purchase order</Button>
        </>
      }
    >
      <Stack>
        <ResourceState error={error} onRetry={reload} state={state} title="Inventory">
          {data ? (
            <Stack>
              <Grid>
                <KpiCard
                  label="Stock positions"
                  value={String(data.inventory.counts.balances)}
                  trend={`${data.inventory.counts.movements} movement(s) posted`}
                  tone="information"
                />
                <KpiCard
                  label="Reorder alerts"
                  value={String(data.inventory.counts.reorderSuggestions)}
                  trend="Based on available + incoming"
                  tone={data.inventory.counts.reorderSuggestions > 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Purchase orders"
                  value={String(data.inventory.counts.purchaseOrders)}
                  trend={`${data.inventory.counts.receipts} receipt(s)`}
                  tone="information"
                />
                <KpiCard
                  label="Stock counts"
                  value={String(data.inventory.counts.stockCounts)}
                  trend={`${data.inventory.counts.openStockCounts} open`}
                  tone={data.inventory.counts.openStockCounts > 0 ? "warning" : "information"}
                />
              </Grid>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "stock", label: "Stock ledger" },
                  { value: "counts", label: "Counts" },
                  { value: "purchasing", label: "Purchasing" },
                  { value: "fulfillment", label: "Fulfillment" },
                ]}
              />

              {tab === "stock" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="On hand, reserved, incoming and available"
                      className="ui-scroll-panel"
                      toolbar={
                        <div className="ui-row">
                          <Button onClick={() => setDialog("transfer")}>Transfer</Button>
                          <Button onClick={() => setDialog("reorder")}>Reorder level</Button>
                        </div>
                      }
                      empty="No stock has been posted yet. Start with an opening stock adjustment or receive a purchase order."
                      getRowKey={(row) => row.id}
                      rows={data.inventory.availability}
                      columns={[
                        {
                          header: "Item",
                          render: (row) => (
                            <strong>
                              {row.itemCode} · {row.itemName}
                            </strong>
                          ),
                        },
                        { header: "Location", render: (row) => row.locationName },
                        {
                          header: "On hand",
                          align: "right",
                          render: (row) => row.onHandQuantity.toLocaleString(),
                        },
                        {
                          header: "Reserved",
                          align: "right",
                          hideOnMobile: true,
                          render: (row) => row.reservedQuantity.toLocaleString(),
                        },
                        {
                          header: "Incoming",
                          align: "right",
                          hideOnMobile: true,
                          render: (row) => row.incomingQuantity.toLocaleString(),
                        },
                        {
                          header: "Available",
                          align: "right",
                          render: (row) => (
                            <Badge tone={row.availableQuantity > 0 ? "success" : "warning"}>
                              {row.availableQuantity.toLocaleString()}
                            </Badge>
                          ),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <DataTable
                      caption="Latest stock movements"
                      className="ui-scroll-panel"
                      empty="No stock movement exists yet."
                      getRowKey={(row) => row.id}
                      rows={data.inventory.movements}
                      columns={[
                        { header: "Type", render: (row) => readable(row.kind) },
                        {
                          header: "Item",
                          render: (row) => `${row.itemCode} · ${row.itemName}`,
                        },
                        {
                          header: "Qty",
                          align: "right",
                          render: (row) => row.quantity.toLocaleString(),
                        },
                        {
                          header: "Time",
                          hideOnMobile: true,
                          render: (row) => formatDateTime(row.occurredAt),
                        },
                      ]}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "counts" ? (
                <DataTable
                  caption="Stock counts and variance posting"
                  toolbar={<Button onClick={() => setDialog("count")}>Open stock count</Button>}
                  empty="No stock counts yet."
                  getRowKey={(row) => row.id}
                  rows={data.inventory.stockCounts}
                  columns={[
                    { header: "Count", render: (row) => <strong>{row.number}</strong> },
                    { header: "Name", render: (row) => row.name },
                    { header: "Location", render: (row) => row.locationName },
                    {
                      header: "Status",
                      render: (row) => (
                        <Badge tone={row.status === "POSTED" ? "success" : "warning"}>
                          {readable(row.status)}
                        </Badge>
                      ),
                    },
                    {
                      header: "Expected",
                      align: "right",
                      render: (row) => row.expectedQuantity.toLocaleString(),
                    },
                    {
                      header: "Variance",
                      align: "right",
                      render: (row) =>
                        row.varianceQuantity === null ? "-" : row.varianceQuantity.toLocaleString(),
                    },
                    {
                      header: "Action",
                      render: (row) =>
                        row.status === "OPEN" ? (
                          <Button
                            onClick={() => {
                              setSelectedCount(row);
                              setDialog("postCount");
                            }}
                            size="quiet"
                          >
                            Post count
                          </Button>
                        ) : (
                          <StatusChip tone="success">Posted</StatusChip>
                        ),
                    },
                  ]}
                />
              ) : null}

              {tab === "purchasing" ? (
                <div className="ui-screen-grid">
                  <main className="ui-screen-main">
                    <DataTable
                      caption="Purchase orders and receiving"
                      toolbar={
                        <div className="ui-row">
                          <Button onClick={() => setDialog("request")}>Purchase request</Button>
                          <Button onClick={() => setDialog("order")}>Purchase order</Button>
                        </div>
                      }
                      empty="No purchase orders yet."
                      getRowKey={(row) => row.id}
                      rows={data.inventory.purchaseOrders}
                      columns={[
                        { header: "PO", render: (row) => <strong>{row.number}</strong> },
                        { header: "Supplier", render: (row) => row.supplierName },
                        {
                          header: "Status",
                          render: (row) => (
                            <Badge tone={poTone(row.status)}>{readable(row.status)}</Badge>
                          ),
                        },
                        {
                          header: "Ordered",
                          align: "right",
                          render: (row) => row.orderedQuantity.toLocaleString(),
                        },
                        {
                          header: "Received",
                          align: "right",
                          render: (row) => row.receivedQuantity.toLocaleString(),
                        },
                        {
                          header: "Action",
                          render: (row) =>
                            row.varianceQuantity > 0 ? (
                              <Button
                                onClick={() => {
                                  setSelectedOrder(row);
                                  setDialog("receive");
                                }}
                                size="quiet"
                              >
                                Receive
                              </Button>
                            ) : (
                              <StatusChip tone="success">Done</StatusChip>
                            ),
                        },
                      ]}
                    />
                  </main>
                  <aside className="ui-screen-side">
                    <DataTable
                      caption="Suggested replenishment"
                      empty="No reorder suggestions."
                      getRowKey={(row) => row.id}
                      rows={data.inventory.reorderSuggestions}
                      columns={[
                        { header: "Item", render: (row) => row.itemName },
                        {
                          header: "Available",
                          align: "right",
                          render: (row) => row.availableQuantity.toLocaleString(),
                        },
                        {
                          header: "Buy",
                          align: "right",
                          render: (row) => <Badge tone="warning">{row.suggestedQuantity}</Badge>,
                        },
                      ]}
                    />
                    <DataTable
                      caption="Purchase requests"
                      empty="No purchase requests yet."
                      getRowKey={(row) => row.id}
                      rows={data.inventory.purchaseRequests}
                      columns={[
                        { header: "Number", render: (row) => row.number },
                        {
                          header: "Status",
                          render: (row) => (
                            <Badge tone={row.status === "APPROVED" ? "success" : "warning"}>
                              {readable(row.status)}
                            </Badge>
                          ),
                        },
                        {
                          header: "Qty",
                          align: "right",
                          render: (row) => row.totalQuantity.toLocaleString(),
                        },
                      ]}
                    />
                  </aside>
                </div>
              ) : null}

              {tab === "fulfillment" ? (
                <DataTable
                  caption="Pick, pack and dispatch"
                  toolbar={
                    <Button onClick={() => setDialog("fulfill")}>New fulfillment order</Button>
                  }
                  empty="No fulfillment orders yet."
                  getRowKey={(row) => row.id}
                  rows={data.inventory.fulfillmentOrders}
                  columns={[
                    { header: "Number", render: (row) => <strong>{row.number}</strong> },
                    { header: "Customer", render: (row) => row.customerName ?? "Not assigned" },
                    {
                      header: "Status",
                      render: (row) => (
                        <Badge tone={fulfillmentTone(row.status)}>{readable(row.status)}</Badge>
                      ),
                    },
                    {
                      header: "Qty",
                      align: "right",
                      render: (row) => row.totalQuantity.toLocaleString(),
                    },
                    {
                      header: "Next",
                      render: (row) =>
                        row.status !== "DISPATCHED" && row.status !== "CANCELLED" ? (
                          <Button
                            onClick={() =>
                              api && identity
                                ? void run("Fulfillment status updated.", () =>
                                    api.updateFulfillmentStatus(identity.businessId, row.id, {
                                      status: nextFulfillmentStatus(row.status),
                                    }),
                                  )
                                : undefined
                            }
                            size="quiet"
                          >
                            {readable(nextFulfillmentStatus(row.status))}
                          </Button>
                        ) : (
                          <StatusChip tone="success">Closed</StatusChip>
                        ),
                    },
                  ]}
                />
              ) : null}

              {stockItems.length === 0 ? (
                <Card>
                  <Kicker>Before stock can move</Kicker>
                  <CardTitle>Create at least one stock-tracked Item</CardTitle>
                  <CardDescription>
                    Open Catalog, create or edit an Item, and tick “Track stock”. Inventory uses
                    those items for adjustments, transfers, receiving and fulfillment.
                  </CardDescription>
                </Card>
              ) : null}
            </Stack>
          ) : null}
        </ResourceState>
      </Stack>

      <Dialog onClose={() => setDialog(null)} open={dialog === "adjust"} title="Stock adjustment">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Stock movement posted.", () =>
                api && identity
                  ? api.adjustStock(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      locationId: readText(form, "locationId"),
                      itemId: readText(form, "itemId"),
                      quantityChange: readOptionalNumber(form, "quantityChange") ?? 0,
                      unitCost: readOptionalNumber(form, "unitCost"),
                      reason: readText(form, "reason"),
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <LocationSelect foundation={data?.foundation} defaultValue={firstLocation} />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field
              label="Quantity change"
              name="quantityChange"
              defaultValue="10"
              inputMode="decimal"
              required
            />
            <Field label="Unit cost" name="unitCost" inputMode="decimal" />
            <Field label="Reason" name="reason" defaultValue="Opening stock" required />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Post movement" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "transfer"} title="Transfer stock">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Stock transferred.", () =>
                api && identity
                  ? api.transferStock(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      fromLocationId: readText(form, "fromLocationId"),
                      toLocationId: readText(form, "toLocationId"),
                      itemId: readText(form, "itemId"),
                      quantity: readOptionalNumber(form, "quantity") ?? 1,
                      reason: readText(form, "reason"),
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <LocationSelect
              foundation={data?.foundation}
              label="From Location"
              name="fromLocationId"
              defaultValue={firstLocation}
            />
            <LocationSelect foundation={data?.foundation} label="To Location" name="toLocationId" />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field label="Quantity" name="quantity" defaultValue="1" inputMode="decimal" required />
            <Field label="Reason" name="reason" defaultValue="Branch replenishment" required />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Transfer" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "reorder"} title="Set reorder level">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Reorder level saved.", () =>
                api && identity
                  ? api.upsertReorderSetting(identity.businessId, {
                      locationId: readText(form, "locationId"),
                      itemId: readText(form, "itemId"),
                      minimumQuantity: readOptionalNumber(form, "minimumQuantity") ?? 0,
                      targetQuantity: readOptionalNumber(form, "targetQuantity") ?? 1,
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <LocationSelect foundation={data?.foundation} defaultValue={firstLocation} />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field
              label="Minimum quantity"
              name="minimumQuantity"
              defaultValue="5"
              inputMode="decimal"
              required
            />
            <Field
              label="Target quantity"
              name="targetQuantity"
              defaultValue="20"
              inputMode="decimal"
              required
            />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Save reorder level" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "count"} title="Open stock count">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Stock count opened.", () =>
                api && identity
                  ? api.createStockCount(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      locationId: readText(form, "locationId"),
                      name: readText(form, "name"),
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <LocationSelect foundation={data?.foundation} defaultValue={firstLocation} />
            <Field label="Count name" name="name" defaultValue="Cycle count" required />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Open count" />
        </form>
      </Dialog>

      <Dialog
        onClose={() => setDialog(null)}
        open={dialog === "postCount"}
        title="Post stock count"
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Stock count posted.", () =>
                api && identity && selectedCount
                  ? api.postStockCount(identity.businessId, selectedCount.id, {
                      varianceReason: readText(form, "varianceReason"),
                      lines: selectedCount.lines.map((line) => ({
                        stockCountLineId: line.id,
                        countedQuantity:
                          readOptionalNumber(form, `countedQuantity:${line.id}`) ??
                          line.expectedQuantity,
                        note: readOptionalText(form, `note:${line.id}`),
                      })),
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <CardDescription>
            {selectedCount
              ? `${selectedCount.number} at ${selectedCount.locationName}. Variances post as stock adjustments.`
              : "Choose an open stock count first."}
          </CardDescription>
          <div className="ui-stack">
            {(selectedCount?.lines ?? []).map((line) => (
              <FormGrid key={line.id}>
                <Field label={`${line.itemCode} expected`} value={line.expectedQuantity} readOnly />
                <Field
                  label="Counted quantity"
                  name={`countedQuantity:${line.id}`}
                  defaultValue={line.expectedQuantity}
                  inputMode="decimal"
                  required
                />
                <Field label="Note" name={`note:${line.id}`} />
              </FormGrid>
            ))}
          </div>
          <Field
            label="Variance reason"
            name="varianceReason"
            defaultValue="Cycle count variance"
            required
          />
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Post variances" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "request"} title="Purchase request">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Purchase request created.", () =>
                api && identity
                  ? api.createPurchaseRequest(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      reason: readText(form, "reason"),
                      lines: [
                        {
                          itemId: readText(form, "itemId"),
                          quantity: readOptionalNumber(form, "quantity") ?? 1,
                          unitCost: readOptionalNumber(form, "unitCost"),
                        },
                      ],
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field
              label="Quantity"
              name="quantity"
              defaultValue="10"
              inputMode="decimal"
              required
            />
            <Field label="Expected cost" name="unitCost" inputMode="decimal" />
            <Field label="Reason" name="reason" defaultValue="Low stock" required />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Create request" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "order"} title="Purchase order">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Purchase order created.", () =>
                api && identity
                  ? api.createPurchaseOrder(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      supplierId: readText(form, "supplierId"),
                      expectedDate: readOptionalText(form, "expectedDate"),
                      notes: readOptionalText(form, "notes"),
                      lines: [
                        {
                          itemId: readText(form, "itemId"),
                          quantity: readOptionalNumber(form, "quantity") ?? 1,
                          unitCost: readOptionalNumber(form, "unitCost") ?? 0,
                        },
                      ],
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <SupplierSelect
              suppliers={data?.suppliers.rows ?? []}
              defaultValue={firstSupplier?.id}
            />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field
              label="Quantity"
              name="quantity"
              defaultValue="10"
              inputMode="decimal"
              required
            />
            <Field
              label="Unit cost"
              name="unitCost"
              defaultValue="1"
              inputMode="decimal"
              required
            />
            <Field label="Expected date" name="expectedDate" type="date" />
            <Field label="Notes" name="notes" />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Create PO" />
        </form>
      </Dialog>

      <Dialog
        onClose={() => setDialog(null)}
        open={dialog === "receive"}
        title="Receive purchase order"
      >
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) => {
              const line = selectedOrder?.lines[0];
              return run("Goods received and stock increased.", () =>
                api && identity && selectedOrder && line
                  ? api.receivePurchaseOrder(identity.businessId, selectedOrder.id, {
                      locationId: readText(form, "locationId"),
                      supplierDocument: readOptionalText(form, "supplierDocument"),
                      lines: [
                        {
                          purchaseOrderLineId: line.id,
                          quantity: readOptionalNumber(form, "quantity") ?? 1,
                          unitCost: readOptionalNumber(form, "unitCost"),
                        },
                      ],
                    })
                  : Promise.resolve(),
              );
            })
          }
        >
          <CardDescription>
            {selectedOrder
              ? `Receiving against ${selectedOrder.number}. First line: ${selectedOrder.lines[0]?.itemName ?? "No line"}.`
              : "Choose a purchase order first."}
          </CardDescription>
          <FormGrid>
            <LocationSelect foundation={data?.foundation} defaultValue={firstLocation} />
            <Field
              label="Quantity"
              name="quantity"
              defaultValue={String(selectedOrder?.varianceQuantity ?? 1)}
              inputMode="decimal"
              required
            />
            <Field label="Unit cost override" name="unitCost" inputMode="decimal" />
            <Field
              label="Supplier document"
              name="supplierDocument"
              placeholder="Invoice / delivery note"
            />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Receive stock" />
        </form>
      </Dialog>

      <Dialog onClose={() => setDialog(null)} open={dialog === "fulfill"} title="Fulfillment order">
        <form
          className="ui-stack"
          onSubmit={(event) =>
            void submit(event, (form) =>
              run("Fulfillment order created.", () =>
                api && identity
                  ? api.createFulfillmentOrder(identity.businessId, {
                      branchId: readText(form, "branchId"),
                      customerName: readOptionalText(form, "customerName"),
                      sourceType: "MANUAL",
                      sourceId: readText(form, "sourceId", `manual-${Date.now()}`),
                      lines: [
                        {
                          itemId: readText(form, "itemId"),
                          quantity: readOptionalNumber(form, "quantity") ?? 1,
                        },
                      ],
                    })
                  : Promise.resolve(),
              ),
            )
          }
        >
          <FormGrid>
            <BranchSelect reference={data?.reference} defaultValue={firstBranch?.id} />
            <ItemSelect items={stockItems} defaultValue={firstStockItem?.id} />
            <Field label="Quantity" name="quantity" defaultValue="1" inputMode="decimal" required />
            <Field label="Customer" name="customerName" placeholder="Customer / counter order" />
            <Field
              label="Source reference"
              name="sourceId"
              defaultValue={`manual-${Date.now()}`}
              required
            />
          </FormGrid>
          <DialogFooter busy={busy} onClose={() => setDialog(null)} label="Create fulfillment" />
        </form>
      </Dialog>
    </Workspace>
  );
}

async function submit(
  event: FormEvent<HTMLFormElement>,
  handler: (form: FormData) => Promise<unknown>,
) {
  event.preventDefault();
  await handler(new FormData(event.currentTarget));
}

function BranchSelect({
  defaultValue,
  reference,
}: {
  defaultValue?: string | undefined;
  reference?: CatalogReferenceData | undefined;
}) {
  return (
    <SelectField label="Branch" name="branchId" defaultValue={defaultValue ?? ""} required>
      {(reference?.branches ?? []).map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.code} · {branch.name}
        </option>
      ))}
    </SelectField>
  );
}

function LocationSelect({
  defaultValue,
  label = "Location",
  name = "locationId",
  foundation,
}: {
  defaultValue?: string | undefined;
  label?: string | undefined;
  name?: string | undefined;
  foundation?: BusinessFoundationSummary | undefined;
}) {
  return (
    <SelectField label={label} name={name} defaultValue={defaultValue ?? ""} required>
      {locationOptions(foundation).map((location) => (
        <option key={location.id} value={location.id}>
          {location.code} · {location.name}
        </option>
      ))}
    </SelectField>
  );
}

function ItemSelect({
  defaultValue,
  items,
}: {
  defaultValue?: string | undefined;
  items: ItemListRow[];
}) {
  return (
    <SelectField label="Stock item" name="itemId" defaultValue={defaultValue ?? ""} required>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.code} · {item.name}
        </option>
      ))}
    </SelectField>
  );
}

function SupplierSelect({
  defaultValue,
  suppliers,
}: {
  defaultValue?: string | undefined;
  suppliers: SupplierListRow[];
}) {
  return (
    <SelectField label="Supplier" name="supplierId" defaultValue={defaultValue ?? ""} required>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.code} · {supplier.name}
        </option>
      ))}
    </SelectField>
  );
}

function DialogFooter({
  busy,
  label,
  onClose,
}: {
  busy: boolean;
  label: string;
  onClose: () => void;
}) {
  return (
    <FormFooter>
      <Button onClick={onClose} variant="secondary">
        Cancel
      </Button>
      <Button disabled={busy} type="submit">
        {label}
      </Button>
    </FormFooter>
  );
}

function locationOptions(foundation?: BusinessFoundationSummary) {
  return (foundation?.branches ?? []).flatMap((branch) =>
    branch.locations.map((location) => ({
      id: location.id,
      code: `${branch.code}/${location.code}`,
      name: location.name,
    })),
  );
}

function readable(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1))
    .join(" ");
}

function poTone(
  status: PurchaseOrderRow["status"],
): "success" | "warning" | "danger" | "neutral" | "information" {
  if (status === "RECEIVED") return "success";
  if (status === "PARTIALLY_RECEIVED") return "information";
  if (status === "CANCELLED") return "danger";
  return "warning";
}

function fulfillmentTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "information" {
  if (status === "DISPATCHED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "PACKED") return "information";
  return "warning";
}

function nextFulfillmentStatus(status: string): "PICKING" | "PACKED" | "DISPATCHED" {
  if (status === "READY_TO_PICK") return "PICKING";
  if (status === "PICKING") return "PACKED";
  return "DISPATCHED";
}
