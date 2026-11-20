<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CampaignPublishersService
{
    public function canReview(User $user, string $action): bool
    {
        return $user->is_super_admin || $user->permissionNames()->contains($action.'_applications')
            || ($user->is_advertiser && $user->permissionNames()->contains('manage_campaigns'));
    }

    public function build(Campaign $campaign, User $user, ?PublisherCampaigns $own = null): array
    {
        $rows = PublisherCampaigns::where('campaign_id', $campaign->id)->where('network_id', $campaign->network_id)
            ->when($own, fn ($q) => $q->whereKey($own->id))
            ->with(['publisher.user', 'publisher.network', 'offer'])->orderByRaw('applied_at IS NULL')->orderByDesc('applied_at')->orderByDesc('id')->get();
        $offers = Offer::where('campaign_id', $campaign->id)->where('network_id', $campaign->network_id)->get()->keyBy('id');
        $events = DB::table('partner_enrollment_events')->whereIn('publisher_campaign_id', $rows->pluck('id'))
            ->orderBy('created_at')->orderBy('id')->get()->groupBy('publisher_campaign_id');
        $enrollment = app(PartnerEnrollmentService::class);
        $contracts = $offers->map(fn ($offer) => $enrollment->contract($campaign, $offer));

        return [
            'can_approve' => ! $own && $this->canReview($user, 'approve'),
            'can_reject' => ! $own && $this->canReview($user, 'reject'),
            'capacity' => $own ? null : (int) $campaign->max_publishers,
            'rows' => $rows->map(function ($row) use ($campaign, $offers, $contracts, $events, $enrollment) {
                $offer = $offers->get($row->requested_offer_id ?? $row->offer_id);
                $current = $offer ? $contracts->get($offer->id) : null;
                $accepted = $row->terms_accepted_at && $row->terms_version;
                $termsCurrent = $accepted && $current && hash_equals($row->terms_version, $enrollment->version($current));
                $blocker = null;
                if ($row->status === 'P') {
                    if (! $offer || ! $row->publisher) {
                        $blocker = 'The requested offer is no longer available.';
                    } else {
                        try {
                            $enrollment->approvalContract($campaign, $row, $row->publisher, $offer);
                        } catch (ValidationException $e) {
                            $blocker = collect($e->errors())->flatten()->first();
                        }
                    }
                }
                $history = collect($events->get($row->id, []))->map(function ($event) {
                    $details = json_decode($event->details, true);

                    return ['id' => $event->id, 'action' => $event->action, 'at' => Carbon::parse($event->created_at)->toISOString(),
                        'reason' => $details['rejection_reason'] ?? null, 'terms_version' => $details['terms_version'] ?? null,
                        'terms_accepted_at' => $details['terms_accepted_at'] ?? null];
                })->all();
                // Older enrollments have no audit events; only show dates actually recorded.
                if (! $history) {
                    foreach (['applied_at' => 'applied', 'approved_at' => 'approved', 'terminated_at' => 'terminated'] as $field => $action) {
                        if ($row->$field) {
                            $history[] = ['id' => $field, 'action' => $action, 'at' => $row->$field->toISOString(), 'reason' => null,
                                'terms_version' => null, 'terms_accepted_at' => null];
                        }
                    }
                }

                $sources = $row->publisher?->traffic_sources ?? [];

                return [
                    'id' => $row->id, 'name' => $row->publisher?->business_name ?: trim(($row->publisher?->user?->first_name ?? '').' '.($row->publisher?->user?->last_name ?? '')),
                    'website' => $row->publisher?->website_url, 'sources' => array_values(array_filter($sources['sources'] ?? $sources, 'is_string')),
                    'status' => $row->status, 'terminated_at' => $row->terminated_at?->toISOString(),
                    'offer' => ($row->status === 'P' ? $offer?->name : $row->offer?->name) ?? $offer?->name,
                    'requested_offer_id' => $row->requested_offer_id, 'notes' => $row->applied_notes,
                    'applied_at' => $row->applied_at?->toISOString(), 'approved_at' => $row->approved_at?->toISOString(),
                    'rejection_reason' => $row->rejection_reason, 'terms_version' => $row->terms_version,
                    'terms_accepted_at' => $row->terms_accepted_at?->toISOString(), 'terms_current' => (bool) $termsCurrent,
                    'terms_snapshot' => $row->terms_snapshot, 'approval_blocker' => $blocker,
                    'rates' => in_array($row->status, ['A', 'I']) && $row->commission_type
                        ? [['type' => $row->commission_type, 'value' => $row->commission_value]]
                        : ($row->terms_snapshot['commissions'] ?? []),
                    'history' => $history,
                ];
            })->all(),
        ];
    }
}
