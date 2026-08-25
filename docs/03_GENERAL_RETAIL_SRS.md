# General Retail — Business-Specific SRS & User Stories

**File:** `03_GENERAL_RETAIL_SRS.md`  
**Business type:** General Retail / Specialty Retail  
**Depends on:** `01_COMMON_CORE_SRS.md`  
**Development order:** After Common Core and after validating the first Grocery/Supermarket business pack  
**Purpose:** Define only the additional requirements needed for a normal retail shop while reusing the same Common Core for users, customers, products, sales, payments, stock, purchasing, finance, reporting, devices, security, and integrations.

---

## 1. Business Type Overview

General Retail represents businesses that mainly sell physical products through a counter, cashier, salesperson, online order, or pickup/delivery flow.

Examples include:

- gift shops;
- toy shops;
- stationery stores;
- book shops;
- cosmetics stores;
- sports shops;
- homeware stores;
- small department stores;
- pet-product stores;
- lifestyle stores;
- specialty retail shops;
- multi-branch retail chains.

General Retail should become the **base retail business pack** for later specialized business types such as Fashion, Electronics, Cosmetics, Bookstore, Jewelry, Furniture, and Auto Parts.

### 1.1 Main design rule

Do not create a new retail-only version of the following shared systems:

- Business / Branch management;
- User / Role / Permission management;
- Customer management;
- Supplier management;
- Item / Product catalog;
- Variant engine;
- Price / Promotion engine;
- POS / Sales engine;
- Payment engine;
- Inventory ledger;
- Purchasing engine;
- Finance / Receivable / Payable engine;
- Loyalty / Store Credit engine;
- Reporting engine;
- Audit engine;
- Offline / Device engine;
- Integration / API engine.

General Retail only adds retail-specific workflows, screens, rules, terminology, and operational reports on top of the Common Core.

---

## 2. Business Roles

| Role | Main Responsibility |
|---|---|
| Business Owner | Views overall business performance, configures plans, branches, major policies, and approvals. |
| Business Administrator | Manages Branches, users, roles, settings, tax, payment methods, devices, and feature access. |
| Store Manager | Runs a Branch, approves sensitive transactions, monitors stock, cash, staff, and daily results. |
| Cashier | Performs fast checkout, receives allowed payments, prints receipts, and handles permitted returns/exchanges. |
| Sales Associate | Assists customers, checks stock, creates quotations/orders, attaches customers, and prepares sales. |
| Inventory User | Receives, counts, transfers, adjusts, labels, and monitors stock. |
| Purchasing User | Creates purchase requests/orders, monitors suppliers, and follows receiving. |
| Finance User | Reviews invoices, payments, receivables, payables, expenses, settlements, and reconciliations. |
| Customer Service User | Handles returns, exchanges, loyalty, store credit, customer history, and complaints. |
| Auditor / Read-only User | Reviews sales, stock, finance, permissions, and audit history without changing records. |

---

## 3. Common Core Capabilities Reused

General Retail shall directly reuse these Common Core capabilities:

### 3.1 Platform

- Business account;
- Branches and Locations;
- users and roles;
- permissions and approvals;
- feature access;
- audit history;
- document numbering;
- subscription and business-plan controls.

### 3.2 Catalog

- Item;
- category;
- brand;
- variant;
- attributes;
- barcode / SKU / QR;
- unit of measure;
- price list;
- promotions;
- tax;
- bundles / kits.

### 3.3 Commerce

- POS;
- quotation;
- sales order;
- payment;
- partial / split payment;
- return;
- refund;
- exchange;
- receipt / invoice.

### 3.4 Operations

- inventory ledger;
- stock Location;
- stock reservation;
- receiving;
- stock transfer;
- stock count;
- stock adjustment;
- reorder / replenishment;
- purchasing;
- picking / packing / dispatch.

### 3.5 Finance and Customer

- customer profile;
- loyalty;
- gift card / store credit;
- customer credit if enabled;
- receivables;
- payables;
- expenses;
- cash / bank;
- settlement;
- reports.

### 3.6 Reliability

- POS terminal management;
- barcode scanner;
- receipt printer;
- label printer;
- cash drawer;
- offline transaction queue;
- safe synchronization;
- audit and monitoring.

---

## 4. General Retail Business-Specific Feature Scope

The General Retail business pack shall add or emphasize the following features.

### 4.1 Retail Checkout

- barcode-first item entry;
- quick item search;
- favorite / quick-select products;
- fast quantity update;
- customer attachment;
- promotion visibility;
- retail discount workflow;
- hold / resume sale;
- multi-payment checkout;
- print / digital receipt;
- cashier shift control.

### 4.2 Retail Product Handling

- product variants;
- multiple barcodes;
- retail labels;
- shelf / selling price;
- retail category navigation;
- product images;
- simple bundles;
- discontinued / inactive product handling.

### 4.3 Retail Stock Operations

- stock by Branch;
- stock by Location;
- stock transfer between Branches;
- shop-floor replenishment;
- barcode stock count;
- damaged stock;
- return stock;
- shrinkage / variance;
- reorder suggestions;
- fast / slow / dead stock.

### 4.4 Retail Customer Operations

- loyalty;
- customer groups;
- member prices;
- purchase history;
- return / exchange history;
- store credit;
- gift card;
- customer-specific notes;
- marketing consent / communication preferences.

### 4.5 Retail Fulfillment

