# Design tokens

Exact values from the `Foundations.dc.html` board. Phase 01 turns these into
CSS custom properties in `resources/css/app.css`; later phases use the
variables, never the raw hex.

## Type

- Font: **Plus Jakarta Sans** (400, 500, 600, 700, 800), fallback Inter,
  system-ui. Code: JetBrains Mono 500.
- Page title 30px / 800 / -0.02em. Metric 28px / 800, tabular numerals.
  Card title 16px / 700. Body 14px / 500, line-height 1.5. Label 11px / 700
  uppercase, 0.08em tracking.

## Neutrals

| Token | Light | Dark |
| --- | --- | --- |
| `--canvas` (page bg) | `#F6F5FF` | `#0F0C24` |
| `--surface` (cards) | `#FFFFFF` | `#1B1740` |
| `--surface-muted` (inputs, table head, row hover) | `#FBFAFF` | `#221D4D` |
| `--surface-tint` (segmented bg, chips) | `#F1EFFB` | `#2A2458` |
| `--border` | `#E8E5F7` | `#2F2963` |
| `--border-strong` (controls) | `#E1DDF3` | `#3B3473` |
| `--ink` (text) | `#16133A` | `#EEEBFF` |
| `--ink-muted` | `#6A6690` | `#A9A4D6` |
| `--sidebar` | `#17133B` | `#0B0920` |
| `--sidebar-text` | `#C9C5EA` | `#C9C5EA` |
| `--sidebar-label` | `#8F8ABF` | `#8F8ABF` |

## Domain colours

Each domain has base (solid tiles, primary fills), soft (tinted tile/badge
background), ink (text on soft) and nav (icon colour on the navy sidebar).
Dark mode: base lifted ~15% lightness, soft becomes `color-mix(base 18%, surface)`,
ink becomes the nav value.

| Domain | Base | Soft | Ink | Nav | Used for |
| --- | --- | --- | --- | --- | --- |
| brand / campaigns | `#5B3DF5` | `#EFEBFF` | `#4527D9` | `#A594FF` | primary actions, focus, campaigns, offers |
| partners | `#0EA597` | `#DDF6F2` | `#0B7F76` | `#3DD6C6` | advertisers, publishers, networks |
| finance | `#F2711C` | `#FFEEDF` | `#B54A0A` | `#FF9A52` | earnings, invoices, payouts, budget |
| admin | `#E23D84` | `#FDE7F1` | `#B8236A` | `#FF6FAE` | settings, roles, approvals, applications |
| analytics | `#1E7FD8` | `#E3F0FD` | `#1667B5` | `#6CB8FF` | clicks, tracking, charts, info |

Primary hover `#4527D9`; focus halo `#E6E0FF`.

## Status tones

One mapping everywhere (campaigns, offers, applications, invoices, partners,
disputes). Badge = pill, 6px dot + label.

| Tone | Soft bg | Text | Dot | Statuses |
| --- | --- | --- | --- | --- |
| success | `#DFF6E7` | `#13803D` | `#16A34A` | active, approved, paid, installed, verified, resolved |
| warning | `#FEF3D6` | `#9A5203` | `#F59E0B` | pending, paused, open, not seen, flagged |
| danger | `#FDE6E9` | `#B42136` | `#DC2F45` | rejected, overdue, suspended, escalated, failed |
| info | `#E3F0FD` | `#1667B5` | `#1E7FD8` | sent, draft, scheduled |
| neutral | `#EFEDF7` | `#4F4B70` | `#8E8AAE` | ended, archived, inactive |
| brand | `#EFEBFF` | `#4527D9` | `#5B3DF5` | not applied, new |

Unknown statuses fall back to neutral and show the raw label.

## Shape, spacing, elevation

- Radius: cards 18px (hero/identity cards 22px), controls 12px, small buttons
  11px, chips/badges full pill. Icon tiles: 32px → 10px radius, 40–44px →
  12–13px, 56px → 16px.
- Control height 44px (inputs, buttons); compact icon buttons 40px.
- Spacing on a 4px grid. Card padding 20–22px; card gaps 18px; page section
  gaps 24–28px; page padding 32px 36px 48px (16px sides on mobile); max content
  width 1680px.
- Card shadow: `0 1px 2px rgba(23,19,59,.04), 0 10px 28px -16px rgba(23,19,59,.18)`.
- Primary button shadow: `0 8px 18px -8px rgba(91,61,245,.7)`.
- Focus: 2px `--brand` ring + 4px `#E6E0FF` halo.
- Sidebar 264px; top bar 72px (64px mobile).

## Icons

Lucide (already a dependency via shadcn), 2px stroke. Icon tile sizes: 32
(list rows), 44 (card headers, metrics), 56 (page headers, empty states).
Soft tile (soft bg + base icon) for information; solid tile (base bg + white
icon) for actions and the page-header tile.
