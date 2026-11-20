# DM Hub workspace design

DM Hub uses one vibrant workspace system across administrators, network owners,
advertisers, publishers and account settings. The full redesign plan lives in
[`docs/redesign/`](docs/redesign/README.md); exact values are in
[`docs/redesign/tokens.md`](docs/redesign/tokens.md).

## Foundation

The source of truth is `resources/css/app.css`. Every token has a light (`:root`)
and dark (`.dark`) value; `resources/css/tokens.test.ts` fails if one is missing.

- **Neutrals:** `canvas` (page), `surface` (cards), `surface-muted` (inputs,
  table heads, row hover), `surface-tint` (segmented tracks, chips), `ink`,
  `ink-muted`, `border`, `border-strong`. Navy `sidebar` with `sidebar-text` /
  `sidebar-label`.
- **Domains:** `brand` (campaigns, primary actions), `partners`, `finance`,
  `admin`, `analytics`, each as `-base`, `-soft`, `-ink`, `-nav`
  (e.g. `bg-finance-soft text-finance-ink`, `bg-brand`).
- **Status tones:** `success`, `warning`, `danger`, `info`, `neutral` as
  `-soft`, `-ink`, `-dot`. One status → tone map is used everywhere.
- **Strong fills:** every domain and status also has `-strong`, a darker fill
  that keeps white text at 4.5:1 in both themes. The bright `-base` fills only
  carry icons; anything with white **text** on it (initials, solid stat cards,
  filled segmented options, destructive/success buttons) uses `-strong`
  (`toneClasses[tone].strong` in `@/lib/tones`).
- **Shape:** controls `rounded-control` (12px), cards `rounded-card` (18px),
  hero cards `rounded-hero` (22px), badges and chips fully rounded.
- **Elevation:** `shadow-card`, `shadow-primary` (primary buttons),
  `shadow-overlay` (dialogs, menus).
- The shadcn variables (`--background`, `--primary`, `--muted`, …) map onto
  these tokens so the primitives in `components/ui` follow the palette. Pages
  and app components use the token names (`text-ink-muted`, `bg-surface-muted`,
  `text-danger-ink`) rather than the shadcn aliases.

Type is Plus Jakarta Sans (JetBrains Mono for code), 14px/1.5 body. Page titles
30px/800, metrics 28px/800 with tabular numerals, card titles 16px/700, labels
11px/700 uppercase. Focus is a 2px brand ring with a soft halo.

## Components

- `@/components/ui` — restyled primitives (Button, Badge, Input, Select,
  Tabs, SegmentedControl, Dialog, AlertDialog, Sheet, DropdownMenu,
  StatusBadge, …). Overlays return focus to whatever opened them, even when
  opened from state without a `*Trigger`.
- `@/components/app` — building blocks (PageHeader, SectionCard, StatCard,
  ResourceDirectory, ProfileBanner, EmptyState, FormField, form fields,
  ConfirmDialog, FormDialog, …). Import from the barrel `@/components/app`.
- Domain folders (`campaigns`, `creatives`, `scripts`, `finance`, `fraud`,
  `marketplace`, `dashboard`, `applications`) hold page-specific pieces built
  from the two sets above.

## How to build a new page

1. **Shell.** Wrap the page in `AppLayout` and a `<div className="workspace-page">`
   (max 1680px, page padding, 16px sides on phones). Add the page to
   `resources/js/navigation/config.ts` (and a row to its test) if it belongs in
   the sidebar.
2. **Header.** One `PageHeader` per page — it renders the only `h1`:

    ```tsx
    <PageHeader
        title={t('Advertisers')}
        description={t('Brands running campaigns in {{network}}', { network })}
        breadcrumbs={[
            { title: t('Partners'), href: advertisers.index.url() },
            { title: t('Advertisers'), href: advertisers.index.url() },
        ]}
        icon={<Building2 />}
        tone="partners"
        actions={<Button>{t('Add advertiser')}</Button>}
    />
    ```

3. **Content in cards.** Group content in `SectionCard`s (`title`, `icon`,
   `tone`, `action`, `flush` for tables). Use `StatCard`s for headline numbers
   and `DetailList` for label/value pairs.
4. **Lists.** Use `ResourceDirectory` for any list of records: identity column,
   `status` (→ `StatusBadge`), extra `columns`, row `href`, row `actions` menu,
   `statusTiles` or a `SegmentedControl` filter, `pagination` from
   `useDirectoryQuery().pagination(page)`, and empty / loading / error states.
5. **Status.** Always `<StatusBadge status={code} />` — never a coloured span.
   Add new codes to `STATUS_MAP` (and its test).
6. **Forms.** `FormField` around each control (label, hint and error wired
   with `aria-describedby`), or the value-based `TextField` / `SelectField` /
   `SearchSelect` / `MultiSelect` in state-driven dialogs. Dialogs use
   `DialogHeader` (icon + tone) and `DialogFooter`; confirmations use
   `useConfirmationDialog()`.
7. **Copy.** Every string through `t('English source')`, with entries in
   `resources/js/i18n/locales/en.json` and `nl.json`.
   `resources/js/i18n/translations.test.ts` fails on a missing key.
8. **Check.** Add the page to `targets` in `tests/e2e/a11y.spec.ts`: it is then
   audited with axe in light and dark and checked for horizontal scroll at
   375 / 768 / 1280 / 1680px.

## Rules

- Use the tokens, never raw hex, in components and pages.
- Status is always text plus colour; never colour alone.
- Real `<button>`/`<a>`/`<label>`, `aria-label` on icon-only buttons, 44px touch
  targets, 4.5:1 text contrast in both themes. When a control has visible
  text, its accessible name must contain that text (add hidden context with an
  `sr-only` span instead of an `aria-label` that replaces it).
- No page-level horizontal scroll; wide tables scroll inside their card.
- Keep Laravel/Inertia routes, authorization, financial calculations, currency
  separation and tenant logos intact. All visible copy has English and Dutch
  translations.
