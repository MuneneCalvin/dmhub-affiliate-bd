# Phase 09 · Finance & invoices

**Goal:** earnings, invoices and platform finance in the new style with
currency separation and all existing actions intact.

**Design boards:** `Finance.dc.html`, `InvoiceDetail.dc.html`,
`Overlays.dc.html` (record payment modal, toasts), `Directory.dc.html`.

## Files in scope

- Pages: `publisher/earnings/index`, `publisher/invoices/{index,create,show}`,
  `network_invoices/index`, `admin/finance/index`, `admin/invoices/{index,show}`.
- Components: `finance-summary.tsx`, `finance-form-controls.tsx`,
  `finance-error-notice.tsx`, `record-payment.tsx`, `partner-money.tsx`,
  `campaign-funding.tsx` (shared with 07 — restyle only if 07 has not).
- Feature tests: `FinancialConsistencyTest.php`, `OptionalFundingTest.php`,
  `Integration/FinancialConcurrencyTest.php`.

## Tasks

1. Earnings: currency SegmentedControl (filled finance variant), navy balance
   hero with Create invoice / Payout settings, commission breakdown tiles
   (approved, pending, paid, rejected — server values), invoices table with
   status SegmentedControl, status badges, View + Download PDF.
2. Invoice create: select approved earnings per currency, live totals, submit.
3. Invoice detail (publisher, network, admin): document card (colour strip,
   issuer/recipient, period, line items, subtotal/VAT/total as the backend
   computes), status history timeline, overdue notice, actions by permission
   (Download PDF, Record payment, Mark as sent, etc.).
4. Network invoices and admin invoices/finance lists: ResourceDirectory with
   amount columns right-aligned, tabular numerals, per-currency totals.
5. Record payment modal (Overlays board): amount due tile, amount with €
   adornment, date, method, reference; success toast with real follow-up.

6. **Known bug from phase 00:** invoice detail shows Approve / Reject / Mark as
   Paid to network owners who lack `approve_network_invoices`, giving a 403.
   Show only actions the user is permitted to perform, and extend
   `tests/e2e/finance.spec.ts` to assert the network owner sees no Approve
   button (the approve/pay flow there runs as the super admin).

## Tests to add

- Vitest: money formatting per currency never mixes currencies; invoice totals
  display; record payment form validation messages.
- Pest: existing finance tests green; add tests for any controller prop
  changes.
- Playwright `finance.spec.ts` (extend): publisher switches currency and sees
  separate totals; creates an invoice; network owner records payment; invoice
  shows Paid and the timeline gains a Paid entry; PDF download returns 200.

## Done when

All README checks pass.

## Handoff notes

**Status: done** (branch `redesign/phase-09-finance`, based on
`redesign/phase-08-creatives-scripts`).

### New shared components

- `@/components/finance` (barrel):
  - **BalanceHero** (`title`, `value`, `caption?`, `actions?`, `footer?`):
    navy card with the decorative shapes; the title is its `h2` and names the
    region ("Available to invoice").
  - **CurrencyTotals** (`summary`, `label?`): one `article` per currency
    ("EUR totals") listing StatusBadge, count and amount per status; empty
    state without activity. Replaces `finance-summary.tsx` (deleted).
  - **InvoiceDocument** (`invoice`): colour strip, "Bill to" network,
    "Bill from" publisher, Issued / Period / Payout method, line items
    (campaign, offer · order code, type, date, commission = `invoice_amount`)
    and a `dl` "Invoice totals": Subtotal (`invoice_details.gross_minor`),
    "Prior refund recovery deducted" (`recovery_minor`), Total (`amount`).
    No VAT: the backend computes none.
  - **InvoiceTimeline** (`invoice`, children = notes): "Status history"
    SectionCard, newest first; done steps are filled tiles, the next expected
    step is dashed (`data-state="waiting"`, sr-only "(Upcoming)").
    `useInvoiceSteps(invoice)` is exported.
  - **InvoiceDetail** (`invoice`, `breadcrumbs`, `can {approve,reject,pay}`,
    `endpoints {pdf, approve?, reject?, pay?}`, `audience`
    publisher|network): the whole invoice page body. **Only permitted actions
    render** (fixes the phase 00 bug): Approve (pending), Reject (pending) /
    Cancel invoice (approved), Record payment (approved), Download PDF always.
  - **RecordPaymentDialog** (`target {url, invoiceNumber, payee?, amount,
    currency, askMethod?}`, `onClose`, `followUp? {label,onClick}`): amount due
    tile, Bank reference, Method (network invoices only — the publisher
    endpoint has no method field), Receipt or reconciliation note. Client
    checks (`validatePayment`, mirrors the controller rules) focus the first
    invalid field; server and `errors.finance` messages show inline. On
    success a "Payment recorded" toast replaces the flash toast (same id
    `flash-success`) with a real follow-up: "Download PDF" on the detail
    page, "View invoice" on the admin list.
  - **CancelInvoiceDialog** (`target {url, invoiceNumber, mode
    reject|cancel}`): reason (max 500) → `reason`.
  - Money helpers in `money.ts`: `formatMoney(value, currency, locale)`,
    `useFormatMoney()`, `summaryTotal(summary, currency, statuses)` (one
    currency only, summed in cents), `availableFor(groups, currency)`,
    `invoiceTotals(invoice)`, `lineAmount(line)`, `fromMinor`. There is
    deliberately no cross-currency sum.
  - Types: `FinanceSummary`, `Invoice`, `InvoiceLine`, `PayoutGroup`,
    `PayoutRequest`, `InvoiceAbilities`.
