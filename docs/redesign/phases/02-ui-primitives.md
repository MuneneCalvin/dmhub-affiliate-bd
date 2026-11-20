# Phase 02 · Core UI primitives

**Goal:** one shared, tested component set that matches the design, so page
phases only compose. Restyle the shadcn primitives in place (keep their APIs
where possible) and add the new building blocks.

**Design boards:** `Foundations.dc.html`, `Overlays.dc.html`.
Values: [`../tokens.md`](../tokens.md).

## Files in scope

- Restyle: `resources/js/components/ui/{button,badge,input,textarea,select,checkbox,label,field,tabs,toggle,toggle-group,card,table,dialog,alert-dialog,sheet,drawer,dropdown-menu,popover,tooltip,sonner,progress,skeleton,alert,avatar,breadcrumb}.tsx`
- Status: replace `resources/js/dev/statusBadge.tsx` with
  `components/ui/status-badge.tsx` (re-export from the old path until phase 11).
- New folder `resources/js/components/app/` for composed building blocks.

## Components

Restyled primitives:

- **Button** variants: `primary` (default), `secondary`, `soft`, `ghost`,
  `destructive`, `success`; sizes `md` (44px), `sm` (40px), `icon` (44×44),
  `icon-sm` (40×40). Optional `tone` prop for `soft` (brand/partners/finance/
  admin/analytics). Icon slot with 8px gap.
- **Input / Textarea / Select trigger**: 44px, 12px radius, `surface-muted`
  fill, `border-strong`; focus = 2px brand border + halo; `aria-invalid` →
  danger border + `#FFF7F8` fill. Support leading icon/adornment (e.g. €).
- **Checkbox** (22px, brand fill), new **Switch** (48×28), **RadioCard**
  (bordered card with title + hint, selected = 2px tone border + soft fill).
- **Tabs**: underline style with optional icon and count pill (page tabs).
  **SegmentedControl** (new): tinted track, white selected pill; also a
  "filled" variant (selected = solid domain colour) used for currency/status.
- **Card**: 18px radius, border, card shadow. **Table**: 11px uppercase head on
  `surface-muted`, row borders, hover `surface-muted`, wrapper with horizontal
  scroll.
- **Dialog / AlertDialog / Sheet**: 24px radius, header with icon tile + title
  + description + 44px close button, footer on `surface-muted`. AlertDialog
  centred with 64px danger tile.
- **Toast (sonner)**: white card, solid 36px tone tile, title + description,
  optional action; dark variant for neutral info.
- **DropdownMenu**: 20px radius, items 44px with 30px soft icon tiles.

New building blocks (`components/app/`):

- `IconTile` — size 32/40/44/56, `tone`, `variant: soft|solid`, icon child.
- `StatusBadge` — `status` string → tone via one map (tokens.md); custom label
  override; dot + text.
- `TrendChip` — up/down/neutral with percentage.
- `StatCard` — icon tile, label, value (tabular), optional trend chip, optional
  sparkline (`Sparkline` small SVG polyline from number[]), optional progress.
  Variants `default` and `solid` (coloured card, admin dashboard).
- `SectionCard` — card with header (icon tile + title + description + action
  slot) and body/footer slots.
- `MetricTile` — compact tinted tile (label + value) used inside cards.
- `ProgressBar` and `ProgressRing` (conic, centred value + label).
- `EmptyState` — 56px tile, title, one sentence, one action.
- `IdentityCell` — initials/logo tile with deterministic tone from name +
  title + subtitle (tables, lists).
- `CopyField` — monospace value + Copy button + toast.
- `Stepper` — vertical steps with icon tiles, current/complete states, progress.
- `FilterChips` — pill toggles with colour dot.
- `PageHeader` will be built in phase 03 (needs breadcrumbs from the shell).

Optional but recommended: a local-only route `/dev/ui` (guarded by
`app()->isLocal()`) rendering every component in both themes for visual QA.

## Tests to add (Vitest)

One `*.test.tsx` per component covering: renders accessible name, variant →
expected class/tone, disabled state, keyboard (Tabs arrow keys,
SegmentedControl `aria-pressed`, Switch `role="switch"` toggles,
RadioCard is a real radio), StatusBadge mapping for every status in tokens.md
including unknown fallback, CopyField writes to clipboard (mock) and shows a
toast, Stepper `aria-current="step"`.

## Done when

All README checks pass; existing pages still render (they use restyled
primitives); the e2e suite is green.

## Handoff notes

