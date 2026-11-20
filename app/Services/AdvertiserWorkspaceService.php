<?php

namespace App\Services;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignTerms;
use App\Models\Creative;
use App\Models\User;
use App\Support\Tenancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdvertiserWorkspaceService
{
    public function find(User $user, int $userId): Advertiser
    {
        abort_unless($user->status === 'A' && $user->closed_at === null, 403);
        $query = Advertiser::where('user_id', $userId);
        if ($user->is_super_admin) {
            return $query->firstOrFail();
        }
        if ($user->is_network) {
            abort_unless($user->permissionNames()->contains('view_advertisers'), 403);
            abort_unless($user->userNetworks()->whereHas('network', fn ($q) => $q->where('status', 'A'))->exists(), 403);

            return $query->where('network_id', $user->networkId())->firstOrFail();
        }
        abort_unless($user->is_advertiser && $user->permissionNames()->contains('access_advertiser_dashboard'), 403);

        return $query->where('user_id', $user->id)->firstOrFail();
    }

    public function permissions(User $user, Advertiser $advertiser): array
    {
        $grants = $user->permissionNames();
        $has = fn (string $permission) => $user->is_super_admin || $grants->contains($permission);
        $operator = $user->is_super_admin || $user->is_network;
        $owner = ! $operator && $user->is_advertiser && $advertiser->user_id === $user->id;

        return [
            'editProfile' => $owner || ($operator && $has('manage_advertisers')),
            'campaigns' => $has('view_campaigns'),
            'createCampaign' => $has('create_campaigns') && $advertiser->status === 'A' && $advertiser->network_id !== null && $advertiser->user?->status === 'A',
            'materials' => $has('manage_creatives'),
            'terms' => $has('view_campaigns'),
            'manageTerms' => $owner && $has('manage_campaigns'),
            'funding' => $has('view_financial_ledger') || ($owner && $has('view_advertiser_reports')),
            'recordFunding' => (bool) $user->is_super_admin && $advertiser->network_id !== null,
            'settings' => $operator && ($has('manage_advertisers') || $has('approve_advertisers')),
            'edit' => $operator && $has('manage_advertisers'),
            'activate' => $operator && $has('approve_advertisers'),
            'deactivate' => $operator && $has('manage_advertisers'),
            'changeNetwork' => (bool) $user->is_super_admin,
            'directory' => $operator && $has('view_advertisers'),
        ];
    }

    public function build(Advertiser $advertiser, Request $request): array
    {
        $user = $request->user();
        $permissions = $this->permissions($user, $advertiser);
        $tabs = collect(['overview' => 'Overview', 'campaigns' => 'Campaigns', 'materials' => 'Materials',
            'terms' => 'Terms', 'funding' => 'Funding', 'account' => 'Account', 'settings' => 'Settings'])
            ->filter(fn ($label, $key) => in_array($key, ['overview', 'account']) || $permissions[$key])
            ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values();
        $tab = $request->query('tab', 'overview');
        abort_unless(is_string($tab) && $tabs->contains('key', $tab), 403);
        $campaigns = Tenancy::campaigns(Campaign::query(), $user)->where('advertiser_id', $advertiser->id);
        $funding = DB::table('ledger_entries')->join('financial_transactions', 'financial_transactions.id', '=', 'ledger_entries.transaction_id')
            ->where('ledger_entries.account', 'advertiser')->where('ledger_entries.owner_id', $advertiser->id)
            ->where('ledger_entries.network_id', $advertiser->network_id)->where('ledger_entries.currency', $advertiser->currency)
            ->whereIn('financial_transactions.kind', ['funding', 'funding_refund']);

        return [
            'tabs' => $tabs,
            'activeTab' => $tab,
            'permissions' => $permissions,
            'role' => $user->is_super_admin ? 'Platform administrator' : ($user->is_network ? 'Network operator' : 'Advertiser'),
            'summary' => [
                'campaigns' => $permissions['campaigns'] ? (clone $campaigns)->count() : null,
                'activeCampaigns' => $permissions['campaigns'] ? (clone $campaigns)->where('campaign_status', 'A')->count() : null,
                'available' => $permissions['funding'] ? $advertiser->available_budget : null,
                'netFunded' => $permissions['funding'] ? (clone $funding)->sum('ledger_entries.amount_minor') / 100 : null,
            ],
            'campaigns' => $tab === 'campaigns' ? (clone $campaigns)->latest('id')->paginate(15, [
                'id', 'name', 'campaign_status', 'currency', 'start_date', 'end_date',
            ])->withQueryString() : null,
            'materials' => $tab === 'materials' ? Creative::visibleTo($user)->whereIn('campaign_id', (clone $campaigns)->select('id'))
                ->with('campaign:id,name')->latest('id')->paginate(15, ['id', 'campaign_id', 'name', 'type', 'status'])->withQueryString() : null,
            'terms' => $tab === 'terms' ? CampaignTerms::where(fn ($q) => $q->whereNull('advertiser_id')->orWhere('advertiser_id', $advertiser->id))
                ->latest('id')->paginate(15, ['id', 'advertiser_id', 'description'])->withQueryString() : null,
            'funding' => $tab === 'funding' ? (clone $funding)->orderByDesc('financial_transactions.id')->paginate(15, [
                'financial_transactions.id', 'financial_transactions.kind', 'financial_transactions.reference',
                'financial_transactions.created_at', 'ledger_entries.currency', 'ledger_entries.amount_minor',
            ])->withQueryString() : null,
            'funded' => $permissions['settings'] && DB::table('ledger_entries')->where('account', 'advertiser')->where('owner_id', $advertiser->id)->exists(),
        ];
    }
}
