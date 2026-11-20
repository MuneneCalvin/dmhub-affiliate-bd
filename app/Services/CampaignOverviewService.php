<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Network;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Services\Finance\LedgerService;
use App\Support\ConversionMoney;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class CampaignOverviewService
{
    /** Call only after the controller has authorized the campaign/assignment. */
    public function build(Campaign $campaign, User $user, ?PublisherCampaigns $assignment = null): array
    {
        $now = CarbonImmutable::now('UTC');
        $start = $now->startOfDay()->subDays(29);
        $end = $now->endOfDay();
        $publisherView = $assignment !== null;
        $advertiser = $campaign->advertiser;
        $network = Network::find($campaign->network_id);
        $assignments = DB::table('publisher_campaigns')->where('publisher_campaigns.campaign_id', $campaign->id)
            ->when($assignment, fn ($q) => $q->where('publisher_campaigns.id', $assignment->id));
        $ids = (clone $assignments)->select('publisher_campaigns.id');
        $earnings = DB::table('publisher_earnings')->whereIn('publisher_campaign_id', $ids);
        $facts = DB::query()->fromSub(app(PartnerReportingService::class)->facts($assignments), 'facts')
            ->where('currency', $campaign->currency)
            ->whereBetween('conversion_date', [$start->toDateString(), $end->toDateString()]);
        $totals = (clone $facts)->selectRaw('COUNT(*) as conversions, COALESCE(SUM(sale_amount), 0) as sales, COALESCE(SUM(commission_amount), 0) as commissions')->first();
        $daily = (clone $facts)->selectRaw('conversion_date, COUNT(*) as conversions')->groupBy('conversion_date')->pluck('conversions', 'conversion_date');
        $dailyUsage = ConversionMoney::cents(DB::table('publisher_earnings')
            ->whereIn('publisher_campaign_id', DB::table('publisher_campaigns')->where('campaign_id', $campaign->id)->select('id'))
            ->where('created_at', '>=', $now->startOfDay())->sum('amount'));
        $available = min(ConversionMoney::signedCents($advertiser->available_budget),
            app(LedgerService::class)->balance($campaign->network_id, $campaign->currency, 'advertiser', $campaign->advertiser_id));
        $totalLimit = ConversionMoney::cents($campaign->total_budget);
        $dailyLimit = ConversionMoney::cents($campaign->daily_budget);
        $spent = ConversionMoney::cents($campaign->spent_amount);
        $activeOffers = $campaign->offers()->where('offer_status', 'A')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now))->count();
        $alerts = [];
        $add = function (string $code, string $title, string $description, string $tab = 'settings', string $action = 'Review settings', bool $blocks = true, array $values = []) use (&$alerts) {
            $alerts[] = compact('code', 'title', 'description', 'tab', 'action', 'blocks', 'values');
        };
        if ($dailyLimit > 0 && $dailyUsage >= $dailyLimit) {
            $add('daily_cap', 'Traffic paused: daily commission cap reached',
                $publisherView ? 'Traffic is paused until the daily cap resets at 00:00 UTC.' : '{{amount}} used today. Resets at 00:00 UTC.',
                $publisherView ? 'tracking' : 'settings', $publisherView ? 'View tracking' : 'Review limits', true,
                $publisherView ? [] : ['amount' => $campaign->currency.' '.number_format($dailyUsage / 100, 2)]);
        }
        if ($totalLimit > 0 && $spent >= $totalLimit) {
            $add('total_cap', 'Traffic paused: campaign commission limit reached', 'The campaign spending limit has been reached. The advertiser must review the limit before traffic can resume.', 'settings', 'Review limits');
        }
        if ($network?->requires_prepaid_funding && $available <= 0) {
            $add('funding', 'Traffic paused: advertiser funds unavailable', 'The advertiser needs available, ledger-backed funds in the campaign currency before traffic can resume.', 'finance', $publisherView ? 'View earnings' : 'Review funding');
        }
        if (! $network?->requires_prepaid_funding
            && $available + ConversionMoney::cents($advertiser->credit_limit ?? '0.00') <= 0) {
            $add('credit_limit', 'Traffic paused: advertiser credit limit reached', 'The advertiser must reduce the outstanding balance or ask the network to increase the credit limit.', 'finance', $publisherView ? 'View earnings' : 'Review funding');
        }
        if ($campaign->campaign_status !== 'A') {
            $add('inactive', 'Traffic paused: campaign is not active', 'The campaign must be activated before it can receive traffic.');
        }
        if ($campaign->start_date?->gt($now)) {
            $add('scheduled', 'Campaign has not started', 'Traffic becomes eligible when the campaign starts on {{date}} UTC.', 'settings', 'View dates', true, ['date' => $campaign->start_date->utc()->format('j M Y H:i')]);
        }
        if ($campaign->end_date?->lt($now)) {
            $add('ended', 'Traffic paused: campaign has ended', 'The campaign end date has passed. Review the campaign dates before resuming traffic.', 'settings', 'View dates');
        }
        if (! $activeOffers) {
            $add('offers', 'Setup needed: no active offers', 'Add or activate an offer with valid dates before publishers can promote this campaign.', 'offers', 'Review offers');
        }
        if ($network?->status !== 'A' || $advertiser->status !== 'A' || $advertiser->user?->status !== 'A'
            || $advertiser->user?->closed_at !== null || ! $advertiser->user?->hasVerifiedEmail()
            || (int) $advertiser->network_id !== (int) $campaign->network_id) {
            $add('account', 'Traffic paused: account setup needs attention', 'The network and advertiser accounts must be active and the advertiser email verified.', 'settings', 'Review account');
        }
        if ($assignment) {
            $offer = $assignment->offer;
            if ($assignment->status !== 'A' || $assignment->terminated_at) {
                $add('assignment', match ($assignment->status) {
                    'P' => 'Application pending review', 'R' => 'Application rejected', default => 'Your assignment is inactive',
                }, $assignment->rejection_reason ?: 'Your assignment must be approved and active before you can promote this campaign.', 'assignment', 'View assignment');
            }
            if ($offer && ($offer->offer_status !== 'A' || $offer->expires_at?->lt($now))) {
                $add('offer_unavailable', 'Traffic paused: your offer is unavailable', 'Your assigned offer is inactive or has expired. Contact your network before sending more traffic.', 'offers', 'View offer');
            }
            $publisher = $assignment->publisher;
            if ($publisher->user?->status !== 'A' || $publisher->user?->closed_at !== null || ! $publisher->user?->hasVerifiedEmail()
                || (int) $publisher->network_id !== (int) $assignment->network_id
                || (int) $assignment->network_id !== (int) $campaign->network_id
                || ($offer && ((int) $offer->campaign_id !== (int) $campaign->id || (int) $offer->network_id !== (int) $campaign->network_id))) {
                $add('publisher_account', 'Traffic paused: publisher account needs attention', 'Verify your email and contact your network to check your account and assignment.', 'assignment', 'View assignment');
            }
            if ($assignment->status === 'A' && (! $offer || ! $assignment->tracking_link)) {
                $add('tracking', 'Tracking link is not ready', 'Your network must finish configuring your offer and tracking link.', 'tracking', 'View tracking');
            }
            if ($assignment->status === 'P' && $assignment->requested_offer_id) {
                $requested = $campaign->offers()->find($assignment->requested_offer_id);
                $enrollment = app(PartnerEnrollmentService::class);
                if ($requested && (! $assignment->terms_accepted_at || $assignment->terms_version !== $enrollment->version($enrollment->contract($campaign, $requested)))) {
                    $add('terms', 'Updated terms need your acceptance', 'Accept the current campaign terms and commission before your application can be approved.', 'assignment', 'Review terms');
                }
            }
        } elseif (! (clone $assignments)->where('status', 'A')->whereNull('terminated_at')->exists()) {
            $add('publishers', 'Setup needed: no active publishers', 'Approve a publisher application to start receiving attributed traffic.', 'publishers', 'Review applications');
        } elseif (! (clone $assignments)
            ->join('publishers as p', 'p.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users as u', 'u.id', '=', 'p.user_id')
            ->join('offers as o', 'o.id', '=', 'publisher_campaigns.offer_id')
            ->where('publisher_campaigns.status', 'A')->whereNull('publisher_campaigns.terminated_at')
            ->where('publisher_campaigns.network_id', $campaign->network_id)
            ->whereNotNull('publisher_campaigns.tracking_link')->where('publisher_campaigns.tracking_link', '!=', '')
            ->where('p.network_id', $campaign->network_id)->where('u.status', 'A')
            ->whereNotNull('u.email_verified_at')->whereNull('u.closed_at')
            ->where('o.campaign_id', $campaign->id)->where('o.network_id', $campaign->network_id)->where('o.offer_status', 'A')
            ->where(fn ($q) => $q->whereNull('o.expires_at')->orWhere('o.expires_at', '>=', $now))->exists()) {
            $add('publisher_readiness', 'Traffic paused: no eligible publisher assignments', 'Check publisher accounts, email verification, assigned offers and tracking links before sending traffic.', 'publishers', 'Review publishers');
        }
        $legacy = (clone $earnings)->whereNull('ledger_transaction_id')->whereNotIn('status', ['rejected', 'reversed'])->count();
        if ($legacy) {
            $add('reconciliation', 'Commissions require reconciliation', 'Some historical commissions are not ledger-backed and cannot be settled until an operator reconciles them.', 'finance', 'Open finance', false);
        }
        if ($assignment) {
            $publisherBalance = app(LedgerService::class)->balance($assignment->network_id, $campaign->currency, 'publisher_available', $assignment->publisher_id);
            $threshold = ConversionMoney::cents($assignment->publisher->payout_threshold ?? '0');
            if ($publisherBalance < 0) {
                $add('recovery', 'Payout paused: outstanding recovery', 'Your account has {{amount}} in recoveries in this network and currency, across all campaigns. Future earnings offset this before a new payout.', 'finance', 'View earnings', false,
                    ['amount' => $campaign->currency.' '.number_format(abs($publisherBalance) / 100, 2)]);
            } elseif ($publisherBalance > 0 && $publisherBalance < $threshold) {
                $add('threshold', 'Payout threshold not yet reached', 'Your account has {{available}} available across campaigns in this network. The payout threshold is {{threshold}}; {{remaining}} more is needed.', 'finance', 'View earnings', false,
                    ['available' => $campaign->currency.' '.number_format($publisherBalance / 100, 2), 'threshold' => $campaign->currency.' '.number_format($threshold / 100, 2), 'remaining' => $campaign->currency.' '.number_format(($threshold - $publisherBalance) / 100, 2)]);
            }
        }
        // Manager-only settings have no place in the publisher navigation.
        if ($publisherView) {
            foreach ($alerts as &$alert) {
                if ($alert['tab'] === 'settings') {
                    $alert['tab'] = 'assignment';
                    $alert['action'] = 'View assignment';
                }
            }
            unset($alert);
        }
        $invoices = DB::table('publisher_invoices')->whereIn('id', (clone $earnings)->whereNotNull('invoice_id')->select('invoice_id'));
        $pending = (clone $earnings)->where('status', 'pending')->count();
        $applications = $publisherView ? 0 : (clone $assignments)->where('status', 'P')->count();
        $latest = (clone $earnings)->orderByDesc('updated_at')->orderByDesc('id')->first(['status', 'amount', 'reversed_minor', 'currency', 'updated_at']);
        $operator = $user->is_super_admin || $user->is_network;
        $can = fn (string $permission) => $user->is_super_admin || $user->permissionNames()->contains($permission);
        $tools = [];
        if (! $publisherView) {
            if (($operator && $can('view_advertisers')) || (! $operator && $advertiser->user_id === $user->id && $can('access_advertiser_dashboard'))) {
                $tools['advertiser'] = ['href' => route('advertisers.show', $advertiser->user_id), 'label' => 'View account'];
            }
            if ($can('manage_campaigns')) {
                $tools['settings'] = ['href' => route('advertiser.campaign.edit', $campaign->id), 'label' => 'Edit campaign settings'];
            }
            if ($can('create_offers')) {
                $tools['offers'] = ['href' => route('advertiser.offers.index', $campaign->id), 'label' => 'Manage offers'];
            }
            if ($operator && $can('review_applications')) {
                $tools['publishers'] = ['href' => route('applications.index'), 'label' => 'Open application review'];
            }
            if ($operator && $can('review_commissions')) {
                $tools['finance'] = ['href' => route('finance.index'), 'label' => 'Open commission review'];
            }
        } else {
            if (! $operator && $user->is_publisher && $user->publisher?->id === $assignment->publisher_id && $can('access_publisher_dashboard')) {
                $tools['publisher'] = ['href' => route('publishers.show', $assignment->publisher_id), 'label' => 'My publisher account'];
            }
            if ($can('view_earnings') && $user->publisher?->id === $assignment->publisher_id) {
                $tools['finance'] = ['href' => route('publisher.earnings'), 'label' => 'View my earnings'];
            }
            if ($can('view_embeded_scripts') && $assignment->status === 'A') {
                $tools['tracking'] = ['href' => route('publisher.scripts.show', $assignment->id), 'label' => 'Open tracking tools'];
            }
            if ($can('apply_to_campaigns') && in_array($assignment->status, ['P', 'R'], true)) {
                $tools['assignment'] = ['href' => route('publishers.campaign.application', $campaign->id), 'label' => 'Review application and terms'];
            }
        }

        return [
            'publisher_view' => $publisherView,
            'role' => $publisherView ? 'Publisher' : ($user->is_super_admin ? 'Administrator' : ($user->is_network ? 'Network operator' : 'Advertiser')),
            'campaign' => ['id' => $campaign->id, 'name' => $campaign->name, 'status' => $campaign->campaign_status,
                'advertiser' => $advertiser->business_name, 'network' => $network?->network_name,
                'currency' => $campaign->currency, 'start_date' => $campaign->start_date?->toISOString(), 'end_date' => $campaign->end_date?->year >= 2100 ? null : $campaign->end_date?->toISOString()],
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'configured' => $activeOffers > 0 && (! $assignment || ($assignment->offer_id && $assignment->tracking_link)),
            'traffic_eligible' => ! collect($alerts)->contains('blocks', true),
            'alerts' => $alerts,
            'metrics' => ['clicks' => DB::table('clicks')->whereIn('publisher_campaign_id', $ids)->whereBetween('clicked_at', [$start, $end])->count(),
                'conversions' => (int) $totals->conversions, 'sales' => round((float) $totals->sales, 2), 'commissions' => round((float) $totals->commissions, 2)],
            'lifecycle' => ['confirmed' => DB::table('conversions')->whereIn('publisher_campaign_id', $ids)->whereNotNull('conversion_event_id')->count(),
                'pending' => $pending,
                'invoiced' => (clone $invoices)->whereIn('status', ['pending', 'approved', 'paid'])->count(),
                'paid' => (clone $invoices)->where('status', 'paid')->count()],
            'applications' => $applications,
            'days' => collect(range(0, 29))->map(fn ($offset) => ['date' => $start->addDays($offset)->toDateString(), 'conversions' => (int) ($daily[$start->addDays($offset)->toDateString()] ?? 0)])->all(),
            'budget' => $publisherView ? null : ['spent' => $spent / 100, 'total_limit' => $totalLimit / 100, 'daily_usage' => $dailyUsage / 100,
                'daily_limit' => $dailyLimit / 100, 'available' => $available / 100],
            'earnings' => $publisherView ? ['pending' => $this->netAmount($earnings, ['pending']), 'approved' => $this->netAmount($earnings, ['approved']), 'paid' => $this->netAmount($earnings, ['paid'])] : null,
            'assignment' => $assignment ? ['id' => $assignment->id, 'status' => $assignment->status, 'offer' => $assignment->offer?->name,
                'commission_type' => $assignment->commission_type, 'commission_value' => $assignment->commission_value,
                'tracking_link' => $assignment->status === 'A' && ! $assignment->terminated_at && $assignment->tracking_link && $assignment->extractTrackingId()
                    ? url('/t/'.$assignment->extractTrackingId()) : null] : null,
            'activity' => $latest ? ['status' => $latest->status, 'amount' => round((float) $latest->amount - $latest->reversed_minor / 100, 2), 'currency' => $latest->currency, 'at' => $latest->updated_at] : null,
            'tools' => $tools,
        ];
    }

    private function netAmount($query, array $statuses): float
    {
        return round((float) (clone $query)->whereNotNull('ledger_transaction_id')->whereIn('status', $statuses)
            ->selectRaw('COALESCE(SUM(amount - reversed_minor / 100.0), 0) as total')->value('total'), 2);
    }
}