- reserve stock for an order;
- prepare pickup order;
- click and collect;
- delivery preparation where enabled;
- pickup confirmation;
- cancellation and stock release;
- cross-channel return support as an advanced feature.

---

# 5. Development Phase Plan

General Retail shall be implemented in the following sequence.

| Phase | Name | Goal | Main Common Core Dependency |
|---|---|---|---|
| R0 | Retail Business Setup | Prepare store structure, terminals, users, permissions, retail settings, and Locations. | Common P0 |
| R1 | Retail Catalog, Variants, Labels & Pricing | Configure sellable products, categories, variants, barcodes, labels, prices, promotions, and tax. | Common P1 |
| R2 | Fast POS, Payments, Returns & Exchanges | Deliver complete retail checkout and customer-facing sales operations. | Common P2 |
| R3 | Retail Inventory, Purchasing & Replenishment | Deliver receiving, counts, transfers, reorder, purchase, and shelf/back-store stock operations. | Common P3 |
| R4 | Retail Customer, Loyalty, Credit & Finance | Add loyalty, gift/store credit, customer balance, expenses, reconciliation, and management approvals. | Common P4 |
| R5 | Retail Fulfillment & Omnichannel Readiness | Add reservations, pickup, dispatch, order preparation, and channel-ready order handling. | Common P3 + P5 |
| R6 | Retail Reporting, Loss Control & Management | Add retail-specific reports, shrinkage, promotion, margin, staff, and branch dashboards. | Common P4 + P7 |
| R7 | Offline, Devices, Migration & Production Go-Live | Validate hardware, offline transactions, opening data, performance, monitoring, and production reconciliation. | Common P6-P8 |

---

# 6. Phase R0 — Retail Business Setup

## 6.1 Objective

Prepare the Retail Branch so later sales and stock transactions use the correct store, terminal, Location, user, role, and business rule.

## 6.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-001 | Retail Branch | The system shall allow a Branch to be configured as a retail store/outlet. |
| RETL-FR-002 | Locations | A retail Branch shall support Locations such as Shop Floor, Back Store, Main Store Room, Returns, Damaged, and Dispatch. |
| RETL-FR-003 | Terminal | Each POS terminal shall belong to one active Branch and have a unique terminal identity. |
| RETL-FR-004 | Cashier | A cashier shall be assigned to the Branch/terminal according to permission rules. |
| RETL-FR-005 | Retail Settings | The Branch shall configure default receipt format, tax behavior, payment methods, return rules, and price rules. |
| RETL-FR-006 | Manager Approval | The Branch shall configure approval thresholds for discount, void, refund, price override, cash drawer, and stock adjustment. |
| RETL-FR-007 | Business Hours | The Branch shall store configured business hours for reporting and operational use. |
| RETL-FR-008 | Receipt Header | Receipt details shall be configurable using Business and Branch information. |
| RETL-FR-009 | Cash Shift | The Branch shall define whether cashier shifts require opening float and closing reconciliation. |
| RETL-FR-010 | Feature Access | Retail features such as loyalty, gift card, credit sales, delivery, or click-and-collect shall be enabled through common feature controls. |

## 6.3 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-001 | Business Administrator | As a Business Administrator, I want to create a retail Branch so that sales and stock belong to the correct outlet. | The Branch can be selected by authorized users and has its own Locations and settings. |
| RETL-US-002 | Store Manager | As a Store Manager, I want discount and refund approval limits so that sensitive retail transactions are controlled. | A transaction above the cashier's allowed limit requests an authorized approval and records both users. |
| RETL-US-003 | Business Administrator | As an administrator, I want to register POS terminals so that every sale can be traced to the correct terminal. | Each terminal has one unique ID, active Branch, status, and audit history. |

## 6.4 Phase Exit Criteria

R0 is complete when:

- Branch and Locations are configured;
- users and roles are assigned;
- terminals are registered;
- retail settings are active;
- manager approval rules work;
- audit history is verified.

---

# 7. Phase R1 — Retail Catalog, Variants, Labels & Pricing

## 7.1 Objective

Create a reusable retail catalog that later specialty-retail business packs can extend.

## 7.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-011 | Product | A retail Item shall use the Common Core Item model and shall not use a separate retail product table. |
| RETL-FR-012 | Category | Retail Items shall support hierarchical categories for POS browsing and reporting. |
| RETL-FR-013 | Brand | Retail Items shall support brand/manufacturer information. |
| RETL-FR-014 | Variant | Retail products may use shared variants such as size, colour, style, storage, or pack. |
| RETL-FR-015 | Variant Identity | Each sellable Variant may have its own SKU, barcode, price, cost, image, and stock. |
| RETL-FR-016 | Multiple Barcode | One Item/Variant may have multiple active barcodes according to Common Core rules. |
| RETL-FR-017 | Barcode Duplicate | The system shall prevent unsafe duplicate active retail barcodes unless an explicit supported rule exists. |
| RETL-FR-018 | Label | Authorized users shall print barcode and price labels from Item/Variant data. |
| RETL-FR-019 | Price | Retail price shall use the shared pricing engine. |
| RETL-FR-020 | Customer Price | Member/customer-group prices shall use shared customer price lists. |
| RETL-FR-021 | Quantity Price | Quantity-based pricing shall be supported when configured. |
| RETL-FR-022 | Promotion | Retail promotions shall use the shared promotion engine. |
| RETL-FR-023 | Promotion Conflict | When multiple promotions are eligible, the configured stacking/priority/best-price rule shall determine the result. |
| RETL-FR-024 | Effective Date | Price and promotion rules shall support start/end date and time. |
| RETL-FR-025 | Tax | Retail sale tax shall use the common tax engine and remain reproducible on historical receipts. |
| RETL-FR-026 | Bundle | A retail bundle shall use the common bundle/kit capability instead of a separate sales engine. |
| RETL-FR-027 | Product Status | Items/Variants shall support active, inactive, discontinued, or not-for-sale status. |
| RETL-FR-028 | Product Search | POS/admin search shall support name, SKU, barcode, category, brand, and configured attributes. |
| RETL-FR-029 | Bulk Import | Retail catalog import shall use the common validated import process. |
| RETL-FR-030 | Product Image | Retail Item/Variant may store display images without making images part of stock identity. |

