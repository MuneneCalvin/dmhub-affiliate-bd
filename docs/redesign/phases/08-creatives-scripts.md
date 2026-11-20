# Phase 08 · Creatives & embed scripts

**Goal:** creatives library/forms and publisher embed scripts in the new style.

**Design boards:** `Creatives.dc.html`, `Scripts.dc.html`.

## Files in scope

- Pages: `creatives/{index,create,show,edit}`,
  `publisher/scripts/{index,show,documentation}`.
- Components: `creative-form.tsx`, `offer-materials.tsx` (shared with phase
  07 — coordinate via handoff notes; only restyle here if 07 has not).
- Feature tests: `CreativeManagementTest.php`, `MediaStorageTest.php`,
  `SubmissionTrackingTest.php`; node scripts `tests/js/publisher-script.mjs`,
  `partner-sdk.mjs`.

## Tasks

1. Creatives index: type SegmentedControl (All/Banners/Text links/Email with
   counts — use the real creative types), campaign filter, grid/list toggle,
   upload drop zone card (existing upload endpoint, accepted types and size
   limit from validation rules), creative cards (preview using the real
   image/thumbnail, size badge, type pill, campaign, clicks if available,
   copy-code and edit buttons). List view = ResourceDirectory.
2. Create/edit: form in a SectionCard with a live preview panel; show page with
   preview, embed code CopyField and stats.
3. Scripts index: script list cards (selected state), detail panel with status
   badge (installed/not seen from real data), three-step install strip, code
   block with Copy, stats tiles if data exists. Documentation page: readable
   doc layout with side table of contents and code blocks.

## Tests to add

- Vitest: drop zone rejects wrong file type with a message; type filter;
  CopyField used for embed code.
- Playwright `creatives.spec.ts`: advertiser uploads a creative (fixture image
  in `tests/e2e/fixtures/`), it appears in the grid, edit name, filter by type.
  `scripts.spec.ts`: publisher opens a script and copies the snippet.
- Run `npm run test:browser` and `node tests/js/publisher-script.mjs` (or the
  way they're currently run) — must pass.

## Done when

All README checks pass, including the merchant/script tests.

## Handoff notes

**Status: done** (branch `redesign/phase-08-creatives-scripts`, based on
`redesign/phase-07-campaigns`).

### New shared components

- `@/components/creatives` (barrel):
  - **CreativeCard** (`creative`, `href` details link on the name, `editHref?`,
    `onDelete?`): real preview (`preview_url`, else the image `file_url`), size
    badge ("728×90" / "Text" / "HTML"), **CreativeTypePill**, campaign, clicks,
    icon buttons "Copy embed code for {name}" (clipboard + toast) and
    "Edit {name}" / "Delete {name}".
  - **CreativePreview** (`type`, `name`, `imageUrl`, `videoUrl`, `altText`,
    `badge`, `size` card|panel, `onMediaLoad(w,h)`, `onMediaError`): never
    executes HTML. The form uses the load callbacks to read dimensions.
  - **CreativeDropZone** (`onFile`, `rules` = `IMAGE_UPLOAD` | `VIDEO_UPLOAD`,
    `title`, `fileName`, `error`, `disabled` + `disabledReason`, `layout`
    tile|field, `id`): a `<label>` card around a visually hidden file input
    (works with click, keyboard, drag-and-drop; Playwright `setInputFiles` on
    `getByLabel(/Drop files to upload/)`). Rejects wrong types / oversized
    files with a `role="alert"` message and never calls `onFile`.
  - **CreativeUploadDialog** (`open`, `onOpenChange`, `file`, `campaigns`,
    `offers`, `campaignId`): with a file it asks for the offer (grouped
    Select "Offer"), name and Banner/Email format and posts to the existing
    `advertiser.creatives.store` with `return_to=library`; without a file it
    only picks an offer and opens the full editor. Remount it with a new `key`
    per opening.
  - Helpers in `creative-types.ts`: `creativeKind` (legacy `image` → banner),
    `CREATIVE_KIND_META` (label, plural, tone: banner admin, text analytics,
    email finance, html brand, video partners), `IMAGE_UPLOAD` /
    `VIDEO_UPLOAD` (mirror the controller's `mimes`/`max` rules — change both
    together), `uploadError`, `creativeSize`, `creativeThumbnail`.
- `@/components/scripts`: **ScriptListCard** (`aria-pressed` button),
  **ScriptStatusBadge** (`installed` → success "Installed · n loads",
  `not_seen` → warning "Not seen"), **InstallSteps** (Copy / Paste /
  Publish strip), **ScriptDetailPanel**.
- `@/hooks/use-copy-toast` → `useCopyToast()` `{copied, copy(value, message?)}`;
  `CopyField` now uses it. Use it for any copy button that is not a CopyField.
- `components/integration-steps.tsx` restyled as a SectionCard (same copy).
- `offer-materials.tsx` (offer page tab) now renders `CreativeCard`s in a
  SectionCard with `EmptyState` and a numbered pager on `materials_page`.

### Server changes

- `GET advertiser/creatives/index` is now the **creatives library** (was a
  redirect to campaigns). Props: `creatives` (paginated 24, newest first,
  with `campaign`/`offer` names), `type` (`all|banner|text|email|html|video`;
  `banner` includes legacy `image`; unknown → all), `typeCounts` (per type,
  within the campaign filter), `campaign` (visible campaign id or null —
  foreign ids are ignored), `campaigns`, `offers` (visible, for the upload
  dialog), `can {upload, manage}`. Same route middleware
  (`manage_creatives`).
- `store` / `update` / `destroy` accept `return_to=library` and then redirect
  to the library; without it they behave as before (offer materials tab, or
  the campaign workspace with `workspace=1`).
- `create` without `offer_id` now redirects to the library (the offer picker
  lives there) instead of the campaigns list. `create`/`edit` get
  `returnTo: 'library'|null` from `?from=library` (breadcrumbs + Cancel).
- `show` adds `can.manage`.
- Publisher scripts (`index`, `show`): each script adds `install_status`
  (`installed` when `script_impressions > 0`, i.e. the SDK or impression
  pixel has loaded at least once; else `not_seen`), `script_loads`,
  `clicks` and `last_click_at` (count and latest `clicked_at` from the
  `clicks` table — not the `total_clicks` counter, which can lag).
  Index is ordered by assignment id (oldest first). There is no "last seen"
  timestamp in the data, so the badge shows the load count instead of
  "seen 4 min ago".
- Tests: `tests/Feature/CreativeLibraryTest.php`,
  `tests/Feature/PublisherScriptsPageTest.php`. `OfferMaterialsIntegrationTest`
  "redirects legacy standalone material navigation" was replaced by "sends
  material creation without an offer to the creatives library" (deliberate
  behaviour change above).

