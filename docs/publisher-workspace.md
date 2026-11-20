# Publisher workspace

Open **Publishers → View details**, or **My publisher account** in the publisher navigation as a publisher. A publisher's campaign workspace also links back to their account workspace.

The existing `/publishers/show/{id}` URL uses the **publisher ID**, while the existing update endpoint uses the **user ID**. Tabs use `?tab=overview|campaigns|applications|tracking|earnings|invoices|sites|account|settings` and retain their context during pagination.

| Tab | Access and functions |
| --- | --- |
| Overview | Account readiness and profile. Campaign, application, performance and financial summaries follow their respective permissions. |
| Campaigns | Owners need `view_my_campaigns`; operators need `view_campaigns`. Opens the appropriate publisher assignment or campaign workspace. |
| Applications | Owners need `apply_to_campaigns` or `view_my_campaigns`; operators need `review_applications`. Includes pending requests without assigned offers and links to authorized application tools. |
| Tracking | Owners need `view_embeded_scripts`, or campaign access plus tracking permissions. Operators need `view_campaigns`. Active assignments link to script or campaign tracking tools; tokens are not returned by this workspace. |
| Earnings | Owners need `view_earnings`; operators need `view_financial_ledger` or `review_commissions`. Only recorded, ledger-backed commissions are included, net of reversals and separated by currency. |
| Invoices | Owners need `view_invoices`; operators need `view_network_invoices`. Links to role-appropriate invoice details. Owners with `request_payouts` can enter the existing payout workflow when the invoice service reports eligibility. |
| Sites & traffic | Website, business and self-reported audience details. Authorized operators can open the existing account editing functions. |
| Account | Contact preferences, verification and role information; authentication secrets are excluded. |
| Settings | Owners with `manage_publisher_account` can open profile/security settings. Operators with `manage_publishers` can edit; activation needs `approve_publishers`, deactivation needs `manage_publishers`. Network changes remain super-admin-only. |

Network staff need `view_publishers` and active membership; both the publisher and related records are restricted to their network. Owners need `access_publisher_dashboard` and can only enter their own workspace, including their own historical records across networks. Super admins retain cross-network authority. Hidden tabs are rejected server-side, including Inertia partial requests, and unauthorized data is omitted from response props.

Changing the preferred currency does not convert existing earnings. Payout eligibility and thresholds remain separate for each liable network and earning currency. Pending commissions do not imply available funds. The workspace uses the existing payout and invoice services without changing their financial rules.

Verification: `vendor/bin/pest tests/Feature/PublisherWorkspaceTest.php tests/Feature/PartnerWorkflowsTest.php tests/Feature/Security/RouteAuthorizationTest.php`.

## Editing cards

Editable cards expose a labeled pencil button that opens a focused dialog. Saves use card-specific PATCH endpoints and return to the current tab, with validation errors kept in the dialog. Cancel discards unsaved edits. Calculated financial and performance figures, verification indicators, and role flags are not directly editable. Profile email changes clear email verification.

Owners can edit profile/business details with `manage_publisher_account`, website/traffic with `manage_publisher_sites`, and payout preferences with `manage_payouts`. Operators need `manage_publishers`; activation separately requires `approve_publishers`. The controller rechecks ownership, active network membership, and current grants on every save.
