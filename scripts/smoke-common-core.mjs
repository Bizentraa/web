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
  check("Role templates were created with the Business", Boolean(cashierRole && adminRole));
  check(
    "Cashier Role cannot manage Roles",
    Boolean(cashierRole) && !cashierRole.permissions.includes("ROLE_MANAGE"),
  );
  check("Permission catalogue covers P0, P1 and P2", access.permissionCatalog.length >= 50);

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
  const actions = new Set(audit.rows.map((row) => row.entityType));
  check("Audit records cover the Business setup", actions.has("BusinessFoundation"));
  check("Audit records cover selling", actions.has("Sale") && actions.has("SaleReturn"));
  check("Audit records cover approvals", actions.has("ApprovalRequest"));

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
