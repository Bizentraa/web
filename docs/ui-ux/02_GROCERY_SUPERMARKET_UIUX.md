# Grocery / Supermarket — Advanced UI/UX Specification

**Companion SRS:** `02_GROCERY_SUPERMARKET_SRS.md`  
**Shared design system:** `01_COMMON_UIUX_DESIGN_SYSTEM.md`  
**Theme:** **Fresh Emerald**

> This document defines the specialized Grocery / Supermarket experience. It does **not** create a separate frontend design system. Shared components, accessibility, responsive rules, status semantics, POS behavior, payment behavior, tables, approvals, offline states and audit patterns come from the Common UI/UX Design System.

## 1. Experience goals

- Make the highest-frequency Grocery / Supermarket task immediately visible after login.
- Use the language already used by staff in this business type.
- Keep critical operational state visible without opening multiple pages.
- Reuse shared Customer, Item, Order, Stock, Finance, Booking and Work components.
- Keep exception states as carefully designed as the happy path.
- Avoid decorative UI that reduces speed or information clarity.

## 2. Visual theme

| Token | Light | Dark / dark accent | Purpose |
| --- | --- | --- | --- |
| Business accent | #059669 | #34D399 | Selected nav, primary CTA, active tabs and vertical identity. |
| Soft accent | #ECFDF5 | Use low-opacity accent over dark surface | Selected cards, subtle highlights and informational grouping. |
| Primary text | #0F172A | #F8FAFC | Headings and main data. |
| Muted text | #64748B | #A8B3C5 | Metadata and secondary labels. |
| Success | Shared semantic green | Shared semantic green | Paid, completed, healthy. |
| Warning | Shared semantic amber | Shared semantic amber | Pending, near expiry, waiting action. |
| Danger | Shared semantic red | Shared semantic red | Failed, blocked, destructive, overdue critical. |

### Theme behavior
- Do not colour every card with the business accent.
- Use the accent primarily for navigation, active selection and main call-to-action.
- Charts use the accent as the first series; additional series use accessible shared chart colours.
- Dark mode uses `#34D399` for active interactive emphasis.

## 3. Role workspaces

| Role | Default landing / workspace |
| --- | --- |
| Supermarket Manager | Role dashboard + exceptions + approvals |
| Cashier | Primary transaction / order workspace |
| Inventory User | Operational task queue + scan/list view |
| Receiving User | Operational task queue + scan/list view |
| Purchasing User | Role-specific task dashboard |
| Price / Promotion Manager | Role dashboard + exceptions + approvals |
| Finance User | Finance queue / balances / reconciliation |

## 4. Information architecture

Primary navigation:

```text
Home → POS → Products → Stock → Receiving → Purchasing → Promotions → Customers → Finance → Reports → Settings
```

Navigation rules:
- The first item is the highest-frequency role home, not a generic marketing dashboard.
- Hide navigation that the User cannot access or the Business has not enabled.
- Preserve selected Branch/Location/resource context during normal navigation.
- High-risk finance/configuration areas remain separated from fast operational workspaces.

## 5. Role dashboard

Recommended top KPIs:

- **Today sales**
- **Transactions**
- **Average basket**
- **Gross margin**
- **Low-stock items**
- **Expiring soon**
- **Waste value**
- **Cash variance**

Dashboard order:
1. actions requiring attention;
2. live operational state;
3. today/current period KPIs;
4. trend analytics;
5. secondary insights.

Do not use the dashboard as the only way to discover unfinished work. Important task queues must have their own navigable workspace.

## 6. Core screen inventory

