<?php

namespace App\Http\Middleware;

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Support\SettingsSections;
use App\Support\Tenancy;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $networkBranding = $this->getNetworkBranding($request);
        $permissions = $request->user()?->permissionNames() ?? collect();

        return [
            ...parent::share($request),
            'name' => $networkBranding['network_name'] ?? config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'locale' => [
                'current' => App::getLocale(),
                'fallback' => config('app.fallback_locale'),
                'available' => config('app.available_locales'),
            ],
            'auth' => [
                'user' => $request->user()?->load(['notifications' => function ($query) {
                    $query->latest()->limit(20);
                }]),
                'permissions' => $permissions,
            ],
            // Sidebar badges. A count is null when the user may not see that page.
            'navCounts' => fn () => $request->user()
                ? $this->navCounts($request->user(), $permissions->all())
                : null,
            // Optional account settings sections (only resolved on settings pages).
            'settingsSections' => fn () => $request->user() && $request->routeIs('profile.*', 'settings.*', 'user-password.*', 'two-factor.*', 'appearance.*')
                ? SettingsSections::for($request->user())
                : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'store_setup' => fn () => $request->session()->get('store_setup'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'networkBranding' => $networkBranding,
        ];
    }

    /**
     * Counts for sidebar badges, scoped like the pages they link to.
     *
     * @param  array<int, string>  $permissions
     * @return array{pendingApplications: int|null, fraudFlags: int|null}
     */
    private function navCounts(User $user, array $permissions): array
    {
        $networkId = $user->is_super_admin ? null : $user->networkId();
        // Both pages sit behind ensure.network: super admins, or network members.
        $networkStaff = $user->is_super_admin || ($user->is_network && $networkId !== null);
        $can = fn (string $permission) => $user->is_super_admin || in_array($permission, $permissions, true);

        return [
            // Same scope as PublisherApplicationController@index with status "P".
            'pendingApplications' => $networkStaff && $can('review_applications')
                ? PublisherCampaigns::query()
                    ->whereIn('campaign_id', Tenancy::campaignIds($user))
                    ->when($networkId !== null, fn ($q) => $q->where('network_id', $networkId))
                    ->where('status', 'P')
                    ->count()
                : null,
            // Pending earnings whose latest fraud assessment asks for manual review
            // (FinanceController@index with fraud=manual_review).
            'fraudFlags' => $networkStaff && $can('review_commissions')
                ? PublisherEarning::query()
                    ->when($networkId !== null, fn ($q) => $q->where('network_id', $networkId))
                    ->where('status', 'pending')
                    ->whereHas('latestFraudAssessment', fn ($q) => $q->where('recommendation', 'manual_review')->where('status', 'completed'))
                    ->count()
                : null,
        ];
    }

    private function getNetworkBranding(Request $request): ?array
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        $networkId = null;

        // Check if user is linked via UserNetworks (network owners/staff)
        $userNetwork = UserNetworks::where('user_id', $user->id)->first();
        if ($userNetwork) {
            $networkId = $userNetwork->network_id;
        }

        if (! $networkId) {
            $publisher = Publisher::where('user_id', $user->id)
                ->whereNotNull('network_id')
                ->first();
            if ($publisher) {
                $networkId = $publisher->network_id;
            }
        }
        if (! $networkId) {
            $advertiser = Advertiser::where('user_id', $user->id)
                ->whereNotNull('network_id')
                ->first();
            if ($advertiser) {
                $networkId = $advertiser->network_id;
            }
        }
        if (! $networkId) {
            return null;
        }

        $network = Network::find($networkId);
        if (! $network) {
            return null;
        }

        return [
            'network_name' => $network->network_name,
            'logo_url' => $network->logo_url,
            'sidebar_logo_url' => $network->sidebar_logo_url,
            'favicon_url' => $network->favicon_url,
        ];
    }
}
