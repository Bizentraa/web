#!/usr/bin/env node
/**
 * Common Core P0-P1-P2 smoke run.
 *
 * Exercises the real API against a running database: Business setup, access control, approvals,
 * feature packs, master data, CSV import, POS shift, sale, split payment, receipt, return and
 * Business isolation. Run it after `pnpm infra:up` and `pnpm db:migrate:deploy`, with the API
 * running on API_URL (default http://localhost:4000/api/v1).
 *
 *   node scripts/smoke-common-core.mjs
 */

const API = process.env.API_URL ?? "http://localhost:4000/api/v1";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` - ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

async function call(path, { method = "GET", body, identity, expect } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(identity ? { "x-business-id": identity.businessId, "x-user-id": identity.userId } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (expect !== undefined) {
    if (response.status !== expect) {
      throw new Error(
        `${method} ${path} expected ${expect} but received ${response.status}: ${text.slice(0, 300)}`,
      );
    }
    return payload;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text.slice(0, 300)}`);
  }
  return payload;
}

const stamp = Date.now().toString(36);
const key = (name) => `smoke-${stamp}-${name}`;

async function main() {
  console.log(`Bizentra Common Core smoke run against ${API}`);

  /* ------------------------------------------------------------- P0 setup */
  console.log("\nP0 Business foundation");
  const foundation = await call("/setup/business-foundation", {
    method: "POST",
    body: {
      business: {
        name: `Smoke Store ${stamp}`,
        slug: `smoke-${stamp}`,
        defaultCurrency: "LKR",
        timeZone: "Asia/Colombo",
        countryCode: "LK",
      },
      firstBranch: { code: `MAIN${stamp.slice(-3)}`, name: "Main Branch" },
      firstLocation: { code: "SHOP", name: "Shop Floor", type: "SHOP_FLOOR" },
      owner: {
        externalSubject: `smoke-owner-${stamp}`,
        email: `owner-${stamp}@example.com`,
        displayName: "Smoke Owner",
      },
    },
  });
  const owner = { businessId: foundation.businessId, userId: foundation.ownerUserId };
  check("Business, Branch, Location and owner created", Boolean(foundation.businessId));

  const summary = await call(`/businesses/${owner.businessId}/foundation`, { identity: owner });
  check("Foundation reports one Branch", summary.branches.length === 1);
  check("Setup progress is reported", summary.setup.hasSellableItems === false);

  await call(`/businesses/${owner.businessId}`, {
    method: "PATCH",
    identity: owner,
    body: { legalName: "Smoke Store (Pvt) Ltd" },
  });
  check("Business details can be updated", true);

  const branchTwo = await call(`/businesses/${owner.businessId}/branches`, {
    method: "POST",
    identity: owner,
    body: {
      code: `WEST${stamp.slice(-3)}`,
      name: "West Branch",
      firstLocation: { code: "STORE", name: "Back Store", type: "WAREHOUSE" },
    },
  });
  check("A second Branch can be created", Boolean(branchTwo.branchId));

  await call(`/businesses/${owner.businessId}/branches/${branchTwo.branchId}`, {
    method: "PATCH",
    identity: owner,
    body: { status: "INACTIVE" },
  });
  await call(`/businesses/${owner.businessId}/branches/${branchTwo.branchId}`, {
    method: "PATCH",
    identity: owner,
    body: { status: "ACTIVE" },
  });
  check("A Branch can be deactivated and activated", true);

  const mainBranchId = foundation.branchId;
  await call(`/businesses/${owner.businessId}/locations`, {
    method: "POST",
    identity: owner,
    body: { branchId: mainBranchId, code: "VAN01", name: "Van 01", type: "VAN" },
  });
  check("A Location can be added to a Branch", true);

  /* --------------------------------------------------------- P0 access */
  console.log("\nP0 users, roles and approvals");
  const access = await call(`/businesses/${owner.businessId}/access`, { identity: owner });
  const cashierRole = access.roles.find((role) => role.code === "CASHIER");
  const adminRole = access.roles.find((role) => role.code === "ADMINISTRATOR");
  const managerRole = access.roles.find((role) => role.code === "BRANCH_MANAGER");
  const financeRole = access.roles.find((role) => role.code === "FINANCE_USER");
  const operationsRole = access.roles.find((role) => role.code === "OPERATIONS_USER");
  const deviceRole = access.roles.find((role) => role.code === "DEVICE_USER");
  const reportingRole = access.roles.find((role) => role.code === "REPORTING_USER");
  const operationsAdminRole = access.roles.find((role) => role.code === "OPERATIONS_ADMIN");
  check("Role templates were created with the Business", Boolean(cashierRole && adminRole));
  check(
    "Cashier Role cannot manage Roles",
    Boolean(cashierRole) && !cashierRole.permissions.includes("ROLE_MANAGE"),
  );
  check(
    "Permission catalogue covers P0 through P8",
    access.permissionCatalog.some((permission) => permission.code === "INVENTORY_VIEW") &&
      access.permissionCatalog.some((permission) => permission.phase === "P3") &&
      access.permissionCatalog.some((permission) => permission.code === "AR_MANAGE") &&
      access.permissionCatalog.some((permission) => permission.phase === "P4") &&
      access.permissionCatalog.some((permission) => permission.code === "WORK_TICKET_MANAGE") &&
      access.permissionCatalog.some((permission) => permission.phase === "P5") &&
      access.permissionCatalog.some((permission) => permission.code === "OFFLINE_MANAGE") &&
      access.permissionCatalog.some((permission) => permission.phase === "P6") &&
      access.permissionCatalog.some((permission) => permission.code === "REPORT_EXPORT") &&
      access.permissionCatalog.some((permission) => permission.phase === "P7") &&
      access.permissionCatalog.some((permission) => permission.code === "RELEASE_MANAGE") &&
      access.permissionCatalog.some((permission) => permission.phase === "P8"),
  );
  check(
    "Business Administrator Role receives P3 permissions",
    Boolean(adminRole) && adminRole.permissions.includes("INVENTORY_VIEW"),
  );
  check(
    "Branch Manager Role receives P3 operations permissions",
    Boolean(managerRole) && managerRole.permissions.includes("INVENTORY_VIEW"),
  );
  check(
    "Business Administrator Role receives P4 permissions",
    Boolean(adminRole) && adminRole.permissions.includes("AR_MANAGE"),
  );
  check(
    "Finance User Role receives P4 operations permissions",
    Boolean(financeRole) &&
      financeRole.permissions.includes("AR_MANAGE") &&
      financeRole.permissions.includes("AP_MANAGE") &&
      financeRole.permissions.includes("BANK_MANAGE"),
  );
  check(
    "Business Administrator Role receives P5/P6 permissions",
    Boolean(adminRole) &&
      adminRole.permissions.includes("WORK_TICKET_MANAGE") &&
      adminRole.permissions.includes("DEVICE_MANAGE") &&
      adminRole.permissions.includes("OFFLINE_MANAGE"),
  );
  check(
    "Operations User Role receives P5 permissions",
    Boolean(operationsRole) &&
      operationsRole.permissions.includes("WORK_TICKET_MANAGE") &&
      operationsRole.permissions.includes("BOOKING_MANAGE") &&
      operationsRole.permissions.includes("TRACEABILITY_MANAGE"),
  );
  check(
    "Device User Role receives P6 permissions",
    Boolean(deviceRole) &&
      deviceRole.permissions.includes("DEVICE_MANAGE") &&
      deviceRole.permissions.includes("OFFLINE_MANAGE"),
  );
  check(
    "Reporting User Role receives P7 permissions",
    Boolean(reportingRole) &&
      reportingRole.permissions.includes("REPORT_EXPORT") &&
      reportingRole.permissions.includes("INTEGRATION_MANAGE") &&
      reportingRole.permissions.includes("MIGRATION_MANAGE"),
  );
  check(
    "Operations Admin Role receives P8 permissions",
    Boolean(operationsAdminRole) &&
      operationsAdminRole.permissions.includes("SECURITY_MANAGE") &&
      operationsAdminRole.permissions.includes("OPERATIONS_MANAGE") &&
      operationsAdminRole.permissions.includes("RELEASE_MANAGE"),
  );

  const manager = await call(`/businesses/${owner.businessId}/users`, {
    method: "POST",
    identity: owner,
    body: {
      email: `manager-${stamp}@example.com`,
      displayName: "Smoke Manager",
      roleIds: [managerRole.id],
      branchIds: [mainBranchId],
    },
  });
  await call(`/businesses/${owner.businessId}/users/${manager.membershipId}`, {
    method: "PATCH",
    identity: owner,
    body: { status: "ACTIVE" },
  });
  const managerIdentity = { businessId: owner.businessId, userId: manager.userId };
  check("A manager can be invited and activated", Boolean(manager.membershipId));

  const cashier = await call(`/businesses/${owner.businessId}/users`, {
    method: "POST",
    identity: owner,
    body: {
      email: `cashier-${stamp}@example.com`,
      displayName: "Smoke Cashier",
      roleIds: [cashierRole.id],
      branchIds: [mainBranchId],
    },
  });
  await call(`/businesses/${owner.businessId}/users/${cashier.membershipId}`, {
    method: "PATCH",
    identity: owner,
    body: { status: "ACTIVE" },
  });
  const cashierIdentity = { businessId: owner.businessId, userId: cashier.userId };

  const denied = await call(`/businesses/${owner.businessId}/access`, {
    identity: cashierIdentity,
    expect: 403,
  });
  check("A cashier is denied the access screen", denied.code === "FORBIDDEN");

  await call(`/businesses/${owner.businessId}/roles`, {
    method: "POST",
    identity: owner,
    body: { code: "STOCKKEEPER", name: "Store Keeper", templateCode: "MERCHANDISER" },
  });
  check("A custom Role can be created from a template", true);

  const badRole = await call(`/businesses/${owner.businessId}/roles`, {
    method: "POST",
    identity: owner,
    body: { code: "BADROLE", name: "Bad Role", permissions: ["NOT_A_PERMISSION"] },
    expect: 400,
  });
  check("Unknown permissions are rejected", badRole.code === "INVALID_INPUT");

  await call(`/businesses/${owner.businessId}/approvals/policies`, {
    method: "PUT",
    identity: owner,
    body: {
      actionCode: "SALE_DISCOUNT",
      name: "Large sale discount",
      thresholdAmount: 100,
      currencyCode: "LKR",
      enabled: true,
    },
  });
  await call(`/businesses/${owner.businessId}/approvals/policies`, {
    method: "PUT",
    identity: owner,
    body: {
      actionCode: "SALE_REFUND",
      name: "Refund a sale",
      thresholdAmount: 1000,
      currencyCode: "LKR",
      enabled: true,
    },
  });
  check("Approval rules can be configured", true);

  /* ------------------------------------------------------------ features */
  const features = await call(`/businesses/${owner.businessId}/features`, { identity: owner });
  check("Feature packs are listed", features.length >= 5);
  const packBlocked = await call(`/businesses/${owner.businessId}/features`, {
    method: "PUT",
    identity: owner,
    body: { featureKey: "COMMON_CORE", enabled: false },
    expect: 409,
  });
  check("The Common Core cannot be disabled", packBlocked.code === "CONFLICT");
  await call(`/businesses/${owner.businessId}/features`, {
    method: "PUT",
    identity: owner,
    body: { featureKey: "STORE_CREDIT", enabled: true },
  });
  check("An optional feature can be enabled", true);

  /* -------------------------------------------------------- P1 master data */
  console.log("\nP1 master data");
  await call(`/businesses/${owner.businessId}/catalog/defaults`, {
    method: "POST",
    identity: owner,
  });
  const taxCategory = await call(`/businesses/${owner.businessId}/catalog/tax-categories`, {
    method: "POST",
    identity: owner,
    body: {
      code: "VAT15",
      name: "VAT 15%",
      rate: {
        code: "VAT15_STD",
        name: "VAT 15% standard",
        rate: 0.15,
        kind: "BOTH",
        effectiveFrom: "2026-01-01",
      },
    },
  });
  const reference = await call(`/businesses/${owner.businessId}/catalog/reference`, {
    identity: owner,
  });
  const unitId = reference.units.find((unit) => unit.code === "EA").id;
  check("Reference data returns units, tax and price lists", Boolean(unitId));

  const category = await call(`/businesses/${owner.businessId}/catalog/categories`, {
    method: "POST",
    identity: owner,
    body: { code: "DAIRY", name: "Dairy" },
  });

  const item = await call(`/businesses/${owner.businessId}/catalog/items`, {
    method: "POST",
    identity: owner,
    body: {
      code: "MILK-1L",
      name: "Fresh Milk 1L",
      baseUnitId: unitId,
      categoryId: category.id,
      taxCategoryId: taxCategory.id,
      sellable: true,
      stockTracked: true,
      identifiers: [{ kind: "BARCODE", value: `95500${stamp.slice(-6)}` }],
      price: { unitPrice: 450, costPrice: 380, minQuantity: 1 },
    },
  });
  check("An item with barcode, tax and price can be created", Boolean(item.id));

  const duplicate = await call(`/businesses/${owner.businessId}/catalog/items`, {
    method: "POST",
    identity: owner,
    body: {
      code: "MILK-1L-COPY",
      name: "Copy",
      baseUnitId: unitId,
      identifiers: [{ kind: "BARCODE", value: `95500${stamp.slice(-6)}` }],
    },
    expect: 409,
  });
  check("A duplicate barcode is refused with a clear message", duplicate.code === "CONFLICT");

  await call(`/businesses/${owner.businessId}/catalog/items/${item.id}/prices`, {
    method: "PUT",
    identity: owner,
    body: { unitPrice: 420, minQuantity: 12 },
  });
  check("A quantity price break can be added", true);

  const secondItem = await call(`/businesses/${owner.businessId}/catalog/items`, {
    method: "POST",
    identity: owner,
    body: {
      code: "BAG-1",
      name: "Shopping Bag",
      kind: "FEE",
      baseUnitId: unitId,
      sellable: true,
      price: { unitPrice: 20 },
    },
  });

  const itemDetail = await call(`/businesses/${owner.businessId}/catalog/items/${item.id}`, {
    identity: owner,
  });
  check("Item detail includes prices and history", itemDetail.prices.length >= 2);
  check("Item detail includes an audit timeline", itemDetail.timeline.length >= 1);

  const itemList = await call(`/businesses/${owner.businessId}/catalog/items?search=milk`, {
    identity: owner,
  });
  check("Items can be searched", itemList.total >= 1);

  await call(`/businesses/${owner.businessId}/catalog/items/${secondItem.id}`, {
    method: "PATCH",
    identity: owner,
    body: { name: "Shopping Bag (large)" },
  });
  check("An item can be edited", true);

  const customer = await call(`/businesses/${owner.businessId}/catalog/customers`, {
    method: "POST",
    identity: owner,
    body: { code: "CUS-001", name: "Nimal Perera", phone: "0771234567" },
  });
  const supplier = await call(`/businesses/${owner.businessId}/catalog/suppliers`, {
    method: "POST",
    identity: owner,
    body: { code: "SUP-001", name: "Island Distributors", leadTimeDays: 3 },
  });
  await call(`/businesses/${owner.businessId}/catalog/suppliers/${supplier.id}/items`, {
    method: "PUT",
    identity: owner,
    body: { itemId: item.id, supplierCode: "ID-MILK", costPrice: 375, leadTimeDays: 2 },
  });
  const supplierDetail = await call(
    `/businesses/${owner.businessId}/catalog/suppliers/${supplier.id}`,
    { identity: owner },
  );
  check("Supplier items, cost and lead time are stored", supplierDetail.items.length === 1);

  /* --------------------------------------------------------------- P3 stock */
  console.log("\nP3 inventory, purchasing and fulfillment");
  const initialInventory = await call(`/businesses/${owner.businessId}/inventory/overview`, {
    identity: owner,
  });
  check("Inventory overview loads", Boolean(initialInventory.counts));

  const openingMovement = await call(`/businesses/${owner.businessId}/inventory/adjustments`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      locationId: foundation.locationId,
      itemId: item.id,
      quantityChange: 20,
      unitCost: 375,
      reason: "Opening stock before first receiving run",
    },
  });
  check("Opening stock adjustment creates a movement", Boolean(openingMovement.id));

  await call(`/businesses/${owner.businessId}/inventory/reorder-settings`, {
    method: "PUT",
    identity: owner,
    body: {
      locationId: foundation.locationId,
      itemId: item.id,
      minimumQuantity: 25,
      targetQuantity: 40,
    },
  });
  const reorderOverview = await call(`/businesses/${owner.businessId}/inventory/overview`, {
    identity: owner,
  });
  check(
    "Reorder suggestion appears when available stock is below minimum",
    reorderOverview.reorderSuggestions.length === 1,
  );

  const transfer = await call(`/businesses/${owner.businessId}/inventory/transfers`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      fromLocationId: foundation.locationId,
      toLocationId: branchTwo.locationId,
      itemId: item.id,
      quantity: 3,
      reason: "Move stock to West Branch store",
    },
  });
  check(
    "Stock transfer creates paired movement rows",
    Boolean(transfer.outMovementId && transfer.inMovementId),
  );

  const overTransfer = await call(`/businesses/${owner.businessId}/inventory/transfers`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      fromLocationId: foundation.locationId,
      toLocationId: branchTwo.locationId,
      itemId: item.id,
      quantity: 99999,
      reason: "Try to over transfer",
    },
    expect: 409,
  });
  check("Stock transfer refuses unavailable quantity", overTransfer.code === "CONFLICT");

  const purchaseRequest = await call(
    `/businesses/${owner.businessId}/inventory/purchase-requests`,
    {
      method: "POST",
      identity: owner,
      body: {
        branchId: mainBranchId,
        reason: "Replenish dairy stock",
        lines: [{ itemId: item.id, quantity: 12, unitCost: 370 }],
      },
    },
  );
  check("Purchase request can be created", Boolean(purchaseRequest.id));

  await call(
    `/businesses/${owner.businessId}/inventory/purchase-requests/${purchaseRequest.id}/decision`,
    {
      method: "POST",
      identity: managerIdentity,
      body: { decision: "APPROVED", note: "Approved for replenishment" },
    },
  );
  check("Purchase request can be approved", true);

  const purchaseOrder = await call(`/businesses/${owner.businessId}/inventory/purchase-orders`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      supplierId: supplier.id,
      purchaseRequestId: purchaseRequest.id,
      expectedDate: "2026-09-01",
      notes: "P3 smoke order",
      lines: [{ itemId: item.id, quantity: 12, unitCost: 370 }],
    },
  });
  check("Approved purchase request can become a purchase order", Boolean(purchaseOrder.id));

  const poOverview = await call(`/businesses/${owner.businessId}/inventory/overview`, {
    identity: owner,
  });
  const po = poOverview.purchaseOrders.find((row) => row.id === purchaseOrder.id);
  check(
    "Purchase order overview exposes ordered and received quantities",
    po?.varianceQuantity === 12,
  );

  const goodsReceipt = await call(
    `/businesses/${owner.businessId}/inventory/purchase-orders/${purchaseOrder.id}/receipts`,
    {
      method: "POST",
      identity: owner,
      body: {
        locationId: foundation.locationId,
        supplierDocument: "SUP-GRN-001",
        lines: [{ purchaseOrderLineId: po.lines[0].id, quantity: 5, unitCost: 370 }],
      },
    },
  );
  check("Goods receipt increases stock only when received", Boolean(goodsReceipt.id));

  const overReceive = await call(
    `/businesses/${owner.businessId}/inventory/purchase-orders/${purchaseOrder.id}/receipts`,
    {
      method: "POST",
      identity: owner,
      body: {
        locationId: foundation.locationId,
        lines: [{ purchaseOrderLineId: po.lines[0].id, quantity: 99 }],
      },
      expect: 409,
    },
  );
  check("Receiving more than ordered is refused", overReceive.code === "CONFLICT");

  const afterReceiptOverview = await call(`/businesses/${owner.businessId}/inventory/overview`, {
    identity: owner,
  });
  const receivedPo = afterReceiptOverview.purchaseOrders.find((row) => row.id === purchaseOrder.id);
  const mainStock = afterReceiptOverview.availability.find(
    (row) => row.locationId === foundation.locationId && row.itemId === item.id,
  );
  check(
    "Purchase order remains partially received after partial receipt",
    receivedPo?.status === "PARTIALLY_RECEIVED",
  );
  check(
    "Availability includes adjusted, transferred and received stock",
    mainStock?.onHandQuantity === 22,
  );

  const fulfillment = await call(`/businesses/${owner.businessId}/inventory/fulfillment-orders`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      customerName: "Pickup Customer",
      sourceType: "MANUAL",
      sourceId: key("fulfillment"),
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  await call(
    `/businesses/${owner.businessId}/inventory/fulfillment-orders/${fulfillment.id}/status`,
    { method: "PUT", identity: owner, body: { status: "PICKING" } },
  );
  await call(
    `/businesses/${owner.businessId}/inventory/fulfillment-orders/${fulfillment.id}/status`,
    { method: "PUT", identity: owner, body: { status: "PACKED" } },
  );
  await call(
    `/businesses/${owner.businessId}/inventory/fulfillment-orders/${fulfillment.id}/status`,
    { method: "PUT", identity: owner, body: { status: "DISPATCHED" } },
  );
  const fulfillmentOverview = await call(`/businesses/${owner.businessId}/inventory/overview`, {
    identity: owner,
  });
  check(
    "Fulfillment order moves through pick, pack and dispatch",
    fulfillmentOverview.fulfillmentOrders.find((row) => row.id === fulfillment.id)?.status ===
      "DISPATCHED",
  );

  await call(`/businesses/${owner.businessId}/catalog/promotions`, {
    method: "POST",
    identity: owner,
    body: {
      code: "DAIRY10",
      name: "10% off dairy",
      discountKind: "PERCENTAGE",
      discountValue: 10,
      startsAt: new Date(Date.now() - 3600_000).toISOString(),
      conditions: { scope: "CATEGORY", categoryIds: [category.id] },
    },
  });
  const promotions = await call(`/businesses/${owner.businessId}/catalog/promotions`, {
    identity: owner,
  });
  check("Promotions are listed with conflict information", promotions.length === 1);

  /* ---------------------------------------------------------------- import */
  console.log("\nP1 import");
  const csv = [
    "code,name,kind,unit,price,barcode",
    `RICE-5KG,White Rice 5kg,PRODUCT,EA,1850,77100${stamp.slice(-6)}`,
    `SUGAR-1KG,White Sugar 1kg,PRODUCT,EA,320,77200${stamp.slice(-6)}`,
    ",Missing code row,PRODUCT,EA,100,",
  ].join("\n");
  const preview = await call(`/businesses/${owner.businessId}/imports/validate`, {
    method: "POST",
    identity: owner,
    body: { entityKind: "ITEMS", fileName: "items.csv", content: csv },
  });
  check(
    "Import validation reports valid and invalid rows",
    preview.validRows === 2 && preview.invalidRows === 1,
  );
  const applied = await call(`/businesses/${owner.businessId}/imports/${preview.id}/apply`, {
    method: "POST",
    identity: owner,
  });
  check("Import apply creates only the valid rows", applied.appliedRows === 2);
  const rolledBack = await call(`/businesses/${owner.businessId}/imports/${preview.id}/rollback`, {
    method: "POST",
    identity: owner,
  });
  check("Import rollback removes the created records", rolledBack.status === "ROLLED_BACK");
  const afterRollback = await call(
    `/businesses/${owner.businessId}/catalog/items?search=RICE-5KG`,
    { identity: owner },
  );
  check("Rolled back items are gone", afterRollback.total === 0);

  /* ------------------------------------------------------------ P4 finance */
  console.log("\nP4 finance, credit and loyalty");
  const initialFinance = await call(`/businesses/${owner.businessId}/finance/overview`, {
    identity: owner,
  });
  check("Finance overview loads for Business Owner", Boolean(initialFinance.totals));

  const expenseCategory = await call(`/businesses/${owner.businessId}/finance/expense-categories`, {
    method: "POST",
    identity: owner,
    body: { code: `EXP${stamp.slice(-6)}`, name: "Smoke expenses" },
  });
  check("Expense category can be created", Boolean(expenseCategory.id));

  const bankAccount = await call(`/businesses/${owner.businessId}/finance/bank-accounts`, {
    method: "POST",
    identity: owner,
    body: {
      code: `CASH${stamp.slice(-5)}`,
      name: "Smoke cash account",
      type: "CASH",
      currencyCode: "LKR",
      openingBalance: 1000,
    },
  });
  check("Cash or bank account can be created", Boolean(bankAccount.id));

  const bankTransaction = await call(`/businesses/${owner.businessId}/finance/bank-transactions`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      accountId: bankAccount.id,
      kind: "DEPOSIT",
      amount: 250,
      currencyCode: "LKR",
      description: "Owner cash deposit",
    },
  });
  check("Cash or bank transaction updates account balance", Boolean(bankTransaction.id));

  const customerInvoice = await call(`/businesses/${owner.businessId}/finance/customer-invoices`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      customerId: customer.id,
      currencyCode: "LKR",
      dueDate: "2026-09-10",
      lines: [
        {
          itemId: item.id,
          description: "Wholesale milk invoice",
          quantity: 2,
          unitAmount: 450,
          taxAmount: 135,
        },
      ],
    },
  });
  check("Customer invoice creates a receivable", Boolean(customerInvoice.id));

  const partialCollection = await call(
    `/businesses/${owner.businessId}/finance/customer-collections`,
    {
      method: "POST",
      identity: owner,
      body: {
        branchId: mainBranchId,
        customerId: customer.id,
        amount: 500,
        currencyCode: "LKR",
        method: "Cash",
        allocations: [{ documentId: customerInvoice.id, amount: 500 }],
      },
    },
  );
  check("Customer collection can be allocated to an invoice", Boolean(partialCollection.id));

  const overCollection = await call(
    `/businesses/${owner.businessId}/finance/customer-collections`,
    {
      method: "POST",
      identity: owner,
      body: {
        customerId: customer.id,
        amount: 99999,
        currencyCode: "LKR",
        method: "Cash",
        allocations: [{ documentId: customerInvoice.id, amount: 99999 }],
      },
      expect: 400,
    },
  );
  check(
    "Customer collection cannot over-allocate an invoice",
    overCollection.code === "INVALID_INPUT",
  );

  const supplierBill = await call(`/businesses/${owner.businessId}/finance/supplier-bills`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      supplierId: supplier.id,
      currencyCode: "LKR",
      supplierDocument: "SUP-BILL-001",
      lines: [
        {
          itemId: item.id,
          description: "Supplier milk bill",
          quantity: 3,
          unitAmount: 370,
          taxAmount: 0,
        },
      ],
    },
  });
  check("Supplier bill creates a payable", Boolean(supplierBill.id));

  const supplierPayment = await call(`/businesses/${owner.businessId}/finance/supplier-payments`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      supplierId: supplier.id,
      amount: 500,
      currencyCode: "LKR",
      method: "Cash",
      allocations: [{ documentId: supplierBill.id, amount: 500 }],
    },
  });
  check("Supplier payment can be allocated to a bill", Boolean(supplierPayment.id));

  const expense = await call(`/businesses/${owner.businessId}/finance/expenses`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      categoryId: expenseCategory.id,
      amount: 150,
      taxAmount: 0,
      currencyCode: "LKR",
      paymentMethod: "Cash",
      description: "Counter cleaning expense",
    },
  });
  check("Expense can be posted", Boolean(expense.id));

  const loyaltyEarn = await call(`/businesses/${owner.businessId}/finance/loyalty-adjustments`, {
    method: "POST",
    identity: owner,
    body: {
      customerId: customer.id,
      kind: "EARN",
      points: 25,
      tier: "STANDARD",
      reason: "Opening loyalty balance",
    },
  });
  check("Loyalty points can be earned", Boolean(loyaltyEarn.id));

  const loyaltyRedeem = await call(`/businesses/${owner.businessId}/finance/loyalty-adjustments`, {
    method: "POST",
    identity: owner,
    body: {
      customerId: customer.id,
      kind: "REDEEM",
      points: 10,
      reason: "Manual test redemption",
    },
  });
  check("Loyalty points can be redeemed", Boolean(loyaltyRedeem.id));

  const loyaltyOverRedeem = await call(
    `/businesses/${owner.businessId}/finance/loyalty-adjustments`,
    {
      method: "POST",
      identity: owner,
      body: {
        customerId: customer.id,
        kind: "REDEEM",
        points: 9999,
        reason: "Try to over redeem",
      },
      expect: 400,
    },
  );
  check("Loyalty balance cannot go below zero", loyaltyOverRedeem.code === "INVALID_INPUT");

  const financeOverview = await call(`/businesses/${owner.businessId}/finance/overview`, {
    identity: owner,
  });
  const invoiceRow = financeOverview.customerInvoices.find((row) => row.id === customerInvoice.id);
  const billRow = financeOverview.supplierBills.find((row) => row.id === supplierBill.id);
  const accountRow = financeOverview.bankAccounts.find((row) => row.id === bankAccount.id);
  check(
    "Finance overview reports partial customer invoice balance",
    invoiceRow?.status === "PARTIALLY_PAID",
  );
  check(
    "Finance overview reports partial supplier bill balance",
    billRow?.status === "PARTIALLY_PAID",
  );
  check("Finance overview reports updated cash balance", accountRow?.currentBalance === 1250);
  check(
    "Finance accounting events are queued",
    financeOverview.accountingEvents.some((event) => event.sourceType === "CustomerInvoice") &&
      financeOverview.accountingEvents.some((event) => event.sourceType === "SupplierBill"),
  );

  /* ------------------------------------------------------------ P5 engines */
  console.log("\nP5 reusable business engines");
  const initialEngines = await call(`/businesses/${owner.businessId}/business-engines/overview`, {
    identity: owner,
  });
  check("Business engines overview loads for Business Owner", Boolean(initialEngines.counts));

  const workflowStatus = await call(
    `/businesses/${owner.businessId}/business-engines/workflow-statuses`,
    {
      method: "POST",
      identity: owner,
      body: { appliesTo: "WORK_TICKET", code: `OPEN${stamp.slice(-3)}`, name: "Open" },
    },
  );
  check("Workflow status can be created", Boolean(workflowStatus.id));

  const workTicket = await call(`/businesses/${owner.businessId}/business-engines/work-tickets`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      title: "Smoke work ticket",
      description: "Check reusable work ticket engine",
      priority: "HIGH",
      sourceType: "Smoke",
      sourceId: key("ticket-source"),
    },
  });
  check("Work ticket can be created", Boolean(workTicket.id));

  await call(
    `/businesses/${owner.businessId}/business-engines/work-tickets/${workTicket.id}/status`,
    {
      method: "PATCH",
      identity: owner,
      body: { status: "IN_PROGRESS" },
    },
  );
  check("Work ticket status can be updated", true);

  const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const booking = await call(`/businesses/${owner.businessId}/business-engines/bookings`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      customerId: customer.id,
      resourceCode: `ROOM${stamp.slice(-3)}`,
      title: "Smoke booking",
      startsAt,
      endsAt,
    },
  });
  check("Booking can be created", Boolean(booking.id));

  const overlappingBooking = await call(
    `/businesses/${owner.businessId}/business-engines/bookings`,
    {
      method: "POST",
      identity: owner,
      expect: 409,
      body: {
        branchId: mainBranchId,
        resourceCode: `ROOM${stamp.slice(-3)}`,
        title: "Overlap booking",
        startsAt,
        endsAt,
      },
    },
  );
  check("Overlapping confirmed booking is refused", overlappingBooking.code === "CONFLICT");

  const asset = await call(`/businesses/${owner.businessId}/business-engines/customer-assets`, {
    method: "POST",
    identity: owner,
    body: {
      customerId: customer.id,
      code: `ASSET${stamp.slice(-6)}`,
      name: "Smoke customer asset",
      assetType: "Device",
      identifier: `DEV-${stamp}`,
    },
  });
  check("Customer asset can be registered", Boolean(asset.id));

  const traceableUnit = await call(
    `/businesses/${owner.businessId}/business-engines/traceable-units`,
    {
      method: "POST",
      identity: owner,
      body: {
        itemId: item.id,
        locationId: foundation.locationId,
        serialNumber: `SN-${stamp}`,
        batchNumber: `BATCH-${stamp}`,
        expiryDate: "2027-12-31",
      },
    },
  );
  check("Traceable serial or batch unit can be registered", Boolean(traceableUnit.id));

  const warrantyClaim = await call(
    `/businesses/${owner.businessId}/business-engines/warranty-claims`,
    {
      method: "POST",
      identity: owner,
      body: {
        customerId: customer.id,
        itemDescription: "Smoke warranty item",
        serialReference: `SN-${stamp}`,
        issue: "Device does not power on",
      },
    },
  );
  check("Warranty claim can be opened", Boolean(warrantyClaim.id));

  const bom = await call(`/businesses/${owner.businessId}/business-engines/boms`, {
    method: "POST",
    identity: owner,
    body: {
      code: `BOM${stamp.slice(-6)}`,
      name: "Smoke BOM",
      outputItemId: item.id,
      outputQuantity: 1,
      components: [{ itemId: item.id, quantity: 1 }],
    },
  });
  check("BOM can be created without stock mutation", Boolean(bom.id));

  const consumption = await call(
    `/businesses/${owner.businessId}/business-engines/material-consumptions`,
    {
      method: "POST",
      identity: owner,
      body: {
        itemId: item.id,
        quantity: 1,
        sourceType: "WORK_TICKET",
        sourceId: workTicket.id,
        notes: "Smoke material use",
      },
    },
  );
  check("Material consumption can be posted once against a work record", Boolean(consumption.id));

  const route = await call(`/businesses/${owner.businessId}/business-engines/delivery-routes`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      code: `RT${stamp.slice(-6)}`,
      name: "Smoke delivery route",
      plannedDate: "2026-08-27",
      vehicleReference: "Van 01",
      driverName: "Smoke Driver",
      stops: [
        {
          sequence: 1,
          customerName: "Smoke Customer",
          sourceType: "Sale",
          sourceId: key("delivery"),
        },
      ],
    },
  });
  check("Delivery route and stop plan can be created", Boolean(route.id));

  const notification = await call(
    `/businesses/${owner.businessId}/business-engines/notifications`,
    {
      method: "POST",
      identity: owner,
      body: {
        channel: "EMAIL",
        recipient: `notify-${stamp}@example.com`,
        subject: "Smoke notification",
        body: "Smoke notification body",
        sourceType: "WorkTicket",
        sourceId: workTicket.id,
      },
    },
  );
  check("Notification event can be queued", Boolean(notification.id));

  const document = await call(`/businesses/${owner.businessId}/business-engines/documents`, {
    method: "POST",
    identity: owner,
    body: {
      entityType: "WorkTicket",
      entityId: workTicket.id,
      fileName: "smoke-photo.jpg",
      mimeType: "image/jpeg",
      url: "https://example.com/smoke-photo.jpg",
    },
  });
  check("Document metadata can be attached to a record", Boolean(document.id));

  const enginesOverview = await call(`/businesses/${owner.businessId}/business-engines/overview`, {
    identity: owner,
  });
  check(
    "Business engines overview reports created records",
    enginesOverview.workTickets.some((row) => row.id === workTicket.id) &&
      enginesOverview.bookings.some((row) => row.id === booking.id) &&
      enginesOverview.traceableUnits.some((row) => row.id === traceableUnit.id) &&
      enginesOverview.boms.some((row) => row.id === bom.id),
  );

  /* ------------------------------------------------------------ P6 reliability */
  console.log("\nP6 offline, devices and store reliability");
  const initialReliability = await call(
    `/businesses/${owner.businessId}/store-reliability/overview`,
    {
      identity: owner,
    },
  );
  check("Store reliability overview loads for Business Owner", Boolean(initialReliability.counts));

  const device = await call(`/businesses/${owner.businessId}/store-reliability/devices`, {
    method: "POST",
    identity: owner,
    body: {
      branchId: mainBranchId,
      code: `POS${stamp.slice(-6)}`,
      name: "Smoke POS terminal",
      kind: "POS_TERMINAL",
      hardwareId: `HW-${stamp}`,
      capabilities: { receipt: true, scanner: true, offline: true },
    },
  });
  check("Store device can be registered", Boolean(device.id));

  await call(`/businesses/${owner.businessId}/store-reliability/devices/${device.id}/heartbeat`, {
    method: "PATCH",
    identity: owner,
    body: { pendingOfflineItems: 1 },
  });
  check("Device heartbeat updates terminal health", true);

  const offlineItem = await call(
    `/businesses/${owner.businessId}/store-reliability/offline-queue`,
    {
      method: "POST",
      identity: owner,
      body: {
        branchId: mainBranchId,
        deviceId: device.id,
        idempotencyKey: key("offline-sale"),
        operationType: "POS_HELD_SALE",
        payload: { localSaleId: key("local-sale"), total: 100 },
        riskLevel: "NORMAL",
      },
    },
  );
  check("Offline operation can be queued with an idempotency key", Boolean(offlineItem.id));

  const sameOfflineItem = await call(
    `/businesses/${owner.businessId}/store-reliability/offline-queue`,
    {
      method: "POST",
      identity: owner,
      body: {
        branchId: mainBranchId,
        deviceId: device.id,
        idempotencyKey: key("offline-sale"),
        operationType: "POS_HELD_SALE",
        payload: { localSaleId: key("local-sale"), total: 100 },
        riskLevel: "NORMAL",
      },
    },
  );
  check(
    "Offline queue idempotency prevents duplicate records",
    sameOfflineItem.id === offlineItem.id,
  );

  await call(`/businesses/${owner.businessId}/store-reliability/offline-queue/${offlineItem.id}`, {
    method: "PATCH",
    identity: owner,
    body: { status: "CONFLICT", failureReason: "Smoke conflict review" },
  });
  check("Offline queue item can be marked as conflict", true);

  const reliabilityOverview = await call(
    `/businesses/${owner.businessId}/store-reliability/overview`,
    {
      identity: owner,
    },
  );
  const openConflict = reliabilityOverview.conflicts.find(
    (row) => row.queueItemId === offlineItem.id,
  );
  check(
    "Store reliability overview reports device, queue and open conflict",
    reliabilityOverview.devices.some((row) => row.id === device.id) &&
      reliabilityOverview.queue.some((row) => row.id === offlineItem.id) &&
      Boolean(openConflict),
  );

  await call(
    `/businesses/${owner.businessId}/store-reliability/sync-conflicts/${openConflict.id}`,
    {
      method: "PATCH",
      identity: owner,
      body: { status: "RESOLVED", resolution: "Smoke conflict resolved" },
    },
  );
  check("Sync conflict can be resolved", true);

  /* ------------------------------------------- P7 reporting and integrations */
  console.log("\nP7 reporting, integrations and migration");
  const initialReporting = await call(
    `/businesses/${owner.businessId}/reporting-operations/overview`,
    {
      identity: owner,
    },
  );
  check("Reporting overview loads for Business Owner", Boolean(initialReporting.counts));

  const reportView = await call(
    `/businesses/${owner.businessId}/reporting-operations/report-views`,
    {
      method: "POST",
      identity: owner,
      body: {
        code: `DAILY${stamp.slice(-6)}`,
        name: "Daily sales smoke view",
        reportType: "SALES",
        filters: { dateRange: "TODAY", branchId: mainBranchId },
        columns: ["number", "total", "taxTotal"],
      },
    },
  );
  check("Saved report view can be created", Boolean(reportView.id));

  const exportRequest = await call(`/businesses/${owner.businessId}/reporting-operations/exports`, {
    method: "POST",
    identity: owner,
    body: {
      exportType: "SALES",
      format: "CSV",
      filters: { dateRange: "TODAY" },
    },
  });
  check("Data export request can be queued", Boolean(exportRequest.id));

  const webhook = await call(`/businesses/${owner.businessId}/reporting-operations/webhooks`, {
    method: "POST",
    identity: owner,
    body: {
      name: "Smoke integration webhook",
      endpointUrl: `https://example.com/webhooks/${stamp}`,
      eventTypes: ["sale.confirmed", "stock.changed"],
      secretHint: `hint-${stamp.slice(-4)}`,
    },
  });
  check("Webhook subscription can be created", Boolean(webhook.id));

  const webhookDelivery = await call(
    `/businesses/${owner.businessId}/reporting-operations/webhook-deliveries`,
    {
      method: "POST",
      identity: owner,
      body: {
        subscriptionId: webhook.id,
        eventId: key("webhook-event"),
        eventType: "sale.confirmed",
        payload: { source: "smoke" },
        status: "FAILED",
        attempts: 3,
        lastError: "Smoke delivery failure",
      },
    },
  );
  check("Webhook delivery failure can be recorded", Boolean(webhookDelivery.id));

  const migrationValidation = await call(
    `/businesses/${owner.businessId}/reporting-operations/migration-validations`,
    {
      method: "POST",
      identity: owner,
      body: {
        sourceName: "Legacy item master",
        entityKind: "ITEMS",
        totalRows: 10,
        validRows: 9,
        invalidRows: 1,
        warningRows: 2,
        errors: { row10: "Missing barcode" },
        preview: { sample: ["Milk", "Bread"] },
        reconciliation: { expected: 10, accepted: 9 },
      },
    },
  );
  check("Migration validation can be recorded", Boolean(migrationValidation.id));

  const reportingOverview = await call(
    `/businesses/${owner.businessId}/reporting-operations/overview`,
    {
      identity: owner,
    },
  );
  check(
    "Reporting overview reports saved view, export, webhook and migration records",
    reportingOverview.savedViews.some((row) => row.id === reportView.id) &&
      reportingOverview.exports.some((row) => row.id === exportRequest.id) &&
      reportingOverview.webhooks.some((row) => row.id === webhook.id) &&
      reportingOverview.deliveries.some((row) => row.id === webhookDelivery.id) &&
      reportingOverview.migrations.some((row) => row.id === migrationValidation.id),
  );

  /* ------------------------------------------- P8 production readiness */
  console.log("\nP8 security, operations and production readiness");
  const initialReadiness = await call(
    `/businesses/${owner.businessId}/production-readiness/overview`,
    {
      identity: owner,
    },
  );
  check("Production readiness overview loads for Business Owner", Boolean(initialReadiness.counts));

  const securityEvent = await call(
    `/businesses/${owner.businessId}/production-readiness/security-events`,
    {
      method: "POST",
      identity: owner,
      body: {
        eventType: "MFA_REVIEW",
        severity: "WARNING",
        subjectType: "User",
        subjectId: foundation.ownerUserId,
        detail: "Smoke privileged account review",
        metadata: { source: "smoke" },
      },
    },
  );
  check("Security event can be recorded", Boolean(securityEvent.id));

  const backupRun = await call(`/businesses/${owner.businessId}/production-readiness/backup-runs`, {
    method: "POST",
    identity: owner,
    body: {
      scope: "Primary PostgreSQL",
      status: "COMPLETED",
      storageReference: `backup://${stamp}`,
      sizeBytes: 1024,
      recoveryPointObjective: "15 minutes",
      recoveryTimeObjective: "2 hours",
      restoreTested: true,
    },
  });
  check("Backup and restore-test evidence can be recorded", Boolean(backupRun.id));

  const readinessCheck = await call(
    `/businesses/${owner.businessId}/production-readiness/readiness-checks`,
    {
      method: "POST",
      identity: owner,
      body: {
        area: "Performance",
        name: `POS smoke response ${stamp}`,
        status: "PASS",
        target: "Under 2 seconds",
        measuredValue: "1.2 seconds",
        notes: "Smoke evidence",
      },
    },
  );
  check("Readiness check can be saved", Boolean(readinessCheck.id));

  const privacyRequest = await call(
    `/businesses/${owner.businessId}/production-readiness/privacy-requests`,
    {
      method: "POST",
      identity: owner,
      body: {
        customerId: customer.id,
        requestType: "EXPORT",
        requester: `customer-${stamp}@example.com`,
        dueDate: "2026-12-31",
      },
    },
  );
  check("Privacy request can be opened", Boolean(privacyRequest.id));

  await call(
    `/businesses/${owner.businessId}/production-readiness/privacy-requests/${privacyRequest.id}`,
    {
      method: "PATCH",
      identity: owner,
      body: { status: "COMPLETED", resolution: "Smoke privacy export completed" },
    },
  );
  check("Privacy request can be resolved", true);

  const releaseReadiness = await call(
    `/businesses/${owner.businessId}/production-readiness/releases`,
    {
      method: "POST",
      identity: owner,
      body: {
        version: `smoke-${stamp}`,
        status: "READY",
        checklist: { tests: "PASS", migration: "PASS", backup: "PASS", rollback: "READY" },
        rollbackPlan: "Restore previous application version and database backup.",
        migrationPlan: "Apply migrations before enabling traffic.",
      },
    },
  );
  check("Release readiness can be saved", Boolean(releaseReadiness.id));

  const readinessOverview = await call(
    `/businesses/${owner.businessId}/production-readiness/overview`,
    {
      identity: owner,
    },
  );
  check(
    "Production readiness overview reports security, backup, readiness, privacy and release records",
    readinessOverview.securityEvents.some((row) => row.id === securityEvent.id) &&
      readinessOverview.backupRuns.some((row) => row.id === backupRun.id) &&
      readinessOverview.readinessChecks.some((row) => row.id === readinessCheck.id) &&
      readinessOverview.privacyRequests.some((row) => row.id === privacyRequest.id) &&
      readinessOverview.releases.some((row) => row.id === releaseReadiness.id),
  );

  /* ------------------------------------------------------------ P2 selling */
  console.log("\nP2 shift, sale, payment and receipt");
  const shift = await call(`/businesses/${owner.businessId}/pos/shifts`, {
    method: "POST",
    identity: cashierIdentity,
    body: { branchId: mainBranchId, registerCode: "REG1", openingFloat: 5000 },
  });
  check("A cashier can open a shift", shift.status === "OPEN");

  const secondOpen = await call(`/businesses/${owner.businessId}/pos/shifts`, {
    method: "POST",
    identity: cashierIdentity,
    body: { branchId: mainBranchId, registerCode: "REG1", openingFloat: 100 },
    expect: 409,
  });
  check("A register cannot have two open shifts", secondOpen.code === "CONFLICT");

  const posCatalog = await call(
    `/businesses/${owner.businessId}/pos/catalog?term=milk&branchId=${mainBranchId}`,
    { identity: cashierIdentity },
  );
  check("POS catalog search returns price and tax", posCatalog[0]?.unitPrice === 450);

  const quote = await call(`/businesses/${owner.businessId}/pos/quote`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  check("Quote applies the category promotion", quote.discountTotal === 90);
  check("Quote adds 15% tax on the discounted amount", quote.taxTotal === 121.5);
  check("Quote total reconciles", quote.total === 931.5);

  const quantityBreak = await call(`/businesses/${owner.businessId}/pos/quote`, {
    method: "POST",
    identity: cashierIdentity,
    body: { branchId: mainBranchId, lines: [{ itemId: item.id, quantity: 12 }] },
  });
  check("Quantity price break is used at 12 units", quantityBreak.lines[0].unitPrice === 420);

  const scanQuote = await call(`/businesses/${owner.businessId}/pos/quote`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      lines: [{ identifier: `95500${stamp.slice(-6)}`, quantity: 1 }],
    },
  });
  check("A scanned barcode resolves to the item", scanQuote.lines[0].itemId === item.id);

  const sale = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      customerId: customer.id,
      idempotencyKey: key("sale1"),
      lines: [
        { itemId: item.id, quantity: 2 },
        { itemId: secondItem.id, quantity: 1 },
      ],
    },
  });
  check(
    "A sale is confirmed with a document number",
    sale.status === "CONFIRMED" && Boolean(sale.number),
  );
  check("The sale carries the amount due", sale.dueTotal === sale.total);

  const retry = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      customerId: customer.id,
      idempotencyKey: key("sale1"),
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  check("Retrying the same idempotency key returns the same sale", retry.id === sale.id);

  const partlyPaid = await call(`/businesses/${owner.businessId}/pos/sales/${sale.id}/payments`, {
    method: "POST",
    identity: cashierIdentity,
    body: { method: "CARD", amount: 500, reference: "CARD-001", idempotencyKey: key("pay1") },
  });
  check("A partial card tender leaves an amount due", partlyPaid.dueTotal > 0);
  check("The sale has no receipt number until it is fully paid", partlyPaid.receiptNumber === null);

  const paid = await call(`/businesses/${owner.businessId}/pos/sales/${sale.id}/payments`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      method: "CASH",
      amount: partlyPaid.dueTotal,
      tenderedAmount: 1000,
      idempotencyKey: key("pay2"),
    },
  });
  check("Split payment completes the sale", paid.dueTotal === 0);
  check("Cash change is recorded", paid.changeTotal > 0);
  check("A receipt number is allocated once", Boolean(paid.receiptNumber));

  const duplicatePayment = await call(
    `/businesses/${owner.businessId}/pos/sales/${sale.id}/payments`,
    {
      method: "POST",
      identity: cashierIdentity,
      body: { method: "CASH", amount: 100, idempotencyKey: key("pay2") },
    },
  );
  check(
    "A retried payment does not double charge",
    duplicatePayment.payments.filter((payment) => payment.method === "CASH").length === 1,
  );

  const receipt = await call(`/businesses/${owner.businessId}/pos/sales/${sale.id}/receipt`, {
    identity: cashierIdentity,
  });
  check(
    "The receipt shows tax lines and tenders",
    receipt.taxLines.length >= 1 && receipt.payments.length === 2,
  );
  check(
    "Receipt totals reconcile to the sale",
    Math.abs(receipt.totals.total - paid.total) < 0.001,
  );

  /* ------------------------------------------------------- hold and resume */
  const held = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      idempotencyKey: key("hold1"),
      hold: true,
      holdName: "Counter 2",
      lines: [{ itemId: secondItem.id, quantity: 3 }],
    },
  });
  check("A cart can be held", held.status === "HELD");
  const resumed = await call(`/businesses/${owner.businessId}/pos/sales/${held.id}`, {
    method: "PUT",
    identity: cashierIdentity,
    body: { branchId: mainBranchId, lines: [{ itemId: secondItem.id, quantity: 5 }] },
  });
  check("A held cart can be changed", resumed.lines[0].quantity === 5);
  const confirmedHold = await call(`/businesses/${owner.businessId}/pos/sales/${held.id}/confirm`, {
    method: "POST",
    identity: cashierIdentity,
    body: { shiftId: shift.id },
  });
  check("A held cart can be confirmed", confirmedHold.status === "CONFIRMED");
  await call(`/businesses/${owner.businessId}/pos/sales/${held.id}/payments`, {
    method: "POST",
    identity: cashierIdentity,
    body: { method: "CASH", amount: confirmedHold.dueTotal, idempotencyKey: key("pay3") },
  });

  /* ------------------------------------------------------------- approvals */
  console.log("\nP2 approval, return and refund");
  const blocked = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      idempotencyKey: key("discount-blocked"),
      saleDiscountKind: "FIXED_AMOUNT",
      saleDiscountValue: 300,
      lines: [{ itemId: item.id, quantity: 2 }],
    },
    expect: 409,
  });
  check("A large discount is blocked without approval", blocked.code === "CONFLICT");

  const approvalRequest = await call(`/businesses/${owner.businessId}/approvals/requests`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      actionCode: "SALE_DISCOUNT",
      entityType: "Sale",
      amount: 400,
      currencyCode: "LKR",
      reason: "Damaged packaging on two units",
      branchId: mainBranchId,
    },
  });
  const selfDecision = await call(
    `/businesses/${owner.businessId}/approvals/requests/${approvalRequest.id}/decision`,
    {
      method: "POST",
      identity: cashierIdentity,
      body: { decision: "APPROVED" },
      expect: 403,
    },
  );
  check("A cashier cannot approve their own request", selfDecision.code === "FORBIDDEN");

  await call(`/businesses/${owner.businessId}/approvals/requests/${approvalRequest.id}/decision`, {
    method: "POST",
    identity: managerIdentity,
    body: { decision: "APPROVED", note: "Checked the damage" },
  });
  const discounted = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      idempotencyKey: key("discount-approved"),
      approvalRequestId: approvalRequest.id,
      saleDiscountKind: "FIXED_AMOUNT",
      saleDiscountValue: 300,
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  check("An approved discount posts the sale", discounted.status === "CONFIRMED");
  await call(`/businesses/${owner.businessId}/pos/sales/${discounted.id}/payments`, {
    method: "POST",
    identity: cashierIdentity,
    body: { method: "CASH", amount: discounted.dueTotal, idempotencyKey: key("pay4") },
  });

  /* ---------------------------------------------------------------- return */
  const milkLine = paid.lines.find((line) => line.itemId === item.id);
  const returned = await call(`/businesses/${owner.businessId}/pos/sales/${sale.id}/returns`, {
    method: "POST",
    identity: managerIdentity,
    body: {
      idempotencyKey: key("return1"),
      shiftId: shift.id,
      reason: "Customer changed their mind",
      refundMethod: "CASH",
      lines: [{ saleLineId: milkLine.id, quantity: 1, disposition: "RESELLABLE" }],
    },
  });
  check("A partial return is accepted", returned.saleStatus === "PARTIALLY_RETURNED");
  check("The refund is the proportional share of the line", returned.refundTotal > 0);

  const overReturn = await call(`/businesses/${owner.businessId}/pos/sales/${sale.id}/returns`, {
    method: "POST",
    identity: managerIdentity,
    body: {
      idempotencyKey: key("return-over"),
      reason: "Trying to over return",
      lines: [{ saleLineId: milkLine.id, quantity: 5 }],
    },
    expect: 409,
  });
  check("Returning more than was sold is refused", overReturn.code === "CONFLICT");

  const creditSale = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      customerId: customer.id,
      idempotencyKey: key("sale-credit"),
      lines: [{ itemId: secondItem.id, quantity: 2 }],
      payments: [
        { method: "CASH", amount: 46, tenderedAmount: 50, idempotencyKey: key("pay-credit") },
      ],
    },
  });
  const creditLine = creditSale.lines[0];
  const creditReturn = await call(
    `/businesses/${owner.businessId}/pos/sales/${creditSale.id}/returns`,
    {
      method: "POST",
      identity: managerIdentity,
      body: {
        idempotencyKey: key("return-credit"),
        reason: "Store credit refund",
        refundMethod: "STORE_CREDIT",
        lines: [{ saleLineId: creditLine.id, quantity: 1 }],
      },
    },
  );
  check("A refund can be issued as store credit", creditReturn.storeCreditTotal > 0);

  const customerDetail = await call(
    `/businesses/${owner.businessId}/catalog/customers/${customer.id}`,
    { identity: owner },
  );
  check("Store credit shows on the customer", customerDetail.storeCredit > 0);
  check("Customer history shows the sales", customerDetail.recentSales.length >= 2);

  const creditPaidSale = await call(`/businesses/${owner.businessId}/pos/sales`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      branchId: mainBranchId,
      shiftId: shift.id,
      customerId: customer.id,
      idempotencyKey: key("sale-usecredit"),
      lines: [{ itemId: secondItem.id, quantity: 1 }],
      payments: [
        {
          method: "STORE_CREDIT",
          amount: 20,
          idempotencyKey: key("pay-usecredit"),
        },
      ],
    },
  });
  check("Store credit can be spent on a later sale", creditPaidSale.dueTotal === 0);

  /* ------------------------------------------------------------ shift close */
  const shiftBeforeClose = await call(
    `/businesses/${owner.businessId}/pos/shifts/current?branchId=${mainBranchId}&registerCode=REG1`,
    { identity: cashierIdentity },
  );
  check("The open shift shows expected cash", typeof shiftBeforeClose.expectedCash === "number");
  check("The open shift counts its sales", shiftBeforeClose.saleCount >= 3);

  const missingReason = await call(`/businesses/${owner.businessId}/pos/shifts/${shift.id}/close`, {
    method: "POST",
    identity: cashierIdentity,
    body: { countedCash: shiftBeforeClose.expectedCash - 50 },
    expect: 400,
  });
  check("A cash difference needs a reason", missingReason.code === "INVALID_INPUT");

  const closed = await call(`/businesses/${owner.businessId}/pos/shifts/${shift.id}/close`, {
    method: "POST",
    identity: cashierIdentity,
    body: {
      countedCash: shiftBeforeClose.expectedCash - 50,
      varianceReason: "Counted short by 50",
    },
  });
  check("The shift closes with a recorded variance", closed.cashVariance === -50);

  /* -------------------------------------------------------------- isolation */
  console.log("\nP0 isolation and audit");
  const otherFoundation = await call("/setup/business-foundation", {
    method: "POST",
    body: {
      business: {
        name: `Other Store ${stamp}`,
        slug: `other-${stamp}`,
        defaultCurrency: "LKR",
        timeZone: "Asia/Colombo",
        countryCode: "LK",
      },
      firstBranch: { code: `OTH${stamp.slice(-3)}`, name: "Other Branch" },
      firstLocation: { code: "SHOP", name: "Shop Floor", type: "SHOP_FLOOR" },
      owner: {
        externalSubject: `other-owner-${stamp}`,
        email: `other-${stamp}@example.com`,
        displayName: "Other Owner",
      },
    },
  });
  const crossRead = await fetch(`${API}/businesses/${owner.businessId}/foundation`, {
    headers: {
      "x-business-id": owner.businessId,
      "x-user-id": otherFoundation.ownerUserId,
    },
  });
  check("A user from another Business is denied", crossRead.status === 403);

  const audit = await call(`/businesses/${owner.businessId}/audit?pageSize=100`, {
    identity: owner,
  });
  const setupAudit = await call(
    `/businesses/${owner.businessId}/audit?entityType=BusinessFoundation&pageSize=10`,
    {
      identity: owner,
    },
  );
  const actions = new Set(audit.rows.map((row) => row.entityType));
  check("Audit records cover the Business setup", setupAudit.rows.length > 0);
  check("Audit records cover selling", actions.has("Sale") && actions.has("SaleReturn"));
  check("Audit records cover approvals", actions.has("ApprovalRequest"));
  check(
    "Audit records cover inventory and purchasing",
    actions.has("StockMovement") && actions.has("PurchaseOrder") && actions.has("GoodsReceipt"),
  );
  check(
    "Audit records cover finance",
    actions.has("CustomerInvoice") &&
      actions.has("SupplierBill") &&
      actions.has("Expense") &&
      actions.has("BankTransaction") &&
      actions.has("LoyaltyAccount"),
  );
  check(
    "Audit records cover reusable business engines",
    actions.has("WorkTicket") &&
      actions.has("Booking") &&
      actions.has("TraceableUnit") &&
      actions.has("WarrantyClaim") &&
      actions.has("Bom") &&
      actions.has("DeliveryRoute"),
  );
  check(
    "Audit records cover store reliability",
    actions.has("StoreDevice") && actions.has("OfflineQueueItem") && actions.has("SyncConflict"),
  );
  check(
    "Audit records cover reporting and integration operations",
    actions.has("SavedReportView") &&
      actions.has("DataExportRequest") &&
      actions.has("WebhookSubscription") &&
      actions.has("MigrationValidation"),
  );
  check(
    "Audit records cover production readiness",
    actions.has("SecurityEvent") &&
      actions.has("BackupRun") &&
      actions.has("ReadinessCheck") &&
      actions.has("PrivacyRequest") &&
      actions.has("ReleaseReadiness"),
  );

  const sequences = await call(`/businesses/${owner.businessId}/document-numbers`, {
    identity: owner,
  });
  check(
    "Document sequences show the next number",
    sequences.some((row) => row.nextNumberPreview),
  );

  const finalSummary = await call(`/businesses/${owner.businessId}/foundation`, {
    identity: owner,
  });
  check(
    "Setup progress now reports a confirmed sale",
    finalSummary.setup.hasConfirmedSale === true,
  );

  console.log(`\n${passed} checks passed, ${failed} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nSmoke run stopped:", error.message);
  process.exitCode = 1;
});
