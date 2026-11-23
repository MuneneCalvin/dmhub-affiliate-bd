# Partner Sign-up Emails and Approval Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every partner sign-up event sends exactly one email in the recipient's language, approval sends an "approved" email, and pending partners are visible to approvers.

**Architecture:** Keep the existing flow (register → setup link → approval in the pool). Localize and de-duplicate the emails, send one on approval via a `User` model event, and add a shared `PendingPartners` count used by the sidebar badge and a dashboard card.

**Tech Stack:** Laravel 12 (Fortify, markdown mail), Inertia/React 19, Pest, Vitest, Playwright, Resend over SMTP.

**Spec:** `docs/superpowers/specs/2026-11-23-partner-signup-and-emails-design.md`

## Global Constraints

- One email per event: self-registration → setup email only (no framework "Verify Email Address"); approval `P`→`A` → approved email; admin-created partner → setup email only.
- Mail locale is the recipient's `users.locale` (default `nl`), subject included; texts in `lang/nl/emails.php` and `lang/en/emails.php`.
- Following the password link verifies the email (`email_verified_at ??= now()`); token expiry and one-use unchanged.
- Reactivation (`I`→`A`) and creation with `A` send no approved email.
- `CheckAdvertiserStatus` keeps showing pending users the awaiting-approval page.
- No secrets in the repo; mail delivery stays env-driven.
- Not in scope: Dutch/euro defaults, terminology, KPIs (part 2), network layer, auto-login changes, password field at sign-up.
- Code reads like surrounding code; Dutch and English strings wherever neighbours have both.

## Review Focus

- Mail goes out in the recipient's language, not the request's (an English browser registering as `nl` user gets Dutch; an `en` user gets English).
- Registration and "resend" never produce two mails; a user who already set a password and verified is not mailed again.
- Every route that approves a pending partner sends the approved mail once (builder `update()` on the relation does not fire model events: all approval sites must update the model).
- The approved mail is not sent for admin-created partners, reactivation, or when status is set to the value it already has.
- The pending count/card respects the approver's scope (network owner sees unclaimed + own network; super admin sees all) and disappears when zero; partners cannot see it.

---

### Task 1: One localized setup email, and the link verifies the address

**Files:**
- Create: `lang/nl/emails.php`, `lang/en/emails.php`
- Modify: `app/Mail/UserCredentialsMail.php`, `app/Jobs/SendUserCredentialsJob.php`, `resources/views/emails/user-credentials.blade.php`, `app/Models/User.php`, `app/Actions/Fortify/CreateNewUser.php`, `app/Actions/Fortify/ResetUserPassword.php`
- Test: `tests/Feature/PartnerSetupEmailTest.php`

**Interfaces:**
- Produces: `emails.credentials.{subject,greeting,created,pending,choose,button,expires,thanks}` keys in both languages; `User::sendEmailVerificationNotification(): void` dispatches `SendUserCredentialsJob` (replaces the framework mail, also used by the "resend verification" route). `SendUserCredentialsJob::handle()` mails with `->locale($user->locale ?: config('app.locale'))`.

- [ ] **Step 1: Write failing tests** (`Mail::fake()`, `Queue` not faked so jobs run sync, seed `RolePermsSeeder`): registering a publisher sends exactly one `UserCredentialsMail`, to the registrant, and no `Illuminate\Auth\Notifications\VerifyEmail`; with an English browser header and default `nl` the subject is the Dutch string, with `locale => 'en'` on the registrant it is the English string; the mail body for a pending user mentions BND reviews the application, for an active (admin-created) user it does not; the registrant is authenticated after registering and `get('/dashboard')` shows the `errorpages/wait_approval` page; posting the reset form with the emailed token sets the password and `email_verified_at`; the `email/verification-notification` route sends exactly one `UserCredentialsMail` for an unverified user and none for a verified one; admin-created publisher (existing store route/fixture) sends exactly one `UserCredentialsMail`.
- [ ] **Step 2: Run** `php artisan test --filter=PartnerSetupEmailTest`. Expected: FAIL (two mails, English subject, not verified).
- [ ] **Step 3: Implement**: `User::sendEmailVerificationNotification()` → `SendUserCredentialsJob::dispatch($this)->afterCommit()`; remove the explicit dispatch in `CreateNewUser` (the `Registered` event now triggers it exactly once, verify with the test); `ResetUserPassword` sets `email_verified_at` when null; mail subject and template text via `__('emails.credentials.*')`, with the pending-review sentence shown only when `$user->status === 'P'`. Dutch copy is a draft for the user to review.
- [ ] **Step 4: Run** the filter, then `php artisan test --filter='Auth|Partner|Publisher|Advertiser'`. Expected: PASS (existing registration and verification tests updated only where they assert the old behavior; ledger each).
- [ ] **Step 5: Commit** `feat: one localized setup email for new partners`.

### Task 2: Approved email when a pending partner is approved

**Files:**
- Create: `app/Mail/PartnerApprovedMail.php`, `resources/views/emails/partner-approved.blade.php`
- Modify: `lang/nl/emails.php`, `lang/en/emails.php`, `app/Models/User.php`, and every site that approves through the relation builder: `app/Http/Controllers/Pool/PoolController.php` (advertiser, publisher approval, publisher `update` near line 180), `app/Http/Controllers/Advertisers/AdvertiserController.php` (activate and the status updates near lines 307 and 353), `app/Http/Controllers/Publishers/PublisherController.php` (near line 249), `app/Http/Controllers/Partners/PartnerCardController.php` (near line 137)
- Test: `tests/Feature/PartnerApprovedEmailTest.php`