**Status: done** (branch `redesign/phase-02-ui-primitives`, based on
`redesign/phase-01-tokens-theme`).

### Tones (`@/lib/tones`)

- `DomainTone` = `brand | partners | finance | admin | analytics`;
  `Tone` = domain + `success | warning | danger | info | neutral`.
- `toneClasses[tone].{soft,solid,text,fill,border}` and `softIconClasses[tone]`
  are full class strings (Tailwind-safe). Use them instead of building class
  names.
- `toneFromName(name)` (deterministic domain tone), `initialsFrom(name)`
  (handles emails and camelCase: "CouponLab" → "CL").

### Restyled primitives (`@/components/ui/*`) — APIs kept, additions only

- **Button**: `variant` `primary` (default) | `secondary` | `soft` | `ghost` |
  `destructive` | `success` | `link`; legacy `default` = primary, `outline` =
  secondary. `tone` (domain) for `soft`. `size` `md` (default, 44px) | `sm`
  (40px) | `icon` (44) | `icon-sm` (40); legacy `default`/`lg`/`icon-lg` = 44px.
  Exposes `data-variant`. Default `type` is unchanged (browser default).
- **Badge**: pill; variants `default`/`brand`, `secondary`, `outline`,
  `destructive`/`danger`, `success`, `warning`, `info`, `neutral`, `count`.
- **Input** + new **InputGroup** (`leading`, `trailing` adornments; put an
  `<Input>` inside). `controlClasses` export is the shared control look used by
  Textarea and SelectTrigger. Invalid = `aria-invalid`.
- **Checkbox** 22px (shows a minus when `checked="indeterminate"`).
- **Switch** (`components/ui/switch.tsx`, new): `checked`/`defaultChecked`,
  `onCheckedChange`, `tone`; `role="switch"`, 48×28.
- **RadioCardGroup / RadioCard** (`radio-card.tsx`, new): native radios.
  Group: `name`, `value`, `onValueChange`, `label`, `disabled`. Card: `value`,
  `title`, `hint`, `icon`, `tone`. Accessible name = title, description = hint.
- **Tabs**: `TabsList variant="underline"` (default) | `"segmented"`.
  `TabsTrigger` adds `icon` and `count` props. Accessible name includes the
  count ("Offers 6").
- **SegmentedControl** (`segmented-control.tsx`, new): `options`
  `{value,label,count?,tone?,disabled?}[]`, `value`, `onValueChange`, `label`,
  `variant` `tinted` | `filled`, `tone`, `size` `md` | `sm`. Buttons use
  `aria-pressed`; names read "All · 48".
- **Card** 18px radius + card shadow, 22px padding. **Table**: uppercase 11px
  heads on `surface-muted`, row hover, wrapper scrolls horizontally.
- **Dialog**: 24px radius, 44px close button ("Close", translated),
  `DialogHeader` takes `icon` + `tone` (solid 44px tile). `DialogFooter` is
  full-bleed on `surface-muted`; it uses negative margins from
  `--dialog-pad` (1.5rem), so if you change the content padding set
  `[--dialog-pad:…]` too.
- **AlertDialog**: centred; `AlertDialogHeader` takes `icon` + `tone`
  (default `danger`, 64px soft tile). `AlertDialogAction` takes
  `variant` `primary` (default) | `destructive` | `success`.
- **Sheet**: rounded inner edge, same close button; `SheetHeader` takes `icon`
  + `tone` and has a bottom border; `SheetFooter` on `surface-muted`.
  `OverlayCloseButton` and `OverlayHeaderProps` are exported from `dialog.tsx`.
- **DropdownMenuItem**: 44px; new `icon` + `tone` props render a 30px soft
  tile (destructive items use the danger tile). With `asChild` the tile is
  inserted inside the child element (Radix Slot needs a single child); a
  regression here blanked the app when opening the account menu, so it has a
  unit test.
- **Toaster** (`ui/sonner.tsx`, now used by `app.tsx`): white card with a
  solid 36px tone tile for success/error/warning; `toast()` and `toast.info()`
  use the dark navy card. Actions render as brand text buttons.
- Also restyled: select content/items, label (13px/700), field, toggle,
  toggle-group (tinted track by default), popover, tooltip (navy), progress,
  skeleton, alert (new `success`/`warning`/`info`/`danger` variants), avatar
  (12px radius, brand-soft fallback), breadcrumb, drawer.

### StatusBadge (`@/components/ui/status-badge`)

