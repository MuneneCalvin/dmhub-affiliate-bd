# Configurable fraud checks and automatic approval

Open **Financial review → Manage fraud rules** (`/finance/fraud`). Network operators need `manage_fraud_rules`; reviewers need `review_commissions` to see assessment evidence and record outcomes. Existing network-owner and super-admin roles receive the new permission through the migration and reference seeder. Every query is scoped to the operator's network; super admins can select a network.

## Default behavior and integration change

New installations and networks without a saved policy start in **shadow mode** with all nine rules monitoring. No commissions are automatically approved until an operator explicitly configures automatic mode, enforced rules, eligible events and currency limits.

The successful-submission contract and metadata allowlist remain mandatory. Failed saves, malformed signals, invalid credentials, attribution failures, conflicting duplicates and events exceeding applicable funding or credit limits are still rejected before financial records are created.

**Behavior change:** valid honeypot, spam-verdict and duration signals no longer produce an unconditional HTTP 422. They are persisted and assessed as configurable rules. A flagged submission can therefore create a pending conversion and reserve commission for review. Merchants must still validate their own forms and report truthful signals. A pending conversion is not a payout approval. Event retries return the current commission status instead of a hardcoded `pending`.

## Policy controls

Each rule has:

- **Off:** does not evaluate or affect a decision.
- **Monitor only:** records findings with zero contribution to the enforced score.
- **Enforced:** contributes its configured weight when flagged. Missing required evidence prevents automatic approval.

Rules cover honeypots, merchant spam verdicts, form duration, click-to-conversion duration, publisher/assignment velocity, repeated referral/IP activity, commission size, mature publisher outcomes and traffic evidence. Rule settings and supported event types are validated against a fixed registry. The initial form-duration threshold comes from `TRACKING_MINIMUM_FORM_DURATION_MS` and can be overridden in a saved rule.

Scores are additive rule weights, not probabilities. Disabled weights are never redistributed. A score equal to the configured maximum passes; a higher score requires review. No applicable enforced rules always means manual review, including when all rules are off or monitor-only. Observation counts include the current event; timing and amount boundaries are inclusive.

Network settings provide defaults. Campaigns may inherit everything, override approval settings, or override individual rules. Removing an override restores inheritance. Network **disabled** mode stops assessment and approval; **shadow** mode prevents campaign auto-approval. Network exposure limits always cap campaign overrides.

Each save requires a reason and the version the editor loaded. Concurrent edits return a conflict. Restoring history creates another version with the restoring operator and reason; it never rewrites historical settings. New or in-flight assessments use the current policy. Completed decisions are unchanged. Use the pending reassessment action for changed policies (up to 100 eligible commissions per batch), or request a fresh assessment from an individual pending commission.

## Approval safeguards

Automatic approval requires:

1. Automatic mode, an eligible event type and eligible publisher assignment.
2. At least one applicable enforced rule, complete required evidence and a passing score.
3. A pending, unadjusted, ledger-backed earning whose financial version has not changed during assessment.
4. An elapsed hold period, measured from receipt of the earning rather than merchant-supplied event time.
5. Per-conversion and daily limits for the earning's currency, both network-wide and within the campaign.
6. The same current policy and latest assessment when the decision is applied.

Daily limits reset at 00:00 UTC and measure gross automatically approved commission, separated by currency. Later refunds do not reopen the daily allowance. There is no currency conversion. A missing currency limit requires manual review.

Evidence collection occurs outside the network financial lock. Applying a decision rechecks policy and earning versions under the same network-first lock order used by the financial services. Approval, its ledger entries and exposure accounting commit together. A system approval has no fabricated human user ID: the ledger records `actor_type: fraud_engine`, the assessment ID and policy versions; the conversion records `system:fraud`.

The engine never automatically rejects or reverses a conversion. Human review, invoices, payouts and refunds retain their existing financial workflows. Human financial decisions and partial refunds invalidate pending automatic decisions. An operator’s latest confirmed-fraud classification also prevents automatic approval until corrected. A policy change or retry cannot undo a completed human or automatic approval.

## Evidence and outcomes

Submission signals come from the authenticated merchant and do not independently prove authenticity. Visitor IP/device information comes from the persisted click, not the merchant's postback IP. Configure trusted proxies correctly at deployment. No contact details, form answers or extra browser fingerprinting are collected. Geolocation/IP reputation providers are not part of this release.

Velocity windows use platform receipt time and event sequence, so merchant timestamps cannot manufacture a quieter observation window. Publisher history uses mature conversions with explicit latest `legitimate` or `fraud` feedback in the same network. Ordinary returns and unknown outcomes do not count as fraud or as classified history. Sparse history is unavailable evidence.

Assessment detail shows rule modes, observed values, thresholds, score contributions, policy IDs, hold time and processing errors. Recording an outcome does not change money. Record a new outcome to correct an earlier classification; history remains visible.

The rule-performance table samples the latest assessment per conversion, up to 500 from the last 30 days. It separates triggers, sole enforced triggers, subsequent human approvals, confirmed legitimate outcomes and confirmed fraud. Human disagreement alone is not proof of a false positive.

Preview compares proposed rules against up to 200 stored assessments, respecting campaign exceptions. It is a **rule-only comparison**: activation, exposure, holds and financial state are not simulated. A changed observation window or a previously disabled rule may lack historical evidence; those results are explicitly unavailable. Preview never writes assessments or approvals.

## Queue and deployment

Run migrations as part of the normal deployment. `compose.dokploy.yaml` now includes a dedicated fraud worker and scheduler in addition to the existing worker:

```sh
php artisan migrate --force
php artisan queue:work --queue=fraud --sleep=3 --tries=3 --timeout=60 --max-time=3600
php artisan schedule:work
```

Use the normal production queue backend, not `sync`. The development scripts consume `default,fraud`; run the scheduler separately during development if testing holds and recovery.

A queued assessment row is created in the conversion transaction and acts as a durable outbox. Dispatch occurs after commit. Dispatch failures leave the accepted event intact. Recovery runs every minute and retries missed deliveries, backoff-eligible errors and abandoned workers. Duplicate dispatch is limited to once per five minutes per assessment; successful processing is idempotent. A running claim older than ten minutes is recoverable. After five assessment attempts, errors remain pending for an operator to retry explicitly. Hold expiry creates a fresh assessment with current evidence and policy.

Monitor the rule page's queued/held/error counts and application warnings for stalled or exhausted assessments. Queue downtime never causes automatic approval. Connect these logs to the deployment's existing alerting system. Disabling network assessment is the emergency stop; it takes effect before the next approval transaction.

## Validation and rollout

```sh
APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: DB_URL= vendor/bin/pest tests/Feature/FraudEngineTest.php
npm run types
npm run build
npm run test:fraud-browser
```

The browser runner creates its own disposable SQLite database, starts a loopback server and tests rule switches, persistence, campaign overrides, preview, feedback and mobile overflow. It does not use the developer database. Screenshots are retained in the printed temporary directory.

PostgreSQL concurrency coverage is included in `tests/Integration/FinancialConcurrencyTest.php`: duplicate fraud jobs, manual review/refund races, and simultaneous daily-exposure enforcement. Run the existing PostgreSQL release qualification pipeline before production rollout; SQLite tests do not verify row-lock behavior.

Start in shadow mode. Record verified outcomes, inspect noisy rules, and move useful rules to enforcement individually. Enable automatic mode on selected campaigns with conservative holds and limits after sufficient outcomes mature. Automatic merchant refund/chargeback synchronization and external reputation services remain separate integration work; the current financial adjustment workflow remains the source for those changes.
