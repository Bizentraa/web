# UI Component System

**Date:** 2026-08-26  
**Scope:** Back Office and future POS shared UI primitives

## Decision

Bizentra will use the shadcn/ui approach of owned, modular, reusable components, but will not add the full shadcn CLI/Tailwind setup in this slice.

Reason: the current platform already has a Business-selectable theme engine based on CSS variables. Installing standard shadcn/ui directly would require introducing Tailwind CSS first and then migrating existing screens. That is a larger design-system migration and should be done deliberately, not as a small P1 catalog refactor.

## Current Implementation

Reusable UI primitives now live in:

- `packages/design-system/src/index.tsx`

The first primitives are:

| Component | Purpose |
|---|---|
| `Card` | Shared surface wrapper; can render as `section` or `form` |
| `CardHeader` | Standard title/action header layout |
| `CardContent` | Standard content spacing |
| `CardTitle` | Shared section title |
| `CardDescription` | Shared helper copy |
| `Kicker` | Small uppercase phase/context label |
| `Button` | Primary, secondary and ghost actions |
| `Badge` | Status and category pills |
| `Progress` | Accessible progress indicator |
| `Field` | Label, input and hint wrapper |

Shared styles live in:

- `apps/backoffice/src/app/globals.css`

The styles use existing theme tokens such as:

- `--color-surface`
- `--color-border`
- `--color-primary`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-text-primary`
- `--color-text-secondary`

## Applied Screen

The Back Office P1 catalog workspace now composes reusable primitives instead of keeping all UI markup local to the page:

- `apps/backoffice/src/app/catalog/catalog-workspace.tsx`

This keeps the P1 screen aligned with the future component-level approach while preserving the current Business theme system.

## Future Tailwind/shadcn Migration Rule

If the project later adopts full shadcn/ui CLI components:

1. Add Tailwind CSS to the monorepo intentionally.
2. Map Bizentra Business theme variables to Tailwind/shadcn CSS variables.
3. Add shadcn components into an owned source folder, not as a black-box dependency.
4. Migrate screens one component group at a time.
5. Keep accessibility, keyboard support, responsive behavior and SRS traceability as release gates.

## Current Boundary

This slice intentionally does not add:

- Tailwind CSS
- Radix UI primitives
- `class-variance-authority`
- `tailwind-merge`
- `lucide-react`

Those dependencies are useful for a full shadcn rollout, but adding them now would increase migration scope without completing more P1 business capability.
