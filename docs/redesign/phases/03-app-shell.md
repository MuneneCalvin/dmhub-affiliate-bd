# Phase 03 · App shell & navigation

**Goal:** new sidebar, top bar and page header used by every authenticated
page, with navigation defined once and filtered by role and permission.

**Design boards:** `Sidebar.dc.html` (props `role`: network / publisher /
advertiser / admin; `active`), `Topbar.dc.html`, `Overlays.dc.html` (account
menu, notifications panel), and the header area of `Main.dc.html` /
`Directory.dc.html` for the page header.

## Files in scope

- `resources/js/components/app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx`,
  `nav-footer.tsx`, `components/ui/sidebar.tsx`
- `resources/js/components/app-header.tsx`, `app-sidebar-header.tsx`,
  `header-account-menu.tsx`, `header-docs-link.tsx`, `language-switcher.tsx`,
  `appearance-dropdown.tsx`, `search.tsx`, `partner-discovery-dialog.tsx`,
  `breadcrumbs.tsx`, `heading.tsx`, `heading-small.tsx`, `app-shell.tsx`,
  `app-content.tsx`, `user-menu-content.tsx`
- `resources/js/layouts/app-layout.tsx`, `layouts/app/*`
- Notifications: check `routes/notifications.php` and its controller for the
  data the panel can show.

## Tasks

1. **Navigation config** `resources/js/navigation/config.ts`: one array of
   groups (Overview/Marketplace, Campaigns, Partners, Finance, Administration),
   each item `{ key, titleKey, href (wayfinder route), icon, domain, permission?,
   roles?, badgeKey? }`. A pure function `buildNavigation(user, permissions)`
   returns the visible groups (empty groups dropped). Detail/create routes map
   to their list item for the active state (`matchPatterns`).
2. **Sidebar** (navy, 264px): logo block (tenant branding/logo when present),
   workspace switcher card (network name + role), grouped nav with domain-dot
   group labels, 30px icon tiles in domain nav colour, active item = brand pill
   with white text, count badges (pending applications, fraud flags) from shared
   Inertia props, docs card at the bottom. Collapsed icon-only mode and mobile
   drawer (keep current behaviour); links close the drawer.
3. **Top bar** (72px, 64px mobile): sidebar toggle, global search pill with ⌘K
   (opens existing discovery/search), role chip, language switch, theme toggle,
   notifications button with unread count + popover panel, account menu
   (settings, campaign terms, log out). Wrap at narrow widths.
4. **PageHeader** `components/app/page-header.tsx`: breadcrumbs, optional
   56px solid icon tile (domain), title, description, actions slot that wraps.
   Replace the existing `heading.tsx` usage via a compatibility wrapper so
   untouched pages still work.
5. **Layout**: canvas background, content max-width 1680px, padding per
   tokens, sections gap. Keep `workspace-*` classes working or migrate them.
6. Backend: expose counts the sidebar needs (e.g. pending applications) in
   `HandleInertiaRequests` shared props, cheaply and permission-aware.

## Tests to add

- Vitest: `buildNavigation` per role/permission matrix (super admin, network
  owner, advertiser, publisher, user with partial permissions) → exact visible
  keys; active-state matching for detail routes; Sidebar renders badges and
  `aria-current="page"`; PageHeader renders breadcrumbs and actions; top bar
  icon buttons have accessible names.
- Pest: shared props include the counts only for users allowed to see them.
- Playwright: update `navigation.spec.ts` to the new menu; add mobile viewport
  test (drawer opens, link navigates, drawer closes); theme and language
  toggles from the top bar; notifications panel opens.

## Done when

All README checks pass; every authenticated page renders inside the new shell
for all four roles.

## Handoff notes

**Status: done** (branch `redesign/phase-03-app-shell`, based on
`redesign/phase-02-ui-primitives`).

### Shell

- Every authenticated page now uses the sidebar layout, for all four roles.
  The publisher/advertiser top-nav layout (`layouts/app/app-header-layout.tsx`,
  `components/app-header.tsx`) and its `.workspace-top-*` / `.workspace-footer`
  CSS are gone. `AppLayout` still accepts `breadcrumbs` but ignores it.
- Removed as unused: `heading.tsx`, `nav-user.tsx`, `nav-footer.tsx`,
  `header-docs-link.tsx` (docs moved to the sidebar card), and
  `NavBarLanguageChanger` / `NavBarNotification` in `dev/core.tsx`.
  `heading-small.tsx` stays for the settings pages (phase 10).
- Layout: `layouts/app/app-sidebar-layout.tsx` → skip link, `AppSidebar`,
  `<main class="workspace-main bg-canvas">` with the top bar, flash toasts and
  `#main-content`. Pages keep their own `.workspace-page` wrapper (max 1680px,
  32/36/48 padding, 16px sides on mobile); that class still works.
- Sidebar primitive (`ui/sidebar.tsx`): 264px (`16.5rem`), 72px collapsed,
  menu buttons restyled (44px, brand pill when active), translated mobile sheet
  title "Navigation". Old `[data-slot='sidebar-*']` overrides removed from
  `app.css`.