- **ResourceDirectory** gained `heading` (left of the toolbar) and a
  `DirectoryHeading` helper (`icon`, `tone`, `title` → h2, `description`).
  Use it instead of nesting a directory inside a SectionCard.
- `finance-form-controls.tsx`: `OptionCards` now renders `RadioCardGroup` /
  `RadioCard` (tone finance, stacked); `FormErrors` is a danger `Alert`.
  Same props (+ optional `label`, `tone`). `finance-error-notice.tsx` is a
  danger Alert with a title. `campaign-funding.tsx` restyled on tokens.
- Deleted: `record-payment.tsx`, `finance-summary.tsx`, and the dead finance
  columns in `dev/columns/columns.tsx` (`AdminInvoiceColumns`,
  `PublisherEarningsColumn`, `InvoiceEarningsColumns`, `EarningsColumns`,
  `InvoiceColumns`, `NetworkInvoiceColumns`). The old `PublisherInvoice`,
  `AdminInvoice*`, `PublisherPayoutRequest` types in `types/index.d.ts` are
  still used by nothing in finance; phase 11 can drop them.

### Server changes

- **PDF download (new)**: `GET publisher/invoices/{id}/pdf`
  (`publisher.invoices.pdf`, `view_invoices`, own invoices only → 404
  otherwise) and `GET admin/invoices/{id}/pdf` (`admin.invoices.pdf`,
  `view_network_invoices`, scoped like `show`). Rendered by
  `App\Support\Pdf\PublisherInvoicePdf` on `App\Support\Pdf\SimplePdf` — a
  small built-in PDF 1.4 writer (Helvetica, WinAnsi, A4, page numbers); **no
  new Composer dependency**. Labels are server strings
  `messages.invoices.pdf.*` (en/nl), dates and money follow the app locale.
- `publisher/earnings`: `?currency=` (one of the publisher's currencies,
  unknown → first), props `currencies`, `currency`, `canRequest` (groups now
  include `network_name`), `invoices` (latest 10 in the currency, with
  `network`), `payoutMethod`, `payoutThreshold`; earnings filtered by currency,
  paging keeps the query.
- `publisher/invoices`: `?status=all|open|paid|rejected` (open =
  pending + approved), `status`, `statusCounts {all,open,paid,rejected}`,
  rows include `network`. `create` groups include `network_name`. `show`
  loads `network`, `publisher.user`, `earnings.publisherCampaign.offer`.
- `admin/invoices` index/show: `can {approve, reject, pay, export,
  all_networks}` (settling = super admin or `approve_network_invoices`, as
  the routes require), index adds `statusCounts` (all + per status),
  `withQueryString()`.
- `networks/invoices`: `?status=`, `status`, `statusCounts`, `totals`
  (currency → status → amount/count), rows include `network`, `can {generate,
  approve, reject, pay}` (approve/reject/pay remain super-admin routes). The
  old try/catch that hid errors is gone; a user without a network gets an
  empty list instead of a bare `[]`.
- Tests: `tests/Feature/FinanceRedesignTest.php`. Existing finance tests
  unchanged and green (the concurrency suite still needs PostgreSQL).

### Pages