**Interfaces:**
- Consumes: Task 1 lang files.
- Produces: `PartnerApprovedMail(User $user)` with subject `emails.approved.subject` and a login button to `route('login')`; `User` `booted()` `updated` listener: when `wasChanged('status')` and the original status was `P` and the new status is `A`, send it with the recipient's locale.

- [ ] **Step 1: Write failing tests**: approving a pending advertiser and a pending publisher through each approval route (pool approve ×2, advertiser activate, publisher status change, partner card status) sends exactly one `PartnerApprovedMail` to that partner, in their locale; the same route on an already active partner sends none; `I`→`A` sends none; an admin-created partner (created as `A`) sends none; a second approval request does not send a second mail.
- [ ] **Step 2: Run** `php artisan test --filter=PartnerApprovedEmailTest`. Expected: FAIL.
- [ ] **Step 3: Implement** the mailable, template and `User` listener. Change each approval site from `$partner->user()->update([...])` to updating the loaded model (`$partner->user->update([...])`) so model events fire; keep behavior otherwise identical.
- [ ] **Step 4: Run** the filter plus the existing pool/partner tests (`php artisan test --filter='Pool|Partner|Advertiser|Publisher'`). Expected: PASS.
- [ ] **Step 5: Commit** `feat: email partners when they are approved`.

### Task 3: Pending partners where approvers work, and a clearer waiting page

**Files:**
- Create: `app/Support/PendingPartners.php`, `resources/js/components/pending-partners-card.tsx`, `resources/js/components/pending-partners-card.test.tsx`
- Modify: `app/Http/Controllers/Pool/PoolController.php` (reuse the scope), `app/Http/Middleware/HandleInertiaRequests.php` (`navCounts`), `app/Http/Controllers/Dashboard/AdminDashboardController.php`, `app/Http/Controllers/Dashboard/NetworkDashboardController.php`, `resources/js/pages/admin_dashboard/dashboard.tsx`, `resources/js/pages/network_dashboard/dashboard.tsx`, `resources/js/navigation/config.ts` (`NavBadgeKey`, pool item `badgeKey`), `resources/js/components/nav-main.tsx` (badge style), `resources/js/pages/errorpages/wait_approval.tsx`, `resources/js/i18n/locales/{en,nl}.json`
- Test: `tests/Feature/PendingPartnersTest.php`

**Interfaces:**
- Produces: `PendingPartners::counts(User $approver): array{advertisers:int, publishers:int, total:int}` using exactly the Pool scope (`claimable`: super admin all; otherwise `network_id` null or the approver's network; `is_verified = false`); `navCounts.pendingPartners` (int|null, null unless the user can `access_pool`); dashboard prop `pendingPartners` with the same shape; `NavBadgeKey` gains `'pendingPartners'`.

- [ ] **Step 1: Write failing tests**: Pest: counts match what the pool lists for super admin, a network owner (unclaimed + own network, not another network's), and are null/absent for publishers and advertisers; approving a partner lowers the count; both dashboards receive `pendingPartners`; the wait page for status `P` and `R` renders the new copy. Vitest: card shows the totals and a link to the pool, renders nothing when total is 0; nav-main shows the badge on "Partner pool".
- [ ] **Step 2: Run** `php artisan test --filter=PendingPartnersTest` and `npx vitest run resources/js/components/pending-partners-card.test.tsx resources/js/components/nav-main.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**: extract the pool scope into `PendingPartners` and call it from `PoolController` (no behavior change there); add the count to `navCounts`, both dashboards and the nav badge; the card and the wait-page copy in Dutch and English: pending says choose your password from the email, then BND reviews and emails you; rejected as today.
- [ ] **Step 4: Run** both test commands, `npm run types`, `npx vitest run`, `php artisan test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: show pending partners to approvers`.

### Task 4: Delivery settings, real-send check, end-to-end and full gate

**Files:**
- Modify: `.env.example`, `.env.production.example`, `docs/` deployment note if one lists mail settings (`DEPLOYMENT.md`)
- Create: `tests/e2e/partner-signup.spec.ts` (name it so it runs after the existing specs, e.g. `zz-partner-signup.spec.ts`)
- Test: full gates

**Interfaces:**
- Consumes: Tasks 1–3.

- [ ] **Step 1: Write the e2e spec** (extend the existing e2e helpers; mail driver `log` in the e2e env): register a publisher on `/register`, land on the waiting page with the new copy, read the setup link from the logged mail, set a password, log in, still see the waiting page; as the network admin, see the pending badge and card, approve in the pool; the partner logs in and reaches the publisher dashboard; the log holds exactly one setup mail and one approved mail.
- [ ] **Step 2: Run** it with `npm run test:e2e -- --project=workflows --no-deps zz-partner-signup`. Expected: FAIL until wired, then PASS.
- [ ] **Step 3: Document** Resend SMTP in both env examples (`MAIL_MAILER=smtp`, `MAIL_HOST=smtp.resend.com`, `MAIL_PORT=465`, `MAIL_SCHEME=smtps`, `MAIL_USERNAME=resend`, `MAIL_PASSWORD=<api key>`, `MAIL_FROM_ADDRESS` on a verified domain, `MAIL_FROM_NAME`) with placeholders only.
- [ ] **Step 4: Full gate**: `php artisan test`, `npm run types`, `npx vitest run`, `npm run build`, `npm run test:e2e`, `npx prettier --check resources tests/e2e`. Expected: all pass; report failures as they are.
- [ ] **Step 5: Real-send check** (needs the user's recipient and the key in `.env`; never print the key): send the setup email in Dutch and English and the approved email to the address the user names through Resend SMTP using a throwaway script in the scratchpad; report what was sent, not that it arrived.
- [ ] **Step 6: Commit** `docs: mail delivery settings and sign-up e2e`.
