# Tailwind v4 and shadcn/ui in Back Office and POS

**Date:** 2026-08-27
**Scope:** `apps/backoffice` and `apps/pos`. `packages/design-system` is untouched and still
owns every shared `ui-*` component.
**Supersedes:** the "no Tailwind, no shadcn CLI" decision in [`06_UI_COMPONENT_SYSTEM.md`](./06_UI_COMPONENT_SYSTEM.md).

## What changed

The hand-written `bo-shell` / `bo-sidebar` layout was replaced by the shadcn/ui `sidebar-07`
block: a sidebar that collapses to icons, with a switcher at the top, collapsible navigation
groups, a footer menu and a breadcrumb header. The switcher lists the **Branches** of the signed-in
Business and switching one re-scopes every Branch-aware screen.

## One-time install

Neither the sidebar primitives nor Tailwind can be vendored by hand, so they are installed with
the CLI. Run once, from the repository root:

```bash
pnpm install
cd apps/backoffice
pnpm dlx shadcn@latest add sidebar breadcrumb separator collapsible dropdown-menu avatar tooltip sheet skeleton button input
```

That is exactly the set `sidebar-07` pulls in (`sidebar`, `breadcrumb`, `separator`,
`collapsible`, `dropdown-menu`, `avatar`, plus what `sidebar` itself depends on). The block's own
demo composition is deliberately **not** installed, because `components/app-sidebar.tsx`,
`nav-main.tsx`, `nav-user.tsx` and `branch-switcher.tsx` in this repository are the Bizentra
adaptation of it and would be overwritten.

`components.json` is already committed, so the CLI writes straight into `src/components/ui`
without running `init`.

## How Tailwind coexists with the design system

`@bizentra/design-system/styles.css` is imported by the layout before `globals.css` and is
unlayered. Unlayered rules beat layered rules regardless of specificity, so Tailwind is imported
in pieces rather than as one `@import "tailwindcss"`:

| Layer | Holds | Effect |
|---|---|---|
| `theme` | Tailwind design tokens | Lowest priority |
| `base` | Tailwind preflight | Loses to the design system, so existing screens are untouched |
| `components` | Reserved | — |
| *(unlayered)* | Tailwind utilities | `.bg-sidebar` beats `button { color: inherit }` |

Without this split, preflight would reset the design system, or `button, input, select, textarea
{ font: inherit; color: inherit }` would silently defeat every Tailwind text utility inside the
sidebar.

## Theme tokens

Every shadcn token is derived from a saved Business theme variable in `globals.css`:

```css
--sidebar: var(--color-surface-elevated);
--sidebar-accent: var(--color-hover-background);
--sidebar-primary: var(--color-primary);
```

`@theme inline` is used deliberately: utilities compile to `var(--sidebar)` rather than to
`var(--color-sidebar)`, which keeps Tailwind's `--color-*` namespace from colliding with the
Business theme's own `--color-*` variables. There is no second palette and no `.dark` stylesheet —
the theme engine rewrites `--color-*` on `<html>` for dark mode, so the sidebar follows
automatically. `dark:` utilities are mapped onto the engine's `data-color-mode` attribute with
`@custom-variant`.

## Branch switching

| File | Responsibility |
|---|---|
| `src/app/lib/active-branch.tsx` | Loads Branches from `getBusinessFoundation`, keeps the active one, persists it per Business in `localStorage` |
| `src/components/branch-switcher.tsx` | The switcher in the sidebar header, with ⌘/Ctrl + 1-9 shortcuts |
| `src/app/lib/workspace.tsx` | `useResource` passes the active Branch id to every loader and re-loads when it changes |

The saved key is `bizentra.backoffice.active-branch.<businessId>`, so signing into a different
Business never inherits a Branch the user cannot see. Inactive Branches are listed but not
selectable, and are labelled as inactive in text rather than by colour alone.

`useResource` loaders now receive a third argument:

```ts
useResource((api, businessId, branchId) => api.listSales(businessId, { branchId }));
```

Existing two-argument loaders keep working unchanged.

## Page actions

`Workspace`'s `headerActions` render beside the page title, not in the breadcrumb bar. The bar is a
fixed `h-16` row, so `.ui-page-header-actions` — which wraps — had its second line clipped as soon
as the viewport narrowed or a screen passed more than two actions. The title row is free to grow,
so the actions drop below the title instead of disappearing. The breadcrumb bar now carries only
the sidebar trigger, the breadcrumb and the active Branch.

Pages keep passing design-system `Button`s and `ui-button` links; those classes are unchanged and
still follow the Business theme, so no screen needed editing.

### One header per screen

