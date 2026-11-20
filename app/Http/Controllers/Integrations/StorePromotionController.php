<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\PromotionGrant;
use App\Services\Promotions\PromotionGrantService;
use App\Services\Promotions\PromotionOrderService;
use Illuminate\Http\Request;

class StorePromotionController extends Controller
{
    public function connect(Request $request)
    {
        $data = $request->validate(['domain' => 'required|string', 'currency' => 'required|string|size:3']);
        $store = $request->attributes->get('promotion_store');
        abort_unless($data['domain'] === $store->domain && $data['currency'] === $store->currency, 422, 'Store domain or currency does not match.');
        $store->update(['status' => 'connected', 'last_seen_at' => now()]);

        return response()->json(['connected' => true, 'store_id' => $store->public_id]);
    }

    public function grant(Request $request, PromotionGrantService $service)
    {
        $data = $request->validate(['referral_id' => 'required|uuid', 'session' => 'required|string|min:24|max:200']);

        return response()->json($service->payload($service->issue($request->attributes->get('promotion_store'), $data['referral_id'], $data['session'])))
            ->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, string $grant, PromotionGrantService $service)
    {
        abort_unless($request->attributes->get('promotion_store')->status === 'connected', 409);
        $data = $request->validate(['session' => 'required|string|min:24|max:200']);
        $g = PromotionGrant::whereKey($grant)->where('store_connection_id', $request->attributes->get('promotion_store')->id)->firstOrFail();
        abort_unless(hash_equals($g->session_hash, hash('sha256', $data['session'])), 404);
        abort_if($g->expires_at->isPast() || $g->redeemed_at, 422);

        return response()->json($service->payload($g))->header('Cache-Control', 'no-store');
    }

    public function order(Request $request, PromotionOrderService $service)
    {
        $order = $service->record($request->attributes->get('promotion_store'), $request->all());
        $service->confirm($order);

        return response()->json(['id' => $order->id, 'status' => $order->fresh()->status], 202);
    }

    public function adjustment(Request $request, PromotionOrderService $service)
    {
        $record = $service->adjustment($request->attributes->get('promotion_store'), $request->all());

        return response()->json(['id' => $record->id, 'status' => $record->status], 202);
    }
}
