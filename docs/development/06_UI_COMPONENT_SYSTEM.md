# UI Component System

**Date:** 2026-08-26  
**Scope:** the shared component system used by Back Office and POS  
**Specification:** [`../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md`](../ui-ux/01_COMMON_UIUX_DESIGN_SYSTEM.md)

## Decision

**Superseded for Back Office on 2026-08-27.** See
[`15_BACKOFFICE_SIDEBAR_SHADCN.md`](./15_BACKOFFICE_SIDEBAR_SHADCN.md).

The original decision was that Bizentra would use the shadcn/ui *idea* of owned, modular,
reusable components without adding the shadcn CLI or Tailwind, because the Business-selectable
theme engine is built on CSS variables and adding Tailwind would mean migrating that engine and
every existing screen first.

Back Office now runs Tailwind CSS v4 and the shadcn CLI alongside the existing stylesheet. POS also
uses the same Tailwind/shadcn foundation for its register dropdown, but deliberately does not adopt
the Back Office sidebar. The theme engine stayed authoritative: every shadcn token is derived from a
saved Business theme variable, so nothing about how a Business chooses its palette changed.
`packages/design-system` is still the owner of every shared `ui-*` component, so the rules below
continue to apply to every shared component.

## Where things live

| File | What it holds | Imported by |
|---|---|---|
| `packages/design-system/styles.css` | Every shared `ui-*` style: base, shell, layout, surfaces, controls, data, overlays, POS, states and responsive rules | Both application layouts |
| `packages/design-system/src/index.tsx` | Server-safe components and formatters | Any component |
| `packages/design-system/src/client.tsx` | `"use client"` components and hooks | Client components only |
| `packages/design-system/src/theme.tsx` | Business theme provider and cache | Both application layouts |
| `apps/*/src/app/globals.css` | Business theme defaults, Tailwind/shadcn token bridge and that application's own screens | Its own application |

Before this slice each application carried its own copy of the shared styles. They are now defined
once, so a table, chip or dialog cannot drift between Back Office and POS.

## Server-safe components

| Component | Purpose |
|---|---|
| `AppShell` | Shared content frame for app surfaces that do not provide their own product shell |
| `PageHeader` | Page title, description, visible status and actions |
| `Card`, `FormCard`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` | Shared surfaces; `FormCard` is a card that is also the form |
| `Kicker` | Small uppercase phase or context label |
| `KpiCard` | Dashboard metric with trend and comparison |
| `StatusCard` | Ready / planned / attention summary |
| `EntityHeader` | Identity, status, context and main actions on a detail page |
| `DescriptionList` | Label and value pairs on detail pages |
| `Stack`, `Row`, `Grid`, `Split`, `Toolbar` | Layout helpers so screens do not invent their own spacing |
| `Button` | Primary, secondary, ghost and danger, in quiet, normal and large sizes |
| `Badge`, `StatusChip` | State shown as text plus a semantic colour, never colour alone |
| `Progress` | Accessible progress indicator |
| `Field`, `SelectField`, `TextareaField`, `CheckField`, `FormGrid`, `FormFooter` | Labelled controls with hints and error text |
| `FilterBar` | Search, extra controls, actions and clearable active-filter chips |
| `DataTable` | Sticky header, optional kicker, toolbar, aligned numeric columns, row click, footer, and task cards below 768px |
| `Timeline` | Business history on a record |
| `MoneySummary` | Subtotal, discount, tax, paid and due in one aligned block |
| `StockBadge` | On-hand quantity with a semantic tone |
| `IntegrationState` | Connected, pending, failed or disabled external posting |
| `OfflineBanner` | Online, offline, syncing or needs-review with a pending count |
| `EmptyState`, `StatePanel` | Empty, loading, error, permission, offline and needs-review states |
| `Skeleton`, `SkeletonRows` | Loading placeholders |
| `ReceiptView` | Printable receipt with lines, totals, tax lines and tenders |
| `ApprovalDrawer`, `DangerConfirmation`, `PaymentSheet` | Presentational operational patterns |
| `SerialPicker`, `BatchExpiryPicker`, `BookingCalendar`, `WorkBoard`, `WorkTicketPanel` | Placeholders reserved for P5 engines |
| `formatMoney`, `formatQuantity`, `formatDateTime`, `cn` | Shared formatting so money and dates look the same everywhere |

## Client components and hooks

| Export | Purpose |
|---|---|
| `Dialog` | Modal with header, body and footer; Escape closes it |
| `Drawer` | Right-hand panel for record detail |
| `Sheet` | Bottom sheet used by the POS payment flow |
| `ConfirmDialog` | Destructive or financial confirmation that states the consequence and can require a reason |
| `Tabs` | Section navigation inside a screen, as a horizontal row |
| `VerticalTabs` | Section navigation as a left-hand rail, for screens whose sections are a list of record types; full tablist keyboard support, collapses to a scrolling row below 900px |
| `ToastProvider`, `useToasts` | Non-blocking result messages |
| `NumberPad` | Touch numeric entry |
| `useScanFocus` | Keeps the POS scan input focused, as section 6 requires |
| `useOnlineState` | Connectivity for the offline banner |
| `useDebouncedValue` | Search and live cart pricing without a request per keystroke |
| `createIdempotencyKey` | One stable key per POS action so a retry never posts twice |

Every overlay traps initial focus, closes on Escape, blocks background scrolling and becomes a
bottom sheet on phones.

## Rules for new components

1. A component belongs in the design system when a second screen would otherwise copy it.
2. Colours come from the Business theme variables, never from a literal value.
3. State is shown with text and shape, not colour alone.
4. Anything that uses a hook goes in `client.tsx`, so a server component can still import the rest.
5. Money and quantities use tabular numbers and the shared formatters.
6. A component ships with its empty, loading, error and permission behaviour, not only its happy path.

## Remaining work

- Component examples (Storybook or equivalent) and visual-regression snapshots.
- Automated accessibility assertions on the overlay and table patterns.
- Saved views, a column selector and a density switch for back-office lists.
- Real implementations for the P5 placeholders when those engines are built.
