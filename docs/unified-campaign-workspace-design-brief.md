# Unified Campaign Workspace Design Brief

Prepared for the DM Hub product and design team · 4 November 2026

Design a single campaign workspace where advertisers, publishers and network operators can understand a campaign, complete their next task, measure results and follow the money through to payment. The workspace should connect the existing campaign, offer, publisher, tracking and finance flows while respecting each role’s access.

The central design requirement is clarity across the lifecycle: **configured → eligible for traffic → receiving confirmed outcomes → financially reviewed → invoiced → paid**. These are different milestones. An active campaign does not necessarily have funding, a working integration or approved publishers.

Sections describing current functionality reflect the repository implementation. The proposed workspace and design deliverables describe the intended experience; the scope table identifies where additional engineering is required.

## Product structure and terminology

| Concept | Meaning | Relationship to the workspace |
| --- | --- | --- |
| Network | The operating organization connecting advertisers and publishers, with its own settings and financial responsibilities. | Sets the access boundary for network staff and partners. |
| Advertiser | The business funding campaigns and confirming outcomes from its website. | Owns campaigns and a funding balance shared across those campaigns. |
| Campaign | The parent initiative, with dates, spending limits, targeting, terms and goals. | The main workspace context. |
| Offer | A specific proposition within a campaign: landing page, commission terms, attribution windows and promotional materials. | A campaign can contain several offers. |
| Publisher or promoter | The partner bringing traffic and earning commissions. Both terms appear in the product. | Choose one consistent primary label in the new design; this brief uses “publisher.” |
| Publisher assignment | The approved relationship between a publisher, campaign and selected offer. It holds the agreed rate, accepted terms, tracking link and script token. | The unit of attribution and publisher performance. Currently a publisher has one enrollment per campaign. |
| Creative or promotional material | A banner, image, text, HTML, email asset or video associated with an offer. | Publishers use attribution links specific to their assignment. |
| Click and referral | A recorded tracking request and its referral identity. | Connect the publisher’s traffic to a later confirmed outcome. |
| Conversion | A merchant-confirmed submission, purchase or qualified action. | Confirmation creates a pending financial earning. |
| Earning | The publisher’s commission, with its own review and settlement status. | Connects the conversion to financial review and an invoice. |
| Publisher invoice | A payout request covering eligible earnings for one publisher, liable network and currency. | Can include earnings from several campaigns. |

A useful drill-down path is campaign → offer → publisher assignment → click/referral → conversion → earning → invoice. The designer should make these relationships navigable without requiring users to understand database identifiers.

## Users and access

The workspace shares a structure across roles, but its information and actions change with permissions. A role label alone is insufficient: existing business permissions also control actions.

| Role | Primary jobs | Current access boundaries |
| --- | --- | --- |
| Advertiser | Create and edit campaigns, configure offers and materials, arrange integration, understand performance and funding. | Own campaigns. Current application review and financial review routes belong to network operators and administrators, not advertiser self-service. |
| Publisher | Discover a campaign, accept terms, apply, obtain links and assets, track own results, request and follow payouts. | Own enrollment, attribution assets, earnings and invoices. Discovery is within the publisher’s network. |
| Network operator | Manage authorized campaigns in the network, review applications and commissions, handle publisher invoices, inspect financial records. | Own network and granted permissions. Funding deposits/refunds and settlement of the network’s own invoices are platform administrator actions. |
| Platform administrator | Manage across networks, record funding, review financial exceptions and settle network invoices. | Cross-network access with clearly visible organization context. |

Merchant developers are integration collaborators, not a separate implemented campaign role. Provide a useful integration handoff without assuming a new invitation or developer-access system.

Do not design a switch between unrelated signed-in accounts as an existing capability. The current product uses separate sessions/accounts. A campaign selector should select resources the current identity can already access.

## Current campaign setup and management

The campaign wizard has three steps: campaign details, budget and terms, and audience and targeting. Creation does not require an advertiser balance.

