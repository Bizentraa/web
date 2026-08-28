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

Every screen used to render a design-system `PageHeader` inside its own content *and* pass title,
description and an eyebrow to `Workspace`, so all fourteen showed two stacked headers with
near-identical weight — "Sales and shifts" immediately above "Selling activity", each with its own
description. Both sets of text came from the same page file, so this was a duplication in the
screens rather than in the shell.

The inner `PageHeader` is gone from every screen. What it carried that the shell did not now has a
slot on `Workspace`:

| Was | Now |
|---|---|
| `status` chip | `Workspace status={...}` — beside the title, in `.ui-page-header-title-row` |
| Internal requirement range eyebrow | Removed from the Back Office screen API and no longer rendered in the product UI |
| `Workspace eyebrow` | Removed from the Back Office screen API; breadcrumbs derive their section from the sidebar route map |
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
it carries short product contexts such as "Role dashboard", "Shift" or "Prices". Internal
requirement IDs, phase IDs and story IDs stay in development documents and should not return to
operator-facing navigation, page headers, kickers or table labels. Money and quantities keep
`tabular-nums` in the sans face, which is what a finance surface wants.

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

`DataTable` renders its own header — the caption as a heading and a `toolbar` slot on the right.
Twenty-four tables were nevertheless wrapped in a `Card` that drew a second heading and a second
description for the same thing, so a section read:

```
Units                       [Add]     <- card header
Units of measure                      <- card description
  TABLE
  Units of measure                    <- the table's own header, again
```

Those wrappers are gone. The table carries it all:

| Was | Now |
|---|---|
| `CardTitle` | `caption` |
| Buttons in `CardHeader` | `toolbar`, so the action sits with the rows it acts on |
| `CardDescription` | `summary`, the footer line under the table |

The later cleanup removed `DataTable`'s `kicker` prop entirely. The table header now has one text
label, its caption, which keeps tables from carrying a second small label that repeats the screen
or record type. Nine now-unused `Card*` and `Kicker` imports were dropped with the wrappers.

`Card` is still right for a section that holds a form, a grid of tiles, or several things at once —
this only unwraps the cards whose entire content was one table. Three kept theirs deliberately:
Controls' audit history (a filter grid above the table), Sales' shift records (a description list,
not a table) and the Sales detail card.

Two further props came out of the later operations screens, where the tables sit in the two-column
`ui-screen-grid` beside a create form:

- `className` on `DataTable`, so `ui-scroll-panel` moves from the card onto the table wrapper and
  the records still scroll independently of the form beside them.
- Business engines' local `Screen` helper no longer draws a card header. It was printing the
  section title three times — as a small label, as the card title, and again as the table's caption.

The four main list screens — Sales, Catalog, Customers, Suppliers — each wrapped their primary
table in `<Card flush>`, which is `.ui-card` with its padding removed: a border, radius, background
and shadow drawn immediately around `.ui-table-wrap`, which already has all four. Those wrappers
are gone too.

Those same four used the row count as the table's *title*: `caption={`${data.customers.total}
customer(s). Click a row to open the record.`}` rendered as the bold heading. A caption is a title,
so it is now the record type — "Sales", "Items", "Customers", "Suppliers" — with the count and the
hint moved to `summary`.

All 61 tables in the Back Office now rely on `caption` alone, and no caption is a sentence.

### Import: two tabs instead of one long page

Import was the last screen with no section navigation — the wizard, the validation preview and the
history of past runs all stacked on one scroll. Doing an import meant scrolling past the history;
checking the history meant scrolling past the wizard.

It now carries the same horizontal `Tabs` row every other screen uses:

| Tab | Holds |
|---|---|
| Import | Step 1 choose a file, Step 2 the validation preview |
| History | Past imports, badged with the run count |

The two steps stay together because they are one task — validate then apply — and the preview is
meaningless without the file that produced it. The history table uses its caption alone, since the
tab above it already says History.

### Tab icons