### Navigation config (`resources/js/navigation/config.ts`)

- `navigation`: groups `overview` (no label), `campaigns`, `partners`,
  `finance`, `administration`. Item shape:
  `{ key, titleKey, titleByRole?, href, icon, domain, permission?, roles?,
  slot?, matchPatterns?, badgeKey? }`.
  - `roles` mirrors the route middleware (`admin | network | advertiser |
    publisher`, from the `is_*` flags); `permission` is "any of". Super admins
    pass permission checks (as `RequireBusinessPermission` does) but are still
    limited by `roles`.
  - `slot: 'overview'` keeps one Overview for multi-role accounts.
  - `titleByRole` swaps labels by the user's primary role (advertiser "My
    campaigns", admin "Platform finance" / "Network invoices").
  - `matchPatterns` are path prefixes; `*` matches one segment.
- `buildNavigation(user, permissions)` → visible groups (empty dropped).
  `findActiveKey(groups, url)` → the longest matching href/pattern wins.
  Also `userRoles`, `primaryRole`, `roleLabels`, `roleTones`, `normalizePath`.
- To add a page to the menu, add an item here and a row to
  `navigation/config.test.ts`. The search palette uses the same list.
- Menu changes vs. before: advertisers now see **Creatives**; network owners
  and admins see **Partner pool** and **Fraud rules**; publisher/advertiser
  labels are sentence case ("My campaigns", "My earnings", "Embed scripts").
  Not in the menu because no page exists yet: advertiser "Applications",
  "Funding & budget" and "My invoices" from the Sidebar board (phases 06/09
  can add them). Admins keep a separate **Permissions** item because nothing
  else links to `/system/settings/permissions`; phase 10 can link it from the
  roles page and drop the item.

### Shared props

- `navCounts` (lazy closure in `HandleInertiaRequests`):
  `{ pendingApplications: int|null, fraudFlags: int|null }`. `null` = the user
  may not see the page (only super admins and network members with
  `review_applications` / `review_commissions`).
  - `pendingApplications`: publisher campaign applications with status `P`,
    scoped like `PublisherApplicationController@index`. Badge on
    **Applications**.
  - `fraudFlags`: pending earnings whose latest fraud assessment is completed
    with `manual_review` (= Financial review with `fraud=manual_review`).
    Badge on **Financial review** (the design draws it on Fraud rules, but the
    flagged items are reviewed on the finance page).
- `auth.permissions` is unchanged in shape.
- Feature test: `tests/Feature/NavigationCountsTest.php`.

### Top bar (`components/app-sidebar-header.tsx`)

Sidebar toggle (`Toggle sidebar` / `Open navigation` on mobile, with
`aria-expanded`), search pill (`components/search.tsx` → `GlobalSearch`,
⌘K / Ctrl+K command palette over the user's menu items + account settings +
docs; there is no record search on the server yet), role chip (lg+), language
menu (`components/language-switcher.tsx`, button "Change language (English)",
items are `menuitemradio` named in their own language: "English",
"Nederlands"), theme toggle (`components/appearance-dropdown.tsx`, default
export, "Switch to dark mode" / "Switch to light mode"; "System" stays on the
Appearance settings page), notifications (`components/notifications-menu.tsx`,
button "Notifications, N unread", popover `region` "Notifications", reads
`auth.user.notifications`, mark one / all as read), account menu
(`header-account-menu.tsx`, still "Account menu"; items Account settings,
Campaign terms (with `manage_campaigns`), Account and role help, Log out).
`UserAvatar` and `displayName` are exported from `user-menu-content.tsx`.

### Page header (`@/components/app` → `PageHeader`)

```tsx
<PageHeader
    title={t('Advertisers')}
    description={t('Brands running campaigns in {{network}}', { network })}
    breadcrumbs={[{ title: t('Partners'), href: … }, { title: t('Advertisers'), href: … }]}
    icon={<Building2 />}   // optional 56px solid tile
    tone="partners"
    actions={<Button>…</Button>}
/>
```

The last crumb is the current page. `ReusablePageTitle` (dev/core) now renders
`PageHeader` (prepends a "Dashboard" crumb, children → `actions`), so pages
not yet migrated already get the new header. Page phases should switch to
`PageHeader` directly and add the domain icon. `Breadcrumbs` takes an
optional `className` and labels its landmark "Breadcrumb".

### Other changes

- `ui/command.tsx`: `CommandDialog` title/description moved inside
  `DialogContent` (was a Radix a11y warning); items 44px.
- Dutch "Creatives" fixed (was "Creativeeven").
- Playwright: `navigation.spec.ts` rewritten (role menus, badge link,
  collapse, mobile drawer, notifications, search). `theme.spec.ts` uses
  "Switch to dark/light mode"; `settings.spec.ts` uses `menuitemradio`
  "Nederlands"/"English".