## 7.3 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-004 | Inventory User | As an Inventory User, I want to create a product with barcode and price so that the cashier can sell it immediately after approval. | Active item appears at the allowed Branch and barcode resolves to the correct Item/Variant. |
| RETL-US-005 | Store Manager | As a Store Manager, I want to schedule a promotion so that cashiers do not calculate discounts manually. | Eligible sales automatically receive the correct configured promotion during the active period. |
| RETL-US-006 | Inventory User | As an Inventory User, I want to print price/barcode labels so that shelf/product labeling matches the catalog. | Label uses the selected Item/Variant barcode and current intended retail price. |
| RETL-US-007 | Sales Associate | As a Sales Associate, I want to search by name, barcode, brand, or category so that I can find products quickly. | Search returns only authorized/active results and exact barcode lookup resolves quickly. |

## 7.4 Important Exceptions

- duplicate barcode;
- inactive product scanned at POS;
- expired promotion;
- two promotions conflict;
- customer-specific price is lower/higher than general promotion;
- product exists but is not available in current Branch;
- variant exists without barcode;
- imported item has invalid tax or category.

---

# 8. Phase R2 — Fast POS, Payments, Returns & Exchanges

## 8.1 Objective

Deliver the normal retail sale lifecycle from shift opening to payment, receipt, return, exchange, and shift close.

## 8.2 Canonical Retail Sale Flow

```text
Open Shift
    ↓
Scan / Search Product
    ↓
Validate Product Status
    ↓
Check Stock Policy
    ↓
Optional Customer
    ↓
Price + Promotion + Tax
    ↓
Confirm Sale
    ↓
OrderConfirmed
    ↓
Receive Payment
    ↓
PaymentReceived
    ↓
Move Sold Stock
    ↓
StockSaleCommitted
    ↓
Post Receipt / Invoice
    ↓
Customer / Loyalty Update
    ↓
Reporting / Audit
```

## 8.3 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-031 | POS Scan | The cashier shall add an Item/Variant by barcode scan. |
| RETL-FR-032 | POS Search | The cashier shall search items without leaving the sale flow. |
| RETL-FR-033 | Quantity | The cashier shall update quantity according to item/unit rules. |
| RETL-FR-034 | Customer | The cashier may attach a Customer before checkout. |
| RETL-FR-035 | Customer History | Attaching a Customer shall allow authorized users to view relevant purchase/return/loyalty information. |
| RETL-FR-036 | Price | The POS shall calculate retail price using shared price and promotion rules. |
| RETL-FR-037 | Price Override | Manual price override shall require permission and optionally approval/reason. |
| RETL-FR-038 | Discount | Manual line/transaction discount shall follow configured user limits. |
| RETL-FR-039 | Hold | The cashier shall hold/park an unfinished sale without posting stock or finance. |
| RETL-FR-040 | Resume | Authorized users shall resume an eligible held sale. |
| RETL-FR-041 | Payment | Retail checkout shall support all enabled shared payment methods. |
| RETL-FR-042 | Split Payment | The customer may use multiple payment methods for one sale. |
| RETL-FR-043 | Partial Payment | Orders that allow deposit/partial payment shall preserve the remaining balance separately from an immediate fully paid sale. |
| RETL-FR-044 | Payment Retry | Payment retries shall not duplicate a successful payment. |
| RETL-FR-045 | Receipt | A successful sale shall generate a receipt/invoice according to Branch settings. |
| RETL-FR-046 | Digital Receipt | A digital receipt may be sent to an identified Customer when enabled and permitted. |
| RETL-FR-047 | Void | A sale or line voided before completion shall not create a completed sale stock/finance posting. |
| RETL-FR-048 | Return | A return shall reference the original sale when available. |
| RETL-FR-049 | Return Quantity | Returned quantity shall not exceed the eligible original quantity unless a specific approved exception exists. |
| RETL-FR-050 | Return Condition | Returned goods shall be routed to a selected valid Location/status such as Resellable, Damaged, or Quarantine. |
| RETL-FR-051 | Refund | Refund shall use enabled policy and preserve the original financial reference. |
| RETL-FR-052 | Exchange | Exchange shall combine a controlled return and replacement sale while preserving both item identities. |
| RETL-FR-053 | Store Credit | Approved return may issue Store Credit using the shared store-credit ledger. |
| RETL-FR-054 | No Sale Drawer | Cash-drawer opening without a sale shall be permission-controlled and audit logged when supported. |
| RETL-FR-055 | Shift Close | Cashier shift close shall reconcile expected and counted tender values according to payment type. |

## 8.4 Return / Exchange Flow

