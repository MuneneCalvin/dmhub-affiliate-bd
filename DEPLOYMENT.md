# Deployment guide (Dokploy on a VPS)

The app is deployed with [Dokploy](https://dokploy.com) on a shared VPS that already runs other applications.
Dokploy's Traefik owns ports 80/443 and issues the HTTPS certificates; this project only joins its network.

```
 Internet ──► Traefik (Dokploy, TLS)  ──►  web (Caddy :80, static files, gzip)  ──FastCGI──►  app (PHP-FPM)
                                                   │                                              │
                                              /storage (uploads, read-only)         ┌─────────────┼──────────────┐
                                                                                db (Postgres 16)  queue worker  backup (database + uploads)
```

- **Images** are built by GitHub Actions (`docker/production/Dockerfile`, targets `app` and `web`) and pushed to
  GitHub Container Registry. Composer/npm dependencies and the frontend build are baked in.
- **`compose.dokploy.yaml`** is the stack Dokploy runs. It publishes no host ports, so it cannot clash with the
  other apps on the server.
- Each environment (staging, production) is its own Dokploy Compose service with its own environment variables,
  domain, database and volumes. Both environments deploy immutable image digests from a successful qualification run.
- The `app` container applies database migrations when it starts. Seeding and creating the first admin are
  one-time manual steps (section 5).

## 1. What you need first

| Item | Notes |
|---|---|
| A domain per environment | staging: `affiliates-bnd.dmhub.cloud`. Add a DNS **A record** `affiliates-bnd` → `72.61.197.194` at the DNS provider (Namecheap) before deploying; the certificate cannot be issued until it resolves. Production needs its own name |
| GitHub access for the server | the server pulls private images from `ghcr.io` (section 2) |
| A mail provider | Postmark, Mailgun, Resend or SES, with a verified sender domain; credentials go in the env vars |
| Dokploy login | to create the Compose service (section 3) |

## 2. Let the server pull the images (once)

The images are private. Create a GitHub **classic personal access token** with only the `read:packages` scope
(GitHub → Settings → Developer settings), then on the server as root:

```bash
echo "<token>" | docker login ghcr.io -u <github-username> --password-stdin
```

Do this only if the server has no `ghcr.io` login for something else (`cat /root/.docker/config.json` should not
list `ghcr.io`), because a second login to the same registry replaces the first. Alternatively make the two
packages public in GitHub and skip this step (they contain the application code, so only do that deliberately).

## 3. Create the Compose service in Dokploy (once per environment)

1. **Project:** create a project (for example "DM Hub Affiliates NL"), then **Create Service → Compose**.
2. **Source → Git** (SSH): repository `git@github.com:MuneneCalvin/dmhub-affiliate-bd.git`, branch `main`,
   compose path `./compose.dokploy.yaml`. Dokploy shows a public SSH key; add it to the GitHub repository as a
   read-only **deploy key** (Repository → Settings → Deploy keys).
3. **Environment** tab: paste the contents of `.env.production.example`, fill in every blank
   (`APP_KEY`, `APP_URL`, `DB_PASSWORD`, `MAIL_*`) and set
   `IMAGE_TAG=<full qualified commit SHA>` for manual recovery. Automated deployment pins image digests directly. Generate the key with `echo "base64:$(openssl rand -base64 32)"` and
   never change it afterwards.
4. **Domains** tab: add the host name, service **`web`**, port **80**, HTTPS on, certificate provider
   *Let's Encrypt*. Dokploy adds the Traefik labels itself, so the compose file contains none.
5. Do **not** press Deploy yet: the images must exist first (next section).

> If Dokploy complains about the `dokploy-network` declared in the compose file (for example a duplicate
> network after it injects its own), delete the `networks:` block under `web` and the top-level `networks:`
> block and let Dokploy add the network. This stack has not yet been run inside Dokploy itself.

## 4. GitHub setup and qualified deployment

Create `staging` and `production` GitHub environments. Configure each separately:

| Setting | Kind | Value |
|---|---|---|
| `APP_URL` | environment variable | Public HTTPS application URL |
| `DOKPLOY_URL` | environment variable | HTTPS management URL, without `/api` |
| `DOKPLOY_COMPOSE_ID` | environment variable | Existing Compose service ID |
| `DOKPLOY_API_KEY` | environment secret | API key authorized to update/deploy that service |
| `DEPLOY_ENABLED` | repository variable | `true` enables staging deployment on pushes to main |

Protect production with required reviewers and deployment branch restrictions. Require the release
qualification checks before merging. Remove the old webhook integration and disable independent Git auto-deploys.
The workflow also disables Dokploy auto-deploy when it installs the qualified Compose source.

Run **Actions → deploy → Run workflow**, choose `staging` and a ref. The workflow resolves the ref once,
qualifies that exact full SHA, builds app/web/backup images, and deploys their digests. Failed tests, skipped
PostgreSQL cases, failed typechecks/builds, browser or restore failures prevent deployment. A manual production
run uses the same gate. There is no bypass for manual dispatch and no successful no-op for missing credentials.

The environment-protected job submits the tested Compose file as **raw Compose** through the Dokploy API.
It retains the existing environment, domains and volumes, but replaces the Compose source; future application
updates must use this workflow. Do not configure another automation to mutate the same service concurrently.
The previous branch webhook is no longer used.

Deployment checks both `/up/revision` (PHP revision plus database connectivity) and `/revision.txt` (web image
revision) against the qualified SHA. A passing `/up` on the old containers is insufficient. Keep the qualification
and deployment artifacts for release records. Qualification covers PostgreSQL concurrency,
merchant-browser integration, the full browser lifecycle and database/uploads recovery.
See [Before deploying](README.md#before-deploying) for lifecycle scope and evidence.
The API deployment must still be exercised against the installed Dokploy version.

### Local qualification

With locked Composer/npm dependencies, matching PostgreSQL client tools and
Playwright Chromium installed, run the full gate against a dedicated disposable database:

```bash
APP_ENV=testing DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432 \
DB_DATABASE=dmhub_qualification DB_USERNAME=postgres DB_PASSWORD='<test-only-password>' \
DB_URL='' npm run release:qualify
```

The command recreates tables in that database; never point it at a live database.
The database name must end in `_qualification`, and Laravel configuration must not
be cached. Local runs with uncommitted changes are development evidence; CI must
qualify the committed revision before deployment. Test the real merchant's order
persistence and authenticated callback separately, along with queued mail recovery,
infrastructure alerts and actual off-host backup retrieval.

## 5. One-time setup after the first deploy

Seed the reference data and create the first admin. In Dokploy open the Compose service → **Terminal** (service
`app`), or over SSH:

```bash
docker exec -it $(docker ps -qf "name=<dokploy-project-name>-app") sh
php artisan db:seed --force                      # roles, permissions, currencies, countries only
php artisan app:create-admin you@client.com      # prompts for name and a 12+ character password
```

`db:seed` never creates demo users in production and is safe to repeat, but run it **once**: roles and
permissions can be edited in the admin UI and re-seeding resets reference data. Then log in, create a network,
invite a network owner and confirm the credentials email arrives (this proves mail settings and the queue worker).

## 6. Everyday operations

- **Logs:** Dokploy → the service → Logs (containers `app`, `web`, `queue`, `db`, `backup`).
- **Failed jobs** (undelivered emails): `php artisan queue:failed` in the `app` terminal.
- **Update:** merge to `main` → staging redeploys; run the workflow for `production` when ready.
- **Roll back:** run the deployment workflow against a previous compatible full SHA, or recover the previously
  qualified digest-pinned Compose artifact through the protected operational process. Changing `IMAGE_TAG` does
  not change a digest-pinned deployment. Migrations are not reversed automatically; verify schema compatibility.

### Backups and restore

The backup image writes a completed `backup-<UTC timestamp>-<suffix>/` directory every 24 hours, containing
`database.dump`, `uploads.tar.gz`, the release revision and `SHA256SUMS`. It keeps completed bundles for
`BACKUP_KEEP_DAYS` (14 by default). The backup process exits on failure; its healthcheck requires a completed
bundle younger than 26 hours. Configure alerts for unhealthy/restarting backup containers and disk exhaustion.

Copy completed directories to encrypted off-host storage and monitor transfer completion/age. The stack does
not configure an off-host destination. Keep `APP_KEY` in separate secure recovery storage. For a recovery point
consistent across uploads and database references, quiesce upload/deletion writes while taking the bundle.

Restore to a **new empty database and new uploads directory**, never overwrite the live database. Retrieve the
whole bundle from off-host storage and use the matching backup image with its entrypoint overridden:

```bash
# Run on a recovery host/network. Supply PGHOST, PGPORT, PGUSER, PGPASSWORD and
# PGDATABASE for an already-created empty database via a protected environment file.
docker run --rm --network <recovery-network> --env-file <recovery-env-file> \
  -e RESTORE_UPLOADS_DIR=/restored \
  -v <retrieved-bundle-directory>:/bundle:ro -v <new-upload-volume>:/restored \
  --entrypoint /usr/local/bin/restore-backup \
  <qualified-backup-image-digest> /bundle
```

The command verifies checksums, refuses nonempty targets, restores the database in one transaction and
extracts uploads. If extraction fails after the database restore, discard the disposable recovery targets and
repeat; do not cut over partial recovery. Reconnect a matching application image, run `php artisan finance:reconcile`,
verify login, referral confirmation and uploaded files, then perform the approved database/storage cutover.
Restore the uploaded files under `storage/app/public`, retaining the other Laravel runtime storage directories.

The automated drill (`scripts/release/restore-drill.sh`) compares every public table's rows, sequences, uploads
and ledger reconciliation after recovery and checks corruption/failure handling. It runs on synthetic data;
record actual off-host retrieval, production recovery time and recovery-point age separately before launch.

### Financial operations and upgrades

`Finance → Financial review` (`/finance`) provides commission review, adjustments
and platform-only advertiser funding. Funding and payouts record verified external
bank movements; they do not execute transfers. Record a unique bank reference and
durable evidence. Campaign budgets are spending caps, not deposited funds.

Network funding fees are deducted at deposit and are not refunded when unused
funds are returned or commissions reversed. A fixed fee requires the configured
network currency. Supported settlement currencies are USD, EUR, GBP, KES, CAD, AUD
and CHF; there is no FX conversion or cross-currency debt offset.

Earnings progress from `pending → approved → locked → payable → paid`. Only reviewed
earnings can be invoiced. Cancel an unpaid invoice before adjusting its locked or
payable earnings. A partial refund records the additional refunded sale amount,
not the commission amount. Refunds after payout create publisher recovery debt in
the original liable network and currency; paid invoices retain their history.

Before enabling financial activity on an upgraded installation:

1. Back up the database and test all pending migrations in staging, including the
   financial ledger and partner-workflow migrations. These retain immutable
   accounting and enrollment evidence and are forward-only.
2. Review role grants, including `manage_funding`, `review_commissions`,
   `adjust_commissions` and `view_financial_ledger`. Reissuing the
   full role seeder resets grants. Existing unverified users must verify email;
   discard and reissue old queued credential emails that contain generated passwords.
3. Run `php artisan finance:reconcile`. Legacy balances, earnings and invoices do
   not become verified money automatically. Review them against bank records and
   contracts before preparing an explicit opening-balance migration.
4. Issue fresh referrals for legacy clicks without commission snapshots. Pending
   legacy partner applications must be resubmitted with terms consent before
   approval; review legacy inactive assignments before reactivating them.
5. Exercise deposit → event → review → invoice → payment → refund with test bank
   evidence. Require clean reconciliation before enabling settlement and after recovery.

Reconciliation is read-only, exits nonzero on discrepancies and locks each network
for a consistent view; schedule it off peak. Keep financial and enrollment history
intact when closing accounts. Account closure retains records; retention and
personal-data erasure policies require separate operational decisions.

### Form-submission upgrades and initial policy

Deployment must run `php artisan migrate --force`. The removal migration permanently drops existing lead contacts and hosted-form settings, removes their foreign-key columns and permission, and retains conversion, earning, invoice and ledger records. Historical migrations remain in source to support upgrades; they do not leave a lead table after the current migrations finish. This migration cannot restore deleted contacts on rollback. Existing historical event types and financial evidence are retained unchanged.

The initial form-duration threshold comes from `TRACKING_MINIMUM_FORM_DURATION_MS` (1000 ms by default); saved fraud policies can override it. New installations run in shadow mode without automatic commission approval. Coordinate legacy merchant integration changes using the [form guide](docs/form-campaigns.md#upgrading-from-the-removed-lead-feature).

### Customer promotions and store connections

Customer promotions are always available to authorized campaign managers. No feature flag is required. Existing installations should remove the obsolete `CUSTOMER_PROMOTIONS_ENABLED` environment entry. Individual discounts still require explicit configuration and publication by a merchant.

Deploy the current application and migrations through the qualified release workflow. For a non-container installation, run the normal build/migration steps:

```sh
php artisan migrate --force
npm run build
php artisan config:cache
```

Keep the default queue worker and Laravel scheduler running. The Dokploy stack includes `queue` and `scheduler` services. The scheduler runs `promotions:reconcile` to recover pending orders and Shopify webhook deliveries. Restart workers after code or configuration changes.

WooCommerce ZIP downloads, including the authenticated workspace download, are generated from the current allowlisted integration source files. No packaging command is required for merchant downloads. `php artisan promotions:package` remains available when an operator needs a standalone archive at `storage/app/dmhub-promotions.zip`.

Store credentials belong to one advertiser/network. WooCommerce receives a random server-only connection key shown once at creation or rotation; DM Hub stores its hash. Shopify access/refresh tokens are encrypted at rest using the application key. Keep `APP_KEY` stable and backed up. Store keys and Shopify secrets must never appear in browser code.

#### Register and deploy the shared Shopify app

The DM Hub operator prepares this app once per environment. Merchants then enter their own store domain in DM Hub and authorize installation; they do not register or deploy the shared app.

1. Register the Shopify app and set `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` and `SHOPIFY_API_VERSION` in the DM Hub deployment environment. The implemented API version defaults to `2026-10`. The Dokploy app, queue and scheduler receive these through the shared environment file.
2. Use `integrations/shopify/`, or [download its deployment archive](/docs/integrations/shopify/download) from the running DM Hub host. Copy `shopify.app.toml.example` to `shopify.app.toml`, replacing the client ID and host with the environment's registered values. Do not commit secrets.
3. Deploy the app configuration and theme extension with Shopify CLI. The example declares `read_orders,write_discounts,read_products,write_app_proxy`, the OAuth callback at `/integrations/shopify/callback`, the app proxy at `/api/integrations/shopify/proxy`, and webhook deliveries at `/api/integrations/shopify/webhooks`.
4. Configure the declared paid-order, cancellation, refund, uninstall and privacy subscriptions. Distribution to unrelated merchants requires appropriate Shopify distribution and approval. Verify that the intended merchant can install the app before inviting them.
5. Refresh the application's configuration cache and restart workers after changing credentials. Use the [merchant Shopify guide](docs/shopify.md) to test a connection from DM Hub and enable the theme app embed in a test store.

The implementation includes OAuth installation, expiring token refresh, a signed app proxy, theme embed and native discount provisioning. Paid orders are matched by applied native discount code; writable cart attributes alone are not trusted. A stable code lookup recovers ambiguous discount-creation timeouts. Authenticated webhooks persist only the fields required for attribution/accounting, excluding customer contact details, before queue processing.

The integration has not been certified against a live merchant store or submitted to Shopify review. Checkout-step custom UI, Functions-based eligibility, global redemption caps, strict customer identity limits, automatic reversals, emergency native-code revocation, subscriptions, free shipping, tiered benefits, buy-X-get-Y and catalogue-wide price rewriting are not included. Reporting currency must match the campaign/store; there is no FX conversion.

#### Registered staging app (18 November 2026)

- Organization: **DM Consultants Limited**; app: **DM Hub Promotions**.
- [Active Shopify version](https://dev.shopify.com/dashboard/248393909/apps/448859635713/versions/1235533430785): `dmhub-promotions-staging-20261118`.
- Client ID: `cab55899e76c13e771c831afb04178c2`. This replacement app supersedes the staging configuration previously registered under Tami Wears; it does not migrate existing merchant installations.
- Target: `https://affiliates-bnd.dmhub.cloud`.
- Repeatable configuration: `integrations/shopify/shopify.app.staging.toml`; extension identity is retained in `shopify.extension.toml`.
- The private local handoff file `.env.shopify` contains `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` and `SHOPIFY_API_VERSION`. It is Git-ignored and must not be committed or copied into a public artifact. It is not included in deployments automatically.
- Level 1 customer-data development access is configured for app functionality, allowing the order webhook subscriptions. Names, email addresses, phone numbers and addresses are not requested. Production distribution and any required review remain separate.

Copy the three environment values to the target application's secret/environment configuration, deploy the current backend code (including the `write_app_proxy` scope), rebuild Laravel's configuration cache and restart application/queue/scheduler processes according to the hosting setup. Then connect a merchant store through DM Hub and verify an order. Creating/releasing the Shopify app does not install it on a merchant store or activate the DM Hub backend by itself. Distribution/approval for unrelated merchant stores still needs to be completed through Shopify.

Subsequent Shopify configuration/extension releases can use:

```sh
shopify app deploy --path integrations/shopify --config staging
```

Keep Shopify-managed scope configuration enabled (omit `use_legacy_install_flow`). Shopify rejects app-specific webhook subscriptions when the legacy install setting is enabled. The standalone DM Hub backend still obtains its token with the authorization code grant. See [Shopify authentication](https://shopify.dev/docs/apps/build/authentication-authorization) for the distinction between app installation and token grants.

#### WooCommerce operational requirements

The plugin captures referrals both on uncached landing requests and through a same-origin AJAX endpoint on cached pages. Exclude referral landing requests from full-page caches when immediate payment buttons are enabled. Classic checkout and Checkout Blocks have separate metadata hooks, and order storage uses WooCommerce APIs for HPOS compatibility. WooCommerce 8.8 or later is required for eligible-item allocation. Coupons must be enabled.

The plugin listens to `woocommerce_payment_complete`; moving an order into processing/completed status alone is not payment proof. Manual gateways must trigger payment completion after collection. Confirmed orders are snapshotted and delivered using Action Scheduler. Configure a reliable cron/Action Scheduler runner on the merchant host, and inspect the `dmhub-promotions` action group and plugin notices for delivery failures. Transient connection failures retry with bounded backoff; permanently rejected payloads need operator review. Original payload/delivery status is retained in order metadata.

A definitive grant rejection removes the offer and asks the shopper to review totals; a transient outage can honor an already validated, unexpired grant. Test cached pages and accelerated checkout separately.

#### Integration API and recovery

These internal integration endpoints are separate from the advertiser `/api/v1/events` contract:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/stores/connect` | WooCommerce domain/currency handshake |
| `POST /api/v1/stores/grants` | Validate referral and issue/reuse a session-bound grant |
| `POST /api/v1/stores/grants/{id}` | Check a grant using the same session identity |
| `POST /api/v1/stores/orders` | Record a paid-order snapshot |
| `POST /api/v1/stores/adjustments` | Record refunds/cancellations for review |

WooCommerce uses the store Bearer key. Shopify uses signed proxy requests and HMAC-verified webhooks. Orders contain `external_id`, `grant_id`, `paid_at`, `currency`, `subtotal`, `discount`, `promotion_discount`, `shipping`, `tax` and `total`. Monetary values are decimal strings with at most two fractional digits. Shopify also supplies `taxes_included` and `shipping_tax` to exclude tax correctly from the merchandise commission basis. Paid timestamps come from successful SALE/CAPTURE transactions.

Order recording precedes commission confirmation. Replays are idempotent and conflicting payloads are rejected. Funding/eligibility failures become `needs_review`; zero commissionable amounts become `no_commission`. Unsupported adjustments, fees or inconsistent totals remain for review. Refunds and cancellations produce deduplicated review records; they never automatically reverse the immutable purchase event.

After resolving the underlying issue, retry a specific record:

```sh
php artisan promotions:reconcile --order=ORDER_RECORD_ID
php artisan promotions:reconcile --delivery=DELIVERY_ID
```

Retries do not bypass monetary/timing review or attribution windows. Failed deliveries are visible in the campaign workspace; pending deliveries are recovered by the scheduler. Use Financial review for cases that cannot be reconfirmed.

#### Promotion release verification

Run `php artisan test --filter=CustomerPromotionsTest` for tenant isolation, versioning, values, expiry, usage limits, commission funding separation, duplicate events, tax-inclusive amounts, zero-value orders and Shopify mapping. `node scripts/release/promotion-storefronts.mjs` runs browser contract checks with mocked commerce responses. `scripts/release/promotion-workspace.mjs` targets a disposable preview account/database; never point it at production.

Before customer traffic, record real-store checks for percentage/fixed discounts, product scopes/exclusions, competing coupons, empty carts, guest/logged-in sessions, caching, mobile, Classic/Blocks checkout, express/asynchronous payment, duplicate callbacks, expiry, outages, refunds/cancellations and tax/commission totals. Mocked contract checks do not replace merchant-store acceptance.

### Advertiser API credential operations

For custom merchant integrations, issue an advertiser-scoped credential on the DM Hub host:

```sh
php artisan postback:credentials ADVERTISER_ID --name=merchant-integration --days=90
```

Use the actual numeric advertiser ID. Validity can be 1–365 days. Deliver the token securely to the merchant; it is displayed once and belongs in their backend secret store. To rotate, issue a replacement, have the merchant switch to it, then revoke the old credential:

```sh
php artisan postback:credentials ADVERTISER_ID --revoke=CREDENTIAL_ID
```

Built-in customer promotion connections use their own Shopify authorization or WooCommerce store key and do not require this advertiser credential. The [public API reference](docs/api-reference.md) contains merchant-side request and retry instructions.

## 7. Notes for a shared server

- This stack uses roughly 1 GB of RAM per environment. The server has about 8 GB, no swap and ten other
  containers; watch memory (`free -h`) before adding production on the same machine.
- **Service names are shared on Dokploy's network.** `web` is attached to `dokploy-network`, where other applications
  also have containers named `app`, `web`, `db`. A bare `app` therefore resolves to *their* containers. Caddy reaches
  PHP-FPM through the unique alias `dmhub-php` (set on the `app` service in `compose.dokploy.yaml`) for this reason;
  keep that alias, and never attach `app`, `queue`, `db` or `backup` to `dokploy-network`. (Found on the first
  staging deploy: Caddy got 502s from other apps' port 9000.)
- Never run `docker system prune -a` or remove volumes you did not create: other applications live there.
- Things noticed on the server that its owner may want to review (not changed by this project): root and password
  SSH login are enabled, `fail2ban` is not running, the Dokploy UI (port 3000) is published on all interfaces,
  75 package updates are pending, and Traefik's Let's Encrypt contact address is a placeholder.

## 8. Pre-launch checklist

- [ ] DNS points at the server; `https://<host>/up` returns 200 with a valid certificate
- [ ] `.env` values in Dokploy have no blanks; `APP_DEBUG=false`, `APP_ENV=production`
- [ ] `db:seed` and `app:create-admin` done; the demo `test@test.com` user does not exist
- [ ] A test network owner receives the credentials email
- [ ] `curl -X POST https://<host>/api/postback/lead` returns 401; with a valid advertiser-scoped Bearer credential and an empty JSON body it returns 400. See the [API credential operations](#advertiser-api-credential-operations) to issue and rotate credentials
- [ ] A network logo uploads and displays
- [ ] A tracking link redirects and the stored click IP is the visitor's, not an internal address
- [ ] A completed off-host database/uploads bundle has been restored and reconciled; alerts work
- [ ] The exact committed revision passed qualification; production has required reviewers; deployment settings are configured

## Known limits

- One server, one `app` container per environment: migrations run on start, so do not scale `app` to several
  replicas without moving migrations to a separate step.
- The `app` image is about 900 MB.
- Backups share the server with the database until you copy them off.
- The new digest-pinned API deployment and backup image require a staging run against the installed Dokploy
  version. Run [local qualification](#local-qualification) before release; Docker image builds run in CI.