`tabIcon` guessed an icon from keywords in the label and fell through to one generic grid badge for
anything it did not recognise. Sixteen tabs shared that badge — Organization, Tax and preview,
Locations, Features, Numbering, Fulfillment, Traceability, Warranty, Recipe / BOM, Routes,
Messages / docs, Conflicts, Exports, Migration, Backup / DR, Privacy and Release.

Tab labels are a closed set, so they are now mapped explicitly in `TAB_ICONS`. All 55 static tab
labels across the Back Office have their own icon, and no icon repeats within a single tab row.
The keyword pass survives only as the fallback for labels that come from data, such as the
permission areas on the Access screen.

`VerticalTabs` and `Tabs` share the resolver, so the rails and the rows draw from the same map.

### Active tab animation

There is **one** indicator per tab strip and it travels to the selected tab, rather than one
underline per tab fading in and out in place.

`useSlidingIndicator` measures the selected tab's `offsetLeft`/`offsetWidth` (or
`offsetTop`/`offsetHeight` on the rail) and writes them as an inline `transform` and size; CSS
animates the movement over 340ms on a slightly overshooting curve, so the bar settles the way a
spring would. Only `transform` and one dimension change, both compositor-friendly, which matters on
a till.

Three details that are easy to get wrong:

- The indicator stays at `opacity: 0` until the first measurement, so it never flashes at the left
  edge during load.
- `[data-travel]` is absent for that first placement, so the bar appears already in position
  instead of sliding in from nowhere on every page load.
- The tabs themselves are observed by the `ResizeObserver`, not just their container, because web
  fonts land after first paint and change tab widths.

No animation library is involved. A `framer-motion` version of this is a common pattern, but it
would add a dependency the design system does not otherwise need, and its usual styling — a
gradient pill with a blur glow — cannot follow a Business theme, which rule 2 of the component
system requires. Colour here is `--color-primary` like everything else.

Below 900px the rail becomes a horizontal row, so its indicator is hidden: a bar measured from
`offsetTop` would sit in the wrong place, and the selected tab still reads from its filled
background. Under `prefers-reduced-motion: reduce` both indicators keep the opacity fade and drop
the movement.

### Filters belong to the table

Search, the status select and the "New …" button lived in a separate `FilterBar` card floating
above the list, so a screen showed two bordered panels for one thing: a control that filters rows,
and the rows it filters, in different boxes.

`DataTable` now takes them directly:

| Prop | Renders |
|---|---|
| `search` | `{ value, onChange, placeholder?, label? }` — the search field, first control in the row |
| `filters` | Extra controls beside it, typically `SelectField`s |
| `chips` | Clearable active-filter chips |
| `toolbar` | The primary action, on the title row at full size |

The action is deliberately **not** `size="quiet"`. A list's main action — New supplier, New item — is
the primary action on that screen, and the quiet size made it read as an afterthought. Eight table
actions across the Back Office were sized down that way and are now full size.

Four screens used `FilterBar` — Sales, Catalog, Customers, Suppliers — and none do now.
`FilterBar` stays exported for a future screen that filters something other than a table.

No API or database change was needed for any of this: searching and filtering already happened
through the existing list endpoints, and only where the controls are drawn changed.

### Shifts as a table

The Shifts tab rendered one `Card` per shift, each with its own description list and its own
tenders table. Ten shifts meant ten stacked cards and ten small tables, with no way to compare a
cash difference across them - the one thing that tab exists to answer.

It is now a single table, one row per shift, with the columns a manager reconciles against: shift
number, Branch, register, who opened it and when, sale count and total, expected cash, and the
difference as a badge that turns amber the moment it is not zero. Selecting a row opens the full
reconciliation in the drawer.

It also has its own search and status filter, applied in the page over the list `listShifts`
already returns rather than through a new request.

**`cashMovements` was in `ShiftSummary` and rendered nowhere.** Pay-ins, pay-outs and drops are
exactly what move expected cash away from "sales alone", so a difference could not be explained
from the screen. The drawer now shows them as their own table beside the tenders.

## One control height

