<?php

namespace App\Services\Fraud;

/** Pure rules: evaluations can be replayed against the exact stored evidence. */
class FraudRuleRegistry
{
    public function definitions(): array
    {
        return [
            'honeypot' => ['label' => 'Filled honeypot', 'description' => 'The merchant reported that a trap field was filled.', 'events' => ['submission'], 'settings' => []],
            'merchant_spam' => ['label' => 'Merchant spam verdict', 'description' => 'The merchant spam filter flagged the submission.', 'events' => ['submission'], 'settings' => []],
            'submission_timing' => ['label' => 'Submission timing', 'description' => 'The form was completed faster than the configured minimum.', 'events' => ['submission'], 'settings' => ['minimum_ms' => [1000, 0, 86400000]]],
            'conversion_timing' => ['label' => 'Click-to-conversion timing', 'description' => 'The outcome followed the referral unusually quickly.', 'events' => ['submission', 'purchase', 'action'], 'settings' => ['minimum_seconds' => [2, 0, 86400]]],
            'velocity' => ['label' => 'Conversion velocity', 'description' => 'Too many conversions arrived in the selected window. The current conversion is included.', 'events' => ['submission', 'purchase', 'action'], 'settings' => ['window_minutes' => [60, 1, 1440], 'publisher_limit' => [100, 1, 100000], 'assignment_limit' => [50, 1, 100000]]],
            'repetition' => ['label' => 'Repeated visitor activity', 'description' => 'Repeated referrals or visitor IPs exceed a threshold; shared IPs alone do not prove fraud.', 'events' => ['submission', 'purchase', 'action'], 'settings' => ['window_minutes' => [60, 1, 1440], 'referral_limit' => [5, 1, 100000], 'ip_limit' => [20, 1, 100000]]],
            'commission_amount' => ['label' => 'Commission amount', 'description' => 'Commission exceeds this rule’s threshold, in the event currency’s minor units.', 'events' => ['submission', 'purchase', 'action'], 'settings' => ['maximum_minor' => [10000, 1, 1000000000]]],
            'publisher_history' => ['label' => 'Publisher history', 'description' => 'Uses mature, explicitly classified outcomes within this network. Ordinary returns are not fraud.', 'events' => ['submission', 'purchase', 'action'], 'settings' => ['maturity_days' => [30, 1, 365], 'minimum_outcomes' => [20, 1, 100000], 'maximum_fraud_percent' => [5, 0, 100]]],
            'traffic_evidence' => ['label' => 'Traffic evidence', 'description' => 'Checks for an identified device and a reported traffic source. These are supporting signals, not proof.', 'events' => ['submission', 'purchase', 'action'], 'settings' => []],
        ];
    }

    public function defaults(): array
    {
        $rules = [];
        foreach ($this->definitions() as $id => $definition) {
            $settings = array_map(fn ($spec) => $spec[0], $definition['settings']);
            if ($id === 'submission_timing') {
                $settings['minimum_ms'] = config('tracking.minimum_form_duration_ms', 1000);
            }
            $rules[$id] = ['mode' => 'monitor', 'weight' => 20, 'event_types' => $definition['events'], 'settings' => $settings];
        }

        return $rules;
    }

    public function evaluate(array $rules, array $evidence, int $maximumScore): array
    {
        $results = [];
        $score = $enforced = 0;
        $unavailable = false;
        foreach ($rules as $id => $rule) {
            $definition = $this->definitions()[$id];
            $result = ['id' => $id, 'label' => $definition['label'], 'mode' => $rule['mode'], 'weight' => $rule['weight'],
                'settings' => $rule['settings'], 'observed' => null, 'contribution' => 0];
            if ($rule['mode'] === 'off') {
                $results[] = [...$result, 'outcome' => 'off', 'reason' => 'Rule is switched off.'];

                continue;
            }
            if (! in_array($evidence['event_type'], $rule['event_types'], true)) {
                $results[] = [...$result, 'outcome' => 'not_applicable', 'reason' => 'Rule does not apply to this event type.'];

                continue;
            }
            [$observed, $flagged] = $this->check($id, $rule['settings'], $evidence);
            $outcome = $flagged === null ? 'unavailable' : ($flagged ? 'flagged' : 'passed');
            if ($rule['mode'] === 'enforce') {
                $enforced++;
                $unavailable = $unavailable || $flagged === null;
                $result['contribution'] = $flagged === true ? $rule['weight'] : 0;
                $score += $result['contribution'];
            }
            $results[] = [...$result, 'observed' => $observed, 'outcome' => $outcome,
                'reason' => match ($outcome) {
                    'unavailable' => 'Required evidence is missing or history is insufficient.',
                    'flagged' => $definition['description'], default => 'Check passed.',
                }];
        }
        $reasons = [];
        if ($enforced === 0) {
            $reasons[] = 'No applicable rules are enforced.';
        }
        if ($unavailable) {
            $reasons[] = 'Required evidence is unavailable for an enforced rule.';
        }
        if ($score > $maximumScore) {
            $reasons[] = 'Enforced risk score exceeds the approval threshold.';
        }

        return ['results' => $results, 'score' => $score, 'recommendation' => $reasons ? 'manual_review' : 'approve', 'reasons' => $reasons];
    }

    private function check(string $id, array $settings, array $e): array
    {
        $value = match ($id) {
            'honeypot' => $e['spam_checks']['honeypot_filled'] ?? null,
            'merchant_spam' => $e['spam_checks']['is_spam'] ?? null,
            'submission_timing' => $e['spam_checks']['form_duration_ms'] ?? null,
            'conversion_timing' => $e['click_to_conversion_seconds'] ?? null,
            'velocity' => $e['velocity'] ?? null,
            'repetition' => $e['repetition'] ?? null,
            'commission_amount' => $e['commission_minor'] ?? null,
            'publisher_history' => $e['publisher_history'] ?? null,
            'traffic_evidence' => $e['traffic'] ?? null,
        };
        if ($value === null) {
            return [null, null];
        }
        // Replaying a changed window needs new evidence, not counts from the old window.
        if ((in_array($id, ['velocity', 'repetition'], true) && $value['window_minutes'] !== $settings['window_minutes'])
            || ($id === 'publisher_history' && $value['maturity_days'] !== $settings['maturity_days'])) {
            return [$value, null];
        }
        $flagged = match ($id) {
            'honeypot', 'merchant_spam' => (bool) $value,
            'submission_timing' => $value < $settings['minimum_ms'],
            'conversion_timing' => $value < $settings['minimum_seconds'],
            'velocity' => $value['publisher'] > $settings['publisher_limit'] || $value['assignment'] > $settings['assignment_limit'],
            'repetition' => $value['ip'] === null ? null : ($value['referral'] > $settings['referral_limit'] || $value['ip'] > $settings['ip_limit']),
            'commission_amount' => $value > $settings['maximum_minor'],
            'publisher_history' => $value['classified'] < $settings['minimum_outcomes'] ? null
                : $value['fraud'] * 100 > $value['classified'] * $settings['maximum_fraud_percent'],
            'traffic_evidence' => empty($value['source']) || empty($value['device']) || $value['device'] === 'unknown',
        };

        return [$value, $flagged];
    }
}
