# Phase 05 · Dashboards & marketplace

**Goal:** each role's home page in the new style, using real data only.

**Design boards:** `Main.dc.html` (network owner), `AdvertiserDashboard.dc.html`,
`AdminDashboard.dc.html`, `Marketplace.dc.html` (publisher home).

## Files in scope

- Pages: `dashboard.tsx`, `network_dashboard/dashboard.tsx`,
  `advertiser_dashboard/dashboard.tsx`, `admin_dashboard/dashboard.tsx`,
  `publisher_dashboard/{dashboard,dashbaord_cards,campignItems,side_drawer}.tsx`
  (rename the misspelled files while you are here, updating imports).
- Components: `dashboard-panels.tsx`, `dashboard-revenue.tsx`,
  `campaign-overview-chart.tsx`, `workflow-welcome.tsx`.
- Controllers that feed these pages (find via the Inertia component names);
  `tests/Unit/DashboardRevenueTest.php`.

## Tasks

1. **Network dashboard:** PageHeader with date-range and export/new-campaign
   actions; four StatCards with sparklines (only for metrics the backend
   already computes; add a cheap daily series to the controller if needed);
   quick-action tiles (solid domain tiles) gated by permission; revenue
   SectionCard with currency SegmentedControl, summary metrics and bar chart
   (keep accessible daily inspection: tooltip + keyboard focus, or a visually
   hidden table); campaign health stacked bar + legend + budget/offer progress;
   pending applications list with approve/reject icon buttons (existing
   actions/endpoints); recent activity timeline from real events (if no event
   source exists, show recent records already loaded, not invented ones).
2. **Advertiser dashboard:** StatCards; budget overview with ProgressRing and
   legend (spent/reserved/available/net funded as the backend defines them);
   recent campaigns with spend bars; pending applications cards with Review.
   "Days of budget left" only if computable from real data, else omit.
3. **Admin dashboard:** solid-coloured StatCards; campaign activity with
   MetricTiles; top networks bars; pending user approvals; recent disputes.
4. **Publisher marketplace:** "how to join" steps strip; filter card (search,
   campaign status, application status, dates, clear) + category FilterChips if
   categories/tags exist; campaign cards (cover with category colour, logo
   tile, status badge, payout/EPC/cookie panel, geo, CTA Apply / Get links /
   View details); All vs My campaigns tabs; existing side drawer restyled as a
   Sheet. Keep server-side filtering/pagination.
5. Empty states for every list/chart; never fabricate data.

## Tests to add

- Vitest: StatCard/chart wrappers with empty data render EmptyState; currency
  switch changes the series; marketplace card CTA depends on application
  status (not applied → Apply, approved → Get links, pending → View details).
- Pest: dashboard controllers return the props the new UI reads (extend
  existing workspace tests); revenue series per currency stays separate.
- Playwright: each role lands on its dashboard and sees its headline metric
  labels; network owner approves a pending application from the dashboard;
  publisher filters the marketplace and applies to a campaign.

## Done when

All README checks pass; dashboards match the boards in both themes and stack
cleanly at tablet and phone widths.

## Handoff notes

**Status: done** (branch `redesign/phase-05-dashboards`, based on
`redesign/phase-04-auth`).

### New shared components

- `@/components/app`: **ActionTile** (`href`, `title`, `description`, `icon`,
  `tone`, `count`, `countLabel`; a link card with a solid 40px tile),
  **ActivityTimeline** (`items {id,message,meta,icon,tone}[]`, an `<ol>`),
  **StackedBar** (`segments {key,label,value,tone}[]`, `label`, `legend`;
  `role="img"` named "Label: 3 Active, 1 Inactive", zero segments skipped in
  the bar but kept in the legend). **StatCard** gained `badge` (top-right pill,
  used by the admin solid cards when there is no trend). **SectionCard** action
  slot now has `max-w-full` so wide controls wrap on phones.
- `@/lib/format`: `useMoney(currency)(value, compact?)`, `useCount()(value,
  digits?)`, `useShortDate()(isoDate)`; locale-aware via i18n. Prefer these
  over `formatCurrency`/`formatNumber` (fixed en-US) in new code.
- `@/lib/relative-time`: `relativeTime(iso, locale)` (moved out of
  `notifications-menu.tsx`).
