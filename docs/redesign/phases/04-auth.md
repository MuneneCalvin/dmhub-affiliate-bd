# Phase 04 · Auth & access pages

**Goal:** sign in, registration and access-state screens in the new style.

**Design boards:** `Login.dc.html`, `AuthStates.dc.html`.

## Files in scope

- Pages: `auth/login`, `auth/register`, `auth/register_tabs.tsx`,
  `auth/register_tabs/{publisher_tabs,advertiser_tabs}.tsx`,
  `auth/forgot-password`, `auth/reset-password`, `auth/confirm-password`,
  `auth/verify-email`, `auth/two-factor-challenge`, `errorpages/wait_approval`,
  `errors/forbidden`, `welcome` (+ `components/landing/*` if still routed —
  `/` currently redirects to login/dashboard; delete dead landing code only if
  nothing routes to it).
- Layouts: `layouts/auth-layout.tsx`, `layouts/auth/*` → one split layout
  (navy brand panel with role tiles + form panel), collapsing to the form only
  on mobile.
- Controllers under `app/Http/Controllers/Auth` and Fortify views config only
  if a flow needs new props.

## Tasks

1. Split auth layout; tenant branding on the brand panel when a network domain
   supplies it.
2. Login: email/password with leading icons, show-password button, remember
   me, forgot link, register link, language switch.
3. Register: role choice as RadioCards (Publisher/Advertiser), then the
   existing step tabs restyled with the Stepper/progress bar; keep every
   existing field and validation.
4. Forgot/reset/confirm password, verify email, 2FA challenge (OTP input +
   recovery code switch): same card style.
5. Waiting approval and 403: full-page states inside the auth layout (403 also
   reachable inside the app shell if currently rendered there; keep the
   existing status code).

## Tests to add

- Vitest: register role choice switches the visible step set; password
  visibility toggle; OTP input accepts 6 digits.
- Playwright `auth.spec.ts` (extend): login success per role, wrong password
  error, forgot password submits and shows the status message, register as
  publisher reaches the waiting-approval page, unverified user sees verify
  email, forbidden URL shows 403 with a link back.
- Pest: existing `tests/Feature/Auth` stay green.

## Done when

All README checks pass; auth pages match the boards in light and dark and at
375px width.

## Handoff notes

**Status: done** (branch `redesign/phase-04-auth`, based on
`redesign/phase-03-app-shell`).

### Layout

- `layouts/auth-layout.tsx` is the only auth layout (the old
  `layouts/auth/auth-{simple,card,split}-layout.tsx` are gone). Props: `title?`
  (h1), `description?`, `width` `form` (420px) | `wide` (520px). Omit `title`
  when the content brings its own h1 (state pages). It wraps
  `LanguageProvider` and shows the top-bar `LanguageSwitcher` (same
  "Change language (…)" button as the app shell).
- `layouts/auth/auth-brand-panel.tsx`: `AuthBrandPanel` (navy panel, headline,
  three tilted role tiles, decorative shapes; `lg+` only, labelled region
  "About {name}"), `AuthBrandMark` (44px brand tile + name, used on the panel
  and above the form on mobile), `useAuthBrand()` → `{ name, logoUrl }`.
- **Tenant branding:** there is no domain → network lookup for guests, so the
  branding only shows where `networkBranding` is shared, i.e. for signed-in
  users (verify email, waiting approval, 403, confirm password). Guests see
  DM Hub. The mark uses `sidebar_logo_url` (like the app sidebar) in a brand
  tile and falls back to the link icon if the image fails. If a
  per-domain tenant lookup is added later, share `networkBranding` for guests
  and the auth pages pick it up.

### New shared components

- `components/ui/password-input.tsx` → `PasswordInput`: `InputGroup` with a
  lock icon (`showIcon`, default true) and a show/hide button ("Show password"
  / "Hide password", `aria-pressed`). Takes all `<input>` props.
- `components/app/step-progress.tsx` → `StepProgress` `current`, `total`,
  `stepLabel?`: segmented bar, `role="progressbar"` named "Progress",
  `aria-valuetext` "Step 2 of 3 · Your website".
- `components/app/state-panel.tsx` → `StatePanel` `icon`, `tone`,
  `tileVariant`, `title`, `description?`, `badge?`, `actions?`, `variant`
  `default` | `inverse` (navy card), `headingLevel` 1|2. A `<section>` named by
  its heading with a 96px icon tile. Reusable for empty/blocked full-page
  states elsewhere.