```text
Find Original Sale
    ↓
Select Item(s)
    ↓
Validate Returnable Quantity + Policy
    ↓
Manager Approval if Required
    ↓
ReturnAccepted
    ↓
Choose Stock Condition
    ├─ Resellable → StockReturned
    ├─ Damaged → Damaged Location
    └─ Quarantine → Quarantine Location
    ↓
Credit / Refund
    ↓
Optional Replacement Product
    ↓
New Sale / Price Difference
```

## 8.5 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-008 | Cashier | As a Cashier, I want to scan products continuously so that I can serve customers quickly. | Every scan resolves the correct active Item/Variant and one scan does not create duplicate quantity unexpectedly. |
| RETL-US-009 | Cashier | As a Cashier, I want to hold and resume a sale so that I can serve another customer temporarily. | Held sale has no completed stock/finance posting and resumes with original lines/customer/pricing context. |
| RETL-US-010 | Cashier | As a Cashier, I want split payment so that a customer can use cash and card together. | Successful tenders total the sale balance and retrying one tender does not duplicate the other. |
| RETL-US-011 | Cashier | As a Cashier, I want to exchange the wrong item/variant so that the customer can receive the replacement. | Returned stock and replacement stock are handled independently and the price difference is correctly settled. |
| RETL-US-012 | Store Manager | As a Store Manager, I want approval for large discounts and refunds so that loss is controlled. | Over-limit action requires an authorized approver and stores reason/requestor/approver. |
| RETL-US-013 | Customer Service User | As a Customer Service User, I want to issue store credit for an approved return so that the customer can spend it later. | Store-credit balance is created/updated and redemption history remains traceable. |

## 8.6 Edge Cases

- barcode scanned twice accidentally;
- product becomes inactive after being added to a held cart;
- promotion ends while the sale is held;
- payment processor times out;
- one split tender succeeds and another fails;
- customer returns only part of the originally purchased quantity;
- exchange replacement costs more/less than returned product;
- refund to original payment method is temporarily unavailable;
- returned product is damaged;
- cashier tries to return a different variant than the original sale.

---

# 9. Phase R3 — Retail Inventory, Purchasing & Replenishment

## 9.1 Objective

Provide complete retail stock control without creating a retail-specific stock ledger.

## 9.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-056 | Stock by Branch | Users shall view stock by Branch and Location according to permissions. |
| RETL-FR-057 | Available Stock | The system shall distinguish on-hand, reserved, available, incoming, and in-transit quantities. |
| RETL-FR-058 | Receiving | Goods receipt shall increase stock only for received quantities. |
| RETL-FR-059 | Purchase Order | Purchase Order approval shall not increase stock or create supplier payable by itself. |
| RETL-FR-060 | Partial Receipt | Receiving shall support partial receipt and remaining/backordered quantity. |
| RETL-FR-061 | Over/Short Receipt | Receiving shall identify over-receipt or short-receipt according to configured tolerance. |
| RETL-FR-062 | Transfer | Stock transfer shall move quantity between shared Locations using one authoritative transfer workflow. |
| RETL-FR-063 | In Transit | Inter-Branch transfers may use an In-Transit state before destination receipt. |
| RETL-FR-064 | Shop Replenishment | A retail Branch may replenish Shop Floor from Back Store using a shared Location transfer. |
| RETL-FR-065 | Count | Stock count shall support barcode-assisted counting. |
| RETL-FR-066 | Count Variance | Count difference shall post a controlled stock adjustment after approval when required. |
| RETL-FR-067 | Damaged Stock | Damaged stock shall move to a dedicated Location/status or controlled adjustment according to policy. |
| RETL-FR-068 | Reorder | Reorder suggestion shall use available stock, incoming stock, reorder settings, and demand rules. |
| RETL-FR-069 | Purchase Request | Users shall create purchase requests from replenishment needs when enabled. |
| RETL-FR-070 | Supplier | Purchase Order shall use the shared Supplier and supplier-item/pricing data. |
| RETL-FR-071 | Supplier Return | Supplier return shall reference the original purchasing/receipt information where possible. |
| RETL-FR-072 | Reservation | Confirmed customer orders may reserve stock. |
| RETL-FR-073 | Reservation Release | Cancelled/expired orders shall release their stock reservation. |
| RETL-FR-074 | Pick | Pickup/delivery orders shall support picking from the correct stock Location. |
| RETL-FR-075 | Pack | Packed quantity shall remain linked to the order and selected stock movement. |

## 9.3 Stock Rules

```text
Supplier → Goods Receipt → Store/Warehouse
Warehouse → Transfer → Branch
Back Store → Transfer → Shop Floor
Shop Floor → Sale → Customer
Customer → Return → Returns Location
Returns Location → Resellable / Damaged / Quarantine
```

### One-movement rule

A physical movement shall never be posted twice because both POS and another business workflow processed the same Item.

## 9.4 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-014 | Inventory User | As an Inventory User, I want to receive supplier goods so that stock becomes available only when goods arrive. | Only actual received quantity increases stock. |
| RETL-US-015 | Inventory User | As an Inventory User, I want to transfer stock to another Branch so that the destination can sell it. | Source and destination/in-transit quantities update from one transfer workflow. |
| RETL-US-016 | Inventory User | As an Inventory User, I want to scan a stock count so that physical stock can be compared with system stock. | Variance is shown and any posting requires a reason/approval according to policy. |
| RETL-US-017 | Purchasing User | As a Purchasing User, I want low-stock suggestions so that important products can be reordered. | Suggested quantity considers available and incoming stock plus configured reorder rules. |
| RETL-US-018 | Sales Associate | As a Sales Associate, I want to see other-Branch stock so that I can offer transfer or pickup options. | Authorized view shows Branch availability and freshness/status. |

