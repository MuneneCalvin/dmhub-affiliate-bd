<?php

namespace App\Services;

use App\Models\Advertiser;
use App\Models\Clicks;
use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Services\Finance\LedgerService;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class LeadIntakeService
{
    /**
     * Records a contact together with its confirmed submission, once per campaign and email
     * and once per click. A repeat returns the first lead and creates no event or earning.
     *
     * @param  Closure(array): array{event: ConversionEvent, duplicate: bool}  $confirm
     * @return array{lead: LeadContact, event: ConversionEvent, duplicate: bool}
     */
    public function submit(Clicks $click, array $eventData, array $contact, Closure $confirm, ?CarbonImmutable $consentedAt = null): array
    {
        $hash = LeadContact::hashEmail($contact['email']);
        $campaignId = $click->campaign_id;

        try {
            return DB::transaction(function () use ($click, $eventData, $contact, $confirm, $consentedAt, $hash, $campaignId) {
                // Same order as ConversionEventService (network ledger, then advertiser), so two paths never deadlock;
                // submissions of one advertiser are serialized here, so the checks below cannot race.
                app(LedgerService::class)->lock($click->network_id);
                Advertiser::whereKey($click->campaign->advertiser_id)->lockForUpdate()->firstOrFail();

                if ($existing = $this->existing($click, $campaignId, $hash)) {
                    return ['lead' => $existing, 'event' => $existing->event, 'duplicate' => true];
                }

                $result = $confirm($eventData);
                $event = $result['event'];
                $attribution = $event->attribution;
                $lead = LeadContact::firstOrCreate(['conversion_event_id' => $event->id], [
                    'advertiser_id' => $event->advertiser_id, 'network_id' => $attribution['network_id'],
                    'campaign_id' => $attribution['campaign_id'], 'offer_id' => $attribution['offer_id'],
                    'publisher_campaign_id' => $attribution['publisher_campaign_id'], 'consented_at' => $consentedAt,
                ] + $contact);

                return ['lead' => $lead, 'event' => $event, 'duplicate' => $result['duplicate']];
            });
        } catch (UniqueConstraintViolationException) {
            // The unique index is the backstop: the whole attempt rolled back, so the winner is the answer.
            $existing = $this->existing($click, $campaignId, $hash);
            abort_unless($existing, 409, 'The submission could not be recorded; retry.');

            return ['lead' => $existing, 'event' => $existing->event, 'duplicate' => true];
        }
    }

    private function existing(Clicks $click, ?int $campaignId, string $hash): ?LeadContact
    {
        return LeadContact::where(fn ($q) => $q->where('campaign_id', $campaignId)->where('email_hash', $hash))
            ->orWhereHas('event', fn ($q) => $q->where('click_id', $click->id))
            ->with('event.earning')->first();
    }
}