| UI ID | Screen | UX purpose |
| --- | --- | --- |
| GROC-UI-01 | Fast Checkout | Primary daily workspace; optimize first and measure task time. |
| GROC-UI-02 | Product / PLU Search | Business-specific supporting workspace using shared components. |
| GROC-UI-03 | Scale & Weighted Item Sheet | Business-specific supporting workspace using shared components. |
| GROC-UI-04 | Promotion Builder | Business-specific supporting workspace using shared components. |
| GROC-UI-05 | Shelf / Price Label Queue | Business-specific supporting workspace using shared components. |
| GROC-UI-06 | Batch & Expiry Stock | High-density operational control; scanner and bulk actions where useful. |
| GROC-UI-07 | Receiving Workspace | High-density operational control; scanner and bulk actions where useful. |
| GROC-UI-08 | Replenishment Board | Business-specific supporting workspace using shared components. |
| GROC-UI-09 | Cycle Count | High-density operational control; scanner and bulk actions where useful. |
| GROC-UI-10 | Waste / Spoilage Entry | Business-specific supporting workspace using shared components. |
| GROC-UI-11 | Supplier Return | Business-specific supporting workspace using shared components. |
| GROC-UI-12 | Expiry & Shrinkage Dashboard | Manager insight and drill-down; no editing of source truth from chart. |

## 7. Primary workflow

```text
Open shift → scan/weight → promotion/tax → tender → receipt → stock event → shift close; back office: PO → receive batch/expiry → shelf replenishment → count/waste.
```

### Workflow design rules
- Keep source record identity visible while moving through related work.
- Use status chips and timeline to show transitions.
- Use drawers/sheets for quick secondary actions; use dedicated pages for complex, auditable work.
- If a state change affects stock or money, show the consequence before final confirmation.
- External/async actions must show Pending / Success / Failed / Needs Review states.

## 8. Specialized interaction patterns

- Large scan focus and persistent cart
- One-tap quantity/void with approval guard
- Weighted-item keypad and scale status
- Expiry chips with days remaining
- Department and aisle filters
- Dense receiving table with scan mode
- Replenishment task cards grouped by aisle
- High-contrast low-stock/expiry warnings

## 9. Screen layout guidance

### Primary workspace
- Optimize for the first screen in the Screen Inventory.
- Keep the most common action in the top-right desktop / sticky-bottom mobile action position.
- Show only fields required for the current step; extra metadata goes into a side panel or secondary tab.
- Persist recent filters or work context where returning users benefit.

### Lists / operational queues
- Default sort should match the business urgency, not database creation order.
- Provide saved views for common role filters.
- Show status, age/due time, customer/item identity and exception indicator without opening the row.

### Detail records
Use:
- Entity Header
- Status Chip
- Money/Quantity Summary as applicable
- Activity Timeline
- Files/notes
- Audit tab for authorized roles

## 10. Responsive and device behavior

Manager/inventory mobile focuses on scan, receive, count, waste and replenishment. Cashier POS remains tablet/desktop landscape first.

### Desktop
- Use split views for high-context work such as list + detail, calendar + detail, map + stops, or order + payment.

### Tablet
- Preserve operational controls and collapse supporting information into drawers/tabs.

### Phone
- Prioritize task execution, scan/capture, approvals and status update.
- Replace wide matrices/tables with cards or specialized mobile views.

## 11. Keyboard / touch acceleration

- `/` or `Ctrl/Cmd+K` focuses search/command palette where safe.
- Enter confirms selected result; Escape closes temporary drawer/dialog.
- Frequent POS/operational actions receive documented shortcuts.
- Scanner input must never accidentally type into notes/comments when scan mode is active.
- Touch targets for primary actions remain at least operational-friendly size.

## 12. Empty states

Examples:
- No current tasks: explain that there is nothing waiting and show the next likely action.
- No data after filtering: show active filters and **Clear filters**.
- No configuration: explain what must be configured and who can configure it.
- Feature unavailable by plan/role: distinguish **not enabled** from **not permitted**.

## 13. Loading states

- Lists use skeleton rows.
- Saving a line does not block unrelated screen areas.
- Long-running reports/imports/integrations show progress or background-job state.
- External confirmation uses explicit `Waiting for confirmation…` rather than a frozen button.

## 14. Error / exception UX

The following must have designed states, not generic error dialogs:

- **Expired batch at sale**
- **Unknown scale barcode**
- **Promotion conflict**
- **Large count variance**
- **Offline retry**
- **Scanner/scale disconnected**