| Area | Existing configuration and behavior |
| --- | --- |
| Identity | Campaign name, description, advertiser and network ownership. Advertisers create for their own profile; authorized managers select an advertiser. |
| Status | Active, inactive and pending. Editing status is separate from whether dates, funding and integrations permit operation. |
| Schedule | Start date, end date and a no-end-date option. Present “No end date” without exposing the stored sentinel date. |
| Spending limits | Optional total and daily commission spending caps. Blank or zero means no limit of that kind. |
| Currency | Campaign currency must match the advertiser and confirmed events for payable outcomes. No automatic foreign exchange is provided. |
| Targets | Target conversion count and target ROI. These are planning inputs, not proof of actual ROI or launch readiness. |
| Publisher capacity | Optional maximum publisher count; approval checks capacity. Active and inactive assignments count toward capacity. |
| Terms | Optional campaign terms. Authorized advertisers/administrators can manage terms in a new tab and refresh the wizard’s choices without losing entered fields. |
| Targeting | Countries grouped by regions/subregions, individual country selection and devices. No selected countries means all countries. |
| Organization | Tags stored with campaign metadata. |

Campaign creation also notifies publishers in the advertiser’s network. A campaign directory serves network and administrator management; advertisers have their own campaign list.

**Current targeting limitation:** the tracking controller does not resolve a trusted visitor country. Country restrictions therefore reject traffic. The workspace must explain this blocker wherever country targeting is configured or readiness is displayed.

Campaign and offer activation, active dates, account verification, network membership, available funds, spending caps and assignment eligibility all affect whether tracking and conversion confirmation can proceed. Do not treat an “Active” badge as a launch certification.

## Offers and commercial terms

An offer contains its name, description, status, landing page URL, thumbnail, terms, commission configuration, attribution windows, permitted/prohibited traffic sources, bonus labels and a displayed minimum payout. Tracking URL templates are generated from the landing page.

The current offer detail has Details, Materials and Integration tabs. Managers can create, edit, activate and deactivate offers. Deletion is blocked when publisher assignments exist, including assignments that are not currently active.

| Business outcome | Supported commission | What triggers an earning |
| --- | --- | --- |
| Accepted enquiry or sign-up | CPL, fixed amount | Successful saved submission, confirmed by the merchant backend with required spam checks. |
| Paid purchase | CPS or RevShare, percentage | Merchant-confirmed paid order with a positive reported sale amount. |
| Paid purchase | Flat, fixed amount | Merchant-confirmed paid order. |
| Qualified business action | CPA or Flat, fixed amount | Merchant-confirmed action satisfying the agreed business rule. |
| Referral visit | Traffic measurement | Records a click; does not create a payable CPC earning. |

There is no separate persisted campaign-type switch for “form,” “checkout” or “click.” Those goals are expressed through offers, commission agreements and event integrations. A goal-based setup guide would be a new presentation layer over this model.

Publisher approval currently requires **exactly one supported positive commission rule**. Percentage rates cannot exceed 100%. The offer editor can store two rules, but that combination is incompatible with the approval service. The redesigned editor should resolve this mismatch rather than imply combined commissions work.

The approved assignment holds the agreed rate, and each click snapshots its financial contract. Editing an offer does not imply retroactive changes to historical clicks or automatic renegotiation of existing assignments.

Bonus labels are descriptive configuration; the current commission calculation does not implement automatic bonus awards. Likewise, the offer’s displayed minimum payout is not the threshold used by publisher invoice eligibility: that calculation uses the publisher’s payout threshold.

## Publisher discovery and enrollment

The publisher discovers available campaigns, selects an offer, reads its agreement and applies with notes and explicit terms acceptance. Terms acceptance records a version, snapshot and timestamp.

The network reviewer sees the publisher identity, website, traffic sources, application notes, campaign, requested offer and agreement. Approval assigns the accepted offer and commission, activates the enrollment and generates a publisher-specific tracking link. Rejection requires a reason.

The workflow also supports reapplication after rejection and updating a pending application. Approval is blocked when the accepted terms have changed, the selected offer differs from the accepted offer, the campaign is full, the commission is unsupported or eligibility has changed. A publisher must accept the current agreement before approval can proceed.

Enrollment events retain application, reapplication, approval and rejection history. Exposing this as a coherent workspace timeline requires new UI/data assembly.

The publisher’s campaign view provides campaign/offer details, agreed commission, tracking assets, performance and a downloadable QR code. The new workspace should keep application status, assignment status and campaign status visibly distinct.

