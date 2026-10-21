<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CampaignTerms;
use App\Models\Country;
use App\Models\Currency;
use App\Models\Network;
use App\Models\Offer;
use App\Models\Publisher;
use App\Models\User;
use App\Notifications\CampaignCreated;
use App\Support\Tenancy;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class AdvertiserCampaignController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = DB::table('campaigns')
            ->join('networks', 'networks.id', '=', 'campaigns.network_id')
            ->join('advertisers', 'advertisers.id', '=', 'campaigns.advertiser_id')
            ->join('currencies', 'currencies.currency_code', '=', 'campaigns.currency')
            ->select(
                'campaigns.id',
                'campaigns.name',
                'campaigns.total_budget',
                'campaigns.daily_budget',
                'campaigns.currency',
                'campaigns.start_date',
                'campaigns.end_date',
                'campaigns.campaign_status',
                'campaigns.target_conversions',
                'campaigns.target_roi',
                'campaigns.created_at',
                'networks.network_name'
            );
        Tenancy::campaigns($query, $user);
        $campaigns = $query->paginate(25);

        return inertia('advertisercampaigns/index', [
            'campaigns' => [
                'results' => $campaigns,
                'total' => $campaigns->total(),
                'pageCount' => $campaigns->lastPage(),
                'pageSize' => $campaigns->perPage(),
                'currentPage' => $campaigns->currentPage(),
                'from' => $campaigns->firstItem(),
                'to' => $campaigns->lastItem(),
            ],
        ]);
    }

    public function createPage()
    {
        $user = Auth::user();
        $advertiserId = $user->advertiser?->id;
        $terms = CampaignTerms::query()
            ->where(function ($query) use ($advertiserId) {
                $query->whereNull('advertiser_id');
                if ($advertiserId) {
                    $query->orWhere('advertiser_id', $advertiserId);
                }
            })
            ->get();

        return inertia('advertisercampaigns/create', [
            'currencies' => Currency::all(),
            'countries' => Country::where('status', 'A')->get(['country_iso', 'country_name']),
            'terms' => $terms,
        ]);
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $validated = $request->validate([
                'name' => 'required|string|max:200',
                'description' => 'nullable|string',
                'terms' => 'nullable',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'total_budget' => 'required|numeric|min:0',
                'daily_budget' => 'required|numeric|min:0',
                'currency' => 'required|string|size:3',
                'geo_targeting' => 'nullable',
                'device_targeting' => 'nullable',
                'max_publishers' => 'nullable|integer|min:0',
                'target_conversions' => 'nullable|integer|min:0',
                'target_roi' => 'nullable|numeric|min:0',
                'metadata' => 'nullable',
            ]);
            $user = Auth::user();
            $advertiser = Advertiser::where('user_id', $user->id)
                ->whereNotNull('network_id')
                ->first();

            if (! $advertiser) {
                throw new Exception('No advertiser account linked to this user');
            }
            $networkId = $advertiser->network_id;
            $validated['terms'] = $this->safeJson($validated['terms']);
            $validated['geo_targeting'] = $this->safeJson($validated['geo_targeting']);
            $validated['device_targeting'] = $this->safeJson($validated['device_targeting']);
            $validated['metadata'] = $this->safeJson($validated['metadata']);

            $campaign = Campaign::create([
                'network_id' => $networkId,
                'advertiser_id' => $advertiser->id,

                'name' => $validated['name'],
                'description' => $validated['description'],
                'terms' => $validated['terms'],

                'start_date' => Carbon::parse($validated['start_date']),
                'end_date' => Carbon::parse($validated['end_date']),

                'total_budget' => $validated['total_budget'],
                'daily_budget' => $validated['daily_budget'],

                'currency' => $validated['currency'],
                'geo_targeting' => $validated['geo_targeting'],
                'device_targeting' => $validated['device_targeting'],

                'max_publishers' => $validated['max_publishers'],
                'target_conversions' => $validated['target_conversions'],
                'target_roi' => $validated['target_roi'],

                'metadata' => $validated['metadata'],
            ]);

            // Only publishers of the advertiser's own network hear about the campaign
            $publishers = User::where('is_publisher', true)
                ->whereIn('id', Publisher::where('network_id', $networkId)->select('user_id'))
                ->get();
            Notification::send($publishers, new CampaignCreated($campaign));
            DB::commit();

            return redirect()
                ->route('advertiser.campaign.show', [$campaign->id])
                ->with('success', 'Campaign created successfully.');
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()
                ->route('advertiser.campaign.create')
                ->with('error', 'Campaign couldnot be created.');
        }
    }

    public function show($id)
    {
        $query = DB::table('campaigns')
            ->join('networks', 'networks.id', '=', 'campaigns.network_id')
            ->join('advertisers', 'advertisers.id', '=', 'campaigns.advertiser_id')
            ->join('currencies', 'currencies.currency_code', '=', 'campaigns.currency')
            ->select(
                'campaigns.id',
                'campaigns.name',
                'campaigns.total_budget',
                'campaigns.daily_budget',
                'campaigns.currency',
                'campaigns.start_date',
                'campaigns.end_date',
                'campaigns.campaign_status',
                'campaigns.target_conversions',
                'campaigns.target_roi',
                'campaigns.created_at',
                'networks.network_name'
            );
        $campaign = Tenancy::campaigns($query, Auth::user())->where('campaigns.id', $id)->first();
        abort_if($campaign === null, 404);
        $offers = Offer::with(['commissions.commissionType'])
            ->where('campaign_id', $campaign->id)
            ->get()
            ->map(function ($offer) {
                // Map commission values for table display
                $commissions = $offer->commissions;
                $offer->commission_value_1 = $commissions[0]->commission_value ?? null;
                $offer->commission_type_1 = $commissions[0]->commissionType->nice_name ?? null;
                $offer->commission_value_2 = $commissions[1]->commission_value ?? null;
                $offer->commission_type_2 = $commissions[1]->commissionType->nice_name ?? null;

                return $offer;
            });

        return inertia('advertisercampaigns/show', [
            'campaign' => $campaign,
            'offers' => $offers,
        ]);
    }

    public function edit($id)
    {
        $user = Auth::user();
        $advertiserId = $user->advertiser?->id;
        $terms = CampaignTerms::query()
            ->where(function ($query) use ($advertiserId) {
                $query->whereNull('advertiser_id');
                if ($advertiserId) {
                    $query->orWhere('advertiser_id', $advertiserId);
                }
            })
            ->get();

        return inertia('advertisercampaigns/edit', [
            'currencies' => Currency::all(),
            'countries' => Country::where('status', 'A')->get(['country_iso', 'country_name']),
            'campaign' => Campaign::visibleTo($user)->findOrFail($id),
            'terms' => $terms,
        ]);
    }

    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:200',
                'description' => 'nullable|string',
                'terms' => 'nullable',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'total_budget' => 'required|numeric|min:0',
                'daily_budget' => 'required|numeric|min:0',
                'currency' => 'required|string|size:3',
                'geo_targeting' => 'nullable',
                'device_targeting' => 'nullable',
                'max_publishers' => 'nullable|integer|min:0',
                'target_conversions' => 'nullable|integer|min:0',
                'target_roi' => 'nullable|numeric|min:0',
                'metadata' => 'nullable',
            ]);
            $campaign = Campaign::visibleTo(Auth::user())->findOrFail($id);
            $validated['terms'] = $this->safeJson($validated['terms']);
            $validated['geo_targeting'] = $this->safeJson($validated['geo_targeting']);
            $validated['device_targeting'] = $this->safeJson($validated['device_targeting']);
            $validated['metadata'] = $this->safeJson($validated['metadata']);

            $campaign->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'terms' => $validated['terms'] ?? null,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_budget' => $validated['total_budget'],
                'daily_budget' => $validated['daily_budget'],
                'currency' => $validated['currency'],
                'geo_targeting' => $validated['geo_targeting'] ?? null,
                'device_targeting' => $validated['device_targeting'] ?? null,
                'max_publishers' => $validated['max_publishers'] ?? null,
                'target_conversions' => $validated['target_conversions'] ?? null,
                'target_roi' => $validated['target_roi'] ?? null,
                'metadata' => $validated['metadata'] ?? null,
            ]);
            DB::commit();

            return redirect()->route('advertiser.campaign.show', [$id])
                ->with('success', 'Updated Successfully!!');
        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()->route('advertiser.campaign.show', [$id])
                ->with('error', 'could not be updated!!');
        }
    }

    private function safeJson($value)
    {
        if (! $value) {
            return null;
        }
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return ['value' => $value];
    }
}
