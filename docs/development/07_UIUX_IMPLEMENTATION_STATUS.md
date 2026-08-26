# UI/UX Implementation Status

**Date:** 2026-08-26  
**Source UI/UX docs:** [`../ui-ux`](../ui-ux)  
**Common SRS:** [`../01_COMMON_CORE_SRS.md`](../01_COMMON_CORE_SRS.md)  
**Change log:** [`03_DEVELOPMENT_CHANGE_LOG.md`](./03_DEVELOPMENT_CHANGE_LOG.md)  
**Component system:** [`06_UI_COMPONENT_SYSTEM.md`](./06_UI_COMPONENT_SYSTEM.md)

This file tracks what has actually been implemented from the UI/UX specification. It covers all
product surfaces, not only backend features.

## Source UI/UX Files Reviewed

| File | Purpose | Status in repo |
|---|---|---|
| `docs/ui-ux/00_README_UIUX_DEVELOPMENT_ORDER.md` | UI development rule and vertical sequencing | Followed: shared UI first, verticals later |
| `docs/ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md` | Shell, navigation, POS workspace, components, states, accessibility and responsive rules | Implemented for P0, P1 and P2 surfaces |
| `docs/ui-ux/02_GROCERY_SUPERMARKET_UIUX.md` | First vertical companion | Not started; will reuse the shared components |

## Where the UI Lives

| Layer | Location | What belongs there |
|---|---|---|
| Shared component styles | `packages/design-system/styles.css` | Every `ui-*` class, imported by both applications |
| Server-safe components | `packages/design-system/src/index.tsx` | Shell, cards, tables, chips, forms, states, receipts |
| Interactive components | `packages/design-system/src/client.tsx` | Dialog, Drawer, Sheet, ConfirmDialog, Tabs, toasts, POS hooks |
| Business theme | `packages/themes` and `packages/design-system/src/theme.tsx` | Saved Business colours applied before hydration |
| Back Office screens | `apps/backoffice/src/app/*` | Ten routes sharing one `Workspace` frame |
| POS screens | `apps/pos/src/app/*` | Selling workspace and returns |

## Specification Coverage

| UI/UX section | Status | Evidence |
|---|---|---|
| 3 Global application shell | Implemented | Sidebar grouped by Run/Manage/Settings, sticky topbar with Business and Branch context, icon-only sidebar on tablet, bottom navigation on phones |
| 4 Navigation rules | Partly | Command palette on `Ctrl/Cmd+K` and always-visible context. Remaining: navigation filtered by the signed-in user's permissions, a working Branch switcher and an unsaved-change guard |
| 5.1 Dashboard | Implemented | Four KPI cards, a readiness checklist with next actions and a recent-sales table with drill-down |
| 5.2 List / data table | Implemented | Search, filter chips, sticky header, right-aligned numbers, row click to open, and task cards instead of a shrunken table below 768px |
| 5.3 Detail page | Implemented | `EntityHeader` with status and actions, tabs and an activity timeline on item, customer, supplier and sale |
| 5.4 Form | Implemented | Grouped by business meaning, inline hints, sensible defaults and a footer that states the consequence next to the action |
| 5.5 Wizard | Implemented for import | Choose file, validate, preview per row, apply, roll back |
| 6 POS workspace | Implemented | Scan focus, product tiles, cart and amount due always visible, payment sheet with large tender buttons, held carts, receipt and shift close |
| 7 Shared components | Implemented | See the component table in `06_UI_COMPONENT_SYSTEM.md` |
| 9-13 Colour, typography, spacing | Implemented | Semantic tokens from the saved Business theme, tabular numbers for money, 4px spacing scale and the specified radii and control heights |
| 16 Empty, loading and error states | Implemented | Skeletons while loading, and empty, error, permission, offline and needs-review panels that say what to do next |
| 17 Offline UX | Implemented for the POS | Online/offline/syncing/needs-review banner with a pending count, and a local queue replayed idempotently |
| 18 Permissions and approval UX | Implemented | A denied screen names the missing permission, and a blocked action explains that approval is needed |
| 19 Accessibility baseline | Partly | Labels, visible focus, status never colour-only, reduced motion and larger POS touch targets. Remaining: automated assertions and a screen-reader pass |
| 20 Responsive breakpoints | Implemented | Verified with no horizontal overflow at 1440px and 390px on all 12 routes |
| 21 Search and commands | Partly | Route and action commands exist. Remaining: record search and permission awareness |
| 22 Notification center | Not started | Toasts exist for the current action; a filterable notification centre does not |

## Screens Implemented

| Route | Application | Phase | What it does |
|---|---|---|---|
| `/` | Back Office | P0-P2 | KPIs, recent sales, setup readiness and next actions |
| `/setup` | Back Office | P0 | Business details, Branches and Locations |
| `/access` | Back Office | P0 | Users, Roles and the permission catalogue |
| `/controls` | Back Office | P0 | Approval rules and requests, feature packs, numbering, audit |
| `/catalog` | Back Office | P1 | Items, organization, prices and promotions, tax and preview |
| `/catalog/[itemId]` | Back Office | P1 | Item detail with prices, codes, variants, suppliers and history |
| `/customers` | Back Office | P1 | Customer list, detail, history and store credit |
| `/suppliers` | Back Office | P1 | Supplier list, detail, terms and supplied items |
| `/import` | Back Office | P1 | Validate, preview, apply and roll back a CSV file |
| `/sales` | Back Office | P2 | Sales, tenders, returns, receipts and shift reconciliation |
| `/appearance` | Back Office | P0 | Business theme selection |
| `/` | POS | P2 | Shift gate, scan and search, cart, payment sheet, receipt |
| `/returns` | POS | P2 | Find the original sale and accept a return or refund |

## Verification

A repeatable browser run over all 12 routes at 1440px and 390px recorded 54 passing checks: expected
content present, no console or page errors, and no horizontal overflow at either width. A second run
drove the real POS through opening a shift, adding an item, changing its quantity, opening the
payment sheet, taking a cash tender and printing a receipt with change: 11 checks, all passing.

## Remaining UI/UX Work

1. Navigation, commands and actions filtered by the signed-in user's real permissions and features.
2. A Branch switcher that actually changes the working context, and an unsaved-change guard.
3. Saved views, a column selector and a density switch for back-office lists.
4. A notification centre with the seven categories in section 22.
5. Component examples, automated accessibility assertions and visual-regression snapshots.
6. The Grocery/Supermarket vertical workspace, reusing these components.

## Implementation Rule

Do not mark a UI/UX capability complete because a static preview exists. A UI/UX capability is
implemented only when the underlying user workflow, states, validation, permission behaviour,
responsive behaviour, accessibility baseline and verification evidence exist.
