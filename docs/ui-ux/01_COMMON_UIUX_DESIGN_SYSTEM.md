# Common UI/UX Design System — Cloud POS SaaS

**Purpose:** This is the shared UI/UX source of truth for every Business type. Business-specific files only add specialized workspaces, fields, workflows, accent themes and shortcuts.

> Use simple product language: **Business**, **Branch**, **Location**, **User**, **Customer**, **Item**, **Stock**, **Order**, **Payment**, **Work Ticket**, **Booking**. Avoid technical infrastructure terms in normal screens.

## 1. Product UI principles

1. **Fast first:** frequent daily actions should need the fewest decisions and clicks.
2. **Role first:** a Cashier, Manager, Store Keeper and Accountant should not start on the same dashboard.
3. **One source of truth:** the UI must not make duplicated vertical engines look independent when they reuse the same shared record.
4. **State must be visible:** show Draft, Waiting Approval, Paid, Partially Paid, Reserved, In Transit, Ready, Completed, Failed and Offline clearly.
5. **Progressive disclosure:** show the information needed now; move rare/advanced settings into drawers, tabs or secondary actions.
6. **Reversible when safe:** support undo for harmless local UI actions; use explicit reversal/return/refund workflows for posted stock/money.
7. **No hidden failure:** offline, payment uncertainty, sync error, integration error and approval waiting states remain visible until resolved.
8. **Touch + keyboard:** POS and operational screens work well with touch; back office supports efficient keyboard navigation and shortcuts.
9. **Accessible by default:** readable contrast, keyboard focus, labels, status not communicated by colour alone, reduced-motion support.
10. **Consistent across verticals:** same component names and interaction behavior; vertical theme changes accent and specialized content only.

## 2. Product surfaces

| Surface | Primary use | Layout |
| --- | --- | --- |
| Business Back Office | Configuration, catalog, inventory, purchasing, finance, reports | Responsive desktop-first app shell with sidebar + top bar. |
| POS Mode | Fast checkout / payment | Distraction-free full-screen layout; no normal sidebar during checkout. |
| Operations Workspace | Receiving, counting, warehouse, work tickets, kitchen, service | Dense task-first layout; tablet-friendly; scanner/touch capable. |
| Mobile Operations | Stock scan, technician, delivery, route, manager approvals | Bottom navigation + large task cards + offline status. |
| Customer-facing Display / Self-service | Order status, customer display, kiosk/QR/portal where enabled | Highly simplified branded presentation; no internal controls. |

## 3. Global application shell

### Desktop

