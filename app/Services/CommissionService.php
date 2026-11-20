<?php

namespace App\Services;

use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Services\Finance\LedgerService;
use App\Support\ConversionEligibility;
use App\Support\ConversionMoney;
use Illuminate\Validation\ValidationException;

class CommissionService
{
    public const EVENT_COMMISSION_TYPES = [
        'submission' => ['CPL'],
        'purchase' => ['CPS', 'RevShare', 'Flat'],
        'action' => ['CPA', 'Flat'],
    ];

    // The approved publisher assignment is the agreed rate. Never select an
    // unrelated offer commission merely because it happens to be listed first.
    public function quote(PublisherCampaigns $assignment, string $eventType, string $basis, ?array $snapshot = null): array
    {
        $type = $snapshot['type'] ?? $assignment->commission_type;
        $allowed = self::EVENT_COMMISSION_TYPES[$eventType] ?? [];
        if (! in_array($type, $allowed, true)) {
            throw ValidationException::withMessages(['event_type' => 'Event does not match the approved commission type.']);
        }
        $rate = ConversionMoney::cents($snapshot['value'] ?? $assignment->commission_value);
        $percentage = in_array($type, ['CPS', 'RevShare'], true);
        if ($percentage && $rate > 10000) {
            throw ValidationException::withMessages(['commission' => 'Percentage commission must not exceed 100%.']);
        }
        $cents = $percentage ? intdiv(ConversionMoney::cents($basis) * $rate + 5000, 10000) : $rate;
        if ($cents <= 0) {
            throw ValidationException::withMessages(['commission' => 'A positive commission must be configured.']);
        }

        return ['type' => $type, 'rate' => $percentage ? ($snapshot['value'] ?? $assignment->commission_value) : '0.00', 'amount' => ConversionMoney::decimal($cents)];
    }

    /** Called only within ConversionEventService's advertiser/campaign locks. */
    public function accrue(ConversionEvent $event, Conversion $conversion, PublisherCampaigns $assignment): PublisherEarning
    {
        ConversionEligibility::assertBudget($assignment, ConversionMoney::cents($conversion->commission_amount));
        $earning = PublisherEarning::create([
            'currency' => $event->currency,
            'commission_snapshot' => $event->attribution['commission_snapshot'],
            'conversion_event_id' => $event->id,
            'publisher_id' => $assignment->publisher_id,
            'network_id' => $assignment->network_id,
            'publisher_campaign_id' => $assignment->id,
            'conversion_id' => $conversion->id,
            'amount' => $conversion->commission_amount,
            'commission_type' => $conversion->commission_type,
            'commission_rate' => $conversion->commission_rate,
            'base_value' => $event->amount,
            'status' => 'pending',
        ]);
        $assignment->increment('total_commission', $earning->amount);
        $assignment->publisher->increment('total_earnings', $earning->amount);
        $assignment->campaign->increment('spent_amount', $earning->amount);
        $ledger = app(LedgerService::class);
        $minor = ConversionMoney::cents($earning->amount);
        $transaction = $ledger->post($earning->network_id, $earning->currency, 'commission:'.$event->id,
            'commission', 'earning', $earning->id, null, ['event_id' => $event->id, 'snapshot' => $earning->commission_snapshot],
            [['advertiser', $event->advertiser_id, -$minor], ['publisher_pending', $earning->publisher_id, $minor]]);
        $earning->update(['ledger_transaction_id' => $transaction]);
        $ledger->syncAdvertiser($event->advertiser_id, $earning->network_id, $earning->currency);

        return $earning;
    }

    public function getPublisherEarningsSummary(int $publisherId): array
    {
        return PublisherEarning::where('publisher_id', $publisherId)->whereNotNull('ledger_transaction_id')
            ->get()->groupBy('currency')->map(fn ($rows) => $rows->groupBy('status')->map(fn ($group) => [
                'amount' => ConversionMoney::decimal($group->sum(fn ($e) => ConversionMoney::cents($e->amount) - $e->reversed_minor)),
                'count' => $group->count(),
            ]))->all();
    }
}
