# Phase 06 · Directories, applications & partner profiles

**Goal:** every list-of-records page uses one directory pattern; applications
get the list + drawer review flow; partner detail pages use the profile layout.

**Design boards:** `Directory.dc.html`, `Applications.dc.html`,
`PartnerProfile.dc.html`, `Overlays.dc.html` (modals).

## Files in scope

- Shared: `components/resource-directory.tsx`, `dev/table.tsx`,
  `dev/columns.tsx`, `dev/columns/*`, `dev/core.tsx`, `dev/tabs.tsx`,
  `components/partner-profile.tsx`, `partner-workspace-ui.tsx`,
  `partner-card-editor.tsx`, `partner-card-config.ts`, `partner-money.tsx`,
  `profile-company-details.tsx`, `profile-ui.tsx`, `editable-overview.tsx`.
- Pages: `advertisers/{index,show}` + `modals/*`, `publishers/{index,show}` +
  `publisher_modals/*`, `networks/{index,show}` + `networks_modals/*`,
  `pool/{advertisers,publishers,advertiser-show,publisher-show}` + `modals/reject`,
  `applications/{index,show,table_content}` + `modals/reject`,
  `publisher_campaign_applications/index`, `system_managment/system_users`.

## Tasks

1. **ResourceDirectory v2** (`components/app/resource-directory.tsx`): page
   header with 56px domain tile; status summary tiles that act as filters
   (`aria-pressed`, counts from the server); table card toolbar ("Search this
   page", Filters, Export where it exists); IdentityCell first column; status
   badges; optional progress column; Details link + more-actions menu; footer
   with "Showing x–y of n" and pagination; loading skeleton, error and empty
   states. Keep server pagination and the local search label semantics.
2. Apply it to advertisers, publishers, networks, system users, pool lists.
3. **Applications:** status SegmentedControl (Pending/Approved/Rejected with
   counts), selectable rows, bulk bar (approve/reject selected — add a bulk
   endpoint only if one does not exist, with authorization + tests), detail
   drawer (Sheet) with partner summary MetricTiles, details list, message,
   Reject (opens reject reason modal) / Approve.
4. **Partner profile** (advertiser/publisher/network show, pool show): banner
   header with logo tile, status, chips, actions (Message if exists, Change
   network, Edit); performance tiles; company details card (mask sensitive
   values as today); related lists (campaigns joined / campaigns / users).
5. Restyle all modals in scope with the new Dialog (icon tile header, footer).

## Tests to add

- Vitest: ResourceDirectory (filter tiles change the filtered rows and
  `aria-pressed`, local search, empty and error states, pagination labels);
  application drawer renders fields and fires approve/reject; bulk bar appears
  only with a selection.
- Pest: any new bulk endpoint (authorization per role, validation, state
  transitions); existing PartnerWorkflows/PartnerDiscovery tests stay green.
- Playwright `applications.spec.ts` (extend): approve via drawer; reject with
  reason; bulk approve two. `directories.spec.ts`: network owner filters
  advertisers by status, searches, opens a profile, edits the partner card.

## Done when

All README checks pass; all pages in scope match the boards.

## Handoff notes

**Status: done** (branch `redesign/phase-06-directories`, based on
`redesign/phase-05-dashboards`).

### New shared components (`@/components/app`)

- **ResourceDirectory** (`resource-directory.tsx`) — generic `<T>`. Props:
  `label` (accessible name of the table card), `rows`, `rowKey`, `nameHeader`,
  `name(row)`, `subtitle?(row)`, `logoUrl?(row)` → IdentityCell first column;
  `status?(row)` (StatusBadge keyword/code) + `statusLabel?(row)`;
  `columns?: {id, header, cell(row), align?: 'start'|'end', className?}[]`;
  `href?(row)` → name link, row click and the soft "Details" button
  (named "Details for {name}"); `actions?(row)` →
  `{label, onSelect, icon?, tone?, destructive?, hidden?(row)}[]` in the
  "More actions for {name}" menu; `statusTiles?: {value, label, count, tone,
  icon}[]` (first one should be `all`), `statusValue` (from the server),
  `onStatusChange`; `toolbar?` (Filters/Export buttons); `searchable`
  (default true, "Search this page", filters the current page only);
  `pagination?: {page, pageCount, total?, from?, to?, onPageChange}` →
  "Showing x–y of n" + numbered pager; `isLoading`, `isError`, `onRetry`;
  `emptyTitle/emptyDescription/emptyAction`; `tone` for the empty state.
  Tiles also filter the visible rows locally by `status(row) === value`,
  so a server-filtered page is unaffected. Also exports `StatusTiles`,
  `DirectoryPager`, `pageWindow`, `MutedCell`.
- **BulkBar** / **BulkBarButton** — navy bar, `role="region"` "Bulk actions",
  renders nothing at `count` 0.
- **DetailList** — `rows: {label, value, key?}[]` (falsy rows skipped), two
  columns (`labelWidth`), stacked on phones, empty values show "—".
- **ProfileBanner** — partner header: banner art per domain tone, 92px logo
  or initials tile, the name as the page **h1**, `status`, `chips`
  (`{label, tone?, icon?}`), `actions`.
- **LinkTabs** — underline tabs as links (`tabs: {key,label,href,icon?,count?}`,
  `current`, `label`); used by the workspace `?tab=` pages.
- Hook `@/hooks/use-directory-query`: `useDirectoryQuery()` →
  `{params, visit(changes), setStatus(value), pagination(laravelPage)}`
  (keeps other query params, `preserveState`). `LaravelPage<T>` type.
- `@/lib/format`: `useDate()` → "18 Nov 2026" (with year).
- Other: `components/applications/` (ApplicationDrawer,
  RejectApplicationsDialog for one or many ids, types), `pool-directory.tsx`
  and `pool-profile.tsx` (both pool lists/details), `change-network-form.tsx`
  (one form for advertiser + publisher; explicit Save instead of the old
  save-on-click).
- `components/resource-directory.tsx` (old tanstack `CustomBaseTable
  presentation="cards"`) is now an adapter onto the new ResourceDirectory, so
  pages of later phases (campaigns, creatives, terms, roles) already render the
  new pattern. New pages should use the app component directly.
- Restyled shared pieces: `partner-workspace-ui` (Panel = SectionCard with
  icon/tone/action/flush, Details = DetailList, Paging, Empty = EmptyState),
  `profile-ui` (ProfileCard = SectionCard, also used by `settings/profile`),
  `partner-profile` (2-column cards). `CustomDialogComponent` now pads 24px and
  sets `--dialog-pad`, so `DialogFooter` runs full-bleed inside it.

### Server changes

- Directory props: `status` + `statusCounts` on `advertisers/index`,
  `publishers/index`, `system_managment/system_users`
  (`?status=active|inactive`, counts `{all, active, inactive}`), and
  `networks/index` (existing `?status=A|P|D`, counts `{all,A,P,D}`). Unknown
  values fall back to all. Lists keep the query string when paging. Added
  `campaigns_count` (advertisers: all campaigns; publishers: approved
  assignments); system users now include role flags and `created_at`.
- `applications/index`: rows add `publisher_id`, `campaign_id`,
  `requested_offer_id`, `terms_accepted_at`, `rejection_reason`,
  `business_name`, `traffic_sources` (decoded), `monthly_visitors`,
  `partner_summary {campaigns, pending, approval_rate}` (scoped to campaigns
  the reviewer can see); page props `statusCounts {P,A,R}` and
  `can {approve, reject}`.
- **New endpoint** `POST applications/bulk-review`
  (`applications.bulk-review`): `ids[]` (1–50), `decision` approve|reject,
  `rejection_reason` required for reject. Route needs `review_applications`;
  the controller then requires `approve_applications` / `reject_applications`
  (403). Ids outside the reviewer's network/campaigns → 404. Approval always
  uses each application's requested offer (the accepted terms) through
  `PartnerEnrollmentService::review`; failures are skipped and reported in the
  flash (`lang/*/messages.php` → `messages.applications.*`). Redirects to the
  pending list. Tests: `tests/Feature/DirectoryWorkspaceTest.php`.

### Pages

All pages in scope use PageHeader/ProfileBanner + the components above.
Applications: SegmentedControl (Pending/Approved/Rejected with counts),
selectable pending rows, bulk bar, review drawer (Sheet) opened by the row
button "Review {name}"; approving from the drawer uses the requested offer.
`applications/show` keeps offer choice (RadioCards) for the full review.
Profiles (advertiser/publisher/network/pool show) use the banner with
Change network (super admins, was missing), Edit profile, plus StatCards and
SectionCards; tab content is unchanged in data. Removed
`applications/table_content.tsx`, `applications/modals/reject.tsx`,
`dev/tabs.tsx`. All modals in scope use DialogHeader (icon tile) +
DialogFooter.

### Tests and selectors

- Vitest: `components/app/resource-directory.test.tsx`,
  `components/app/profile-blocks.test.tsx`,
  `components/applications/applications.test.tsx`.
- Playwright: `applications.spec.ts` (drawer approve, reject with reason,
  bulk approve two), new `directories.spec.ts`. The seed adds **E2E Review
  Campaign** with pending applications from "E2E Bulk One", "E2E Bulk Two",
  "E2E Reject Me" (`seeded.reviewCampaign`, `bulkApplicants`,
  `rejectApplicant`). `approveApplication(page, campaign, applicant?)` now
  uses the drawer (signature changed: campaign first).
- Selector changes: applications rows are list items with a "Review {name}"
  button (was a table row link "View overview"); directory row links are
  "Details for {name}", menus "More actions for {name}".

### Gotchas

- In Vitest the i18n store does not hold the locale JSON (only ~18 keys), so
  plural forms (`_one`/`_other`) never resolve in unit tests; assert loosely.
- Network page: `default_commission_model` is shown as text (it was passed
  through StatusBadge and rendered a misleading "Pending").
- Visual check: light/dark at 1440 and 390 via screenshots from the e2e
  environment (as in phase 05).
