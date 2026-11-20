<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignTerms;
use App\Services\CampaignSettingsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampaignSettingsController extends Controller
{
    public function update(Request $request, int $campaign, CampaignSettingsService $settings)
    {
        DB::transaction(function () use ($request, $campaign, $settings) {
            $model = Campaign::visibleTo($request->user())->lockForUpdate()->findOrFail($campaign);
            $allowedTerms = $settings->terms($model)->pluck('description')->merge($model->terms['terms'] ?? [])->all();
            $data = $request->validate([
                'name' => ['required', 'string', 'max:200', Rule::unique('campaigns', 'name')->ignore($model->id)
                    ->where('network_id', $model->network_id)->where('advertiser_id', $model->advertiser_id)],
                'description' => ['nullable', 'string', 'max:20000'],
                'campaign_status' => ['required', Rule::in(['A', 'I', 'P'])],
                'start_date' => ['required', 'date_format:Y-m-d', 'before:2100-01-01'],
                'no_end_date' => ['required', 'boolean'],
                'end_date' => ['exclude_if:no_end_date,true', 'required', 'date_format:Y-m-d', 'after_or_equal:start_date', 'before:2100-01-01'],
                'total_budget' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99', 'decimal:0,2'],
                'daily_budget' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99', 'decimal:0,2'],
                'max_publishers' => ['required', 'integer', 'min:0', 'max:2147483647'],
                'country_filter' => ['required', Rule::in(['all', 'selected'])],
                'countries' => ['exclude_if:country_filter,all', 'required', 'array', 'min:1', 'max:300'],
                'countries.*' => ['string', 'distinct', Rule::exists('countries', 'country_iso')->where('status', 'A')],
                'devices' => ['required', 'array', 'min:1', 'max:3'],
                'devices.*' => ['required', 'string', 'distinct', Rule::in(['desktop', 'mobile', 'tablet'])],
                'target_conversions' => ['nullable', 'integer', 'min:0', 'max:2147483647'],
                'target_roi' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99', 'decimal:0,2'],
                'tags' => ['present', 'array', 'max:30'],
                'tags.*' => ['required', 'string', 'max:60', 'distinct'],
                'terms' => ['present', 'array', 'max:100'],
                'terms.*' => ['required', 'string', 'distinct', Rule::in($allowedTerms)],
            ], [
                'countries.required' => 'Select at least one country or use all countries.',
                'devices.required' => 'Select at least one device.',
                'terms.*.in' => 'Select terms belonging to this advertiser or shared terms.',
            ]);
            $model->update([
                'name' => $data['name'], 'description' => $data['description'] ?? null,
                'campaign_status' => $data['campaign_status'],
                'start_date' => CarbonImmutable::parse($data['start_date'], 'UTC')->startOfDay(),
                // Retain the existing campaign form's no-end-date representation.
                'end_date' => CarbonImmutable::parse($data['no_end_date'] ? '2100-12-31' : $data['end_date'], 'UTC')->endOfDay(),
                'total_budget' => $data['total_budget'] ?? 0, 'daily_budget' => $data['daily_budget'] ?? 0,
                'max_publishers' => $data['max_publishers'],
                'geo_targeting' => $data['country_filter'] === 'all' ? null : ['countries' => $data['countries']],
                'device_targeting' => ['devices' => $data['devices']],
                'target_conversions' => $data['target_conversions'] ?? null, 'target_roi' => $data['target_roi'] ?? 0,
                'metadata' => array_merge($model->metadata ?? [], ['tags' => $data['tags']]),
                'terms' => array_merge($model->terms ?? [], ['terms' => $data['terms']]),
            ]);
        });

        return to_route('advertiser.campaign.show', ['id' => $campaign, 'tab' => 'settings'])->with('success', 'Campaign settings saved.');
    }

    /** Pause or resume a campaign from the workspace header. */
    public function status(Request $request, int $campaign)
    {
        $data = $request->validate(['campaign_status' => ['required', Rule::in(['A', 'P'])]]);
        $model = Campaign::visibleTo($request->user())->findOrFail($campaign);
        $model->update(['campaign_status' => $data['campaign_status']]);

        return back()->with('success', __($data['campaign_status'] === 'A' ? 'messages.campaigns.resumed' : 'messages.campaigns.paused'));
    }

    public function storeTerms(Request $request, int $campaign)
    {
        $model = Campaign::visibleTo($request->user())->findOrFail($campaign);
        $data = $request->validate(['description' => ['required', 'string', 'max:20000']]);
        CampaignTerms::create(['advertiser_id' => $model->advertiser_id, 'description' => $data['description']]);

        return to_route('advertiser.campaign.show', ['id' => $campaign, 'tab' => 'settings'])->with('success', 'Campaign terms created.');
    }
}