- `<StatusBadge status label? tone? />`; dot + text pill with `data-tone`.
- `STATUS_MAP`, `resolveStatus(status)`, `normaliseStatus(status)` exported.
  Every status in tokens.md is mapped (test reads the table), plus legacy
  codes (`A`, `P`, `R`, `D`, `N`, `I`, `W`, `M`, `F`), commission types,
  priorities and frequencies from the old badge. Unknown → neutral + raw
  label. `@/dev/statusBadge` re-exports it until phase 11.
- Changes from the old badge: `D`/`N` (deactivated) → danger, `I` (inactive)
  → neutral, `paid`/`approved` share the success tone.

### Building blocks (`@/components/app`, barrel `index.ts`)

- `IconTile` `size` 32|40|44|56|64, `tone`, `variant` `soft`|`solid`
  (aria-hidden unless given an `aria-label`).
- `TrendChip` `value` (signed %), `direction?`, `inverse?` (decrease is good).
- `Sparkline` `values`, `tone`, `width`, `height` (decorative).
- `StatCard` `label`, `value`, `icon?`, `tone`, `trend?`, `trendInverse?`,
  `sparkline?`, `progress? {value,label,caption?}`, `hint?`,
  `variant` `default`|`solid`.
- `SectionCard` `title`, `description?`, `icon?`, `tone`, `action?`,
  `footer?`, `headingLevel` (2), `flush` (no body padding), `bodyClassName`.
  Renders a `<section>` named by its heading.
- `MetricTile` `label`, `value`, `tone`.
- `ProgressBar` `value`, `max`, `tone`, `label` (accessible name), `caption?`,
  `size`. `ProgressRing` `value`, `max`, `tone`, `label`, `display?`, `size`,
  `hideLabel`.
- `EmptyState` `icon`, `title`, `description?`, `action?`, `tone`,
  `headingLevel` (3).
- `IdentityCell` `name`, `subtitle?`, `logoUrl?`, `tone?`, `size` 32|40|44,
  `renderName?` (wrap the name in a link).
- `CopyField` `value`, `label?`, `copiedMessage?`, `multiline?`. Uses
  `navigator.clipboard` and a sonner toast; error toast "Could not copy".
- `Stepper` `steps {id,title,description?,icon?}[]`, `current`, `label`,
  `onStepSelect?`, `allowForward?`, `showProgress?`. Current step has
  `aria-current="step"`.
- `FilterChips` `options {value,label,tone?,count?}[]`, `value` (array),
  `onValueChange`, `label`, `multiple` (default true). `aria-pressed` buttons.

### CSS removed from `app.css`

Generic unlayered overrides that beat the component utilities:
`[data-slot='card']` (8px radius, no shadow), `[data-slot='table-head'|'table-cell']`,
`[data-slot='tabs-list']`, `[data-slot='input'|'textarea'|'select-trigger']`
(box-shadow none), `[data-slot='dialog-content'|'sheet-content']`, and
`.workspace-main [data-slot='button']` (8px radius, no shadow). Page-scoped
rules (`.dashboard-*`, `.directory-*`, `.operational-stats`, …) are left for
the page phases; they may still override cards on those pages.

### Dev gallery

`/dev/ui` (`resources/js/pages/dev/ui.tsx`) renders every component; it is
registered only when `app()->isLocal()` (Feature test
`tests/Feature/Dev/UiGalleryRouteTest.php` asserts 404 otherwise). Its sample
copy is deliberately not translated. Toggle the theme with the button at the
top.

### Translations

The app's real locale files are `resources/js/i18n/locales/{en,nl}.json`
(flat, English source string as key) — not
`resources/js/locales/en/translation.json` as the README says. New strings:
status labels (Installed, Verified, Resolved, Open, Not seen, Overdue,
Suspended, Escalated, Failed, Sent, Scheduled, Ended, Archived, Not applied,
Reversed, Locked, Payable, Expired), Could not copy, Increase, Decrease,
No change, Progress, `Step {{current}} of {{total}}`, Current, Upcoming.

### Deferred / notes

- `PageHeader` is phase 03, as planned.
- Existing pages still pass their own `className`s (e.g. `h-9`, `rounded-md`)
  to buttons and inputs in places; page phases should drop those overrides.
- The appearance dropdown's "Toggle theme" label and its menu items are still
  untranslated (shell, phase 03).
- `dev/core.tsx` confirmation dialog still styles its action with
  `bg-destructive` classes; it works (destructive = danger ink).
