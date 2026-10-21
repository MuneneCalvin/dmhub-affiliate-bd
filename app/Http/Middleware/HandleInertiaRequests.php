<?php

namespace App\Http\Middleware;

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\UserNetworks;
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
                'permissions' => $request->user()?->permissionNames() ?? [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'networkBranding' => $networkBranding,
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