- `IconTile` gained sizes 48 and 96. `Button` gained `variant="inverse"`
  (white on navy).
- Restyled globally: `ui/input-otp.tsx` slots (separate 44–48×56 boxes, brand
  focus halo — also used by the 2FA setup modal in settings), `InputError`
  (13px semibold `text-danger-ink`, readable in dark), `TextLink` (bold
  brand-ink, underline on hover).

### Pages

- **Login**: "Welcome back"; button **Sign in** (was "Log in"), checkbox
  "Keep me signed in", links "Forgot password?" and "Create an account",
  status flash as a success `Alert`. Field labels unchanged ("Email address",
  "Password").
- **Register**: one form for both roles (the duplicated
  `register_tabs/{publisher,advertiser}_tabs.tsx`, `register_tabs.tsx` and
  `RegisterTabs` in `dev/tabs.tsx` are removed). Steps: 1 Account type
  (RadioCards Publisher/Advertiser) → 2 "Your website" (publisher) / "Your
  company" (advertiser) → 3 "Your details". Same fields, ids
  (`{role}-business_name`, …), zod schemas (picked per role via
  react-hook-form `context`), `role_name` and server-error handling (errors
  jump back to the step that owns the field). Labels renamed: "Website URL",
  "Chamber of Commerce number", "Work email", "Business name"/"Company name";
  submit is **Create account**. Enter advances a step. Zod messages now go
  through `t()`.
- **Forgot / reset / confirm password**, **2FA challenge** (labelled OTP field
  "Authentication code", toggle button "Use a recovery code instead" → field
  "Recovery code"): same card style.
- **Verify email**: `StatePanel` "Check your inbox" with the user's email,
  "Resend email", "Log out".
- **Waiting approval** (`errorpages/wait_approval`): `StatePanel` with a
  warning "Pending approval" badge, or danger "Rejected" for status `R`;
  action "Back to sign in" (logs out). The board's "Complete your profile"
  action is omitted: pending users cannot open settings
  (`CheckAdvertiserStatus` only lets them reach this page, logout and account
  deletion).
- **403** (`errors/forbidden`): inverse `StatePanel` inside the auth layout,
  "You don't have access to this page", "Back to overview" → `/dashboard`,
  plus "Campaign setup help". Still rendered by the exception handler in
  `bootstrap/app.php` with status 403 (not inside the app shell, as before).
- **Removed dead code:** `pages/welcome.tsx`, `components/landing/*`,
  `utils/landing-constants.tsx`, `types/landing.ts`, the `LANDING_*` constants
  in `utils/enums.ts`, and the unused `.auth-panel` CSS. `/` still redirects to
  login or dashboard.

### Tests

- Vitest: `pages/auth/register.test.tsx` (role switches the step set,
  validation, posted payload), `pages/auth/two-factor-challenge.test.tsx` (OTP
  takes 6 digits only, recovery switch, server error),
  `pages/auth/auth-pages.test.tsx` (login, branding, waiting approval, verify
  email, 403), `components/ui/password-input.test.tsx`,
  `components/app/state-panel.test.tsx` (+ StepProgress).
- Test helpers: `@/test/inertia` now mocks `<Form>` (render-prop gets
  `{ errors, processing: false, clearErrors }`); set errors with
  `setFormErrors({...})` (reset after each test). `setup.ts` polyfills
  `document.elementFromPoint` for input-otp; tests that render an OTP field
  should use fake timers (`shouldAdvanceTime`) and clear them after each test
  (see the 2FA test) because input-otp schedules probes for up to 6s.
- Playwright `auth.spec.ts` adds: forgot password status, show password,
  register as publisher → waiting approval, unverified user → verify email
  (resend + log out), network owner on `/advertiser/campaigns/edit/{id}` →
  403 page → back to "Network overview". `tests/Support/e2e.php seed` now also
  creates `unverified@dmhub.test` (active publisher, email not verified, demo
  password). New users start in the default locale (Dutch), so that test
  matches both languages.

### Notes for later phases

- `TextLink` and `InputError` restyles apply app-wide; settings pages
  (phase 10) use both.
- Pages outside this phase still call `useLanguage().__`; new code here uses
  `useTranslation().t`.
- Verified visually in light and dark at 1440px and 375px (login, login
  validation, register steps 1–2, forgot password, verify email, waiting
  approval, 403).
