# Phase 07 · Campaign workspace & wizard

**Goal:** campaign list, workspace (all tabs), offers, terms and the
create/edit wizard in the new style, for advertisers, network owners and the
publisher view of a campaign.

**Design boards:** `CampaignDetail.dc.html`, `CampaignCreate.dc.html`,
`Directory.dc.html` (campaign list), `Overlays.dc.html`.

## Files in scope

- Pages: `advertisercampaigns/{index,show,create,edit}`,
  `advertisercampaigns/offers/{index,show,edit,promotions}` + `modals/create`,
  `advertisercampaigns/terms/{index,create}`, `publishercampaigns/{index,show}`
  + `modals/qrcode`, `campaigns/offer-tracking`.
- Components: `campaign-workspace.tsx`, `campaign-form.tsx`,
  `campaign-offers.tsx`, `campaign-offer-forms.tsx`, `campaign-publishers.tsx`,
  `campaign-analytics.tsx`, `campaign-finance.tsx`, `campaign-funding.tsx`,
  `campaign-settings.tsx`, `campaign-tracking.tsx`, `campaign-tracking-hub.tsx`,
  `country-targeting.tsx`, `offer-step-tabs.tsx`, `offer-integration.tsx`,
  `offer-materials.tsx`, `offer-thumbnail-upload.tsx`, `promotion-editor.tsx`,
  `promotion-stores.tsx`, `customer-promotions.tsx`,
  `generated-tracking-template.tsx`, `merchant-tracking-guide.tsx`,
  `integration-steps.tsx`, `advertiser-funding-sheet.tsx`.
- Feature tests: `Campaign*WorkspaceTest.php`, `CampaignOverviewTest.php`,
  `CampaignUxRegressionTest.php`, `OfferManagementTest.php`,
  `OfferMaterialsIntegrationTest.php`, `CustomerPromotionsTest.php`,
  `OptionalFundingTest.php`.

## Tasks

1. Campaign list: ResourceDirectory (from phase 06) with campaign identity,
   status, offers count, budget progress, dates.
2. Workspace header: banner + logo tile, name, status badge, meta chips
   (advertiser, commission, geo, dates), actions (Pause/Resume, Edit, Add
   offer); icon tabs with counts (Overview, Offers, Publishers, Creatives,
   Tracking, Finance, Settings) — keep each tab's URL/state behaviour.
3. Overview tab: StatCards (clicks, conversions, net sales, EPC), offers table
   with type pills and status, budget ProgressRing card with Add funds,
   tracking link card (navy, CopyField, postback/last-hit chips from real
   data).
4. Other tabs restyled with SectionCards; tracking hub code blocks use the
   navy code style with Copy.
5. Wizard (create and edit): Stepper (The essentials → Audience & targeting →
   Budget & terms → Check details), the form steps from `campaign-form.tsx`
   with all existing fields and validation, status RadioCards, tag chips input,
   live marketplace-card preview, sticky footer (Cancel / Save draft if
   supported / Continue). Edit opens on the step with the first error.
6. Offers: create modal and edit page use the same offer step tabs restyled;
   promotions page restyled.
7. Publisher campaign view (`publishercampaigns/show`): same header, publisher
   tabs (links, creatives, scripts, terms); QR code modal restyled.

## Tests to add

- Vitest: Stepper navigation keeps entered values; required-field errors jump
  to the right step; preview card reflects name/advertiser/tags; tab bar marks
  the current tab.
- Pest: keep all listed feature tests green; adjust only selectors/props when
  structure changes.
- Playwright `campaigns.spec.ts` (extend): create campaign through all wizard
  steps; add an offer; pause and resume; copy tracking link shows a toast;
  publisher opens an approved campaign and copies their link.
- Run `npm run test:browser` (merchant tracking release test) — must pass.

## Done when

All README checks pass, including `npm run test:browser`.

## Handoff notes

**Status: done** (branch `redesign/phase-07-campaigns`, based on
`redesign/phase-06-directories`).

### New shared components

- `@/components/campaigns` (barrel): **CampaignHeader** (ProfileBanner +
  status + chips for advertiser / headline commission / geo / dates + actions +
  `LinkTabs` "Campaign sections" in the banner footer), **TrackingLinkCard**
  (navy card, dark `CopyField`, `signals {label, state: ok|wait|muted}[]`),
  **CampaignPreviewCard** (decorative marketplace card, no links/buttons),
  **CommissionPill** (CPS/CPA/CPL/CPC/RevShare/Flat tone pill), helpers
  `campaignStatusKey` (A→active, **P→paused**, I→inactive), `offerStatusKey`,
  `formatRate(type, value, money)` ("8%" for CPS/RevShare, money otherwise).
- `@/components/app`: **TagInput** (chips + text field, Enter/comma adds,
  Backspace removes last, datalist suggestions stored by value, shown by
  label; chip buttons "Remove tag {tag}"). **CopyField** gained
  `variant` `dark` (on navy surfaces) and `code` (own navy panel — use for code
  blocks on light pages). **ProfileBanner** gained `footer` (rendered under a
  divider; the campaign header puts its tabs there).
- `OfferStepTabs` restyled (icon tiles, "Step n of 4" eyebrow); same Tabs API.

### Server changes

