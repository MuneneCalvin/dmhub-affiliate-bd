# Brand New Day demo and test data

For the client's first tests: working accounts, the five products they named, publishers with tracking links, funding, and a way to
generate real clicks and leads through a browser. Everything is safe to run again.

## Create the data

```bash
php artisan demo:bnd --force --base-url=https://affiliates-bnd.dmhub.cloud --json > links.json
```

| Account (all `@demo.dmhub.cloud`) | Role | What it is |
| --- | --- | --- |
| `bnd.adviseur` | Advertiser | "Brand New Day Pensioen (demo)", euro account, funded with demo money (€10,000 before the 8% funding fee) |
| `creator` | Publisher | An **individual** promoting on Instagram and TikTok |
| `vergelijker` | Publisher | A **company**: comparison website plus a newsletter |
| `cashback` | Publisher | A **company**: website plus a cashback platform |

The five campaigns, each with one offer paying a per-lead compensation:

| Campaign | Offer | Compensation |
| --- | --- | --- |
| Pensioen spaarrekening | Spaarrekening aanmelding (demo) | €25 |
| Pensioen beleggingsrekening | Beleggingsrekening aanmelding (demo) | €40 |
| Lijfrente uitkeringsrekening | Lijfrente aanvraag (demo) | €30 |
| Werkgever lead | Werkgever contactverzoek (demo) | €15 |
| Financieel adviseur lead | Adviseur contactverzoek (demo) | €20 |

Each publisher has approved tracking links for several campaigns. A tracking link sends the visitor to the **demo form**
(`/demo/aanmelden.html`), which carries the platform's embed script for that offer, so the whole route works end to end:
click, form, consent, lead, conversion, pending compensation.

## Passwords

The accounts are created with a random password nobody knows. Choose the real ones yourself, in your own terminal (it needs one):

```bash
bash scripts/demo/set-demo-passwords.sh
```

Each password is typed at a hidden prompt (12 characters or more), so it never appears in a command line, a log or a chat.
The network and platform-admin accounts are separate; use the ones you already have.

## Simulate visitors

```bash
node scripts/demo/simulate-traffic.mjs --base https://affiliates-bnd.dmhub.cloud --links links.json --clicks 6 --submit 0.5
```

A real browser opens each tracking link as a new visitor (desktop and mobile, Dutch), and about half of them fill in the form.
A few repeat an email (reported as a duplicate, no second lead or payment) and a few forget the consent box (refused). Every click
and lead goes through the public pages, like a real visitor's. Run `--seed` with another number for a different mix.

## Make the Leads page lively

```bash
php artisan demo:bnd --force --progress-leads
```

moves the existing demo leads along: new, contacted, qualified, **account opened** and lost. It touches no money.

## Where to look afterwards

- **Advertiser** (`bnd.adviseur`): Campaigns, Leads (contacts, statuses, export), the funding balance.
- **Publishers**: tracking links, clicks and pending compensation per campaign. Publishers never see contacts.
- **Network or platform admin**: Financial review (the compensation waits for approval; the fraud engine is in shadow mode),
  Partner pool, publisher pages with their channels.
