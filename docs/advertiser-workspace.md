# Advertiser workspace

Open **Advertisers → View details** to see the unified advertiser workspace. Advertisers can open **Partners → My advertiser account**. The advertiser name in an authorized campaign workspace links back to this view.

The existing `/advertisers/show/{id}` URL continues to use the advertiser's **user ID**. Tabs use `?tab=overview|campaigns|materials|terms|funding|account|settings` and support direct links and pagination.

| Tab | Access and functions |
| --- | --- |
| Overview | Business and account readiness; campaign counts and funding summaries only with their respective permissions. |
| Campaigns | `view_campaigns`; lists only this advertiser's campaigns, with links to offers, publishers, tracking, analytics, and finance. `create_campaigns` adds a creation link with the advertiser preselected when the account is eligible. |
| Materials | `manage_creatives`; scoped materials link to existing creative detail/edit tools. |
| Terms | `view_campaigns`; advertiser-specific and shared platform terms. Owners with `manage_campaigns` can open their terms editor. |
| Funding | Operators with `view_financial_ledger`, or the owner with `view_advertiser_reports`; shows available balance, net funding and paginated deposits/refunds. Only super admins can record funding for an account with a network. Existing funding validation, evidence, fees, and ledger rules apply. |
| Account | Contact information, preferences, verification and account roles. Authentication secrets are excluded. |
| Settings | Network staff/admins with `manage_advertisers` or `approve_advertisers`; editing, activation and deactivation each follow their existing permissions. Only super admins can change networks. Currency/network are locked after ledger activity. |

Network staff need `view_advertisers` and active network membership. Advertisers need `access_advertiser_dashboard` and can access only their own account. Publishers cannot enter this workspace. Super admins retain platform-wide authority. A hidden tab is also rejected server-side, including Inertia partial requests; unauthorized balances and related records are excluded from the response.

Campaign budgets remain separate from advertiser funding. Settings changes never credit the balance. Funding history shows amounts applied to the advertiser account after fees and excludes internal reconciliation evidence.

Verification: `vendor/bin/pest tests/Feature/AdvertiserWorkspaceTest.php tests/Feature/CampaignUxRegressionTest.php tests/Feature/CampaignOverviewTest.php`.

## Editing cards

Editable cards expose a labeled pencil button that opens a focused dialog. Saves use card-specific PATCH endpoints and return to the current tab, with validation errors kept in the dialog. Cancel discards unsaved edits. Calculated financial and performance figures, verification indicators, and role flags are not directly editable. Profile email changes clear email verification.

Business edits require `manage_advertisers`. Owners may edit their own profile. Account activation separately requires `approve_advertisers`; deactivation and publisher approval preferences require `manage_advertisers`. Card saves cannot change advertiser balance, currency, network, or unrelated settings.