- **New endpoint** `PATCH advertiser/campaigns/{campaign}/status`
  (`campaign.status.update`, `manage_campaigns`, `Campaign::visibleTo`):
  `campaign_status` A|P only, redirects back with translated flash
  `messages.campaigns.paused|resumed`.
- `CampaignOverviewService` adds `campaign.countries`, `campaign.tags`,
  `counts {offers, publishers|null}`, `offer_conversions` (confirmed per
  offer id, 30-day window), `tracking {last_click_at, last_outcome_at}`,
  `can {manage, create_offers, fund}`, `funding_advertiser` (operators with
  `manage_funding` only; feeds the existing `FundingSheet` "Add funds").
- Campaign list (`advertisercampaigns/index`): `?status=A|P|I` filter,
  `statusCounts {all,A,P,I}`, rows add `advertiser_name`, `offers_count`,
  `spent_amount`; newest first; paging keeps the query string.
- Offer create page gets `campaign {id,name,currency}`; campaign edit page
  gets `advertiserName`.
- Tests: `tests/Feature/CampaignWorkspaceRedesignTest.php`. All listed
  campaign/offer feature tests unchanged and green.

### Pages

- Workspace (`campaign-workspace.tsx`): breadcrumbs, CampaignHeader with
  Pause/Resume (soft warning / success), Edit, Add offer (→ offer create page);
  publisher sees "Copy tracking link". Tabs keep their `?tab=` keys; manager
  labels shortened ("Offers", "Tracking"), counts on Offers/Publishers.
  Blocking alerts are `Alert variant="warning"` above the content; non-blocking
  ones moved into "Needs attention". Overview = StatCards (clicks, approved
  conversions, net sales, EPC) → offers table + budget (ProgressRing when a
  total limit exists) / publisher earnings + tracking link card → chart + needs
  attention → lifecycle → recent activity.
- Wizard (`campaign-form.tsx`): 4 steps (The essentials, Audience & targeting,
  Budget & terms, Check details) with `Stepper` (forward clicks validate the
  steps in between), live preview aside, sticky footer (Cancel / Back /
  Continue | Create campaign / Save changes). Currency moved to step 1; status
  RadioCards on create too (A/P/I). Opens on the step of the first server
  error; exports `STEP_FIELDS`, `firstStepWithError`. **No "Save draft"**: the
  server validates the full campaign on store, so a draft would just be the
  Inactive status.
- Lists: campaigns, publisher "My campaigns" and campaign terms use
  ResourceDirectory; terms create is a DialogHeader/DialogFooter dialog and
  delete now confirms (shared terms hidden from non-admins).
- Offer show rebuilt with SectionCards/DetailList/badges; create/edit/
  promotions/offer-tracking use PageHeader + card containers.
  `offers/modals/create.tsx` (unused "Create commission" modal) was deleted.
- Tab internals (offers, publishers, finance, analytics, settings, tracking)
  still use their own `resources/css/campaign-*.css`, now mapped to tokens
  (status colours, radii, uppercase table heads, card surfaces via
  `campaign-workspace.css`). Tracking link and embed script use the navy
  `CopyField variant="code"`; technical instructions `<pre>` is navy.
  Phase 11 can move these to SectionCard markup.

### Deviations from the boards

- No separate Creatives tab: materials live in the Offers tab (as before).
  Publisher tabs are unchanged in scope (overview, offers & materials, my
  assignment, tracking, analytics, earnings) — scripts are linked from the
  "My campaigns" row menu ("Embed script", "View docs", "QR code").
- Budget card shows spending limit / spent / remaining plus daily usage and
  advertiser balance (no "funded" figure per campaign exists).
- Manager tracking card has no single link (links are per publisher): it shows
  "Conversion received" / "Last click …" signals from real data.

### Tests and selectors

- Vitest: `components/campaigns/campaign-form.test.tsx`,
  `components/campaigns/campaign-blocks.test.tsx`.
- Playwright `campaigns.spec.ts`: wizard through all steps + offer, pause/
  resume, advertiser copies a publisher link (tracking detail page),
  network status filter, publisher copies their link. `createCampaign` now
  uses labels ("Campaign name", "Start date", `getByLabel(/^Total budget/)`,
  button "Create campaign"); the offer helper still uses ids (offer forms
  were restyled, not rebuilt).
- `npm run test:browser` passed against a local DBngin PostgreSQL database
  `affiliates_nl_qualification` (env: `APP_ENV=testing DB_CONNECTION=pgsql
  DB_DATABASE=affiliates_nl_qualification APP_URL=http://127.0.0.1:8765`, then
  `php artisan migrate:fresh --force`,
  `php tests/Support/release-fixture.php seed > .release-fixture.json`,
  `npx playwright test`, delete the fixture). The database was left in place
  for later phases.

### Gotchas

- Tailwind v4: don't mix `lg:` (rem) with `min-[1400px]:` (px) — they sort
  wrongly. Use rem (`min-[87.5rem]:`).
- `Alert` defaults to `role="alert"`; pass `role="note"` for static info.
- Visual check: light/dark at 1440 and 390 via screenshots from the e2e
  environment; dark mode must be switched with the top-bar button (the app
  ignores `prefers-color-scheme` emulation once a preference is stored).
