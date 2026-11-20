<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignTerms;
use App\Models\Country;
use App\Models\User;

class CampaignSettingsService
{
    public function terms(Campaign $campaign)
    {
        return CampaignTerms::query()->where(fn ($query) => $query
            ->whereNull('advertiser_id')->orWhere('advertiser_id', $campaign->advertiser_id));
    }

    public function build(Campaign $campaign, User $user): array
    {
        $noEndDate = ! $campaign->end_date || $campaign->end_date->year >= 2100;
        $countries = $campaign->geo_targeting['countries'] ?? $campaign->geo_targeting ?? [];
        $devices = $campaign->device_targeting['devices'] ?? $campaign->device_targeting ?? [];
        $counts = $campaign->applications()->whereIn('status', ['A', 'I'])->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return [
            'can_edit' => $user->is_super_admin || $user->permissionNames()->contains('manage_campaigns'),
            'save_url' => route('campaign.settings.update', $campaign),
            'terms_url' => route('campaign.settings.terms', $campaign),
            'values' => [
                'name' => $campaign->name,
                'description' => $campaign->description ?? '',
                'campaign_status' => $campaign->campaign_status,
                'start_date' => $campaign->start_date->format('Y-m-d'),
                'end_date' => $noEndDate ? '' : $campaign->end_date->format('Y-m-d'),
                'no_end_date' => $noEndDate,
                'total_budget' => (float) $campaign->total_budget > 0 ? (string) $campaign->total_budget : '',
                'daily_budget' => (float) $campaign->daily_budget > 0 ? (string) $campaign->daily_budget : '',
                'max_publishers' => (string) ($campaign->max_publishers ?? 0),
                'country_filter' => count($countries) ? 'selected' : 'all',
                'countries' => array_values($countries),
                'devices' => count($devices) ? array_values($devices) : ['desktop', 'mobile', 'tablet'],
                'target_conversions' => (string) ($campaign->target_conversions ?? ''),
                'target_roi' => (string) ($campaign->target_roi ?? ''),
                'tags' => $campaign->metadata['tags'] ?? [],
                'terms' => $campaign->terms['terms'] ?? [],
            ],
            'countries' => Country::where('status', 'A')->orderBy('country_name')->get(['country_iso', 'country_name']),
            'terms' => $this->terms($campaign)->orderByDesc('id')->get(['id', 'description']),
            'publishers' => ['active' => (int) ($counts['A'] ?? 0), 'inactive' => (int) ($counts['I'] ?? 0)],
        ];
    }
}
