# Partner sign-up emails and approval visibility (BND, part 1) — design

## Intent
The client could not test: advertiser and publisher sign-up "do not work", no email arrives, and the process is unclear. Verified locally, the mechanics work (register, set-password email, approval in the pool, verification, dashboard). What fails the client is: email delivery on staging is unproven, emails are English and duplicated, approval sends no email, and pending partners are hard to find. Fix those, and leave the working mechanics alone. Part 2 (Dutch and euro defaults, "compensation" wording, KPIs) is a separate PR.

## Flow (unchanged mechanics, clearer messages)
```
Self-registers (existing form)
  → ONE email, in their language: "Choose your password" (link verifies the email too)
  → can log in once a password is set; sees "Awaiting approval"
BND approves (pool, or the Pending approvals count/card)
  → ONE email: "Your account is approved"
Admin creates a partner (already approved)
  → ONE email: "Account created: set your password"
```

## Goals
- Delivery works on staging through Resend (SMTP), checked with a real send.
- One email per event; the framework's second "Verify Email Address" mail no longer goes out for self-registration.
- Completing the password link verifies the email address (the link proves ownership).
- Approval (`P` → `A`, by any route) sends an "approved" email; reactivating a deactivated partner sends nothing.
- All partner emails are Dutch or English by the recipient's `users.locale` (default `nl`), subject included, texts in `lang/{nl,en}/emails.php`.
- Pending partners are visible where approvers work: a count on the "Partner pool" nav item and a "Pending approvals" card on the admin and network dashboards, linking to the pool.
- The awaiting-approval page says what happens next (choose a password from the email, then wait for BND) in plain words.

## Non-goals
- Auto-login after registering, a "Resend email" button, a password field at sign-up (not needed; may follow separately).
- Network optional, per-environment sender or templates, who approves (priority 2/3, discussed later).
- Dutch/euro defaults, terminology, KPIs (part 2).
- Any email to lead visitors.

## Anti-goals
- Two emails that say different things; English mail to a Dutch user.
- A reset-token link that verifies an address nobody proved.

## Constraints
- `users.locale` defaults to `nl`; mail uses the recipient's locale, not the request's.
- Password token expiry and one-use behaviour unchanged.
- `CheckAdvertiserStatus` keeps showing pending users the awaiting-approval page.
- No secrets in the repo; delivery settings are env-driven.

## Approaches
1. **Fix what is broken, keep the flow (chosen).** Smallest change that removes every reason the client could not test.
2. Rebuild sign-up with auto-login and a password field: larger, and the mechanics already work.
3. Only configure email: leaves English duplicated mail and silent approvals.

## Design
- `CreateNewUser` keeps dispatching the credentials job. Make the framework's default verification mail not send for self-registered users (override `User::sendEmailVerificationNotification` or the listener) so only the setup email goes out; the resend-verification route still works.
- `ResetUserPassword`: set `email_verified_at` when null after a successful token reset.
- `SendUserCredentialsJob` / `UserCredentialsMail`: localize to the recipient (`->locale($user->locale)`), subject and body via `__()` with `lang/{nl,en}/emails.php`. The same mail serves self-registration and admin-created partners, with wording that fits both.
- `User` model event on `updated`: when `status` changes from `P` to `A`, send `PartnerApprovedMail` (localized). Covers `PoolController` and the `activate` endpoints; creation with `A` and `I` → `A` send nothing.
- `HandleInertiaRequests::navCounts`: add `pendingPartners` (unverified advertisers and publishers visible to the approver, same scope as the pool). Badge on the pool nav item; card on the admin and network dashboards.
- Awaiting-approval page copy, Dutch and English.
- `.env.example` and `.env.production.example`: Resend SMTP keys (`smtp.resend.com`, `MAIL_USERNAME=resend`, API key as password, `MAIL_FROM_ADDRESS` on a verified domain).
- Tests first: Pest (`Mail::fake`: one email on registration to the registrant, nl default and en, translated subject, no second verification mail; password link verifies; P→A mail from pool and activate routes; none for admin-create or reactivation; nav count scope), Vitest (awaiting page, nav badge, dashboard card), Playwright (register → set password → awaiting page → approve → dashboard).

## Risks
- Real delivery is proven only by a send: one real send of each email to the address the user names, before and after staging env is set.
- Staging env lives on the VPS; applying it needs the user's say-so.

## Left to the builder
- How to suppress the framework mail; whether mails are queued; template layout and exact Dutch copy (the user reviews the Dutch); card placement.