### Pages

- **Creatives library**: PageHeader (admin tone) + "New creative", type
  SegmentedControl "Creative type" (All, Banners, Text links, Email always;
  HTML/Video only when they have creatives), campaign Select, Grid/List
  toggle (remembered in `localStorage` `creatives.view`), drop zone tile
  (upload permission; disabled with a reason when there are no offers),
  CreativeCards, pager. List view = `ResourceDirectory` with type, size,
  campaign, clicks and a menu (Copy embed code, Edit, Delete).
- **Create / edit** (`creative-form.tsx`): single page instead of the old
  three-step tabs. "Details" SectionCard (offer, name, format RadioCards),
  "Content" SectionCard (drop zone, HTML, alt/link text, preview image) and a
  sticky "Live preview" card with Cancel / Create creative | Save changes.
  Client checks run on submit and focus the first invalid field.
- **Creative show**: StatCards (impressions, clicks, CTR), "Embed code"
  SectionCard (tracking URL, embed code, pixel URL, pixel code, complete
  code — all CopyFields), preview and DetailList; Edit / Delete (confirm) for
  managers.
- **Embed scripts**: list of ScriptListCards + detail panel (status, install
  steps, code `CopyField variant="code"` "Embed script", tracking link, Script
  loads / Clicks / Last click tiles, links to details and docs).
  Selection is kept in `?script=<id>` (history.replaceState). The design's
  "New script" button is omitted: scripts are created by campaign approval.
- **Script show**: install card with status + snippet + tiles, Script details
  (URL, token), Tracking link (+ Test link), How it works, Submission events,
  Conversion setup. **Documentation**: sticky "On this page" nav (anchors)
  beside SectionCards for each guide section; every code sample is a
  `CopyField variant="code"`.

### Tests and selectors

- Vitest: `components/creatives/creatives.test.tsx` (drop zone rejection,
  type filter → `router.get`, grid/list, permissions, CopyField for embed
  code), `components/scripts/scripts.test.tsx`.
- Playwright: `creatives.spec.ts` (upload via drop zone with
  `tests/e2e/fixtures/creative-banner.png` 300×250, edit name, type filter;
  second test depends on the first's "E2E Summer Banner v2"),
  `scripts.spec.ts` (select a script, copy the snippet, docs TOC).
- The lifecycle journey still finds the embed tag (`/s/`) and the submission
  tracking link on `/publisher/scripts`: the first (oldest) assignment is
  selected by default.

### Gotchas

- e2e: uploads are stored in the run's temp storage; `tests/Support/e2e-server.php`
  now serves `/storage/*` from there (before, uploaded images were broken in
  e2e because `public/storage` links to the real storage directory).
- `en.json` had `"All": "ALL"`; changed to "All" (also affects the
  marketplace industry filter, which now reads "All").
- `jsdom` keeps the URL between tests: reset it
  (`window.history.replaceState(null, '', '/')`) after tests that select a
  script.
- `user.upload` honours `accept`, so test rejected types with
  `fireEvent.change`.
- The project is ESM: Playwright specs can't use `__dirname`; resolve paths
  from the repo root.