---

# 10. Phase R4 — Retail Customer, Loyalty, Credit & Finance

## 10.1 Objective

Add customer retention and retail financial controls while reusing Common Core finance and customer engines.

## 10.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-076 | Customer Profile | Retail Customers shall use the common Customer profile. |
| RETL-FR-077 | Purchase History | Authorized users shall view Customer purchase and return history. |
| RETL-FR-078 | Loyalty Earn | Completed eligible retail sales shall earn loyalty using common rules. |
| RETL-FR-079 | Loyalty Redeem | Loyalty redemption shall follow permission and balance rules. |
| RETL-FR-080 | Loyalty Reversal | Returned/refunded sales shall adjust loyalty according to configured policy. |
| RETL-FR-081 | Customer Group | Customer groups shall be usable for price and promotion eligibility. |
| RETL-FR-082 | Gift Card | Gift cards shall use the common stored-value ledger. |
| RETL-FR-083 | Store Credit | Store credit shall be separate from loyalty points. |
| RETL-FR-084 | Credit Sale | Customer credit sales, when enabled, shall use common credit-limit and receivable rules. |
| RETL-FR-085 | Invoice Balance | Unpaid posted invoices shall appear in the customer's outstanding balance. |
| RETL-FR-086 | Collection | Customer collection shall reduce receivable through common payment allocation. |
| RETL-FR-087 | Expenses | Retail Branch expenses shall use common expense records and categories. |
| RETL-FR-088 | Cash Reconciliation | Cashier/Branch cash shall reconcile against completed payment records. |
| RETL-FR-089 | Gateway Settlement | Card/QR settlement reconciliation shall use shared payment settlement records. |
| RETL-FR-090 | Margin | Retail margin report shall use sale price and approved costing information without modifying historical transactions. |

## 10.3 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-019 | Cashier | As a Cashier, I want to identify a loyalty customer before checkout so that eligible points and prices apply. | Customer is attached before completion and eligible loyalty/price rules calculate correctly. |
| RETL-US-020 | Customer Service User | As a Customer Service User, I want to see return history so that repeated/invalid return requests can be reviewed. | Authorized history shows original sale, return, exchange, refund, and store-credit records. |
| RETL-US-021 | Finance User | As a Finance User, I want to reconcile card settlements so that processor deposits match POS payments. | Matched, fee, unmatched, and exception amounts are visible. |
| RETL-US-022 | Store Manager | As a Store Manager, I want to see gross margin so that I can detect unprofitable products or discounts. | Report shows sales, cost basis, margin, discount, and filters by Branch/category/item. |

---

# 11. Phase R5 — Retail Fulfillment & Omnichannel Readiness

## 11.1 Objective

Prepare General Retail for customer orders that are not completed immediately at the checkout counter.

## 11.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-091 | Sales Order | Retail users shall create sales orders using the common Order model. |
| RETL-FR-092 | Reservation | Confirmed pickup/delivery orders may reserve available stock. |
| RETL-FR-093 | Order State | Retail fulfillment shall support states such as Confirmed, Reserved, Picking, Ready, Collected, Dispatched, Delivered, Cancelled. |
| RETL-FR-094 | Pick List | The system shall generate an order pick list from reserved/eligible Locations. |
| RETL-FR-095 | Ready for Pickup | Authorized user shall mark an order Ready for Pickup after required items are prepared. |
| RETL-FR-096 | Pickup Confirmation | Customer pickup shall record completion time and responsible user. |
| RETL-FR-097 | Cancellation | Cancelling an unfulfilled order shall release eligible reservation and follow payment refund policy. |
| RETL-FR-098 | Partial Fulfillment | Retail orders may be partially fulfilled if enabled. |
| RETL-FR-099 | Delivery | Delivery-enabled retail orders shall use the Common Core dispatch/delivery/POD workflow. |
| RETL-FR-100 | External Channel | Future online/marketplace orders shall preserve channel/external-order references while entering the common Order engine. |
| RETL-FR-101 | Cross-channel Stock | External channels shall not directly edit stock totals; reservations/sales/fulfillment shall go through Common Core. |
| RETL-FR-102 | Cross-channel Return | Cross-channel return, when enabled, shall preserve the original sale/order/channel reference. |

## 11.3 Click & Collect Flow

```text
Customer Order
    ↓
OrderConfirmed
    ↓
StockReserved
    ↓
Pick
    ↓
Ready for Pickup
    ↓
Customer Arrives
    ↓
Confirm Collection
    ↓
Stock / Payment / Order Closure
```

## 11.4 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-023 | Sales Associate | As a Sales Associate, I want to reserve products for customer pickup so that they are not sold accidentally. | Reservation reduces available-to-sell quantity according to policy. |
| RETL-US-024 | Inventory User | As an Inventory User, I want a pick list so that I can prepare the correct customer order. | Pick list shows order, Item/Variant, quantity, and eligible Location. |
| RETL-US-025 | Cashier | As a Cashier, I want to confirm pickup so that the order closes correctly. | Pickup records user/time and does not create duplicate stock/payment effects. |
| RETL-US-026 | Customer Service User | As a Customer Service User, I want to cancel an uncollected order so that reserved stock becomes available again. | Reservation is released and any payment follows the configured refund rule. |

---

# 12. Phase R6 — Retail Reporting, Loss Control & Management

## 12.1 Objective

