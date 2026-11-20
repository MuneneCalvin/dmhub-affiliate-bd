# Phase 01 · Design tokens & theme

**Goal:** swap the visual foundation (colours, font, radii, shadows) to the new
system in one place so every existing shadcn component immediately picks up
the new palette, in light and dark.

**Design boards:** `Foundations.dc.html`. Values: [`../tokens.md`](../tokens.md).

## Files in scope

- `resources/css/app.css` (tokens, `@theme`, base layer, `.workspace-*` rules)
- `resources/views/app.blade.php` (font loading)
- `DESIGN.md` (rewrite to describe the new system; keep it short and point to
  `docs/redesign/tokens.md`)
- Appearance handling: `resources/js/hooks/use-appearance*` (check name) only
  if needed for the dark palette.

## Tasks

1. Load Plus Jakarta Sans (and JetBrains Mono) — self-host via
   `@fontsource-variable/plus-jakarta-sans` or a Google Fonts `<link>` in the
   blade layout; set `--font-sans`.
2. Replace the `:root` and `.dark` blocks with the tokens from `tokens.md`.
   Keep the existing shadcn variable names (`--background`, `--primary`,
   `--card`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`,
   `--ring`, `--sidebar-*`, `--chart-1..5`) mapped onto the new values, so
   nothing breaks.
3. Add new variables and Tailwind theme colours:
   - neutrals: `canvas`, `surface`, `surface-muted`, `surface-tint`, `ink`,
     `ink-muted`, `border-strong`.
   - domains: `brand|partners|finance|admin|analytics` each with `-base`,
     `-soft`, `-ink`, `-nav` → utilities like `bg-finance-soft text-finance-ink`.
   - status tones: `success|warning|danger|info|neutral` with `-soft`, `-ink`,
     `-dot`.
   - `--radius` 12px (controls), plus `--radius-card: 18px`, `--radius-hero: 22px`.
   - shadows: `--shadow-card`, `--shadow-primary`, `--shadow-overlay`.
   - chart palette: chart-1..5 = brand, partners, finance, admin, analytics.
4. Focus style: 2px brand ring + 4px halo (`:focus-visible`).
5. Body: canvas background, ink text, 14px/1.5.
6. Dark mode values for every token (see table). Verify contrast of
   `ink-muted` on `surface` in both themes (≥4.5:1).
7. Update `DESIGN.md`.

## Tests to add

- Vitest `resources/css/tokens.test.ts`: parse `app.css` and assert every token
  listed in `tokens.md` exists in both `:root` and `.dark` (guards against a
  missing dark value).
- Playwright `tests/e2e/theme.spec.ts`: dashboard in light has canvas
  background `rgb(246, 245, 255)`; after switching to dark the body background
  changes and `html.dark` is set.

## Done when

All README checks pass; existing pages render with the new palette and font in
both themes without layout breakage (spot-check dashboard, a table page, a
form, login).

## Handoff notes

**Status: done** (branch `redesign/phase-01-tokens-theme`).

### Variables (`resources/css/app.css`, both `:root` and `.dark`)

- Neutrals exactly as named in `tokens.md` (`--canvas`, `--surface`,
  `--surface-muted`, `--surface-tint`, `--border`, `--border-strong`, `--ink`,
  `--ink-muted`, `--sidebar`, `--sidebar-text`, `--sidebar-label`), plus
  `--focus-halo` and `--invalid-fill` (`#FFF7F8`).
- Domains: `--{brand|partners|finance|admin|analytics}-{base|soft|ink|nav}`,
  plus `--brand-hover`.
- Status: `--{success|warning|danger|info|neutral}-{soft|ink|dot}`. The `brand`
  status tone reuses `--brand-soft/-ink/-base`.
- Elevation values: `--elevation-card`, `--elevation-primary`,
  `--elevation-overlay` (the theme exposes them as `--shadow-*`).
- shadcn names are aliases: `--background`=canvas, `--card`/`--popover`=surface,
  `--primary`=brand-base, `--secondary`=surface-tint, `--muted`=surface-muted,
  `--muted-foreground`=ink-muted, `--accent`=brand-soft,
  `--accent-foreground`=brand-ink, `--input`=border-strong, `--ring`=brand,
  `--destructive`=danger-ink (light) / `#DC2F45` (dark), `--chart-1..5` =
  brand, partners, finance, admin, analytics. `--radius` is 12px, so
  `rounded-lg` = 12px, `rounded-md` = 10px, `rounded-sm` = 8px.
- Sidebar is navy now (`--sidebar-foreground` = sidebar-text,
  `--sidebar-accent` = white 8%, `--sidebar-accent-foreground` = white).

### Tailwind utilities

- `bg-canvas`, `bg-surface`, `bg-surface-muted`, `bg-surface-tint`, `text-ink`,
  `text-ink-muted`, `border-border-strong`, `bg-focus-halo`, `bg-invalid-fill`,
  `text-sidebar-text`, `text-sidebar-label`.
- Domains: `bg-brand` (= base), `bg-brand-base`, `bg-brand-soft`,
  `text-brand-ink`, `text-brand-nav`, `bg-brand-hover`; same for `partners`,
  `finance`, `admin`, `analytics`.
- Status: `bg-success-soft text-success-ink bg-success-dot` etc.
- Radius: `rounded-control` (12px), `rounded-card` (18px), `rounded-hero` (22px).
- Shadows: `shadow-card`, `shadow-primary`, `shadow-overlay`.
- Fonts: `font-sans` = Plus Jakarta Sans, `font-mono` = JetBrains Mono (loaded
  from fonts.bunny.net in `app.blade.php`, like Inter was).

### Deviations from tokens.md

- Contrast: `--success-ink` darkened `#13803D` → `#127A3B` and `--partners-ink`
  `#0B7F76` → `#0A7870`, because the design values were 4.42:1 / 4.30:1 on their
  soft backgrounds (below 4.5:1). Everything else is the design value.
- Dark values not in tokens.md were derived: domain bases lifted
  (brand `#6C52FF`, partners `#14C2B2`, finance `#F58C47`, admin `#EA67A0`,
  analytics `#4A9AE6`), soft = `color-mix(base 18%, surface)`, ink = nav.
  Status tones in dark: lighter inks on mixed soft backgrounds.
- `ink-muted` on `surface`: 5.36:1 light, 7.21:1 dark.

### Notes for later phases

- Focus: global `:focus-visible` = 2px ring outline + 6px halo box-shadow.
  shadcn components still apply their own `focus-visible:ring-*`; phase 02
  replaces those.
- Many unlayered `[data-slot=…]` overrides in `app.css` (card radius 8px,
  table head, tabs list) beat Tailwind utilities. Phase 02 removes the generic
  ones; page-scoped ones (`.dashboard-*`, `.directory-*`) belong to page phases.
- Removed the dashboard's local `--border`/`--muted` overrides and pointed
  `.auth-panel` at `--sidebar`. Sidebar brand name now uses
  `text-sidebar-accent-foreground` so it stays readable on navy.
- Tests: `resources/css/tokens.test.ts` (Vitest include extended to
  `resources/css/**/*.test.ts`), `tests/e2e/theme.spec.ts` (uses the
  "Toggle theme" button; resets to light at the end).
