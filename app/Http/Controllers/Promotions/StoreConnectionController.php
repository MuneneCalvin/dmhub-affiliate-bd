<?php

namespace App\Http\Controllers\Promotions;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\StoreConnection;
use App\Support\PromotionIntegrationDownloads;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreConnectionController extends Controller
{
    public function store(Request $request, Campaign $campaign)
    {
        Campaign::visibleTo($request->user())->findOrFail($campaign->id);
        $data = $request->validate(['name' => 'required|string|max:120', 'platform' => 'required|in:woocommerce,shopify',
            'domain' => ['required', 'string', 'max:253', 'regex:/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/D']]);
        if ($data['platform'] === 'shopify') {
            $request->validate(['domain' => ['regex:/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/D']],
                ['domain.regex' => 'Use the myshopify.com store domain.']);
        }
        $request->validate(['domain' => 'unique:store_connections,domain']);
        $token = Str::random(64);
        $store = StoreConnection::create([...$data, 'public_id' => (string) Str::uuid(),
            'advertiser_id' => $campaign->advertiser_id, 'network_id' => $campaign->network_id,
            'currency' => $campaign->currency, 'token_hash' => $data['platform'] === 'woocommerce' ? hash('sha256', $token) : null]);

        return back()->with('store_setup', ['id' => $store->id, 'token' => $data['platform'] === 'woocommerce' ? $token : null,
            'api_url' => url('/api/v1/stores')])->with('success', 'Store created. Complete the connection before publishing.');
    }

    public function update(Request $request, Campaign $campaign, StoreConnection $store)
    {
        Campaign::visibleTo($request->user())->findOrFail($campaign->id);
        abort_unless($store->advertiser_id === $campaign->advertiser_id && $store->network_id === $campaign->network_id, 404);
        $action = $request->validate(['action' => 'required|in:rotate,disconnect'])['action'];
        if ($action === 'disconnect') {
            $store->update(['status' => 'disconnected', 'token_hash' => null, 'credentials' => null]);

            return back()->with('success', 'Store disconnected. Previously issued Shopify codes expire on their configured schedule.');
        }
        abort_unless($store->platform === 'woocommerce', 422);
        $token = Str::random(64);
        $store->update(['token_hash' => hash('sha256', $token), 'status' => 'pending']);

        return back()->with('store_setup', ['id' => $store->id, 'token' => $token, 'api_url' => url('/api/v1/stores')]);
    }

    public function download()
    {
        return PromotionIntegrationDownloads::download('woocommerce');
    }
}
