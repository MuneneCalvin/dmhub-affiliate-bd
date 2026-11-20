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
use App\Services\CampaignAnalyticsService;
use App\Services\CampaignFinanceService;
use App\Services\CampaignOffersService;
use App\Services\CampaignOverviewService;
use App\Services\CampaignPublishersService;
use App\Services\CampaignSettingsService;
use App\Services\CampaignTrackingService;
use App\Support\Tenancy;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

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
        $campaigns->getCollection()->each(fn ($campaign) => $this->serializeDates($campaign));

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

    public function createPage(Request $request)
    {
        $user = Auth::user();
        $terms = CampaignTerms::where(fn ($q) => $q->whereNull('advertiser_id')
            ->orWhereIn('advertiser_id', $this->advertisersForUser()->select('id')))->get();

        $selectedAdvertiser = $request->filled('advertiser_id')
            ? $this->advertisersForUser()->whereKey($request->input('advertiser_id'))->firstOrFail()->id
            : null;

        return inertia('advertisercampaigns/create', [
            'selectedAdvertiserId' => $selectedAdvertiser,
            'currencies' => Currency::all(),
            'countries' => Country::where('status', 'A')->get(['country_iso', 'country_name']),
            'terms' => $terms,
            'advertisers' => $this->advertisersForUser()->get(['id', 'business_name', 'available_budget', 'currency']),
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
                'total_budget' => 'nullable|numeric|min:0',
                'daily_budget' => 'nullable|numeric|min:0',
                'currency' => 'required|string|size:3',
                'geo_targeting' => 'nullable',
                'device_targeting' => 'nullable',
                'max_publishers' => 'nullable|integer|min:0',
                'target_conversions' => 'nullable|integer|min:0',
                'target_roi' => 'nullable|numeric|min:0',
                'metadata' => 'nullable',
                'campaign_status' => 'sometimes|in:A,I,P',
            ]);
            $user = Auth::user();
            $advertiser = $this->advertisersForUser()
                ->when($user->is_network || $user->is_super_admin, fn ($q) => $q->whereKey($request->input('advertiser_id')))
                ->first();
            if (! $advertiser) {
                throw ValidationException::withMessages(['advertiser_id' => 'Select an active advertiser in your network.']);
            }
            $networkId = $advertiser->network_id;
            $validated['terms'] = $this->safeJson($validated['terms'] ?? null);
            $validated['geo_targeting'] = $this->safeJson($validated['geo_targeting'] ?? null);
            $validated['device_targeting'] = $this->safeJson($validated['device_targeting'] ?? null);
            $validated['metadata'] = $this->safeJson($validated['metadata'] ?? null);

            $campaign = Campaign::create([
                'network_id' => $networkId,
                'advertiser_id' => $advertiser->id,

                'campaign_status' => $validated['campaign_status'] ?? 'A',
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'terms' => $validated['terms'],

                'start_date' => Carbon::parse($validated['start_date']),
                'end_date' => Carbon::parse($validated['end_date']),

                // Zero represents an unset spending limit throughout campaign eligibility.
                'total_budget' => $validated['total_budget'] ?? 0,
                'daily_budget' => $validated['daily_budget'] ?? 0,

                'currency' => $validated['currency'],
                'geo_targeting' => $validated['geo_targeting'],
                'device_targeting' => $validated['device_targeting'],

                'max_publishers' => $validated['max_publishers'] ?? null,
                'target_conversions' => $validated['target_conversions'] ?? null,
                'target_roi' => $validated['target_roi'] ?? 0,

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
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
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
        $this->serializeDates($campaign);
        $offers = Offer::with(['commissions.commissionType'])
            ->where('campaign_id', $campaign->id)
            ->get()
            ->map(function ($offer) use ($campaign) {
                // Commission values/types are exposed by the Offer accessors.
                $offer->currency = $campaign->currency;

                return $offer;
            });

        return inertia('advertisercampaigns/show', [
            'campaign' => $campaign,
            'overview' => app(CampaignOverviewService::class)->build(Campaign::findOrFail($campaign->id), Auth::user()),
            'offers' => $offers,
            'publisherWorkspace' => fn () => app(CampaignPublishersService::class)->build(Campaign::findOrFail($campaign->id), Auth::user()),
            'financeWorkspace' => fn () => request('tab') === 'finance' ? app(CampaignFinanceService::class)->build(Campaign::findOrFail($campaign->id), request()) : null,
            'analyticsWorkspace' => fn () => request('tab') === 'analytics' ? app(CampaignAnalyticsService::class)->build(Campaign::findOrFail($campaign->id), request()) : null,
            'settingsWorkspace' => fn () => request('tab') === 'settings' ? app(CampaignSettingsService::class)->build(Campaign::findOrFail($campaign->id), Auth::user()) : null,
            'trackingWorkspace' => fn () => request('tab') === 'tracking' ? app(CampaignTrackingService::class)->build(Campaign::findOrFail($campaign->id), request()) : null,
            'offerWorkspace' => fn () => app(CampaignOffersService::class)->build(Campaign::findOrFail($campaign->id), Auth::user()),
            'funding' => Advertiser::whereKey(Campaign::findOrFail($campaign->id)->advertiser_id)->first(['available_budget', 'currency']),
        ]);
    }

    public function edit($id)
    {
        $user = Auth::user();
        $campaign = Campaign::visibleTo($user)->findOrFail($id);
        $advertiserId = $campaign->advertiser_id;
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
            'campaign' => $campaign,
            'terms' => $terms,
            'funding' => $campaign->advertiser()->first(['available_budget', 'currency']),
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
                'total_budget' => 'nullable|numeric|min:0',
                'daily_budget' => 'nullable|numeric|min:0',
                'currency' => 'required|string|size:3',
                'geo_targeting' => 'nullable',
                'device_targeting' => 'nullable',
                'max_publishers' => 'nullable|integer|min:0',
                'target_conversions' => 'nullable|integer|min:0',
                'target_roi' => 'nullable|numeric|min:0',
                'metadata' => 'nullable',
                'campaign_status' => 'sometimes|in:A,I,P',
            ]);
            $campaign = Campaign::visibleTo(Auth::user())->findOrFail($id);
            $validated['terms'] = $this->safeJson($validated['terms'] ?? null);
            $validated['geo_targeting'] = $this->safeJson($validated['geo_targeting'] ?? null);
            $validated['device_targeting'] = $this->safeJson($validated['device_targeting'] ?? null);
            $validated['metadata'] = $this->safeJson($validated['metadata'] ?? null);

            $campaign->update([
                'campaign_status' => $validated['campaign_status'] ?? $campaign->campaign_status,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'terms' => $validated['terms'] ?? null,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_budget' => $validated['total_budget'] ?? 0,
                'daily_budget' => $validated['daily_budget'] ?? 0,
                'currency' => $validated['currency'],
                'geo_targeting' => $validated['geo_targeting'] ?? null,
                'device_targeting' => $validated['device_targeting'] ?? null,
                'max_publishers' => $validated['max_publishers'] ?? null,
                'target_conversions' => $validated['target_conversions'] ?? null,
                'target_roi' => $validated['target_roi'] ?? 0,
                'metadata' => $validated['metadata'] ?? null,
            ]);
            DB::commit();

            return redirect()->route('advertiser.campaign.show', [$id])
                ->with('success', 'Updated Successfully!!');
        } catch (ModelNotFoundException|ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()->route('advertiser.campaign.show', [$id])
                ->with('error', 'could not be updated!!');
        }
    }

    private function serializeDates(object $campaign): void
    {
        // Query-builder rows lack Eloquent's UTC date serialization.
        foreach (['start_date', 'end_date'] as $field) {
            $campaign->{$field} = $campaign->{$field}
                ? Carbon::parse($campaign->{$field})->toISOString() : null;
        }
    }

    private function advertisersForUser()
    {
        $user = Auth::user();

        return Advertiser::whereNotNull('network_id')->where('status', 'A')
            ->whereHas('user', fn ($q) => $q->where('status', 'A'))
            ->when(! $user->is_super_admin, function ($q) use ($user) {
                if ($user->is_network) {
                    $q->where('network_id', $user->networkId() ?? 0);
                } else {
                    $q->where('user_id', $user->id);
                }
            });
    }

    private function safeJson($value)
    {
        if (! $value) {
            return null;
        }
        if (is_array($value)) {
            return $value;
        }
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return ['value' => $value];
    }
}