## Promotional materials and distribution

Materials belong to a specific campaign and offer and cannot be moved to another offer during editing.

| Material | Existing authoring support |
| --- | --- |
| Images and banners | JPEG, PNG, GIF and WebP uploads; dimensions derived from the image. |
| Email assets | Image-based material categorized for email use; this is not an email sending tool. |
| Video | MP4/WebM upload, dimensions and optional preview image. |
| HTML | Supplied HTML content and optional preview. |
| Text | Link text/alt text. |

Image uploads allow up to 10 MB and video uploads up to 50 MB. Managers can create, preview, edit and delete materials. Publishers receive material URLs, embed snippets, tracking links and impression pixels for their assignment.

Creative reporting includes aggregate impressions, clicks and CTR. Current creative impressions are creative-wide counters; they are not a publisher-specific, dated impression event history. Script serves and script pixels increment an assignment-level script impression counter, which is also not a unique-person count.

The publisher embed generator handles images/banners and text explicitly but uses a generic image fallback for other types. Accurate video/HTML/email previews and embed experiences need implementation review before the design treats every type as equally supported.

## Tracking and integration

The implemented flow is:

1. A visitor follows the approved publisher’s tracking link, optionally identifying a creative, placement/sub-ID and traffic source.
2. DM Hub checks eligibility, records the click and redirects to the offer’s landing page with click and referral identifiers.
3. The merchant site preserves the eligible referral through navigation, form submission or checkout.
4. The merchant backend verifies a successful business outcome and submits an authenticated event.
5. DM Hub validates attribution, currency, commission agreement and budgets, then creates one conversion and pending earning.
6. Financial review and invoice settlement follow separately.

The assignment-specific browser SDK retrieves and revalidates attribution. It preserves the latest eligible referral per campaign/offer; multiple integrations use token-scoped instances. The SDK does not render or intercept forms and does not collect contact fields.

The click cookie lifetime defaults to 168 hours and the conversion window to 720 hours when unset. Referral lookup uses the earlier expiry. A newly submitted event must arrive while its conversion window is still valid; backdating an expired referral does not revive it.

Each click records attribution identities, timestamp, optional placement and traffic source, referrer, device, browser and operating system. IP/user-agent data exists for operational tracking; do not expose raw identifiers in routine publisher reporting. Country fields should not be presented as reliable populated geography under the current implementation.

Submission validation requires successful completion and typed spam signals. Honeypot, spam-verdict and form-duration heuristics are separately configurable fraud rules, with Off, Monitor only and Enforced modes. The initial duration threshold is one second. The merchant supplies these signals from its backend. Contact details, form answers and arbitrary payload metadata are rejected; the former hosted lead/CRM feature has been removed.

Duplicate delivery of an unchanged event returns the existing result without another commission. Reusing the advertiser’s event identifier with changed content produces a conflict. A page view, script load, impression, failed form or unpaid order does not create an earning.

### Integration content the workspace should expose

Present the offer destination, publisher link and QR code, public embed tag, attribution windows, supported outcome, required commission agreement, currency and links to platform instructions. Copy actions must label the publisher and offer to prevent sharing the wrong attribution link.

Provide a merchant handoff view with a plain-language launch checklist and expandable technical instructions. Public publisher tokens and secret advertiser credentials must be clearly differentiated. Credentials are currently issued/rotated/revoked through an operator command; a credential management screen would be new functionality.

Guides exist for custom websites, WordPress, Shopify and WooCommerce. These are implementation instructions, not installable native plugins. Store webhooks need adapters. Refunds and cancellations use financial review; there is no automatic refund webhook integration.

A proposed verification panel should separate “instructions copied,” “click observed,” “confirmed outcome observed” and “earning awaiting review.” Script activity alone cannot establish integration success. A diagnostic console, error history and automated readiness checks require new APIs/UI and potentially additional event logging. There is no dry-run flag: accepted test events can reserve real configured funds.

## Analytics and reporting

Existing advertiser, publisher and network dashboards use shared reporting logic. The new workspace should bring these definitions into the campaign context rather than introduce conflicting totals.