Every screen used to render a design-system `PageHeader` inside its own content *and* pass an
eyebrow, title and description to `Workspace`, so all fourteen showed two stacked headers with
near-identical weight — "Sales and shifts" immediately above "Selling activity", each with its own
description. Both sets of text came from the same page file, so this was a duplication in the
screens rather than in the shell.

The inner `PageHeader` is gone from every screen. What it carried that the shell did not now has a
slot on `Workspace`:

| Was | Now |
|---|---|
| `status` chip | `Workspace status={...}` — beside the title, in `.ui-page-header-title-row` |
| SRS range eyebrow, e.g. `CC-P2-001 to CC-P2-011` | `Workspace requirements="..."` — a quiet `.ui-code` tag next to the phase label |
| Second title and description | Dropped; the shell's were already the navigational ones, matching the sidebar and breadcrumb |

`PageHeader` itself stays in the design system. It is the right component for a *section* header
inside a long screen, and `.bo-screen-header` deliberately sits one size above it so that
relationship reads correctly. The dashboard is the one screen that lost real content — its inner
header showed the Business name — but the branch switcher at the top of the sidebar already names
the Business on every screen.

### Typefaces

`styles.css` had always asked for Inter, but nothing ever loaded it — no `@font-face`, no
`next/font`, no stylesheet link — so every Windows client silently rendered Segoe UI. That is why
the type looked subtly wrong everywhere rather than in one place: the heading tracking (-0.02em)
and the kicker tracking (0.08em) are tuned to Inter's metrics and read as stretched and loose in a
fallback face.

| Role | Face | Why |
|---|---|---|
| Interface | **Inter** | Drawn for UI at small sizes: tall x-height, unambiguous glyphs, real tabular figures. It was already the design's intent, so nothing had to be re-tuned. |
| Identifiers | **JetBrains Mono** | Shift numbers, register codes, SKUs. Disambiguated 0/O and 1/l/I, and a tall x-height so it sits level with Inter at the same size. |

Both are loaded with `next/font/google`, which self-hosts them at build time — no runtime request
to Google and no layout shift. Each layout puts `--font-sans` and `--font-mono` on `<html>`, and
`styles.css` consumes them through `--ui-font-sans` / `--ui-font-mono`, whose fallback stacks still
name Inter first.

`.ui-code` is the class for an identifier: mono, ligatures off, 0.94em so it sits level with the
surrounding sans. Use it for values a person reads character by character or compares down a
column — `COLA2-SHIFT-000003`, `REG2` — not for labels. `Kicker` stays in the sans face on purpose:
it holds words like "Role dashboard" as often as codes like "CC-P2-001", and splitting it by
content would be less consistent, not more. Money and quantities keep `tabular-nums` in the sans
face, which is what a finance surface wants.

### Theme flash on reload

Two independent faults made a saved theme flash the default light palette on every reload.

1. **The boot script ran too late.** It was mounted with `next/script` at
   `strategy="beforeInteractive"`, which the App Router hoists into the framework bootstrap — that
   runs *after* the first paint. Both layouts now render it as a raw inline
   `<script dangerouslySetInnerHTML>` in `<head>`, which the browser executes synchronously while
   parsing the document, before anything is painted.
2. **The provider overwrote it.** `settings` starts as `DEFAULT_BUSINESS_THEME` and the cached
   theme only arrives in a later effect, so the token-applying effect's first pass wrote the
   default palette straight over the values the boot script had already set, and the real theme
   only returned a frame later. That effect now returns early while `status` is `"idle"`, leaving
   the boot script's values untouched until a real source of truth exists. The stylesheet's own
   `:root` defaults still cover a genuinely themeless first visit, and clearing the Business
   identity strips the inline values so a stale palette cannot outlive its cache.

Fixing only the first would have left the flash in place, since the second happens after hydration
regardless of when the boot script runs.

### Theme switching cross-fade

`BusinessThemeProvider` sets `data-theme-transition` on `<html>` for 260ms whenever a theme is
applied **after** the first one, and `styles.css` transitions colour properties only — background,
border, colour, shadow, fill, stroke, outline — while that attribute is present. Layout and
transform are deliberately excluded so nothing shifts during the crossfade, and the whole thing is
disabled under `prefers-reduced-motion: reduce`. The first application is never animated: doing so
would recreate the very flash the boot script exists to prevent. The 260ms in `theme.tsx` and in
`styles.css` are two halves of one value and must be changed together.

### Hydration warning on `<body>`

Browser extensions — Grammarly is the common one — stamp attributes such as
`data-gr-ext-installed` onto `<body>` before React hydrates, which React reports as a mismatch it
cannot patch. Both layouts set `suppressHydrationWarning` on `<body>` for that reason; `<html>`
already carried it for the theme bootstrap script. This suppresses the attribute comparison on that
one element only, not anywhere inside the tree.