```text
┌────────────────────────────────────────────────────────────────────┐
│ Logo / Business       Branch ▾      Search ⌘K      Alerts   User ▾ │
├──────────────┬─────────────────────────────────────────────────────┤
│ Home         │ Page title                       Primary Action +   │
│ POS          │ Context / breadcrumb / status                       │
│ Orders       ├─────────────────────────────────────────────────────┤
│ Products     │ Toolbar: filters / saved view / bulk / export       │
│ Stock        │                                                     │
│ Customers    │ Main content                                        │
│ Finance      │                                                     │
│ Reports      │                                                     │
│ Settings     │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

### Compact desktop/tablet
- Sidebar collapses to icons.
- Context panel becomes a right drawer.
- Dense tables may switch to card rows below ~900px.
- Primary action stays visible in a sticky page header when the workflow is task-heavy.

### Mobile
- Bottom navigation: Home / Tasks / Search / Alerts / More.
- Context switcher appears at top: Business / Branch / Route / Resource where relevant.
- Long forms become step sections; critical save/complete action is sticky at bottom.

## 4. Navigation rules

- Show navigation by role and enabled feature; do not show disabled industry modules.
- Keep the first-level navigation to about 6–10 high-frequency areas; place advanced settings under **More** or **Settings**.
- Business/Branch switcher must always show current context.
- Global search must search only objects the User is allowed to see.
- `⌘K / Ctrl+K` opens Command Palette for navigation and common commands.
- Back button must never silently lose unsaved work; use an unsaved-change guard.

## 5. Shared page patterns

### 5.1 Dashboard
- 4–8 KPI cards maximum above the fold.
- KPIs show current value, comparison, trend and clickable drill-down.
- Alerts use severity and action, not just colour.
- Role-specific task queue appears before decorative analytics.

### 5.2 List / Data table
- Sticky header and optional sticky first column.
- Search, filter chips, saved views, column selector and export.
- Bulk action bar appears only after selection.
- Row click opens detail; checkbox selection does not trigger navigation.
- Numeric columns align right; status/date columns remain scannable.
- Virtualization/pagination for large datasets.

### 5.3 Detail page

```text
Object title / number     Status Chip             Main actions
Customer / Branch / date / owner
──────────────────────────────────────────────────────────────
Summary | Lines | Activity | Payments | Stock | Files | Audit
──────────────────────────────────────────────────────────────
Contextual content
```

Use an activity timeline for business history instead of hiding all history in raw audit tables.

### 5.4 Form
- One-column by default for high-risk transactions; two columns only for short related fields.
- Group fields by business meaning, not database schema.
- Inline validation appears after interaction; submit errors scroll/focus to the relevant section.
- Use sensible defaults from Business/Branch/User context.
- Advanced optional fields collapse under **More details**.

### 5.5 Wizard / guided workflow
Use for receiving, initial Business setup, migration, refund, closing a shift, rental return, or other multi-step processes where skipping steps creates risk.

## 6. POS workspace

```text
┌───────────────────────────────────────────────────────────────────┐
│ Branch / Register    Cashier   Search/Scan focus       Online ●   │
├─────────────────────────────┬─────────────────────────────────────┤
│ Product/category area       │ CART                                │
│ search / favorites / grid   │ Item                    Qty   Total │
│                             │ ...                                 │
│                             │                                     │
│                             ├─────────────────────────────────────┤
│                             │ Customer / Discount / Hold           │
│                             │ Subtotal / Tax / Due                 │
│                             │ [PAY]                                │
└─────────────────────────────┴─────────────────────────────────────┘
```

POS rules:
- Scan/search input gets immediate focus.
- Cart and amount due never disappear behind a modal.
- Payment opens a focused sheet with large tender buttons.
- Approval is a drawer/secure dialog, not a separate navigation page.
- Held carts show owner/time/customer/status.
- Offline state and pending sync count remain visible.
- Unknown payment state uses **Checking payment** / **Needs review**, never a false red “Failed” until confirmed.

## 7. Shared operational components

| Component | Use | Key behavior |
| --- | --- | --- |
| StatusChip | Order/work/payment/stock state | Text + icon + semantic colour; never colour-only. |
| EntityHeader | Customer, Item, Asset, Order, Ticket | Primary identity, status, context, main actions. |
| KpiCard | Dashboard | Value, unit, trend, comparison, drill-down. |
| DataTable | Back-office lists | Search/filter/saved view/columns/bulk actions. |
| FilterBar | Lists/reports | Visible active filters; one-click clear; saved views. |
| CommandPalette | Global nav/actions | Permission-aware keyboard-first access. |
| ApprovalDrawer | Sensitive action | Reason, before/after, threshold, approver identity. |
| Timeline | History | Business events, comments, documents, state changes. |
| MoneySummary | Sales/finance | Subtotal, tax, discount, paid, due, credit in one aligned block. |
| StockBadge | Availability | On hand / reserved / available / incoming with location context. |
| SerialPicker | Serialized items | Scan/search exact identity; availability validation. |
| BatchExpiryPicker | Expiry stock | Batch, available qty, expiry, FEFO suggestion. |
| BookingCalendar | Appointment/resource | Day/week/resource lanes, availability and conflict prevention. |
| WorkBoard | Jobs/KOT/service | Kanban/list with SLA/time/assignee/status. |
| WorkTicketPanel | Work execution | Checklist, timer, materials, notes, attachments, completion. |
| PaymentSheet | Tender | Split/partial tender, failure/unknown handling, outstanding amount. |
| OfflineBanner | Connection state | Online/offline/reconnecting, last sync, pending count. |
| IntegrationState | External posting | Pending/success/failed/unknown plus retry/reconcile actions. |
| EmptyState | No records | Explain why empty and provide next best action. |
| DangerConfirmation | Irreversible/high-risk | Explains consequence + reason/approval, no vague “Are you sure?”. |

## 8. Information density levels

- **Comfortable:** owner/admin/customer screens.
- **Compact:** finance, purchasing, inventory lists.
- **Dense:** receiving, picking, stock count, KDS and other high-throughput operational screens.
- Density can be user-selectable in back office; POS operational density is designed per task rather than user-customized freely.

## 9. Shared semantic colours

| Meaning | Light theme | Dark theme | Usage |
| --- | --- | --- | --- |
| Primary action | #2563EB | #60A5FA | Main CTA, selected navigation. |
| Success | #15803D | #4ADE80 | Completed, paid, healthy. |
| Warning | #B45309 | #FBBF24 | Near expiry, pending, attention needed. |
| Danger | #B91C1C | #F87171 | Failed, blocked, destructive, overdue critical. |
| Info | #0369A1 | #38BDF8 | Informational state, sync, neutral guidance. |
| Neutral | #475569 | #94A3B8 | Draft, inactive, secondary information. |

Never use accent colour as a replacement for semantic status colour.

## 10. Base light theme

```css
--bg: #F8FAFC;
--surface: #FFFFFF;
--surface-muted: #F1F5F9;
--border: #E2E8F0;
--text: #0F172A;
--text-muted: #64748B;
--primary: #2563EB;
--focus: #2563EB;
```

## 11. Base dark theme

```css
--bg: #0B1220;
--surface: #111827;
--surface-muted: #172033;
--border: #263244;
--text: #F8FAFC;
--text-muted: #A8B3C5;
--primary: #60A5FA;
--focus: #93C5FD;
```

Dark mode guidance:
- Avoid pure black large surfaces.
- Tables use subtle row contrast rather than strong zebra stripes.
- Warning/danger backgrounds are toned, not neon.
- Chart series must be independently distinguishable in both themes.

## 12. Typography

Use a system font stack to avoid deployment/font licensing complexity:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Scale:
- Display: 32/40, 700
- H1: 24/32, 700
- H2: 20/28, 650
- H3: 16/24, 650
- Body: 14/20
- Compact table: 13/18
- Caption: 12/16
- POS amount due: 28–36, tabular numbers

Use tabular numbers for money, quantities, times and metrics.

## 13. Spacing, radius, elevation

- Base spacing unit: 4px.
- Common gaps: 8, 12, 16, 24, 32.
- Control height: 36px compact, 40px normal, 48–56px touch/operational.
- Radius: 8px controls, 12px cards, 16px large panels.
- Shadows are subtle; rely on border + surface first.

## 14. Iconography

- Use one outlined icon family consistently.
- Icons supplement text, not replace important action labels.
- Destructive action icons remain accompanied by text.
- Common icons: cart, receipt, package, truck, user, calendar, wrench, wallet, warning, sync, barcode, scan, filter.

## 15. Data visualization

- Use charts only when comparison/trend is faster than a table.
- Prefer line for trends, bars for category comparison, stacked bar for composition, heatmap for matrix/period density.
- Do not use pie charts for many categories.
- Every chart has accessible summary/value table or tooltip data.
- Financial dashboards clearly separate gross sales, net sales, tax, discounts and margin.

## 16. Empty, loading and error states

### Empty
Explain the business meaning and next action.
- Bad: “No data.”
- Good: “No purchase orders yet. Create a purchase order or import opening suppliers.”

### Loading
- Use skeletons for lists/cards.
- Use local button/progress state for save/post operations.
- Do not block the whole screen when only one panel is loading.

### Error
- Explain what failed, what was saved, and what the User can do next.
- External integration errors include reference and retry/reconcile action when permitted.

## 17. Offline UX

```text
ONLINE ●        normal operation
OFFLINE ◐       approved operations continue locally
SYNCING ↻       pending actions are being uploaded
NEEDS REVIEW !  one or more actions could not be reconciled automatically
```

Rules:
- Offline mode is visible at all times on operational surfaces.
- Never promise “Saved to cloud” while offline.
- Pending count is clickable.
- Conflict resolution explains old/new/local/server values in business language.
- High-risk actions may be disabled with explanation rather than disappearing.

## 18. Permissions and approval UX

- Disabled because of permission: explain required role/approval when safe.
- Approval request includes amount/quantity/margin impact and reason.
- Approver can approve/reject without losing context.
- Approval result returns User to the original task.
- “Manager override” never means sharing passwords; use separate secure approver identity.

## 19. Accessibility baseline

- Keyboard reachable controls and visible focus.
- Minimum 44×44 touch target for primary operational controls where possible.
- Labels associated with inputs; placeholders are not labels.
- Error text describes how to fix the problem.
- Status uses text/icon in addition to colour.
- Respect reduced-motion preference.
- Contrast target appropriate for normal text and critical controls.
- Avoid time-limited interactions without extension/cancel support unless business-critical.

## 20. Responsive breakpoints

- `< 640`: phone
- `640–899`: compact tablet
- `900–1199`: tablet / small desktop
- `1200–1599`: normal desktop
- `1600+`: wide operations/dashboard

Do not merely shrink desktop tables onto phones. Switch to task cards or dedicated mobile views.

## 21. Search and command UX

Global search can search permitted:
- Items / SKU / barcode
- Customers
- Orders / invoices / receipts
- Serial / IMEI / batch
- Work tickets
- Customer assets

Command examples:
- New sale
- New purchase order
- Receive stock
- New customer
- Start count
- Open shift close
- Go to today appointments

## 22. Notification center

Categories:
- Action required
- Approval
- Stock / expiry
- Finance / overdue
- Work / booking
- Integration / sync
- System / security

Users can filter by Branch and severity. Critical operational alerts remain visible until acknowledged/resolved according to policy.

## 23. Frontend architecture recommendation

Suggested feature structure:

```text
app-shell/
shared-components/
shared-patterns/
domains/
  business/
  identity/
  catalog/
  commerce/
  inventory/
  purchasing/
  finance/
  crm/
  workforce/
  booking/
  work-ticket/
  traceability/
  warranty/
  fulfillment/