| Metric | Required meaning |
| --- | --- |
| Clicks | Recorded click requests for the relevant publisher assignments. Repeated visits and previews can create multiple requests. |
| Approved conversions | Confirmed conversions whose ledger-backed earnings are approved, locked, payable or paid. Pending review, rejected and fully reversed outcomes are excluded. |
| Net approved sales | Approved purchase value less recorded refunded sale value. Submissions/actions do not add purchase revenue. |
| Net approved commissions | Reviewed commission amounts less recorded reversals. This is performance, not an available cash balance. |
| Conversion rate | Approved conversions ÷ clicks × 100. Multiple qualifying outcomes per click can produce values above 100%. |
| Earnings per click | Net approved commissions ÷ clicks in the relevant currency. |
| Creative CTR | Creative clicks ÷ creative impressions × 100. Keep numerator and denominator at the same creative-wide scope. |
| Daily performance | Thirty UTC event dates including today, with refunds restating the original event date. |

Keep money separated by currency. Do not add EUR, USD or other currencies into one monetary total without a separately defined conversion policy. Display date basis, timezone and filters alongside charts.

Show pending confirmations/review as a separate operational queue, so a user can understand why a newly accepted event has not increased approved performance. Refunds may change historical charts; payment dates belong in settlement history rather than the performance timeline.

For the proposed Analytics tab, prioritize a daily trend and comparison tables by offer and publisher, with links into underlying outcomes. Source, placement, device, browser and creative breakdowns can use recorded click data but require new reporting queries and interfaces. Arbitrary date ranges, period comparisons, saved reports and analytics exports are additions; current dashboard charts use a fixed thirty-day period. Existing invoice CSV export should remain available to authorized operators.

Target ROI is a goal field. Do not show an actual ROI or profit calculation until the cost basis and business definition have been agreed. A commission-to-sales ratio alone is not advertiser profit.

## Funding and campaign spend

An advertiser’s funded balance is shared across its campaigns. Campaign budgets cap commission spending; they do not move money into a separate campaign wallet.

Platform administrators record a deposit with amount, currency, reference and evidence. A configured fixed or percentage network funding fee is deducted, and the remainder becomes available advertiser funds. Returning unused funds is a separate evidenced operation; the earned funding fee stays separate.

Each accepted payable outcome reserves its commission immediately by moving funds from the advertiser balance into publisher pending earnings. Campaign spend therefore includes pending commissions and is different from paid-out money. Financial rejection/refund/reversal restores the corresponding advertiser funds and reduces net campaign spend.

Daily budget enforcement currently sums gross earnings created during the UTC day; it does not subtract reversals from that daily sum. Total campaign spend is adjusted by reversals. The designer must not reuse one “remaining budget” formula for both without accounting for this difference.

Present these values separately: campaign total limit, campaign net commission spend, daily limit and current daily usage, and advertiser available balance across all campaigns. Label an unset cap “No limit.” Make shared-balance scope visible wherever users could mistake it for campaign funds.

## Earnings and financial review

| Earning state | Meaning | Next supported action |
| --- | --- | --- |
| Pending | Outcome accepted and commission reserved; awaiting financial review. | Authorized operator approves or rejects with a reason. |
| Approved | Reviewed commission available for eligible invoicing, subject to recoveries. | Publisher requests an invoice. |
| Locked | Included in a pending invoice. | Operator approves or cancels that invoice. |
| Payable | Invoice approved and awaiting recorded payment. | Operator records payment or cancels the unpaid invoice. |
| Paid | Payment recorded with reference and evidence. | Historical review; a later refund can create recovery. |
| Rejected | Pending earning rejected and its funds released. | Inspect reason/history. |
| Reversed | Remaining commission fully reversed. | Inspect adjustment/history. |

The financial review screen supports status filtering, order-reference search, approval/rejection and adjustments. Adjustments include partial sale refunds, full reversals and chargebacks, with references and reasons.

For a partial refund, the entered amount is the **refunded sale value**, and the service calculates the proportional commission reversal. Show both values before confirmation. Earnings locked in an unpaid invoice require cancellation of that invoice before adjustment.

A refund after payment can create a negative publisher available balance. Future invoice requests offset that recovery before new money is paid. Show original earning, refunded sale basis, commission reversed, net earning and outstanding recovery as distinct values.

