<?php

namespace App\Http\Controllers\Offers;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\PublisherCampaigns;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OffersController extends Controller
{
    /**
     * Route-bound offers must belong to a campaign the user may access.
     */
    private function authorizeOffer(Offer $offer): Offer
    {
        abort_unless(
            Offer::visibleTo(auth()->user())->whereKey($offer->id)->exists(),
            403,
            'Unauthorized'
        );

        return $offer;
    }

    private function offerRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'commission_type_1' => 'nullable|exists:commission_types,id',
            'commission_type_2' => 'nullable|exists:commission_types,id',
            'commission_value_1' => 'nullable|numeric|min:0',
            'commission_value_2' => 'nullable|numeric|min:0',
            'minimum_payout' => 'nullable|numeric|min:0',
            'conversion_window_hours' => 'nullable|integer|min:0',
            'click_cookie_lifetime_hours' => 'nullable|integer|min:0',
            'preview_url' => 'nullable|url:http,https|max:2048',
            'thumbnail_url' => 'nullable|url:http,https|max:2048',
        ];
    }

    public function index($id)
    {
        Campaign::visibleTo(auth()->user())->findOrFail($id);

        return inertia('advertisercampaigns/offers/index', [
            'commissions' => CommissionType::all(),
            'id' => $id,
        ]);
    }

    public function show(Offer $offer)
    {
        $this->authorizeOffer($offer);
        try {
            $offer->load(['commissions.commissionType']);
            $hasPublishers = PublisherCampaigns::where('offer_id', $offer->id)->exists();

            return inertia('advertisercampaigns/offers/show', [
                'offer' => $offer,
                'commissions' => CommissionType::all(),
                'hasPublishers' => $hasPublishers,
            ]);
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.offers.show', $offer->id)->with('error', 'The offer could not be shown.');
        }
    }

    public function edit(Offer $offer)
    {
        $this->authorizeOffer($offer);
        $offer->load(['commissions.commissionType']);

        return inertia('advertisercampaigns/offers/edit', [
            'offer' => $offer,
            'commissions' => CommissionType::all(),
        ]);
    }

    public function update(Request $request, Offer $offer)
    {
        $this->authorizeOffer($offer);
        $request->validate($this->offerRules());

        try {
            DB::transaction(function () use ($request, $offer) {
                $offer->update([
                    'name' => $request->name,
                    'description' => $request->description,
                    'terms' => $request->terms,
                    'offer_status' => $request->offer_status ?? $offer->offer_status,
                    'bonus' => $request->bonus,
                    'conversion_window_hours' => $request->conversion_window_hours,
                    'click_cookie_lifetime_hours' => $request->click_cookie_lifetime_hours,
                    'minimum_payout' => $request->filled('minimum_payout') ? $request->minimum_payout : 0,
                    'allowed_traffic_sources' => $request->allowed_traffic_sources,
                    'prohibited_traffic_sources' => $request->prohibited_traffic_sources,
                    'preview_url' => $request->preview_url,
                    'tracking_url_template' => $request->tracking_url_template,
                    'thumbnail_url' => $request->thumbnail_url,
                ]);
                OfferCommission::where('offer_id', $offer->id)->delete();
                $commissions = [];
                if (! empty($request->commission_type_1) && ! empty($request->commission_value_1)) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_1,
                        'commission_value' => $request->commission_value_1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($request->commission_type_2) && ! empty($request->commission_value_2)) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_2,
                        'commission_value' => $request->commission_value_2,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($commissions)) {
                    OfferCommission::insert($commissions);
                }
            });

            return redirect()->route('advertiser.offers.show', $offer->id)->with('success', 'Offer updated successfully!');
        } catch (Exception $e) {
            report($e);

            return redirect()->back()->with('error', 'Offer could not be updated.');
        }
    }

    public function destroy(Offer $offer)
    {
        $this->authorizeOffer($offer);
        try {
            $hasPublishers = PublisherCampaigns::where('offer_id', $offer->id)->exists();
            if ($hasPublishers) {
                return back()->with('error', 'Cannot delete offer with active publishers.');
            }
            $campaignId = $offer->campaign_id;
            OfferCommission::where('offer_id', $offer->id)->delete();
            $offer->delete();

            return redirect()->route('advertiser.campaign.show', $campaignId)->with('success', 'Offer deleted successfully!');
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'Cannot delete the offer.');
        }
    }

    public function activate(Offer $offer)
    {
        $this->authorizeOffer($offer);
        try {
            $offer->update(['offer_status' => 'A']);

            return back()->with('success', 'Offer activated successfully.');
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.campaign.index')->with('error', 'An error occurred.');
        }
    }

    public function deactivate(Offer $offer)
    {
        $this->authorizeOffer($offer);
        try {
            $offer->update(['offer_status' => 'I']);
            PublisherCampaigns::where('offer_id', $offer->id)->update(['status' => 'I']);

            return back()->with('success', 'Offer deactivated successfully.');
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'An error occurred.');
        }
    }

    public function createCommission(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:200',
            ]);
            $type = CommissionType::create([
                'name' => $validated['name'],
            ]);

            return redirect()->route('advertiser.offers.index', [$request->id])->with('success', 'created successfully');
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.campaign.index')->with('error', 'An error occurred.');
        }
    }

    public function create(Request $request, $id)
    {
        Campaign::visibleTo(auth()->user())->findOrFail($id);
        $request->validate($this->offerRules());

        try {
            DB::transaction(function () use ($request, $id) {
                $campaign = Campaign::visibleTo(auth()->user())->findOrFail($id);
                $offer = Offer::create([
                    'campaign_id' => $campaign->id,
                    'network_id' => $campaign->network_id,
                    'name' => $request->name,
                    'description' => $request->description,
                    'terms' => $request->terms,
                    'offer_status' => $request->offer_status ?? 'A',
                    'bonus' => $request->bonus,
                    'conversion_window_hours' => $request->conversion_window_hours,
                    'click_cookie_lifetime_hours' => $request->click_cookie_lifetime_hours,
                    'minimum_payout' => $request->filled('minimum_payout') ? $request->minimum_payout : 0,
                    'allowed_traffic_sources' => $request->allowed_traffic_sources,
                    'prohibited_traffic_sources' => $request->prohibited_traffic_sources,
                    'preview_url' => $request->preview_url,
                    'tracking_url_template' => $request->tracking_url_template,
                    'thumbnail_url' => $request->thumbnail_url,
                ]);
                $commissions = [];
                if (! empty($request->commission_type_1) && ! empty($request->commission_value_1)) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_1,
                        'commission_value' => $request->commission_value_1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($request->commission_type_2) && ! empty($request->commission_value_2)) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_2,
                        'commission_value' => $request->commission_value_2,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($commissions)) {
                    OfferCommission::insert($commissions);
                }
            });

            return redirect()->route('advertiser.campaign.show', [$id])->with('success', 'Successfully created!!');
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.campaign.show', [$id])->with('error', 'Offer could not be created.');
        }
    }
}