Give store managers actionable retail reports using the same confirmed operational data.

## 12.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-103 | Sales Report | The system shall report retail sales by Branch, date, Item, category, brand, user, customer, and channel. |
| RETL-FR-104 | Hourly Sales | Store Managers shall report sales by hour/day to understand peak periods. |
| RETL-FR-105 | Product Performance | The system shall report quantity, revenue, margin, returns, and discount by Item/Variant. |
| RETL-FR-106 | Fast/Slow Stock | The system shall identify fast-moving, slow-moving, and dead stock. |
| RETL-FR-107 | Stock Aging | The system shall report stock age where receiving/cost data allows it. |
| RETL-FR-108 | Shrinkage | Managers shall report count/adjustment shrinkage by Item, Location, user, reason, and period. |
| RETL-FR-109 | Return Report | The system shall report returns/exchanges/refunds by product, cashier, reason, Branch, and Customer where permitted. |
| RETL-FR-110 | Discount Report | The system shall report discounts, price overrides, approvals, and promotion discounts separately. |
| RETL-FR-111 | Cashier Performance | The system shall report cashier sales, transaction count, average sale, returns, discounts, and cash variance where permitted. |
| RETL-FR-112 | Promotion Performance | Managers shall compare promotion sales/discount/margin during the configured period. |
| RETL-FR-113 | Customer Report | The system shall report customer frequency, value, loyalty, and store-credit use. |
| RETL-FR-114 | Purchase Report | The system shall report purchases, supplier cost changes, receiving variance, and supplier performance. |
| RETL-FR-115 | Branch Comparison | Multi-Branch Businesses shall compare sales, margin, stock, returns, and shrinkage by Branch. |
| RETL-FR-116 | Audit Review | Managers/Auditors shall review high-risk retail operations such as refund, price override, large discount, no-sale drawer open, and stock adjustment. |

## 12.3 Retail KPIs

Recommended KPIs:

- net sales;
- gross sales;
- gross margin;
- average transaction value;
- items per transaction;
- transactions per hour;
- return rate;
- refund value;
- discount value;
- promotion contribution;
- stock turnover;
- sell-through rate;
- dead-stock value;
- stock shrinkage;
- out-of-stock frequency;
- customer repeat rate;
- loyalty redemption;
- cashier cash variance;
- Branch performance comparison.

## 12.4 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-027 | Store Manager | As a Store Manager, I want to see fast and slow products so that I can make better reorder and markdown decisions. | Report uses confirmed sales and current stock and supports date/category filters. |
| RETL-US-028 | Store Manager | As a Store Manager, I want to review refunds and discounts by cashier so that unusual loss patterns can be investigated. | Report links every high-risk transaction to source sale, user, approval, reason, and time. |
| RETL-US-029 | Business Owner | As a Business Owner, I want to compare Branches so that I can understand where revenue, margin, and shrinkage differ. | Branch comparison uses the same definitions/calculation rules for all Branches. |

---

# 13. Phase R7 — Offline, Devices, Migration & Production Go-Live

## 13.1 Objective

Make the Retail business pack operationally safe for real store use.

## 13.2 Functional Requirements

| Requirement ID | Area | Requirement |
|---|---|---|
| RETL-FR-117 | Barcode Scanner | Supported barcode scanner shall work reliably with the POS sale/search workflow. |
| RETL-FR-118 | Receipt Printer | Supported receipt printer shall print configured receipts after successful sale. |
| RETL-FR-119 | Label Printer | Supported label printer shall print configured product/barcode labels. |
| RETL-FR-120 | Cash Drawer | Cash drawer shall open only through supported transaction/permission rules. |
| RETL-FR-121 | Customer Display | Customer display may show current cart/totals without exposing internal controls. |
| RETL-FR-122 | Offline Cash Sale | Approved offline cash sale shall use Common Core offline queue and unique transaction ID. |
| RETL-FR-123 | Offline Retry | Reconnecting and retrying sync shall not duplicate sale, payment, stock, loyalty, or invoice. |
| RETL-FR-124 | Offline Risk | Unsupported/high-risk payment or credit operations shall be blocked offline according to policy. |
| RETL-FR-125 | Device Health | Manager/Admin shall see terminal last-sync time and pending transaction count. |
| RETL-FR-126 | Opening Catalog | Retail catalog migration shall reconcile Item/Variant/barcode counts before go-live. |
| RETL-FR-127 | Opening Stock | Opening stock shall reconcile by Branch, Location, Item, Variant, and traceability details where applicable. |
| RETL-FR-128 | Opening Customer | Customer/loyalty/store-credit migration shall reconcile balances before live use. |
| RETL-FR-129 | Opening Finance | Opening receivable/payable balances, if migrated, shall be reconciled and approved. |
| RETL-FR-130 | Performance | Peak retail checkout load shall be tested using expected transaction, item, user, and Branch volumes. |
| RETL-FR-131 | Backup | Production data backup and restore procedure shall be verified before go-live. |
| RETL-FR-132 | Monitoring | Production monitoring shall cover API errors, payment errors, sync failures, event backlog, database health, and critical business-operation failures. |
| RETL-FR-133 | Rollback | Release/cutover shall have a documented rollback or safe fallback process. |
| RETL-FR-134 | Day-End Reconcile | First production day-end shall reconcile sales, payment tenders, cash, stock movements, and exceptions. |

## 13.3 User Stories