Legacy financial records without ledger backing require reconciliation before settlement. This is a blocked state with an operator resolution path, not a zero balance or a generic form error.

## Publisher payouts and invoices

Publishers view earnings, payout eligibility and invoice history. A request selects one liable network and currency, with optional date limits. Only approved ledger-backed earnings that are not already invoiced qualify. The calculated net amount must be positive and meet the publisher’s payout threshold.

An invoice retains its earnings, period, original line amounts, gross amount, recovery offset, net request, payment method and status. Creating it locks the earnings to prevent duplicate invoicing.

| Invoice stage | User-facing meaning | Financial effect |
| --- | --- | --- |
| Pending | Payout requested; awaiting invoice approval. | Earnings locked. |
| Approved | Approved for payment. | Earnings payable. |
| Paid | External payment recorded. | Earnings marked paid; reference, evidence, actor and timestamp retained. |
| Rejected or cancelled | Unpaid request cancelled with a reason. | Earnings released back to approved/uninvoiced state. |

Operators can review invoice details, approve, cancel unpaid requests, record payments, bulk-approve pending invoices and export invoice CSV data. “Record payment” reflects the existing action: it records evidence of payment and does not itself initiate a bank transfer or payment-provider transaction.

The workspace must explain when a campaign’s earnings sit inside an invoice containing other campaigns. Show the campaign’s included lines and subtotal, then clearly link to the complete invoice. Account-level recovery offsets must not be silently allocated to this campaign or presented as its performance loss.

Network earnings and network invoices are a separate finance stream. Networks earn configured advertiser funding fees and can request settlement above their threshold; platform administrators approve/reject and record those payments. Keep this in network finance with contextual links, not mixed into publisher campaign commissions.

## Proposed workspace structure

Use a persistent campaign header with campaign name, advertiser/network identity, currency, dates, configured status and permission-appropriate actions. Beneath it, show operational blockers or next steps. Keep the campaign context when opening details or returning from broader finance screens.

Use one primary navigation level with seven areas. On smaller screens, adapt the navigation and tables without hiding status explanations or monetary scope.

| Area | Main contents | Primary actions |
| --- | --- | --- |
| Overview | Readiness summary, important blockers, key performance, spending/funding context and work awaiting action. | Continue setup, add an offer, review relevant work or get the publisher’s link. |
| Offers and materials | Offer list, commercial terms, landing pages, status, attribution settings and material library. | Create/edit offer, activate/deactivate, preview/upload materials. |
| Publishers | Pending applications, active assignments, rejected applications, terms acceptance and assignment performance. | Authorized approval/rejection; publisher application and own assignment view. |
| Tracking and integration | Links, QR codes, embed assets, attribution rules, merchant instructions and verification evidence. | Copy link/tag, download guide/QR, inspect integration steps. |
| Analytics | Defined KPIs, daily trends, offer/publisher comparisons and drill-downs. | Filter results and inspect outcomes; future breakdowns clearly scoped. |
| Finance | Campaign earnings, review queue, adjustments and related invoice lines; shared advertiser funding context for authorized roles. | Review, adjust, request payout or open full invoice according to permission. |
| Settings | Campaign details, dates, limits, targeting, goals, capacity, tags and terms. | Save changes and understand operational effects. |

For publishers, default the workspace to their own assignment. Their most prominent actions are “Copy tracking link,” “Get materials” and “View earnings.” Financial totals and performance should describe their results, not the whole campaign or other publishers.

For advertisers, emphasize launch setup, integration, campaign performance and available advertiser funds. For operators, emphasize pending applications, review work, payout blockers and exceptions. These can be different Overview compositions within the same navigation system.

Use an outcome detail drawer/page to connect event reference, offer, publisher, click/referral, event time, sale basis, agreed rate, commission, financial status, adjustments and invoice. This is a proposed unifying interface over currently separate records.

## Critical journeys to prototype