verticals/
  grocery/
  restaurant/
  garage/
  ...
```

A vertical should compose shared domain components and supply specialized configuration/components only where the workflow truly differs.

## 24. UI phase sequence

| UI Phase | Focus | Deliverables |
| --- | --- | --- |
| UI-0 | Design foundation | Tokens, accessibility baseline, app shell, navigation, responsive grid, icons. |
| UI-1 | Shared primitives | Buttons, inputs, tables, drawers, dialogs, status chips, timeline, entity header, forms. |
| UI-2 | Commerce/POS | POS shell, cart, payment sheet, customer side panel, return/refund, shift UI. |
| UI-3 | Operations | Stock table, receiving, transfers, count, purchasing, fulfillment. |
| UI-4 | Finance/CRM | AR/AP, cash, customer 360, loyalty, statements, approvals. |
| UI-5 | Reusable engines | Booking calendar, work board/ticket, serial/batch, warranty, BOM, route/POD. |
| UI-6 | Vertical workspaces | Grocery first, then retail families, food/service, distribution/rental. |
| UI-7 | Offline/mobile/integrations | Offline queue, mobile tasks, integration state, migration. |
| UI-8 | Polish/scale | Accessibility QA, performance, density, saved views, command palette, dark theme, visual regression. |

## 25. Shared UI Definition of Done

A shared UI component/pattern is ready only when:
- light and dark themes are implemented;
- keyboard/focus and screen-reader labels are tested as applicable;
- mobile/tablet/desktop states are designed;
- empty/loading/error/disabled/permission/offline states are defined;
- long text and localization are considered;
- destructive/financial/stock actions state consequences clearly;
- analytics/report values reconcile to the same source records used by operations;
- visual regression/storybook examples exist for important states;
- the component can be reused by more than one vertical without business-specific hacks.