| Story ID | Role | User Story | Acceptance Check |
|---|---|---|---|
| RETL-US-030 | Cashier | As a Cashier, I want approved sales to continue during a short internet outage so that the shop can continue serving customers. | Offline indicator is visible, transaction is durable, and later sync creates no duplicates. |
| RETL-US-031 | Business Administrator | As an administrator, I want to see terminal sync status so that I can identify a failing POS before data is lost. | Terminal status shows last online time, pending count, current version, and error state. |
| RETL-US-032 | Inventory User | As an Inventory User, I want opening stock to reconcile before go-live so that the first day's stock is trustworthy. | Source and target totals match by Item/Variant/Location or approved differences are documented. |
| RETL-US-033 | Store Manager | As a Store Manager, I want day-end reconciliation after go-live so that any sales, payment, or stock issue is detected quickly. | Sale totals, tender totals, cash, stock events, failed sync, and exceptions are reviewed. |

---

# 14. Shared Business Events Used by General Retail

General Retail shall reuse these Common Core events.

| Event | Retail Meaning |
|---|---|
| `OrderConfirmed` | A retail order/sale is confirmed. |
| `PaymentReceived` | A payment/tender is confirmed successful. |
| `StockSaleCommitted` | A stock-tracked retail Item physically leaves available stock because of the completed sale. |
| `CustomerInvoicePosted` | The retail customer invoice is officially posted. |
| `ReturnAccepted` | A retail return is accepted. |
| `StockReturned` | Returned goods are physically returned to an eligible stock Location. |
| `CreditNotePosted` | A financial credit is officially posted for a return/correction. |
| `RefundCompleted` | Money has been successfully refunded. |
| `GoodsReceived` | Supplier goods are physically received. |
| `StockTransferred` | Stock moved between Locations/Branches. |
| `StockReserved` | Stock is reserved for an order/pickup/delivery. |
| `StockAdjusted` | A controlled correction, damage, shrinkage, or count variance changes stock. |
| `CollectionReceived` | Money is collected against customer receivable. |
| `DeliveryCompleted` | A delivery-enabled retail order is successfully delivered. |

## 14.1 Event Rule

A General Retail screen may **request** an operation, but it shall not directly duplicate stock or finance state in a retail-specific table.

Example:

```text
Retail POS
   ↓
Complete Sale
   ↓
StockSaleCommitted
   ↓
Common Inventory Ledger
```

Not:

```text
Retail POS Stock Table
+
Common Inventory Stock Table
```

---

# 15. Retail Data Additions

Use Common Core entities first.

## 15.1 Reused shared entities

- Business;
- Branch;
- Location;
- User;
- Role;
- Customer;
- Supplier;
- Item;
- Variant;
- Barcode;
- Price List;
- Promotion;
- Tax Rule;
- Sale / Order;
- Payment;
- Return;
- Invoice;
- Stock Movement;
- Reservation;
- Purchase Order;
- Goods Receipt;
- Loyalty Account;
- Store Credit;
- Expense.

## 15.2 Retail-specific data should normally be configuration or extension data

Possible retail-specific additions:

- POS quick-access/favorite layout;
- retail label template;
- retail department display order;
- pickup workflow configuration;
- retail return policy configuration;
- retail KPI saved views;
- retail reason-code groups.

Do not store separate copies of:

- stock balance;
- customer balance;
- payment balance;
- loyalty balance;
- invoice balance;
- sales totals.

These values must come from the Common Core source records.

---

# 16. Permissions & Approval Matrix

At minimum, configure permissions for:

| Operation | Cashier | Sales Associate | Inventory User | Manager | Finance User |
|---|---:|---:|---:|---:|---:|
| Create Sale | Yes | Optional | No | Yes | No |
| Manual Discount | Limited | Limited | No | Yes | No |
| Price Override | Limited/No | Limited | No | Yes | No |
| Void Before Payment | Limited | Optional | No | Yes | No |
| Refund | Limited | No/Optional | No | Yes | Optional |
| Exchange | Limited | Optional | No | Yes | No |
| Open Cash Drawer | Controlled | No | No | Yes | No |
| Stock Receive | No | No | Yes | Yes | No |
| Stock Adjust | No | No | Limited | Yes | No |
| Purchase Order | No | No | Optional | Yes | No |
| Reconcile Cash | No | No | No | Yes | Yes |
| View Cost/Margin | No/Optional | Optional | Optional | Yes | Yes |

Actual permissions are configured using the shared Role/Permission engine.

---

# 17. Required Retail Exception Handling

The implementation shall explicitly test at least these cases:

### Product / Pricing

- duplicate barcode;
- unknown barcode;
- inactive product;
- discontinued product;
- missing tax;
- invalid price;
- promotion conflict;
- promotion expires while cart is held;
- unauthorized discount;
- quantity rule violation.

### Stock

- zero stock;
- negative-stock attempt;
- reserved stock unavailable for walk-in sale;
- transfer destination closed/inactive;
- count performed while stock is moving;
- damaged return;
- wrong Location selected;
- opening stock mismatch.

### Payment

- card/QR timeout;
- one split tender fails;
- refund provider unavailable;
- duplicate payment callback;
- cash shift shortage/overage.

### Return / Exchange

- original sale not found;
- return period expired;
- quantity already fully returned;
- returned product/variant does not match original;
- replacement product unavailable;
- exchange has price difference;
- receipt missing according to business policy.

### Offline

- sale created offline then user retries online;
- same offline transaction uploaded twice;
- price changed while terminal was offline;
- product deactivated while terminal was offline;
- reserved stock was sold elsewhere while terminal was offline;
- device restarts with pending transactions.