Six different heights had accumulated across buttons and form controls, because every rule
hard-coded its own: 28px (quiet button), 30px (POS quantity stepper), 32px (colour swatch), 34px
(button, field), 36px (filter bar, pagination), 38px (table search, and POS's own override), 40px
(large button), 42px (POS scan input). A button never lined up with the field beside it.

There is now one token, `--ui-control-height: 34px`, defined beside the font tokens in
`styles.css` and used by every control in both applications. Fourteen rules read it; none carries
its own number.

POS no longer overrides it. It previously pushed buttons and fields to 38px for touch, so the same
control was a different height in the two applications; it now inherits the token like everything
else.

Three heights are deliberately **not** on the token, because they are not form-row controls:

| Selector | Height | Why |
|---|---|---|
| `.ui-section-nav a` | 46px | A tab, sized for its underline and label, not a control |
| `.ui-data-tabs button` | 44px | Same |
| `.ui-numberpad button` | 48px | A touch keypad for entering cash on a till. Shrinking it to 34px would be a real regression at the point of sale |

Note that 34px is above the WCAG 2.5.8 minimum target size (24px) but below the 44px enhanced
guidance, which is worth knowing for the POS surface specifically. Changing the value for one
application is now a single line.

## Managing people

The Users tab listed name, email and a comma-joined string of Role names, and every change went
through a Manage dialog. Changing one person's Role took four interactions.

It now works the way a share-access panel does, in this application's idiom:

- **A person cell** - `Avatar` initials beside the name, with the email beneath it, instead of two
  separate columns.
- **An inline Role control** - a `.ui-inline-select` in the row that calls
  `updateMembership({ roleIds: [id] })` directly. It stays quiet until hovered so a column of them
  does not read as a wall of form fields.
- **Status actions that match the state** - Activate for an invited person, Suspend for an active
  one, Restore for a suspended one. Suspend and Restore were reachable only through the dialog
  before, though `updateMembership` has always accepted `status`.

### The invite dialog

Roles and Branches were `<select multiple size={5}>` with the hint *"Hold Ctrl or Cmd to choose
more than one Role."* A native multi-select hides its state behind ctrl-click, drops the whole
selection on one stray click, and is close to unusable on a touch screen. Both are now
`.ui-choice-list` grids of `CheckField`s with a visible selected state
(`.ui-check-field:has(input:checked)`), so what is chosen is simply visible and tappable.

The rest of the dialog:

- **A preview** at the top — avatar, name, email — showing the row this invitation will become in
  the people list.
- **The email first**, because it is the address the person signs in with; the name is second and
  the email's local part fills its *placeholder* as a suggestion. It is a placeholder, not a value,
  so the field can still be cleared.
- **Controlled state and a guarded submit.** The form previously accepted an empty submission and
  let the server reject it. `Send invitation` is disabled until there is a plausible email and a
  name of at least two characters, which is what `inviteUserSchema` requires.
- **A footer that states the consequence** — who joins, with how many Roles, and a warning in place
  of it when no Role is selected, since a person with no Role can sign in and see nothing.
- **Branches say "Every Branch"** when none are ticked. Previously an empty selection silently
  meant "all", explained only in a hint under the control.

### Viewing a person after they are invited

The Manage drawer - what opens when you click into a person from the list - had the same two
`<select multiple>` controls the invite dialog had, plus a bare status select. Inviting someone and
then editing them were two different experiences of the same data.

It now mirrors the invite dialog exactly: the same preview row at the top, the same
`.ui-choice-list` Roles and Branches with the same "Every Branch" wording, the same guarded save,
and the same consequence line in the footer.

Two things the drawer gained that the dialog did not need:

- The status select **explains what it means** — an invited person cannot sign in until activated,
  a suspended one keeps their history but cannot sign in. The three values were previously offered
  with no indication of their effect.
- It opens from the membership's **current** values. It was `defaultValue` on uncontrolled inputs,
  which is correct on first open but silently stale if the record changed underneath; `openUser`
  now seeds the form state from the row being clicked.

There is no `<select multiple>` left anywhere in the Back Office.

### An account never administers itself

The signed-in user's row shows "(you)", its Role control is disabled, and its actions read "Ask
another administrator".

This is not cosmetic. Without it an administrator can drop their own Role, or suspend themselves,
and lock themselves out of the screen they are standing on - and the server accepts it, because
each request is individually legitimate. The membership rules stop the *Business* losing its last
Owner; nothing stopped a person removing their own access. The guard is `member.userId ===
identity.userId`, checked in both the Role control and the actions cell.

`Avatar` is new in the design system. It renders initials rather than an image: this product has
no uploaded photographs, so an avatar is a derived label, which means no request to make and
nothing to fail to load.

## Sidebar polish

Three things were wrong, and the first was the one that mattered.

**Active and hover looked identical.** shadcn maps both onto `--sidebar-accent`, and the token
bridge points that at `--color-hover-background`. So while the pointer was over any item, that item
looked exactly like the current page, and there was no way to tell where you actually were.
Active is now the Business primary at 12% with primary text and icon; hover stays neutral.

**No indicator.** Active items now carry a 3px accent bar that grows to 1.15rem over 300ms - the
same curve and language as the tab indicators, so selection reads the same way everywhere. The bar
sits inside the button's own left padding, because `SidebarContent` is `overflow-auto` and a
negative offset would be clipped or add a horizontal scrollbar. In icon-collapsed mode it is
hidden, where the fill carries the state alone.

**Two items shared an icon.** Reports and Production both used `ShieldCheck`, adjacent in the same
group. Reports is now `ListOrdered`, matching the Reports tab; Store reliability took
`MonitorSmartphone` from the Devices tab, Finance `CircleDollarSign` from the finance tabs, and
Appearance `Palette` instead of a generic cog. Where a concept appears both in the sidebar and as a
tab, the two now draw the same glyph.

Group labels are quieter and more spaced, and the old phase tags were removed so the sidebar reads
as product navigation rather than build metadata.

All of this is CSS against shadcn's `data-slot` hooks in `globals.css`, not edits to the vendored
component, so a future `shadcn add sidebar` remains a drop-in. It is colour and motion only; no
layout is changed.

## Scrollbars

### A stray vertical scrollbar on the tab row

`.ui-section-nav` set `overflow-x: auto` and nothing for the other axis. CSS does not let the axes
disagree: if one is not `visible`, the other computes to `auto`. The sliding indicator sat at
`bottom: -1px`, one pixel outside the padding box, and that pixel was enough to raise a full
vertical scrollbar on a 46px-tall row.

Both axes are now stated - `overflow-x: auto; overflow-y: hidden` - and the indicator moved to
`bottom: 0` so nothing hangs outside a box that now clips. `.ui-data-tabs` and the mobile vertical
rail got the same treatment, since they are the same shape of element.

`.ui-table-wrap` deliberately keeps only `overflow-x`. It is combined with `.ui-scroll-panel`
(`overflow: auto`) on the later operations screens, and pinning its vertical axis to `hidden` would stop those
panels scrolling.

### Themed scrollbars

Windows and Linux draw classic scrollbars that occupy real layout width and sit there in grey
whether or not anything is being scrolled, so every scroll area looked heavier than the same area
on macOS. Scrollbars are now thin, themed from `--color-text-muted`, with a transparent track and
a rounded thumb that darkens on hover.

The sidebar goes further: its thumb is transparent until the pointer is over the sidebar, or
something inside it takes focus. It is chrome a person looks at constantly rather than reads
through, so a permanent bar down its edge is noise.

They are styled, not removed. A scroll area with no visible affordance is a genuine accessibility
problem for anyone who cannot tell the content continues, so `scrollbar-width: none` is used
nowhere.

## Appearance screen

This screen predated the design system and never joined it: raw `<button className="theme-primary-button">`,
raw `<select>` inside `label.theme-field`, its own panel, kicker, message and save-bar styles. It
was the one screen that did not look like the product.

It is now built from `Card`, `Field`, `SelectField`, `CheckField`, `Button`, `Badge` and `Kicker`
like everything else, in the two-column `ui-screen-grid` the later operations screens use: choices on the
left, a sticky panel on the right.

### The preview is the real thing

The old "Live workspace preview" was three swatches and a mode label. The new one renders a small
piece of the actual interface - rail, active nav item, top bar, a KPI card with two buttons, and a
row of status chips - inside a wrapper carrying the draft's resolved tokens as inline custom
properties. Nothing is duplicated and there is no iframe: the wrapper is simply a scope where
`--color-*` means something different from the surrounding page.

It calls `resolveTheme` and `themeTokensToCss`, the same functions the provider runs on every real
theme change, so it shows the derived values - hover, soft fills, readable foreground on the chosen
primary - that three swatches cannot. A light/dark toggle checks both, which matters because
`allowUserModeChange` lets a terminal pick its own.

### Saying what will happen

- **Unsaved changes are visible.** The panel compares the draft with the saved settings, titles
  itself "Unsaved changes" or "Saved", and Save is disabled when nothing has changed. Previously the
  button was always live and there was no way to tell whether the screen matched the database.
- **Status colours are stated as fixed**, in the preview where the claim can be checked, rather
  than buried in body copy.
- The development identity moved to its own panel at the bottom of the sidebar column instead of
  leading the page with a raw UUID above the actual settings.

## Dark borders

Dark borders were louder than light ones rather than equivalent. Measured against their own
surface:

| | Surface | Border | Contrast |
|---|---|---|---|
| Light | `#FFFFFF` | `#E2E8F0` | 1.23:1 |
| Dark, before | `#111827` | `#334155` | **1.71:1** |
| Dark, after | `#111827` | `#26324A` | 1.38:1 |

So every card, table and input read as *outlined* in dark where it read as merely *separated* in
light. `borderStrong` moved from `#475569` (2.34:1) to `#334155` (1.71:1) on the same reasoning.

They are not taken all the way down to light's 1.23:1: dark surfaces sit closer together
perceptually, and a border much below this stops being visible at all. 1.38:1 is the point where
the two modes feel like the same design.

`THEME_CACHE_VERSION` went to 2 with this change. The boot script paints from cached tokens before
React runs, so without the bump a returning device would show the old borders for a frame before
the provider recomputed them.

## One loading skeleton

`SkeletonScreen` drew a title and description block — but the screen header renders immediately
from static props, above wherever the skeleton appears, so that was a second ghost title beneath
the real one. It is gone.

What is left matches what actually loads: the metric row, the section tabs, and the table with its
own header and filter row. The tab row is new; without it a screen appeared to *gain* a row of tabs
at the moment it finished loading, which read as the layout jumping.

Every screen now renders `<SkeletonScreen />` with no arguments. It previously took `rows={6}` on
the dashboard and `rows={5}` elsewhere, so the loading state changed shape between screens for no
reason a person could see. POS uses the same one.

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

### The selling screen

The till was rebuilt on 2026-08-28. The shell, the two panels and the money block were already
there; what changed is what each one is allowed to hold, and the order a cashier reads them in.

**One instrument, three rules.** Nothing scrolls except the two lists a cashier actually reads -
the product grid and the ticket lines. `ui-pos-shell` is `height: 100dvh; overflow: hidden`
(`dvh`, not `vh`: a mobile browser shrinks the viewport when the address bar appears), and every
descendant carries `min-height: 0` so a long list scrolls inside its panel instead of pushing the
scan field or the pay button off the screen. Money is always the largest thing on screen, always
tabular, always in the same place. Anything the shell shows *instead* of the selling layout - the
shift form, the skeleton, the missing-identity panel - goes in `ui-pos-fallback`, which owns the
scroll the shell refuses.

**The header answers four questions and offers no fifth.** `PosTopbar` is shared by selling and
returns so both carry the identical bar: which register am I, is a shift open, am I online, what
time is it. Selling and Returns are a two-stop segmented control rather than a menu, because a
cashier reaches for them without reading. The clock is not decoration - a receipt dispute is
always about a time.

**Full view.** The `Maximize2` control sits next to the scan field, not in the header, for the
obvious reason that the header is the thing it hides. It sets `data-focus="true"` on the shell,
which drops `ui-pos-topbar` entirely, and asks the browser for real fullscreen so a wall-mounted
terminal loses its address bar too. That request can be refused - it needs a user gesture, and
kiosk builds disable it - so the layout change stands on its own and a `fullscreenchange`
listener brings the header back when fullscreen ends by Escape or a system gesture.

**Products.** The grid now shows the catalogue by default rather than only after a search:
`searchSellableItems` already returned rows for an empty term, so the empty state was self-imposed.
Category chips filter it, which needed `categoryId` on `PosCatalogEntry` and on
`catalogSearchSchema`, applied in the Prisma query so the result limit stays honest. A tile
already in the ticket carries its quantity and a tinted border, so a cashier does not double-add
by accident.

**The ticket.** Customer, discount and coupon used to sit below the cart, between the lines and
the totals, which put setup in the middle of money. The customer is now a single row at the top of
the panel; discount and coupon collapse into `ui-pos-options`. What is left is a straight run from
lines to totals to amount due to Pay - the only sequence read under pressure. Each line gained a
stepper and its own remove control instead of relying on stepping the quantity down to zero.

### Taking the money

`PaymentDrawer` replaces the payment sheet. The sheet asked a cashier to fill in a form: pick a
method from a select, type an amount, type a reference, press a button. A till does the opposite -
it starts with the answer. The amount is pre-loaded with what is still due, so one tender for the
exact total is a single press, and the pad is only touched when the customer hands over something
else. Cash is treated as the special case it is: the notes a customer is likely to be holding
(the next 5, 10, 20, 50, 100) are offered as one-press amounts and the change is computed live and
shown beside the amount, so it is read off the screen rather than worked out while a queue waits.
A reference field appears only for the methods that have one to record.

The design system's `NumberPad` had been shipped and never used in this flow; it is the pad here
and in the close-shift drawer. The drawer also has a normal amount input above the pad. It receives
focus when Payment opens, and because numeric fields select their full value on focus, a cashier
can click Pay on `98`, type `100`, and immediately see the cash change without deleting first.
`Drawer` gained a `wide` prop so the pad can sit beside the tender list, and collapses to one
column below 1200px.

### Closing the drawer

The old dialog pre-filled counted cash with the expected figure, which quietly invites accepting
it without counting: the one number the close exists to capture was already filled in. The field
now starts empty, receives focus when the drawer opens, can be typed directly or entered on the
pad, and the difference is named the moment it stops being zero - **balanced**, **over** or
**short**, each with its own tone - so nobody works it out in their head and nobody discovers it
the next morning. A difference always carries a reason, and the button says which step is missing
rather than failing on submit.

### Returns

The screen follows the counter conversation: find the sale, agree what is coming back, agree what
the customer gets. Lines are chosen with the same stepper the ticket uses, capped at what is still
returnable, and the disposition select appears only on a line that has something coming back. The
refund is priced line by line from what was actually paid (`lineTotal / quantity x returned`) and
shown before anything is committed, labelled an estimate because the server settles promotions,
tax and rounding. Refunding more than is left on the sale, and store credit on a walk-in, are both
caught on screen instead of by a rejected request.

### Every device

| Width | Layout |
|---|---|
| 1440px and wider | Products beside a 360px+ ticket column |
| 1024px to 1439px | Same, narrower ticket |
| 1199px and below | Payment pad drops below the tender list |
| 1023px and below | One column; the ticket becomes a bottom sheet summoned by a fixed cart bar |
| 767px and below | Two-up tiles, icon-only navigation, no clock, tighter panels |

Below 1023px the ticket is summoned rather than always shown, because a till at that width is held
rather than sat at: `ui-pos-cartbar` carries the two numbers that matter and the button that opens
the sheet, `ui-pos-scrim` and `ui-pos-ticket-close` close it. The sheet is rendered at every width
and only transformed off-screen, so its state, focus order and the quote it is displaying survive
a rotation. Z-order is cart bar 40, scrim 44, sheet 45, below the shared `ui-overlay` at 60, so a
dialog always wins.

One touch-specific rule: `useScanFocus` is switched off behind `useMediaQuery("(pointer: coarse)")`.
A hardware scanner types into whatever holds focus, so on a desktop till the scan field claims it;
on a tablet that same claim throws the on-screen keyboard over the product grid every time a
dialog closes.

### Six things the first pass got wrong

Screens from a real till at four widths turned up six defects, all of them in the same family:
a control that moves, or a control that is somewhere the screen cannot show it.

**The navigation drifted between screens.** The header spaced its three groups apart with
`justify-content: space-between`, so Sell/Returns sat wherever the side groups left room - and
selling carries Held carts and Close shift while returns carries neither. The one control a
cashier reaches for without looking was never twice in the same place. The bar is now a grid,
`minmax(0, 1fr) auto minmax(0, 1fr)`, with named areas: two equal side tracks pin the centre track
to the middle of the bar whatever the sides hold. Measured at 1280px, 1023px and 768px, the nav's
centre is within a pixel of the viewport's on both screens.

**The terminal menu opened off the left edge.** The register bar is the leftmost control on the
header and its menu was `align="end"`, which anchors a menu's right edge to the trigger's - so it
extended left, past the viewport. It is `align="start"` now.

**Accept return sat under the bottom of the screen.** The returns detail put lines, refund method,
reason, totals and the estimate in one unbounded column; the only control the screen exists for
was pushed past the panel. The form is now `ui-pos-form`, a flex column that fills the panel, with
everything above the action row in `ui-pos-scrollbody` and the action row pinned as the last
child. The lines inside it use `ui-pos-lines`, which does not scroll, because a scroll region
nested inside a scroll region is a trap.

**The whole returns screen was clipped on a narrow till.** Below the ticket breakpoint the layout
collapses to one column, and returns has two in-flow panels where selling has one - the ticket is
`position: fixed`. The second panel simply ran off the bottom of a shell that is
`overflow: hidden`. The summoned-sheet behaviour is now a class of its own, `ui-pos-summoned`,
shared by the selling ticket and the returns detail: choosing a sale opens the sheet, the scrim
and the chevron close it. `ui-pos-shell[data-cartbar="true"]` scopes the 76px of bottom room to
the screen that actually has a cart bar, and only once a shift is open.

**The phone header wrapped into three ragged rows.** Register, shift, status, actions and the
navigation cannot share 375px. The header is two rows there - `"start end"` over `"nav nav"` -
which costs 38px, buys back the navigation's labels, and turns the two destinations into
thumb-sized halves of the screen. Above that, the header folds rather than wraps: the clock goes
at 1279px, then the words on the action buttons, each of which keeps its icon and its accessible
name. The shift chip drops to its serial at 1023px, which is what would otherwise tip a tablet's
single-row bar over the edge.

**The shift code was set as a heading.** "Close shift COLA2-SHIFT-000003" made the code the
hardest thing on the panel to read back over a counter, in a face where 0/O and 1/l are the whole
point. The heading says what the panel does; the code sits under it as a `ui-pos-shift-id` chip in
the mono face the rest of the product uses for identifiers. The uncounted drawer reads as an empty
count rather than a fake zero.

Verified in a real browser rather than by inspection: at 1280, 1023, 768 and 375px, on both
screens, `document.documentElement.scrollWidth` equals the viewport width and the shell's height
equals the viewport's - nothing overflows in either axis at any of them.

### State that outlives the screens

Selling and returns are two routes, and a route change unmounts the page component. With every
piece of state inside the pages, stepping across to check a refund threw the whole terminal away:
the open ticket, the product grid, the reference data, the current shift and the offline queue all
reset, six requests re-ran, and the header flashed "Register not set" and "No shift" on the way
back. A cashier saw the till reboot every time they touched the navigation.

A layout is **not** unmounted when its children change, so `PosWorkspaceProvider` is rendered in
`app/layout.tsx` and holds everything: the terminal binding, the shift, the offline queue, the
reference data and customer list, the catalogue search and its results, the ticket with its quote
and tenders, the full-view mode, and the returns search, list and open sale. The pages read from
`usePosWorkspace()` and own only their event handlers.

Two consequences worth stating. The ticket now survives a trip to Returns, which is the behaviour
a counter actually needs - a customer asks about a refund halfway through a sale. And the requests
are keyed to what they genuinely depend on, so the catalogue refetches when the Business, the
bound register, the search term, the category or the customer changes, and at no other time.

Verified in the browser: text typed into the returns search survives Returns → Sell → Returns as
soft navigations, and three route changes in a row issue no API request at all.

### Loading looks like the thing that is coming

`pos-skeletons.tsx` holds the till's loading shapes, each one the real component with its text
removed: the same grid, the same row height, the same number of items, reusing the shared
`.ui-skeleton` shimmer so a POS placeholder animates in step with a Back Office one. The catalogue
gets a grid of tile skeletons, the returns list gets rows, an opening sale gets its lines, held
carts get rows, and the first moment of the selling screen gets both panels at once.

One rule about when they show: only on the **first** fill. Once the product grid holds something,
refining a search leaves it on screen and swaps the rows underneath, because blanking a grid a
cashier is reading is worse than a moment of slightly stale prices.

### The shift moved into the terminal menu

A chip wide enough to read "Shift COLA2-SHIFT-000003" spent the left half of the header on
something a cashier checks perhaps twice a day - and in the second before the terminal had asked,
it read as an alarm: "No shift" in warning orange, on a till that was merely still loading.

The register control carries a dot instead, lit green when a shift is open. The menu behind it
holds the rest: the shift number in the mono face, when it opened, how many sales have gone
through it, what it has taken and what the drawer should hold. Whether a shift is open is now
answered by a glance at the dot; everything else is one click away, which is the right cost for
something read twice a day. A terminal with no Business configured gets one centred card with the
single instruction that fixes it, rather than a full-width bordered panel that read as a fault.

### The tickets that hold a shift open

`PosService.closeShift` counts sales on the shift whose status is `DRAFT` or `HELD` and refuses
the close if there are any:

> 3 held sale(s) are still open on this shift. Finish or discard them before closing.

That rule is right, and the way it reached a cashier was not: a red toast, after the drawer was
counted and the reason typed, naming a number with nothing to act on and no clue which tickets
were meant. Everything below moves that rule forward in time and gives it hands.

**The workspace tracks the blockers, not just their count.** `refreshHolds()` asks
`listSales({ shiftId, pageSize: 50 })` and keeps the rows whose status is `HELD` or `DRAFT` -
deliberately the same predicate the server applies, so the screen can never disagree with it. It
is keyed to the shift, so a hold carried over from an earlier shift is somebody else's problem and
does not block this one. It re-runs when the shift changes and after anything that creates or
clears a blocker: holding a cart, resuming one, discarding one, completing a sale.

**The close-shift drawer states the blockage before the count.** The tickets are listed at the top
with their number, customer, line count and total, each with the only two ways it can end - Resume
takes it back into the ticket panel to be paid, Discard voids it. The close button is disabled and
says what is in the way: *Finish or discard 3 open tickets*, in the same style as the two
conditions already stated there ("Enter the counted cash", "Add a reason to close"). Nothing fails
on press any more.

**Discarding is voiding, and it carries a reason.** It goes through `voidSale`, so the record
survives, marked void, with the reason attached - a shift that closed having discarded three
tickets can still say what they were. The shared `ConfirmDialog` collects the reason and enforces
the three-character minimum that `reasonSchema` requires, and the consequence text names the
ticket, its lines and its value before anything happens. The server refuses outright if money has
already been taken against the sale, which is what stops this becoming a way to make a payment
disappear.

**The count is on the header.** The Held carts button carries the number of open tickets on this
shift, so a cashier meets the fact at the start of the close rather than at the end of it.

`HeldSaleRow` is shared by the close-shift drawer and the held-carts dialog, because they ask the
same question at different moments. It also fixed a smaller fault in the dialog: the row was
itself a button, so there was nowhere to put a second action without nesting one button inside
another.

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