For each:
1. explain the business problem;
2. show what has and has not been saved/posted;
3. identify the safe next action;
4. preserve entered data where safe;
5. require approval/reason where policy demands it;
6. never allow a retry to create a duplicate stock or money effect.

## 15. Notifications and attention model

Use three levels:
- **Task:** user can act now; appears in task queue.
- **Warning:** needs attention soon; appears on dashboard and related record.
- **Critical:** operation blocked or business integrity risk; strong banner + alert center.

Avoid sending every normal status change as a notification.

## 16. Reporting and KPI UX

Recommended KPIs:

- Sales/hour
- Average basket
- Units/transaction
- Waste %
- Expiry risk value
- Stockout count
- Shrinkage value
- Supplier fill rate

Report patterns:
- summary KPI → chart/table → drill-down to source records;
- saved filter views by Branch/date/role/context;
- visible data-freshness time;
- export only when role permits;
- charts never provide edit controls for operational records.

## 17. UX development phases

| Phase | Focus | Deliverables |
| --- | --- | --- |
| UX-0 | Information architecture | Confirm roles, navigation, business vocabulary and top tasks. |
| UX-1 | Primary workspace | Design the first daily-use screen and its happy path. |
| UX-2 | Supporting operations | Design stock/work/booking/fulfillment screens required by the SRS. |
| UX-3 | Exceptions & approvals | Design blocked, partial, failed, refund/reversal, approval and conflict states. |
| UX-4 | Responsive / devices | Tablet/mobile/scanner/offline/integration states where relevant. |
| UX-5 | Reports & manager control | Dashboards, saved views, drill-downs and audit visibility. |
| UX-6 | Polish & UAT | Accessibility, dark mode, localization, performance and role-based UAT. |

## 18. UX acceptance criteria

| Area | Acceptance rule |
| --- | --- |
| Navigation | A Supermarket Manager sees the role-appropriate home and only enabled Grocery / Supermarket areas. |
| Primary flow | The main workflow can be completed without leaving the intended workspace: Open shift → scan/weight → promotion/tax → tender → receipt → stock event → shift close; back office: PO → receive batch/expiry → shelf replenishment → count/waste. |
| State | All important states in Expired batch at sale, Unknown scale barcode, Promotion conflict are visible and actionable without inspecting raw logs. |
| Responsive | Manager/inventory mobile focuses on scan, receive, count, waste and replenishment. Cashier POS remains tablet/desktop landscape first. |
| Theme | Light and dark themes use the Fresh Emerald accent while semantic success/warning/danger colours remain shared. |
| Accessibility | Keyboard/focus, touch target, labels, contrast, reduced motion and status text requirements follow the Common UI/UX Design System. |
| Performance | High-frequency operational actions avoid unnecessary page reloads and large blocking dialogs. |
| Audit safety | Posted stock/money changes are never represented as a simple destructive edit; the UI routes to the correct return/reversal/adjustment workflow. |

## 19. Recommended component reuse

Always start with shared components:
- AppShell
- PageHeader
- KpiCard
- DataTable
- FilterBar
- StatusChip
- EntityHeader
- Timeline
- ApprovalDrawer
- PaymentSheet
- CustomerPanel
- StockBadge / StockMovementDrawer
- BookingCalendar when applicable
- WorkBoard / WorkTicketPanel when applicable
- SerialPicker / BatchExpiryPicker when applicable
- OfflineBanner
- IntegrationState
- EmptyState / ErrorState

Create a new vertical component only when the shared primitive cannot communicate the business-specific task clearly.

## 20. Design handoff checklist

Before frontend implementation:
- flow is linked to SRS requirement IDs and user stories;
- wireframe covers happy + important exception paths;
- component mapping identifies shared vs vertical components;
- light + dark mockups exist for primary screens;
- desktop/tablet/mobile behavior is specified;
- focus/keyboard/touch behavior is specified;
- empty/loading/error/offline/permission states exist;
- sample realistic data is used, not only placeholders;
- analytics use defined KPI formulas;
- design review confirms no duplicate business source of truth was introduced.
