<?php

namespace App\Http\Controllers\Offers;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\PublisherCampaigns;
use App\Support\MediaStorage;
use App\Support\TrackingUrlTemplate;
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
            'offer_status' => 'sometimes|in:A,I,P',
            'commission_type_1' => 'nullable|exists:commission_types,id',
            'commission_type_2' => 'nullable|exists:commission_types,id',
            'commission_value_1' => 'required_with:commission_type_1|nullable|numeric|min:0',
            'commission_value_2' => 'required_with:commission_type_2|nullable|numeric|min:0',
            'minimum_payout' => 'nullable|numeric|min:0',
            'conversion_window_hours' => 'nullable|integer|min:0',
            'click_cookie_lifetime_hours' => 'nullable|integer|min:0',
            'preview_url' => 'nullable|url:http,https|max:2048',
            'thumbnail' => 'nullable|image|mimes:jpg,jpeg,png,gif,webp|max:10240',
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
            $offer->load(['commissions.commissionType', 'campaign']);
            $offer->setAttribute('currency', $offer->campaign->currency);
            $hasPublishers = PublisherCampaigns::where('offer_id', $offer->id)->exists();

            return inertia('advertisercampaigns/offers/show', [
                'offer' => $offer,
                'commissions' => CommissionType::all(),
                'hasPublishers' => $hasPublishers,
                'materials' => $offer->creatives()->latest()->paginate(12, ['*'], 'materials_page')->appends(['tab' => 'materials']),
            ]);
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.offers.show', $offer->id)->with('error', 'The offer could not be shown.');
        }
    }

    public function edit(Offer $offer)
    {
        $this->authorizeOffer($offer);
        $offer->load(['commissions.commissionType', 'campaign']);
        $offer->setAttribute('currency', $offer->campaign->currency);

        return inertia('advertisercampaigns/offers/edit', [
            'offer' => $offer,
            'commissions' => CommissionType::all(),
        ]);
    }

    public function update(Request $request, Offer $offer)
    {
        $this->authorizeOffer($offer);
        $request->validate($this->offerRules());

        $thumbnailPath = null;
        try {
            if ($request->hasFile('thumbnail')) {
                $thumbnailPath = $request->file('thumbnail')->store('offers/thumbnails', MediaStorage::disk());
                throw_unless($thumbnailPath, \RuntimeException::class, 'Could not store the offer thumbnail.');
            }
            DB::transaction(function () use ($request, $offer, $thumbnailPath) {
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
                    'tracking_url_template' => TrackingUrlTemplate::fromLandingPage($request->preview_url),
                    'thumbnail_url' => $thumbnailPath ? MediaStorage::url($thumbnailPath) : $offer->thumbnail_url,
                ]);
                OfferCommission::where('offer_id', $offer->id)->delete();
                $commissions = [];
                if (! empty($request->commission_type_1) && $request->filled('commission_value_1')) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_1,
                        'commission_value' => $request->commission_value_1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($request->commission_type_2) && $request->filled('commission_value_2')) {
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

            return ($request->boolean('workspace')
                ? redirect()->route('advertiser.campaign.show', ['id' => $offer->campaign_id, 'tab' => 'offers', 'offer' => $offer->id])
                : redirect()->route('advertiser.offers.show', $offer->id))->with('success', 'Offer updated successfully!');
        } catch (Exception $e) {
            if ($thumbnailPath) {
                MediaStorage::delete($thumbnailPath);
            }
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

        $thumbnailPath = null;
        try {
            if ($request->hasFile('thumbnail')) {
                $thumbnailPath = $request->file('thumbnail')->store('offers/thumbnails', MediaStorage::disk());
                throw_unless($thumbnailPath, \RuntimeException::class, 'Could not store the offer thumbnail.');
            }
            $offer = DB::transaction(function () use ($request, $id, $thumbnailPath) {
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
                    'tracking_url_template' => TrackingUrlTemplate::fromLandingPage($request->preview_url),
                    'thumbnail_url' => $thumbnailPath ? MediaStorage::url($thumbnailPath) : null,
                ]);
                $commissions = [];
                if (! empty($request->commission_type_1) && $request->filled('commission_value_1')) {
                    $commissions[] = [
                        'offer_id' => $offer->id,
                        'commission_type_id' => $request->commission_type_1,
                        'commission_value' => $request->commission_value_1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (! empty($request->commission_type_2) && $request->filled('commission_value_2')) {
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

                return $offer;
            });

            return ($request->boolean('workspace')
                ? redirect()->route('advertiser.campaign.show', ['id' => $offer->campaign_id, 'tab' => 'offers', 'offer' => $offer->id])
                : redirect()->route('advertiser.offers.show', $offer->id))->with('success', 'Successfully created!!');
        } catch (Exception $e) {
            if ($thumbnailPath) {
                MediaStorage::delete($thumbnailPath);
            }
            report($e);

            return ($request->boolean('workspace') ? back() : redirect()->route('advertiser.offers.index', [$id]))
                ->with('error', 'Offer could not be created.');
        }
    }
}
