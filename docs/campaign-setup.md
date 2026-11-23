# Set up a campaign

Configure the commercial agreement first. The tracking link, referral and confirmed event all depend on an active campaign, offer and approved publisher assignment.

## 1. Prepare the accounts and budget

Use active, email-verified advertiser and publisher accounts in the same active network. The publisher must be approved for the offer. Prepayment is optional by default. Administrators can enable **Require prepaid advertiser funds** on a network. Campaign spending limits still apply when confirming events.

## 2. Create the campaign

Open **My Campaigns → Create Campaigns** in the advertiser workspace. Advertiser accounts create campaigns for their signed-in profile automatically. A campaign manager creating on behalf of an advertiser must select that advertiser. You can create a campaign with a zero advertiser balance; traffic and compensation can proceed without prepayment unless the network requires prepaid funds.

1. Enter the campaign name, description, start date and end date (or the no-end-date option).
2. Select campaign terms and the advertiser's currency. Optionally set total and daily spending limits and any target conversions. Leave either budget blank (or set it to zero) for no limit of that kind; limits can be added or cleared later.
3. Configure device and country targeting only where needed, then save. Select a region or subregion to select all its available countries, then add or remove individual countries as needed. Partial regions show a mixed checkbox state. With no countries selected, all countries are allowed. Region membership follows [UN M49](https://unstats.un.org/unsd/methodology/m49/); the campaign stores the selected country codes, so targeting remains editable later.
4. Check that the campaign is active and today's date is inside its active period.

A target conversion count is a planning field; it does not replace the event integration. Daily budget accounting uses UTC. Budget availability and active dates can prevent conversion confirmation even when a tracking URL exists.

## 3. Add an offer

Open the campaign's **Offers** and create an offer. Set a real HTTPS landing-page URL in **Landing page URL**, an active status, the compensation options and the attribution windows.

| Outcome | Approved publisher compensation type | Event |
| --- | --- | --- |
| Accepted form submission | CPL | `submission` |
| Paid sale, percentage of reported amount | CPS or RevShare | `purchase` |
| Paid sale, fixed reward | Flat | `purchase` |
| Qualified action, fixed reward | CPA or Flat | `action` |
| Click measurement | Traffic reporting only | No `click` event is accepted |

Use a positive compensation value; percentage rates cannot exceed 100%. The **approved publisher assignment's** rate determines the compensation, not whichever offer rate appears first. Multiple offer rates are not automatically added together.

The click cookie lifetime controls how long a referral can be looked up or read by the browser SDK. The conversion window controls how long a confirmed event can be attributed. When unset, the code defaults to 168 hours and 720 hours respectively; explicitly configured values take precedence. Referral lookup uses the earlier expiry. Send confirmations promptly: an expired referral cannot be revived with a backdated timestamp.

## 4. Approve a publisher and copy the link

Have a publisher apply through the marketplace and approve the application through **Publisher Applications**, using an account with review permissions. Check the resulting assignment's active status and agreed compensation type/value.

The publisher can find their tracking link in **My Campaigns** and the token-specific script in **Embed Scripts**. Use the generated `/t/{trackingId}` link. Do not build a link from a campaign ID or share one publisher's link as another publisher's attribution.

If using creatives, use the publisher-scoped creative link. A creative code by itself does not identify the publisher.

## 5. Connect and verify

Follow [form campaigns](form-campaigns.md), [checkout campaigns](checkout-campaigns.md) or [clicks and actions](click-campaigns.md), then choose the relevant platform guide.

Open a fresh publisher link after changing compensation terms: each click snapshots its financial contract. Confirm one synthetic event, replay it unchanged and check that there is exactly one pending compensation. Test using a funded test advertiser and synthetic customer data; confirmations can consume real configured budget.

## Common setup blockers

- Inactive or unverified users, inactive networks, offers or publisher assignments.
- Dates outside the active period or an expired offer/referral.
- Missing funds in a network that requires prepayment, or exhausted total/daily budgets.
- A purchase sent against CPL, or a submission sent against CPS.
- A `traffic_source` not allowed by the offer, or a device outside targeting.
- Country targeting: the current click controller does not resolve a trusted country and rejects country-restricted traffic. Ask the operator to resolve that limitation before using geo restrictions; a visitor-supplied country parameter will not satisfy it.

Continue with [API & troubleshooting](api-reference.md).


## Working across accounts

The account menu shows the signed-in identity and links to this guide. Advertisers manage their own campaigns; network operators review their network's campaigns and applications through **Campaign directory**; administrators can manage campaigns across networks. Campaign and offer actions appear only when the current account has permission.

Separate accounts do not share an identity switcher. Use a separate browser profile for each account when you need simultaneous advertiser, network and publisher sessions. Tabs in the same profile share a login: logging out or signing in changes that session for every tab. To use one profile, finish or save your work before choosing **Log out** and signing in to another account. Do not share credentials between people.

## Funding and integration handoff

Campaign total/daily budgets are spending caps, not deposits. **Advertiser funding** shows the current balance shared by all that advertiser's campaigns. A negative balance represents unpaid compensation. Deposits reduce this debt; payout processing still requires recorded cash. If your network requires prepayment, arrange verified funding before running traffic. The operator records evidence through **Financial review**; network fees reduce the available balance. Active status or a positive campaign budget does not prove that conversions are ready.

Give your merchant developer the campaign/offer IDs, approved publisher tracking link, embed tag, campaign currency and agreed compensation type/rate. The network operator supplies the advertiser-scoped credential directly to the server administrator using the [credential procedure](api-reference.md). Keep the credential on the merchant server; the publisher script token is public and is not that credential.

The merchant must preserve a valid referral, accept/save the intended form or verify a paid order, and confirm the event from its backend. Check one new conversion and replay it unchanged before launch. Loading the tag alone creates no earning.

## Optional terms while creating a campaign

Terms are optional. In the campaign wizard, **Manage terms in a new tab** lets an authorized advertiser or administrator add terms without navigating away from the draft. Save the new terms, return to the wizard, and select **Refresh terms** to update only the choices. Your entered campaign fields and current step are retained. Network reviewers can inspect terms but must ask the advertiser or administrator to change them.

## Optional funding and required credit limits

Networks allow traffic and compensation accrual without prepayment by default, within the advertiser’s required credit limit. A platform administrator can enable **Networks → Edit → Require prepaid advertiser funds** to require a positive, sufficient ledger balance.

Network operators with advertiser management permission must set **Advertiser → Settings → Advertiser credit limit** in the advertiser’s currency. This caps unpaid compensation across all of that advertiser’s campaigns. Every advertiser has a required credit limit, defaulting to zero (no borrowing). Blank or missing limits are rejected; there is no unlimited-credit setting. Assign a positive limit to allow unpaid compensation without prepaid funds. Deposits (net of fees) and compensation reversals restore credit. Campaign total and daily limits still apply independently. Reaching the credit limit pauses traffic and rejects additional compensation without partial writes. Lowering a limit below existing debt preserves recorded compensation and pauses new traffic until sufficient credit is available.

Compensation accrual records a negative advertiser balance when funds are owed. It does not create cash: publisher and network payouts still require sufficient recorded cash.