---

# 18. Non-Functional Requirements for General Retail

In addition to Common Core NFRs:

## 18.1 POS Performance

- barcode scan response should feel immediate under normal store load;
- cart updates shall not wait for noncritical report/analytics processing;
- long reports/imports shall run separately from checkout transaction processing;
- peak periods shall be load tested using realistic item count and cashier concurrency.

## 18.2 Usability

- frequent cashier actions should require minimal clicks;
- keyboard and scanner workflows shall be supported;
- touch targets shall be suitable for POS screens;
- important totals/payment state shall be clearly visible;
- errors shall tell the cashier what to do next.

## 18.3 Reliability

- sale/payment/stock event processing shall be idempotent;
- held carts shall survive normal application navigation/reload according to client design;
- approved offline transactions shall persist locally until synchronized;
- report failure shall not block a completed sale.

## 18.4 Security

- cashier shall not access configuration, cost, or finance data unless permitted;
- manager approvals shall identify the approving user;
- sensitive payment data shall follow Common Core/provider security rules;
- high-risk refunds, overrides, adjustments, and drawer openings shall be auditable.

---

# 19. Recommended API / Integration Readiness

General Retail should be designed so later integrations can reuse the same data model.

Potential integrations:

- e-commerce website;
- marketplace;
- payment gateway;
- accounting package;
- SMS/email receipt provider;
- loyalty app;
- courier / delivery provider;
- barcode/label hardware;
- BI/data warehouse.

Integration rule:

```text
External System
    ↓
Common API / Event Contract
    ↓
Common Order / Customer / Stock / Finance Engine
    ↓
General Retail UI / Workflow
```

External systems shall not directly update retail stock totals.

---

# 20. Data Migration Checklist

Before General Retail go-live:

1. import Branches and Locations;
2. import users/roles if applicable;
3. import product categories/brands;
4. import Items/Variants;
5. validate SKU/barcode uniqueness;
6. import prices and tax mappings;
7. import suppliers;
8. import customers;
9. import opening stock by Branch/Location/Variant;
10. import customer loyalty/store-credit balances if applicable;
11. import opening receivable/payable balances if applicable;
12. reconcile counts/totals;
13. perform sample sales/returns/transfers;
14. obtain Business approval before live posting.

---

# 21. General Retail UAT Scenarios

At minimum, UAT shall cover:

1. normal barcode cash sale;
2. card/QR sale;
3. split payment;
4. customer loyalty sale;
5. promotion sale;
6. manager-approved discount;
7. hold/resume sale;
8. full return;
9. partial return;
10. exchange with equal price;
11. exchange with additional payment;
12. store-credit refund;
13. goods receipt;
14. partial purchase receipt;
15. Branch transfer;
16. stock count and variance;
17. damaged-stock handling;
18. reorder suggestion;
19. click-and-collect reservation/pickup;
20. cancelled pickup order;
21. offline cash sale and sync;
22. duplicate sync retry;
23. shift close with exact cash;
24. shift close with cash variance;
25. manager sales/margin/stock/return report review.

---

# 22. Phase Exit Checklist

For every Retail phase:

- all phase Requirement IDs are implemented;
- role permissions are tested;
- approval rules are tested;
- happy-path user stories pass;
- negative/edge cases pass;
- shared events are verified;
- no duplicate stock/payment/finance posting exists;
- audit history is verified;
- reports reconcile with source records;
- offline impact is documented;
- migration/backfill impact is reviewed;
- monitoring/error handling is available for new background processes/integrations.

---

# 23. General Retail Definition of Done

The General Retail business pack is production-ready only when:

- Common Core dependencies are production-ready;
- all `RETL-FR-*` Must requirements in the selected release scope are complete;
- all targeted `RETL-US-*` user stories pass UAT;
- retail sale → payment → stock → receipt/invoice reconciles;
- return → stock disposition → refund/credit reconciles;
- purchase → receipt → stock reconciles;
- stock transfer and count reconcile;
- customer loyalty/store credit reconcile when enabled;
- payment settlement/cash shift reconcile;
- required hardware is tested;
- offline behavior is tested;
- opening catalog/stock/customer/finance data is reconciled;
- security and role review is completed;
- backups and restore readiness are confirmed;
- monitoring and support runbooks are ready;
- the Retail pack has not created a duplicate Customer, Product, Inventory, Payment, Finance, or Reporting source of truth.

---

# 24. What the Next Business Files Should Reuse from General Retail

The following later business files should build on this General Retail pack instead of starting again:

```text
General Retail
   ├── Fashion / Footwear
   │      + Size / Colour / Style Matrix
   │      + Season / Collection
   │
   ├── Electronics / Mobile
   │      + Serial / IMEI
   │      + Warranty / RMA
   │
   ├── Hardware / Building Materials
   │      + Multi-UOM
   │      + Credit / Quote / Delivery
   │
   ├── Bookstore / Stationery
   │      + ISBN / Author / Publisher
   │
   ├── Cosmetics / Beauty Retail
   │      + Shade Variants
   │      + Optional Batch / Expiry
   │
   ├── Furniture / Homeware
   │      + Order / Deposit / Delivery / Assembly
   │
   ├── Jewelry
   │      + Serial / Certificate / Service
   │
   └── Auto Parts
          + Part Number / Compatibility / Wholesale
```

This keeps **one Retail foundation** while each later file adds only the real difference for that business type.
