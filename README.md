# DMHub Affiliate Platform

## Before deploying

Run the reproducible browser lifecycle gate from the repository root:

```sh
npm run test:lifecycle
```

Prerequisites: installed Composer/npm dependencies, PHP 8.4 with `pdo_pgsql`,
Node 22, local PostgreSQL, and Playwright Chromium (`npx playwright install chromium`,
or `npx playwright install --with-deps chromium` on Linux CI). PostgreSQL credentials
come from the shell or `.env`; the role must be allowed to create databases.
Only loopback PostgreSQL hosts are accepted. For example:

```sh
DB_HOST=127.0.0.1 DB_USERNAME=postgres DB_PASSWORD=postgres npm run test:lifecycle
```

Every invocation creates a uniquely named disposable database, migrates/seeds it,
checks TypeScript, builds production assets, and launches real Chromium. It runs
advertiser/promoter registration, password setup and email verification, operator
approvals, campaign/offer creation, promoter applications and terms, funding,
clicks, submission forms, simulated paid/failed checkout, duplicate/conflicting events,
financial review and two-promoter attribution. Negative registration and campaign
validation cases run independently. It works while Vite is running: the test-only
front controller uses production assets without editing `public/hot`.

The command exits **0 only when all assertions pass**, otherwise **1**. Workflow
regressions fail the suite. The advertiser must create its own submission offer; the
network owner creates the checkout offer and must reach an authorized success
page. There are no operator fallbacks. A workflow failure stops that test; independent validation
tests still run. The suite also checks registration labels, duplicate company
numbers and emails for both roles, locale, pending status, campaign dates,
commission currency/percentages, campaign identity, and net funding/approval labels. This does not certify live payment
providers or external email delivery: both are local test integrations.

The runner prints its unique `release-evidence/lifecycle/<run-id>/` directory.
It contains an HTML report, JUnit XML, JSON results, screenshots, failure traces,
application log, final database snapshot, revision/dirty-tree details, and
`run.json` recording the exit result and database cleanup. Inspect a run with:

```sh
npx playwright show-report release-evidence/lifecycle/<run-id>/html
# Or open a trace.zip path printed by a failing test:
npx playwright show-trace /absolute/path/to/trace.zip
```

The test servers stop and the disposable database, temporary credentials, mail,
sessions and cache are removed on completion, failure or a handled interrupt.
The ordinary application database and `.env` are untouched. If the process is
forcibly killed, cleanup cannot run; `run.json`/the printed database name identifies
the disposable database for manual removal. Saved evidence contains synthetic
accounts and test email links. No artifact is uploaded by the local command.

`npm run release:qualify` includes this gate, and the existing GitHub Actions
qualification job runs it before the deployment image/deploy jobs can proceed.
CI retains `release-evidence/` through its existing artifact upload. Unresolved
browser defects therefore block deployment qualification.

## Campaign and website guides

Start with the [documentation overview](docs/overview.md) for form, checkout,
click and action campaigns, plus Shopify, WooCommerce, WordPress and custom
website integrations. The same Markdown files power the public **`/docs`** pages;
each guide includes a Markdown download. No sign-in is required. Documentation
links are available on the login page and in the workspace sidebar.

Edit `docs/*.md` to update both formats. Add new guides to
`App\Support\PublicDocumentation::guides()` to expose them publicly. Only this
explicit catalog is served; internal operational documents remain private.

## Conversion integration

See the [API reference](docs/api-reference.md) for credential issuance and rotation,
authenticated submission, purchase and action events, expiry, deduplication and budget
rules. The [custom website guide](docs/custom-website.md) covers referral persistence
and SDK integration. The client backend reports successful submissions through
`POST /api/v1/events` with spam-check results. Accepted events automatically create
conversions and pending commission without storing contact details. Apply migrations
before enabling event traffic; see the [upgrade notes](docs/form-campaigns.md#upgrading-from-the-removed-lead-feature).

## Finance and reporting

The [deployment guide](DEPLOYMENT.md#financial-operations-and-upgrades) covers
financial operations, migration requirements and reconciliation. Run
`php artisan finance:reconcile` before enabling settlement; legacy financial
records require explicit reconciliation.

Dashboard performance uses ledger-backed earnings and reports each currency
separately:

| Metric | Definition |
| --- | --- |
| Clicks | Recorded clicks for the publisher assignment |
| Approved conversions | Confirmed conversions with approved, locked, payable or paid earnings; rejected/reversed events and unreviewed candidates are excluded |
| Net approved sales | Approved purchase amounts less recorded refunded sale amounts |
| Net approved commissions | Reviewed commissions less recorded reversals |
| Conversion rate | Approved conversions divided by clicks; multiple orders per click can exceed 100% |
| EPC | Net approved commissions divided by clicks in the assignment currency |
| Daily chart | Thirty UTC event dates including today; refunds restate the original event date |

Use the financial ledger and invoices for balances and settlement. Performance
charts show current net results rather than cash movements or period-close totals.

## Local demo data

With a local database configured and migrated, run:

```sh
php artisan db:seed
php artisan db:seed --class=TestUsersSeeder
```

The default seeder loads reference data, the DMHub network, and five verified demo
accounts in local/testing environments. The accounts `test@test.com`,
`superadmin@dmhub.com`, `network@dmhub.com`, `advertiser@dmhub.com`, and
`publisher@dmhub.com` use `Abcd1234!`. The business accounts include network
memberships, advertiser/publisher profiles, and the current role permissions.
`TestUsersSeeder` adds 200 unprivileged accounts (`testuser_001@example.test`
through `testuser_200@example.test`) using `password`.

Reruns preserve existing account passwords, closed accounts, and network settings.
The role seeder restores its default permission grants, so run it deliberately
when roles have been customized. Production's default seeder loads reference data
only, and the demo network/user seeders refuse to run there.

## Customer promotions

Customer discounts, store connections and order reporting are available by default. Merchants enter their Shopify or WooCommerce details under **Offers → Customer promotions & stores** and complete the connection. See the [merchant setup guide](docs/customer-promotions.md). Shared Shopify app registration, deployment, queues and recovery are covered in the [deployment guide](DEPLOYMENT.md#customer-promotions-and-store-connections).