## Reference sections: rail, table, drawer

Screens that manage several kinds of reference record used to fan them out as a grid of small
cards — Catalog's Organization tab was six cards side by side, each with its own short table, so
none of the tables had the width to be readable and the eye had six places to look. Access did the
same with one card per permission area.

Those sections now follow one pattern:

1. **A rail** — `VerticalTabs` lists the record types down the left with a count on each, so the
   set is visible without scrolling and the labels are not truncated the way a horizontal row
   truncates "Prices and promotions".
2. **One table** — the selected type gets the full panel width, as a `DataTable` with a summary
   line rather than a card fragment.
3. **A drawer** — `onRowSelect` opens the design system's `Drawer`, which already slides in from
   the right, showing the record as a `DescriptionList`. Codes render in the `.ui-code` face.

| Screen | Rail sections |
|---|---|
| Catalog · Organization | Units, Unit conversions, Categories, Brands, Tags, Custom attributes |
| Catalog · Prices and promotions | Price lists, Promotions |
| Catalog · Tax and preview | Tax categories, Price and tax preview |
| Access · Permission catalogue | One per permission area |

`VerticalTabs` implements the tablist keyboard contract — up/down move, home/end jump, and only the
selected tab is in the tab order, so the rail is one stop rather than one per section. Below 900px
it becomes a horizontal scrolling row, because a 200px rail beside a table is worse than a table
with a row of tabs above it.

Row-opens-a-drawer is wired on Catalog's Organization tables and the permission catalogue. The
price list, promotion and tax rate tables still render as tables without a drawer; they are the
obvious next ones to give the same treatment.

## A table is not a card

`DataTable` renders its own header — a small kicker, the caption as a heading, and a `toolbar`
slot on the right. Twenty-four tables were nevertheless wrapped in a `Card` that drew a second
heading and a second description for the same thing, so a section read:

```
CC-P1-004
Units                       [Add]     <- card header
Units of measure                      <- card description
  TABLE
  Units of measure                    <- the table's own header, again
```

Those wrappers are gone. The table carries it all:

| Was | Now |
|---|---|
| `CardTitle` | `caption` |
| `Kicker` | `kicker` — previously hard-coded to the word "Table", which said nothing |
| Buttons in `CardHeader` | `toolbar`, so the action sits with the rows it acts on |
| `CardDescription` | `summary`, the footer line under the table |

`kicker` is a new optional prop on `DataTable`; it still defaults to "Table" for callers that pass
nothing. Nine now-unused `Card*` and `Kicker` imports were dropped with the wrappers.

`Card` is still right for a section that holds a form, a grid of tiles, or several things at once —
this only unwraps the cards whose entire content was one table. Three kept theirs deliberately:
Controls' audit history (a filter grid above the table), Sales' shift records (a description list,
not a table) and the Sales detail card.

Two further props came out of the P5–P8 screens, where the tables sit in the two-column
`ui-screen-grid` beside a create form:

- `className` on `DataTable`, so `ui-scroll-panel` moves from the card onto the table wrapper and
  the records still scroll independently of the form beside them.
- Business engines' local `Screen` helper no longer draws a card header. It was printing the
  section title three times — as a kicker, as the card title, and again as the table's caption.

Across the Back Office, 41 tables were unwrapped and 49 of 61 now carry a meaningful kicker
instead of the word "Table".

## Responsive behaviour

| Width | Sidebar |
|---|---|
| Desktop, expanded | Full sidebar; state saved to the `sidebar_state` cookie and rendered on the server so it does not flash open |
| Desktop, collapsed | Icon rail with tooltips; group labels and badges hide |
| Mobile | Off-canvas sheet opened by the header trigger, closing on navigation |

## Verification

The implementation is installed and checked in for both applications:

| Package | Verification |
|---|---|
| Workspace | `pnpm format:check` |
| `@bizentra/design-system` | `pnpm --filter @bizentra/design-system build`; `pnpm --filter @bizentra/design-system typecheck`; `pnpm --filter @bizentra/design-system lint`; `pnpm --filter @bizentra/design-system test` |
| `@bizentra/backoffice` | `pnpm --filter @bizentra/backoffice typecheck`; `pnpm --filter @bizentra/backoffice lint`; `pnpm --filter @bizentra/backoffice test`; `pnpm --filter @bizentra/backoffice build` |
| `@bizentra/pos` | `pnpm --filter @bizentra/pos typecheck`; `pnpm --filter @bizentra/pos lint`; `pnpm --filter @bizentra/pos test`; `pnpm --filter @bizentra/pos build` |

## Lint and format

