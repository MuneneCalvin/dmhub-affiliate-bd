<?php

namespace App\Http\Controllers\Promotions;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CustomerPromotion;
use App\Models\Offer;
use App\Models\StoreConnection;
use App\Services\CampaignOffersService;
use App\Services\Promotions\PromotionConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerPromotionController extends Controller
{
    public function edit(Request $request, Campaign $campaign, CampaignOffersService $offers)
    {
        Campaign::visibleTo($request->user())->findOrFail($campaign->id);
        $offer = $request->filled('offer')
            ? $campaign->offers()->with('customerPromotion.stores')->findOrFail($request->integer('offer'))
            : null;

        return Inertia::render('advertisercampaigns/offers/promotions', [
            'campaign' => $campaign->only('id', 'name', 'currency'),
            'offer' => $offer ? [...$offer->only('id', 'name'), 'customer_promotion' => $offer->customerPromotion] : null,
            'stores' => $offers->stores($campaign),
        ]);
    }

    public function update(Request $request, Offer $offer)
    {
        Offer::visibleTo($request->user())->findOrFail($offer->id);
        $action = $request->validate(['action' => 'required|in:save,publish,pause'])['action'];
        if ($action === 'pause') {
            CustomerPromotion::where('offer_id', $offer->id)->update(['status' => 'paused']);

            return back()->with('success', 'Promotion paused. Existing grants remain valid until expiry.');
        }
        $input = $request->validate(['configuration' => 'required|array', 'store_ids' => 'present|array|max:20', 'store_ids.*' => 'integer|distinct']);
        $c = PromotionConfiguration::validate($input['configuration'], $offer->campaign->currency);
        $stores = StoreConnection::whereIn('id', $input['store_ids'])->where('advertiser_id', $offer->campaign->advertiser_id)
            ->where('network_id', $offer->network_id)->get();
        if ($stores->count() !== count($input['store_ids'])) {
            throw ValidationException::withMessages(['store_ids' => 'Choose stores available to this campaign.']);
        }
        if ($stores->count() > 1 && ($c['scope'] !== 'all' || count($c['excluded_product_ids']))) {
            throw ValidationException::withMessages(['stores' => 'Product and category IDs belong to a specific store. Select one store for these rules.']);
        }
        if ($action === 'publish') {
            Validator::make(['store_ids' => $input['store_ids']], ['store_ids' => 'required|array|min:1'])->validate();
            foreach ($stores as $store) {
                PromotionConfiguration::assertSupported($c, $store);
            }
        }
        DB::transaction(function () use ($offer, $request, $c, $stores, $action) {
            // Serialize first creation as well as version updates.
            Offer::whereKey($offer->id)->lockForUpdate()->firstOrFail();
            $p = CustomerPromotion::firstOrCreate(['offer_id' => $offer->id], ['draft' => $c, 'status' => 'draft']);
            $p->update(['draft' => $c]);
            // Store bindings belong to the published configuration; a draft must not change live eligibility.
            if ($action === 'publish') {
                $version = ($p->versions()->max('version') ?? 0) + 1;
                $p->versions()->create(['version' => $version, 'configuration' => $c, 'created_by' => $request->user()->id]);
                $p->stores()->sync($stores->modelKeys());
                $p->update(['published_version' => $version, 'status' => 'active']);
            }
            $draft = $p->draft;
            $draft['store_ids'] = $stores->modelKeys();
            $p->update(['draft' => $draft]);
        });

        return back()->with('success', $action === 'publish' ? 'Customer promotion published.' : 'Promotion draft saved.');
    }
}
