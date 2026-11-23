<?php

namespace App\Services;

use App\Models\Publisher;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublisherWorkspaceService
{
    public function find(User $user, int $id): Publisher
    {
        abort_unless($user->status === 'A' && $user->closed_at === null, 403);
        $query = Publisher::with(['user', 'network']);
        if ($user->is_super_admin) {
            return $query->findOrFail($id);
        }
        if ($user->is_network) {
            abort_unless($user->permissionNames()->contains('view_publishers'), 403);
            abort_unless($user->userNetworks()->whereHas('network', fn ($q) => $q->where('status', 'A'))->exists(), 403);

            return $query->where('network_id', $user->networkId())->findOrFail($id);
        }
        abort_unless($user->is_publisher && $user->permissionNames()->contains('access_publisher_dashboard'), 403);

        return $query->where('user_id', $user->id)->findOrFail($id);
    }

    public function permissions(User $user): array
    {
        $grants = $user->permissionNames();
        $has = fn ($name) => $user->is_super_admin || $grants->contains($name);
        $operator = $user->is_super_admin || $user->is_network;

        return [
            'owner' => ! $operator,
            'editProfile' => $has($operator ? 'manage_publishers' : 'manage_publisher_account'),
            'editSites' => $has($operator ? 'manage_publishers' : 'manage_publisher_sites'),
            'editPayout' => $has($operator ? 'manage_publishers' : 'manage_payouts'),
            'directory' => $operator && $has('view_publishers'),
            'campaigns' => $has($operator ? 'view_campaigns' : 'view_my_campaigns'),
            'applications' => $operator ? $has('review_applications') : ($has('apply_to_campaigns') || $has('view_my_campaigns')),
            'apply' => ! $operator && $has('apply_to_campaigns'),
            'discover' => ! $operator && $has('discover_campaigns'),
            'tracking' => $operator ? $has('view_campaigns') : ($has('view_embeded_scripts') || ($has('view_my_campaigns') && ($has('share_tracking_links') || $has('generate_tracking_links')))),
            'scripts' => ! $operator && $has('view_embeded_scripts'),
            'performance' => $operator ? ($has('view_network_analytics') || $has('view_network_reports')) : $has('view_conversions'),
            'earnings' => $operator ? ($has('view_financial_ledger') || $has('review_commissions')) : $has('view_earnings'),
            'invoices' => $has($operator ? 'view_network_invoices' : 'view_invoices'),
            'requestPayout' => ! $operator && $has('request_payouts') && $has('view_invoices'),
            'settings' => $operator ? ($has('manage_publishers') || $has('approve_publishers')) : $has('manage_publisher_account'),
            'edit' => $operator && $has('manage_publishers'),
            'activate' => $operator && $has('approve_publishers'),
            'deactivate' => $operator && $has('manage_publishers'),
            'changeNetwork' => (bool) $user->is_super_admin,
        ];
    }

    public function build(Publisher $publisher, Request $request): array
    {
        $user = $request->user();
        $can = $this->permissions($user);
        $tabs = collect(['overview' => 'Overview', 'campaigns' => 'Campaigns', 'applications' => 'Applications',
            'tracking' => 'Tracking', 'earnings' => 'Earnings', 'invoices' => 'Invoices',
            'sites' => 'Sites & traffic', 'account' => 'Account', 'settings' => 'Settings'])
            ->filter(fn ($label, $key) => in_array($key, ['overview', 'sites', 'account']) || $can[$key])
            ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values();
        $tab = $request->query('tab', 'overview');
        abort_unless(is_string($tab) && $tabs->contains('key', $tab), 403);
        $assignments = DB::table('publisher_campaigns')->where('publisher_campaigns.publisher_id', $publisher->id)
            ->when($user->is_network && ! $user->is_super_admin, fn ($q) => $q
                ->where('publisher_campaigns.network_id', $user->networkId())
                ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user)));
        $earnings = DB::table('publisher_earnings')->where('publisher_id', $publisher->id)
            ->when($user->is_network && ! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()));
        $invoices = DB::table('publisher_invoices')->where('publisher_id', $publisher->id)
            ->when($user->is_network && ! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()));
        $performance = $can['performance'] ? app(PartnerReportingService::class)->performance(clone $assignments) : null;
        $listing = null;
        if (in_array($tab, ['campaigns', 'applications', 'tracking'])) {
            $listing = (clone $assignments)->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
                ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
                ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
                ->when($tab !== 'applications', fn ($q) => $q->where('publisher_campaigns.status', 'A'))
                ->orderByDesc('publisher_campaigns.id')->paginate(15, [
                    'publisher_campaigns.id', 'publisher_campaigns.campaign_id', 'publisher_campaigns.status',
                    'publisher_campaigns.applied_at', 'campaigns.name as campaign_name', 'campaigns.currency',
                    'offers.name as offer_name', 'requested_offers.name as requested_offer_name',
                ])->withQueryString();
            $listing->through(function ($row) use ($can) {
                $row->campaign_href = $can['campaigns'] ? ($can['owner']
                    ? route('publishers.my.campaign.show', $row->id) : route('advertiser.campaign.show', $row->campaign_id)) : null;
                $row->application_href = $can['applications'] ? ($can['owner']
                    ? ($can['apply'] ? route('publishers.campaign.application', $row->campaign_id) : $row->campaign_href)
                    : route('applications.show', $row->id)) : null;
                $row->tracking_href = $can['tracking'] && $row->status === 'A'
                    ? ($can['scripts'] ? route('publisher.scripts.show', $row->id) : $row->campaign_href.'?tab=tracking') : null;

                return $row;
            });
        }
        $invoiceListing = $tab === 'invoices' ? (clone $invoices)->orderByDesc('id')->paginate(15, [
            'id', 'invoice_number', 'amount', 'currency', 'status', 'requested_at', 'paid_at',
        ])->withQueryString()->through(function ($row) use ($can) {
            $row->href = route($can['owner'] ? 'publisher.invoices.show' : 'admin.invoices.show', $row->id);

            return $row;
        }) : null;

        return [
            'tabs' => $tabs, 'activeTab' => $tab, 'permissions' => $can,
            'role' => $user->is_super_admin ? 'Platform administrator' : ($user->is_network ? 'Network operator' : 'Publisher'),
            'summary' => [
                'activeCampaigns' => $can['campaigns'] ? (clone $assignments)->where('status', 'A')->count() : null,
                'pendingApplications' => $can['applications'] ? (clone $assignments)->where('status', 'P')->count() : null,
                'clicks' => $performance?->total_clicks,
                'conversions' => $performance?->total_conversions,
            ],
            'earningsSummary' => $can['earnings'] ? (clone $earnings)->whereNotNull('ledger_transaction_id')
                ->selectRaw('currency, status, SUM(amount - reversed_minor / 100.0) as amount, COUNT(*) as count')
                ->groupBy('currency', 'status')->orderBy('currency')->orderBy('status')->get() : null,
            'assignments' => $listing,
            'earnings' => $tab === 'earnings' ? (clone $earnings)->whereNotNull('ledger_transaction_id')
                ->orderByDesc('id')->paginate(15, ['id', 'publisher_campaign_id', 'amount', 'reversed_minor', 'currency', 'status', 'created_at'])->withQueryString() : null,
            'invoices' => $invoiceListing,
            'payoutEligibility' => $tab === 'invoices' && $can['requestPayout'] ? app(InvoiceService::class)->canRequestInvoice($publisher) : null,
        ];
    }

    public function account(Publisher $publisher, array $can): array
    {
        $account = [
            ...$publisher->user->only(['first_name', 'last_name', 'email', 'user_name', 'title', 'status', 'currency',
                'country_iso', 'timezone', 'language', 'email_verified_at', 'two_factor_confirmed_at',
                'is_advertiser', 'is_publisher', 'is_super_admin']),
            ...$publisher->only(['publisher_type', 'business_name', 'industry', 'network_id', 'website_url', 'traffic_sources', 'monthly_visitors',
                'primary_verticals', 'secondary_verticals', 'coc_number', 'is_verified', 'verified_at', 'last_active_at']),
            'channels' => $publisher->channels->map->only(['type', 'handle'])->all(),
            'publisher_id' => $publisher->id, 'user_id' => $publisher->user_id,
            'network_name' => $publisher->network?->network_name,
            'publisher_created_at' => $publisher->created_at, 'publisher_updated_at' => $publisher->updated_at,
        ];
        if ($can['earnings'] || $can['invoices'] || $can['edit'] || $can['editPayout']) {
            $account['payout_threshold'] = $publisher->payout_threshold;
            $account['payout_method'] = $publisher->payout_method;
        }

        return $account;
    }
}
