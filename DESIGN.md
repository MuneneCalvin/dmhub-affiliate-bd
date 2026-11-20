# DM Hub workspace design

The dashboard uses a consistent business workspace across administrators, network
owners, advertisers, publishers, and account settings. Shared components carry the
visual system into list, detail, finance, form, modal, and authentication screens.

## Foundation

The source of truth is `resources/css/app.css`.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#f5f7fb` | `#0e1625` |
| Surface | `#ffffff` | `#162135` |
| Text | `#18243b` | `#e7edf7` |
| Secondary text | `#64738b` | `#a0aec5` |
| Primary action | `#305cde` | `#91adff` |
| Border | `#e2e8f1` | `#2c3a52` |
| Sidebar | `#142039` | `#101a2d` |

Use Inter with system fallbacks. Page titles are 28–32px; section titles are
14–16px; body and form text are 14px. Labels and table headers are 11–12px.
Use tabular numerals for metrics and money. Do not communicate status by color
alone: retain the text in status badges.

## Workspace structure

- A 256px navy sidebar groups visible, permission-filtered destinations under
  Campaigns, Partners, Finance, and Administration. Empty groups do not render.
- The active destination uses a blue surface and a left indicator. Listing,
  detail, and creation routes belong to the same navigation destination.
- The sidebar supports compact icon mode and a scrollable mobile drawer. Links
  close the mobile drawer. Account and documentation controls live in the top right header.
- A 72px surface header contains the sidebar control, tenant identity, role,
  language, appearance, notifications, documentation, and the account dropdown.
  The account dropdown includes account settings and campaign terms.
- Publisher and advertiser hubs offer discovery dialogs with server-backed search
  suggestions and links to partner profiles and full pool results. It reduces to 64px on mobile.
- Content has a 1680px maximum width, 36px desktop horizontal padding, and 16px
  mobile horizontal padding. Sections use 24–28px gaps.
- Standard pages use a shared heading with breadcrumbs, title, description, and
  wrapping actions. A divider separates the page identity from its content.

## Dashboard hierarchy

Show the role-specific overview first, then live headline metrics. Revenue and
supporting operational or budget metrics share a two-column area on wide screens
and stack on smaller screens. Compact quick actions follow the metrics; pending
work and recent activity follow those actions.

The publisher starts with the campaign marketplace, its filters, and access to
owned campaigns. Do not substitute fabricated performance data for empty states.
Revenue charts retain currency selection, accessible daily inspection, and the
30-day reporting period. Other summary values retain their existing definitions.

## Lists, details, and forms

Resource directories use compact tables with an identity cell, status, useful
record fields, and an explicit details action. Local search is labeled “Search
this page”; it does not imply searching unloaded server pages. Status filters,
pagination, loading, errors, and empty states remain available. Detail drawers
expose all original fields and permission-controlled actions.

Use 10px surface corners and 6–8px controls. Keep borders subtle and shadows
minimal. Forms use surface backgrounds and shared input tokens. Financial tables
retain currency separation and existing actions. Editable overviews use a clear
Edit action and a focused dialog. Drawers use short transitions, with reduced
motion honored globally.

## Behavior and accessibility

Keep Laravel/Inertia routes, authorization, financial calculations, tenant logos,
and forms intact. Use semantic controls, visible keyboard focus, and descriptive
names for icon-only actions. Tables scroll horizontally inside their own surfaces
on narrow screens. Navigation and form actions remain usable without hover.

The server-provided locale is applied before the first client render. All new
visible copy has English and Dutch translations. Theme changes affect every
shared surface, including modals and authentication.