1. **Create and launch:** advertiser creates an unfunded campaign, adds a valid offer and materials, publisher applies, operator approves, funding is recorded, merchant integration produces one test outcome and the workspace identifies pending financial review.
2. **Start promoting:** publisher discovers the offer, accepts terms, applies, waits for review, receives access to the correct link/QR/materials and sees initial traffic.
3. **Resolve changed terms:** operator attempts approval after terms change; the publisher sees why renewed acceptance is required and how to complete it.
4. **Explain a conversion:** user moves from a performance figure to the underlying outcome and can distinguish merchant confirmation from financial approval and payment.
5. **Request and settle payout:** publisher sees threshold/recovery eligibility, requests an invoice, operator approves and records payment, publisher sees evidence and status.
6. **Handle a refund:** operator selects an earning, enters refunded sale value, reviews commission impact and resolves an invoice lock or post-payment recovery when required.
7. **Recover blocked traffic:** user sees whether the blocker is funds, daily cap, dates, assignment status, targeting or integration and can reach the responsible action.

## States and interaction requirements

| Situation | Required treatment |
| --- | --- |
| New campaign | Explain the next setup task; do not fill empty charts with invented data. |
| No offers, publishers, materials or earnings | Give each empty state its own relevant action and explanation. |
| Active but not ready | Show the specific operational blocker separately from configured status. |
| Traffic but no approved conversions | Distinguish no confirmed outcomes, outcomes awaiting review and reversed/rejected outcomes. |
| Missing funds or exhausted caps | Identify shared advertiser balance versus campaign total limit versus UTC daily cap. |
| Pending/rejected application | Show review status, rejection reason where available and the supported reapplication path. |
| Changed terms or full campaign | Explain the approval blocker before users retry the same action. |
| Failed or duplicate event | Treat unchanged replay as success; distinguish conflicting replay and invalid/expired attribution. A historical error console needs new instrumentation. |
| Payout below threshold | Show available net amount, required threshold, remaining amount and currency. |
| Locked earning or refund recovery | Explain the invoice dependency and the authorized next action. |
| Multi-campaign invoice | Label campaign subtotal and full invoice total separately. |
| Forbidden action | Respect server permissions; show useful read-only context without presenting inaccessible finance controls. |
| Stale status during an action | Refresh state and explain what changed; preserve user-entered reasons where safe. |
| Loading, empty and unavailable data | Use distinct states; unavailable must not look like a genuine zero. |

Use explicit object labels such as “Application pending,” “Commission pending review” and “Invoice awaiting approval.” Avoid a single ambiguous “Pending” badge across these objects.

Pair status colors with text/icons. Support keyboard navigation, visible focus, accessible chart alternatives, readable amounts, localization, long names and responsive layouts. Retain existing language and appearance preferences. Show currency codes where ambiguity is possible and explain UTC daily boundaries.

Use confirmations for consequential financial operations, with amount, currency, affected records and required reason/evidence. Preserve entered form data after validation errors. Do not introduce routine approval dialogs for ordinary navigation or copying links.

## Scope and engineering dependencies

| Scope | Capabilities |
| --- | --- |
| Existing functions to consolidate | Campaign and offer forms; materials; application review and terms acceptance; publisher links/QR/scripts; dashboards; financial review/adjustments; invoice requests, approvals, payment recording and CSV export. |
| Existing data requiring new workspace queries/UI | Campaign-wide analytics and finance views; offer/publisher comparisons; conversion-to-invoice drill-down; campaign subtotal within a multi-campaign invoice; combined enrollment/finance history. |
| New functionality needing specification | Automated readiness and integration health checks; persisted integration error history; arbitrary reporting dates/comparisons; placement/device/source reports; analytics exports; credential management UI; alerts and new notifications. |
| Implementation gaps affecting design | Trusted country detection; two-rule offer editor versus single-rule enrollment; offer minimum payout versus publisher threshold; full publisher embeds for video/HTML/email. |
| Outside the current functional scope | Payable CPC, automatic bonus payouts, automated bank/provider transfers, recurring payout guarantees, multi-currency conversion, built-in Shopify/WooCommerce plugins, hosted lead forms/CRM, full dispute conversation workflows and multi-touch attribution. |

Dispute models and an administrator dashboard summary exist, but there is no complete routed dispute-management workflow to present as a finished feature. Similarly, avoid promising scheduled payouts, guaranteed payment arrival dates or a financial approval SLA without a separately agreed operating policy.

## Design deliverables and acceptance criteria