`apps/*/src/components/ui/**` is excluded from ESLint and Prettier, the same way
`packages/database/src/generated/**` is, because those files are verbatim registry output.
`tsc` still type-checks them. Delete the two ignore entries if the team decides to hand-own them.



## Three fix-ups this stack needs

These are not optional polish; without them the dev server returns 500 and `typecheck` fails.

### 1. Animations are vendored, not imported from node_modules

`tw-animate-css` publishes an exports map with only a `style` condition and **no `default`**:

```json
"exports": { ".": { "style": "./dist/tw-animate.css" } }
```

When Tailwind's CSS resolver does not pass that condition, `@import "tw-animate-css"` fails
outright — the package resolves to nothing even though it is installed and linked. The symptom is
`Can't resolve 'tw-animate-css' in .../src/app`, which is misleading, because the package is
present.

The file is therefore vendored to `apps/*/src/app/tw-animate.css` and imported by relative path,
which takes the resolver out of the picture. It is 15 KB of `@theme` and `@utility` declarations
with no imports of its own. To upgrade, re-copy it from the package and keep the header comment.
It is excluded from Prettier because it ships minified.

### 2. `@tailwindcss/postcss` must also exist at the workspace root

Turbopack resolves PostCSS plugins relative to the CSS file being transformed. Both applications
import `packages/design-system/styles.css`, which lives outside either app, so the plugin is looked
up from `packages/design-system` and is not found there — `Cannot find module
'@tailwindcss/postcss'`. Adding `tailwindcss` and `@tailwindcss/postcss` to the **root**
`package.json` devDependencies makes the lookup succeed from anywhere in the monorepo. The apps
keep their own copies as well.

### 3. `dropdown-menu.tsx` needs one line changed after every `shadcn add`

`tsconfig.base.json` sets `exactOptionalPropertyTypes: true`. The generated
`DropdownMenuCheckboxItem` destructures an optional `checked` and passes it to a primitive whose
`checked` is not optional, which `tsc` rejects. The fix keeps the uncontrolled behaviour:

```tsx
{...(checked === undefined ? {} : { checked })}
```

Re-apply it if `dropdown-menu` is ever re-added. It is the only file in the registry output that
this repository's stricter compiler settings reject.

## POS

POS adopted the same foundation on 2026-08-27 but **not** the sidebar. Its own stylesheet states
the reason — *"The POS is a distraction-free surface: no sidebar, and controls stay thumb-sized"* —
and `pos-session.tsx` already binds a Branch per terminal through `useRegister()`, *"the way a real
till would"*. A freely-switchable Branch dropdown would contradict that binding, so POS keeps
`ui-pos-shell` and gets a register bar instead.

| Piece | POS | Back Office |
|---|---|---|
| Tailwind v4, layered the same way | Yes | Yes |
| Business theme token bridge | Yes | Yes |
| `@/*` alias, `components.json`, `lib/utils.ts` | Yes | Yes |
| shadcn primitives | `button`, `dropdown-menu`, `separator` | Full `sidebar-07` set |
| Sidebar / nav shell | No | Yes |
| Branch control | Per-terminal binding, re-bind guarded | Free switcher |

### The register bar

`src/components/register-bar.tsx` replaces the plain register text in both POS topbars. It shows
the bound Branch and register, and re-binding is:

1. **Refused while a shift is open.** The menu item is disabled and says which shift to close
   first, because every sale and the drawer count belong to that shift's Branch and register.
2. **Confirmed when allowed.** It uses the design system's `ConfirmDialog` rather than a shadcn
   alert dialog, so the confirmation becomes a bottom sheet on a phone-sized till, which is what
   the shared overlay rules require of a touch surface.

Re-binding clears the terminal's saved selection, which drops it back to the open-shift form where
a Branch and register are chosen again. Nothing already recorded is altered.

#
## POS install

```bash
pnpm install
cd apps/pos
pnpm dlx shadcn@latest add button dropdown-menu separator
```

Only what the register bar needs is installed; adding more later is one more `shadcn add`. Close
any editor or `next dev` holding `src/app/globals.css` first — the CLI tries to rewrite that file
last, and on Windows a lock surfaces as `UNKNOWN: unknown error, open ... globals.css`. That write
is unwanted here in any case: it would replace the layering above with a plain
`@import "tailwindcss"` and its own palette, disconnecting the components from the Business theme.
If it fails at that step, the component files are already written and the run can be treated as
successful.

## Remaining work

- Point Branch-scoped screens (`/sales`, `/inventory`, `/finance`) at the third `useResource`
  argument; today they still request Business-wide data.
- Add the real signed-in user to the footer menu once a current-user endpoint exists; it currently
  shows the workspace and a truncated user id.
- Visual-regression coverage for the expanded, collapsed and mobile sidebar states.
