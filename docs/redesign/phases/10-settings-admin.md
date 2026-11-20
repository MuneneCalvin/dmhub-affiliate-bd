# Phase 10 · Settings & administration

**Goal:** account settings, network settings, roles/permissions and fraud
rules in the new style.

**Design boards:** `Settings.dc.html`, `Roles.dc.html`, `Fraud.dc.html`,
`Overlays.dc.html`.

## Files in scope

- Pages: `settings/{profile,password,two-factor,appearance}`,
  `network_settings/index`, `system_managment/{roles_page,permissions}` +
  `modals/{role-form,assign_roles}`, `admin/fraud/{index,show}`.
- Layout: `layouts/settings/layout.tsx`.
- Components: `appearance-tabs.tsx`, `delete-user.tsx`,
  `two-factor-setup-modal.tsx`, `two-factor-recovery-codes.tsx`,
  `advertiser-settings.tsx`, `publisher-settings.tsx`.
- Feature tests: `tests/Feature/Settings/*`, `FraudEngineTest.php`,
  `Security/*`.

## Tasks

1. Settings layout: left section menu with tinted icon tiles (Profile,
   Company details, Password, Two-factor, Payout details, Appearance — only
   the sections that exist for the user's role), content SectionCards.
2. Profile (avatar upload if supported, name, email with verified state),
   password, two-factor (status card, setup modal, recovery codes),
   appearance (theme preview RadioCards light/dark/system + language
   SegmentedControl), danger zone delete account with confirm dialog.
3. Network settings: SectionCards per settings group, branding preview.
4. Roles & permissions: role cards list (selected state, users and permission
   counts), permission grid grouped by domain with checkbox tiles and
   "x of y on" counts, save/cancel footer, create/edit role modal, delete
   confirm, assign roles modal.
5. Fraud rules: scope selectors (network, campaign/defaults), automation mode
   RadioCards, rule cards with icon, threshold value and Switch, preview
   results (navy card, stacked bar from the preview endpoint), policy history
   with Restore (reason required, as today), fraud show page restyled.

## Tests to add

- Vitest: permission grid group counts update when toggling; Switch rules are
  `role="switch"` with names; theme RadioCards change appearance.
- Pest: settings and fraud tests green; any new props covered.
- Playwright `settings.spec.ts` (extend): update profile; change password
  (then log in with it); enable 2FA up to showing the QR/secret (no real
  device); switch theme/language persists after reload.
  `admin.spec.ts`: super admin creates a role with two permissions, assigns it
  to a user, user sees the permitted menu item; changes a fraud rule threshold,
  runs preview, saves a new version, restores the previous one.

## Done when

All README checks pass.

## Handoff notes

**Status: done** (branch `redesign/phase-10-settings-admin`, based on
`redesign/phase-09-finance`).

### New shared components

- `@/components/app`:
  - **FormField** (`id`, `label`, `hint?`, `error?`, `after?`): label +
    one control + hint + error; clones the child with `aria-describedby`
    and `aria-invalid`. Use it for every labelled field.
  - **PermissionGrid** (`permissions {id,name}[]`, `value` ids,
    `onValueChange`, `query?`, `disabled?`): permissions grouped by domain
    (`role="group"` named by the group), "x of y on" per group, native
    checkbox tiles named by the readable label. Counts ignore the search
    filter.
  - **ImageUploadField** (`id`, `label`, `currentUrl`, `file`,
    `onFileChange`, `accept`, `shape wide|square`, `hint`, `error`) and
    `useObjectUrl(file)`.
- `@/lib/permissions`: `permissionGroup(name)` (keyword rules, specific words
  first), `permissionLabel(name)` (readable English labels for all seeded
  permissions; unknown codes are humanised), `groupPermissions`,
  `PERMISSION_GROUPS`, `roleLabel` (built-in role codes → "Network owner"…).
- `@/components/fraud`: `meta.ts` (events, automation/rule modes, setting
  metadata, `ruleSummary`, `ruleThreshold`, `previewBreakdown`, rule icons),
  `fields.tsx` (`UnitInput`, `DurationInput`, `Hint`), `rule-card.tsx`
  (**RuleCard**: icon, summary, threshold chip, `Switch` named by the rule,
  Monitor/Enforce SegmentedControl, "Adjust" panel), `preview-card.tsx` (navy
  **PreviewCard**: stacked bar Pass / Flagged for review / Missing evidence,
  counts, changed decisions, reason + "Save as new version"),
  `policy-history.tsx` (**PolicyHistory**, **RestoreDialog**,
  **PerformanceTable**).
- Primitive additions: `RadioCard media` (decorative preview above the
  title), `StackedBar variant="dark"` + `stacked`, Button `tone="danger"`
  (soft danger) and `variant="translucent"` (secondary on navy).
- `appearance-tabs.tsx` now exports **ThemePicker** (radiogroup "Theme" with
  preview cards) and **LanguagePicker** (SegmentedControl "Language").
- `delete-user.tsx` is the danger-zone card; `two-factor-*` restyled.

### Server changes

- `GET settings/company` (`settings.company`, `ProfileController@company`,
  404 without a company). `companies` moved there from `settings/profile`
  (`App\Support\SettingsSections::companies()`); `PartnerCardEditingTest`
  now asserts on the new route.
- Shared prop `settingsSections` (`{company: bool}`, only on settings routes,
  `null` elsewhere) drives the settings menu.
- Roles index: `roles` (all, `{id,name,users_count,permissions[],built_in}`,
  users counted from `user_roles`), `allPermissions`, `selectedRoleId`
  (`?role=`). Store / update / sync redirect back with `?role=` so the role
  stays selected. Built-in roles still cannot be renamed or deleted.
- Permissions index: `permissions {id,name,roles[]}`, `canManageRoles`
  (no pagination).
- System users rows include `roles {id,name}`; `roles` prop is `{id,name}`.
- Fraud: `history` and `feedback` rows carry `actor_name`.
- Tests: `tests/Feature/SettingsAdminRedesignTest.php`.

### Pages and behaviour

- Settings: one PageHeader "Account settings", section menu (Profile,
  Company details when available, Password, Two-factor, Appearance). There is
  no avatar upload or "Payout details" (neither exists). Profile edits inline
  (two cards, both send username + email as the request requires). The danger
  zone keeps the wording **"Close account"**: the server closes the account
  and retains records, so "Delete" would be inaccurate.
- Two-factor: status card (Enabled/Disabled badge, recovery codes left),
  "View recovery codes" reveals the codes card, "Enable two-factor" opens the
  setup dialog (QR `img` + Setup key CopyField, then the 6-digit step).
- Appearance: theme RadioCards + language SegmentedControl (persists via
  `/locale`).
- Network settings: identity, brand assets (three upload fields), support
  contact, live branding preview, sticky save bar.
- Roles & permissions: role cards (`aria-pressed`), permission grid with
  search, Rename / Delete role (custom roles only), unsaved-changes guard when
  switching role, "All permissions" link. **The separate "Permissions" menu
  item is gone**; `/system/settings/permissions` highlights "Roles &
  permissions".
- Fraud rules: scope selects in the header, StatCards (automation, awaiting,
  on hold, failed), automation RadioCards, rule cards, coverage (Switch per
  conversion type), limits (Switch per currency), sticky preview + history
  column, performance table. The old Policy / Performance / History tabs are
  replaced by this single layout. Fraud detail page restyled (assessment
  SectionCards, results table with StatusBadges, outcome form).

### Tests and selectors

- Vitest: `permission-grid.test.tsx`, `fraud/fraud.test.tsx`,
  `appearance-tabs.test.tsx`, `form-field.test.tsx`,
  `layouts/settings/layout.test.tsx`, RadioCard media; nav config test drops
  the permissions item.
- Playwright: `settings.spec.ts` rewritten (profile "Save changes", 2FA up to
  the QR/secret, password change + sign in, theme/language persist, top bar
  language). New `admin.spec.ts` (role with two permissions → assign →
  staff sees "Network settings"; fraud threshold → preview → two versions →
  restore). `helpers.ts` gained `loginWith(page, email, password)` and
  `seeded.settingsUser` / `seeded.staffUser`.
- Selector changes: profile "Edit Personal information" dialog → inline
  "Profile" region + "Save changes"; theme buttons "Dark"/"Light" → radios in
  radiogroup "Theme".
- E2E seed: `settings@dmhub.test` (super admin; its password is changed by
  the spec) and `staff@dmhub.test` (network member in DMHub, no role).

### Gotchas

- `/settings/two-factor` requires password confirmation (Fortify
  `confirmPassword`).
- The theme preview uses raw palette hex on purpose (it previews the other
  theme).
- `admin.spec` saves fraud policy versions for the DMHub network (rules only;
  automation mode untouched).