Deliver the information architecture, role-specific wireframes, high-fidelity desktop layouts, responsive examples, a component/state specification and clickable prototypes for the critical journeys. Annotate which screens consolidate existing functionality and which require new engineering.

Include populated, empty, loading, blocked and restricted versions of the main screens. Use realistic examples for a submission offer, percentage purchase offer and fixed action offer, including partial refunds, a threshold blocker and an invoice covering two campaigns.

The design is successful when a user can:

- Identify the current campaign, offer, publisher scope and currency without navigating away.
- Explain why a campaign can or cannot receive traffic and payable outcomes.
- Obtain the correct publisher attribution link without confusing it with a generic landing page or secret credential.
- Distinguish recorded traffic, merchant-confirmed outcomes, approved performance and paid earnings.
- Understand the difference between a campaign spending cap and shared advertiser funds.
- Follow an earning from business outcome through adjustments to its invoice and payment evidence.
- Understand payout ineligibility and the specific next action.
- Complete their authorized work without repeatedly losing campaign context.

## Implementation reference index

Repository paths below identify the source areas for engineering handoff. The public guides cover merchant implementation details; this brief is internal design documentation and is not added to the public guide catalog.

| Subject | Repository references |
| --- | --- |
| Campaign behavior and setup | [docs/campaign-setup.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/docs/campaign-setup.md); [app/Http/Controllers/Campaigns/AdvertiserCampaignController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Campaigns/AdvertiserCampaignController.php); [resources/js/components/campaign-form.tsx](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/resources/js/components/campaign-form.tsx) |
| Offer management | [app/Http/Controllers/Offers/OffersController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Offers/OffersController.php); [resources/js/pages/advertisercampaigns/offers/](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/resources/js/pages/advertisercampaigns/offers) |
| Enrollment and permissions | [app/Services/PartnerEnrollmentService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/PartnerEnrollmentService.php); [app/Http/Controllers/Applications/PublisherApplicationController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Applications/PublisherApplicationController.php); [routes/advertisers.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/routes/advertisers.php); [routes/networks.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/routes/networks.php); [routes/publisher.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/routes/publisher.php) |
| Materials and publisher assets | [app/Http/Controllers/Creatives/CreativesController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Creatives/CreativesController.php); [app/Models/PublisherCampaigns.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Models/PublisherCampaigns.php); [app/Http/Controllers/Campaigns/PublisherCampaignController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Campaigns/PublisherCampaignController.php) |
| Tracking and eligibility | [app/Http/Controllers/Tracking/TrackingController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Tracking/TrackingController.php); [app/Http/Controllers/Tracking/PublisherScriptController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Tracking/PublisherScriptController.php); [app/Models/Clicks.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Models/Clicks.php); [app/Support/ConversionEligibility.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Support/ConversionEligibility.php); [app/Support/PublisherAttribution.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Support/PublisherAttribution.php) |
| Integration contract | [docs/api-reference.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/docs/api-reference.md); [docs/form-campaigns.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/docs/form-campaigns.md); [docs/checkout-campaigns.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/docs/checkout-campaigns.md); [docs/click-campaigns.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/docs/click-campaigns.md); [app/Services/ConversionEventService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/ConversionEventService.php) |
| Reporting definitions | [README.md](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/README.md); [app/Services/PartnerReportingService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/PartnerReportingService.php); [app/Services/DashboardRevenueService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/DashboardRevenueService.php); [app/Http/Controllers/Dashboard/](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Dashboard) |
| Commission and funding | [app/Services/CommissionService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/CommissionService.php); [app/Services/Finance/FundingService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/Finance/FundingService.php); [app/Services/Finance/EarningReviewService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/Finance/EarningReviewService.php); [app/Http/Controllers/Admin/FinanceController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Admin/FinanceController.php) |
| Payouts and network settlement | [app/Services/InvoiceService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/InvoiceService.php); [app/Services/Finance/NetworkSettlementService.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Services/Finance/NetworkSettlementService.php); [app/Http/Controllers/Publisher/PublisherInvoiceController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Publisher/PublisherInvoiceController.php); [app/Http/Controllers/Admin/AdminInvoiceController.php](/Users/geoffstuff/Desktop/Code/laravel/dmhub-affiliate-nl/app/Http/Controllers/Admin/AdminInvoiceController.php) |