- **Earnings & invoices** (`publisher/earnings`): PageHeader + currency
  SegmentedControl (filled finance; only with more than one currency),
  BalanceHero (available = sum of the currency's payout groups; Create invoice
  / All invoices; shortfall to the minimum, minimum payout, payout method),
  four StatCards (Approved, Pending review, Paid all time, Rejected =
  rejected + reversed), latest invoices (ResourceDirectory with All/Open/Paid
  SegmentedControl, Details + "Download PDF" menu item), earnings history.
  "Payout settings" from the board is replaced by "All invoices": publishers
  have no payout settings page (their method/threshold are set by the
  network).
- **Invoices** (`publisher/invoices`): Request Payout, info note when nothing
  is payable, CurrencyTotals, server status filter, pager.
- **Request payout** (`publisher/invoices/create`): RadioCards per currency ·
  network (shortfall in the hint), included earnings table, sticky "Invoice
  summary" with live per-currency totals (earnings, outstanding refund
  recoveries, available after recoveries = what will be invoiced, minimum,
  method). The backend still invoices *all* approved earnings of the group,
  so there are no per-earning checkboxes.
- **Invoice detail** (publisher and admin) → `InvoiceDetail`.
  **No overdue notice**: invoices have no due date in the data; the timeline
  card shows a "what happens next" note instead.
- **Publisher invoices** (`admin/invoices`) and **Network invoices**
  (`network_invoices`): StatusTiles + CurrencyTotals + ResourceDirectory;
  row menus only list permitted actions; amounts right-aligned, tabular.
  Network invoices have no detail page; rejected network invoices read
  "Cancelled".
- **Financial review** (`admin/finance`): PageHeader, status SegmentedControl
  with counts (server filter), ResourceDirectory with the order-reference
  search form in `heading`, fraud select in `toolbar`, Review/Adjust column,
  pager. Review sheet uses `SheetHeader` icon, `DetailList`, RadioCards.

### Tests and selectors

- Vitest: `components/finance/finance.test.tsx` (money per currency,
  no cross-currency totals, invoice totals, document lines, permission-gated
  actions, timeline states, payment validation messages),
  `resource-directory.test.tsx` (heading slot).
- Playwright `finance.spec.ts`: currency switch with separate totals,
  invoice creation (RadioCard `EUR · …`, "Invoice summary"), PDF 200 for
  publisher and admin, **network owner sees no Approve / Reject / Record
  payment**, super admin approves, empty-field validation, records payment,
  "Payment recorded" toast, timeline Paid entry with the reference.
- Selector changes: "Mark as Paid" → **"Record payment"** (Overlays board);
  the invoice form's currency combobox → radiogroup "Currency and liable
  network"; earnings statuses are badges ("Pending"), so
  `tests/browser/lifecycle/journey.spec.ts` now matches `/pending/i` and
  `/approved/i`.
- E2E seed: **E2E Dollar Campaign** (advertiser "E2E Dollar Brand", USD,
  `dollar-advertiser@dmhub.test`) with one approved USD earning for the
  publisher (`seeded.dollarCampaign`). It is approved in the seed so no
  fraud-review badge appears in the navigation specs.

### Checks

- `php artisan test`, `npm run types`, eslint/prettier on changed files,
  `npm run test:unit`, `npm run test:e2e` (47 passed), `npm run test:browser`
  (merchant release test, PostgreSQL `affiliates_nl_qualification`) all pass.
- `npm run test:lifecycle` **fails before reaching any finance step, for
  reasons outside this phase**: registration expects `tab` "advertiser" /
  "publisher" (phase 04 changed the register tabs) and the campaign wizard
  expects a "Start Date *" button (phase 07 changed the date fields). Phase 11
  (or a dedicated fix) should update `tests/browser/lifecycle/journey.spec.ts`
  and its helpers; the finance steps there (Record funding, Review, "Reason
  and evidence", "Approve commission") keep their accessible names.
- Visual check: light/dark at 1440 and 390 from the e2e environment
  (throwaway screenshot spec, deleted).

### Gotchas

- `useForm` in the Vitest Inertia mock is not stateful and has no
  `transform`; test dialogs through their client validation.
- Flash toasts use id `flash-success`; to replace one with a richer toast,
  emit yours with the same id after the page update (`setTimeout`).
- Never pass a whole folder to `npx prettier --write`: it rewrites untouched
  pages of other phases.
