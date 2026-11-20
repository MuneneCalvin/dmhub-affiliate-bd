<?php

namespace App\Services\Fraud;

use App\Models\PublisherEarning;
use App\Support\ConversionMoney;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class FraudEvidenceService
{
    public function collect(PublisherEarning $earning, array $configuration): array
    {
        $earning->loadMissing(['conversion.click', 'event']);
        $click = $earning->conversion?->click;
        $event = $earning->event;
        $evidence = ['captured_at' => now()->toISOString(), 'event_type' => $event->event_type,
            'signal_source' => 'authenticated_merchant', 'spam_checks' => $event->fraud_signals['spam_checks'] ?? null,
            'click_id' => $click?->id, 'commission_minor' => ConversionMoney::cents($earning->amount), 'currency' => $earning->currency,
            'click_to_conversion_seconds' => $click ? $event->occurred_at->getTimestamp() - $click->clicked_at->getTimestamp() : null,
            'traffic' => $click ? ['source' => $click->traffic_source, 'device' => $click->device_type] : null];
        $rules = $configuration['rules'];
        $active = fn ($id) => $rules[$id]['mode'] !== 'off' && in_array($event->event_type, $rules[$id]['event_types'], true);
        foreach (['velocity', 'repetition'] as $id) {
            if (! $active($id)) {
                continue;
            }
            $window = $rules[$id]['settings']['window_minutes'];
            // Receipt time and event sequence are platform controlled, unlike merchant timestamps.
            $query = DB::table('conversion_events as e')->join('clicks as c', 'c.id', '=', 'e.click_id')
                ->where('c.network_id', $earning->network_id)->where('e.id', '<=', $event->id)
                ->whereBetween('e.created_at', [CarbonImmutable::parse($event->created_at)->subMinutes($window)->format('Y-m-d H:i:s.u'), $event->created_at->format('Y-m-d H:i:s.u')]);
            $evidence[$id] = $id === 'velocity'
                ? ['window_minutes' => $window, 'publisher' => (clone $query)->where('c.publisher_id', $earning->publisher_id)->count(),
                    'assignment' => (clone $query)->where('c.publisher_campaign_id', $earning->publisher_campaign_id)->count()]
                : ['window_minutes' => $window, 'referral' => (clone $query)->where('c.id', $click?->id)->count(),
                    'ip' => $click?->ip_address ? (clone $query)->where('c.ip_address', $click->ip_address)->count() : null];
        }
        if ($active('publisher_history')) {
            $days = $rules['publisher_history']['settings']['maturity_days'];
            $outcomes = DB::table('fraud_feedback as f')->join('publisher_earnings as p', 'p.id', '=', 'f.earning_id')
                ->where('p.network_id', $earning->network_id)->where('p.publisher_id', $earning->publisher_id)
                ->where('p.created_at', '<=', now()->subDays($days))->where('p.id', '<>', $earning->id)
                ->whereIn('f.outcome', ['legitimate', 'fraud'])
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('fraud_feedback as newer')->whereColumn('newer.earning_id', 'f.earning_id')->whereColumn('newer.id', '>', 'f.id'))
                ->selectRaw('f.outcome, COUNT(*) as total')->groupBy('f.outcome')->pluck('total', 'outcome');
            $evidence['publisher_history'] = ['maturity_days' => $days, 'classified' => (int) $outcomes->sum(), 'fraud' => (int) ($outcomes['fraud'] ?? 0)];
        }

        return $evidence;
    }
}