- `@/components/dashboard/`: `RevenueChart` (bars of daily approved
  commissions; currency `SegmentedControl` when >1 series; own 7/14/30 period
  switch unless `period` is passed; summary Sales / Commissions / Best day;
  keyboard inspection on a `role="slider"` "Inspect a day" with arrow/Home/End,
  hover tooltip, and a visually hidden table of every day; EmptyState when no
  activity; optional `footer`). Also `seriesFor()`, `PERIODS`.
  `CampaignHealth`, `PendingApplications` (approve/reject icon buttons + reject
  dialog), `RecentActivity` (the user's notifications).
- `@/components/marketplace/`: `CampaignCard`, `CampaignSheet` (replaces
  `side_drawer.tsx`/`campignItems.tsx`/`dashbaord_cards.tsx`, now deleted),
  `types.ts` (`campaignCta`: none → apply, `A` → links, else details;
  `canApply`; `applicationStatus` maps application codes A/P/R/I to
  approved/pending/rejected/inactive — campaign `A` means active, application
  `A` means approved), `format.ts` (`cookieWindow`).

### Removed

`components/dashboard-panels.tsx`, `dashboard-revenue.tsx`,
`workflow-welcome.tsx`, the `SideDrawerProps` type and all `.dashboard-*`,
`.revenue-*`, `.workflow-welcome` CSS in `app.css`. `campaign-overview-chart.tsx`
is untouched (only the phase 07 campaign workspace uses it).

### Server changes

- `PartnerReportingService::dailyClicks($assignments)` (30 days, same window as
  `daily()`) and `campaignEpc($campaigns)` (network-wide approved commission ÷
  clicks per campaign, in the campaign's own currency; `null` without clicks).
  `DashboardRevenueService::lastThirtyDaysCount($query, $column)`.
- Network dashboard props added: `dailyClicks`, `campaignStatusCounts`
  (code → count), `budgets` (`{currency,total,spent}[]`, never summed across
  currencies), `pendingApplications` (latest 5, scoped like the applications
  index, with `requested_offer_id`, `campaign_name`), `pendingApplicationsCount`.
- Advertiser dashboard: `pendingApplications[].campaign_name`,
  `pendingApplicationsCount`.
- Marketplace: new filters `search` (campaign name/description/advertiser
  name, case-insensitive) and `industry` (advertiser industry, used as the
  category chips); props `industries`, `myCampaignsCount`; each campaign has
  `advertiser {id,business_name,industry}` and `epc`. Still server-side
  filtered and paginated (12).
- `applications.approve` / `applications.reject` accept `return_to=dashboard`
  and then redirect to `/dashboard` (role redirect) instead of the list.
  Authorization and validation unchanged.

### Decisions / deviations from the boards

- No "pending payouts", trend chips, "reserved" budget, "days of budget
  left" or "Add funds": the backend has no such definitions (or advertisers
  cannot fund themselves). The network's 4th card is Active campaigns with a
  progress bar. The header date range drives the cards and the chart (7/14/30
  days, the window the server computes); Export downloads a CSV of the series
  on screen.
- Quick actions use existing pages only (no invite flow exists): Launch
  campaign, Review applications, Publishers, Advertisers, Publisher invoices,
  each gated by permission. The default network_owner role lacks
  `create_campaigns`, so "New campaign"/"Launch campaign" are hidden for it.
- Recent activity = the user's database notifications (the only event
  stream). Admin "Approve" on pending users became "Review" → partner pool,
  because approval needs the pool flow.
- The admin and advertiser boards have no revenue chart; it is kept below the
  board content so no information is lost. The admin chart opens on the
  currency with the most commission.
- Dashboard approve uses the offer the publisher requested; without one the
  row links to the application page instead.

### Tests

- Vitest: `components/dashboard/revenue-chart.test.tsx`,
  `dashboard-cards.test.tsx`, `components/marketplace/campaign-card.test.tsx`,
  `components/app/dashboard-blocks.test.tsx`.
- Pest: `tests/Feature/DashboardWorkspaceTest.php` (network props scoped to own
  network, currency series kept apart, dashboard return after review,
  cross-network approval still 404, advertiser counts, marketplace
  search/industry/EPC/my-campaigns).
- Playwright: `dashboards.spec.ts` (each role's headline metrics; publisher
  searches the marketplace, applies, network approves from the dashboard,
  publisher sees Get links). The seed adds **E2E Marketplace Campaign** /
  **E2E Marketplace Offer**; helper `submitApplication(page, offer)`.
- Selector updates (deliberate copy changes): advertiser h1 "Campaign
  overview" → "Advertiser dashboard"; publisher h1 "Campaign marketplace"; the
  campaign sheet is named by the campaign (was "Campaign Details").

### Notes

- The in-app browser pane blocks the Vite dev origin (`:5173`), so the visual
  check used screenshots from the e2e environment (1440 light/dark, 390).
