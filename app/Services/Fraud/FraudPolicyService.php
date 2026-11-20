<?php

namespace App\Services\Fraud;

use App\Models\Campaign;
use App\Models\FraudPolicy;
use App\Models\FraudPolicyVersion;
use App\Services\Finance\LedgerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FraudPolicyService
{
    public function __construct(private FraudRuleRegistry $rules) {}

    public function defaults(): array
    {
        return ['mode' => 'shadow', 'max_score' => 0, 'wait_minutes' => ['submission' => 0, 'purchase' => 1440, 'action' => 0],
            'event_types' => ['submission', 'purchase', 'action'], 'assignment_ids' => [], 'limits' => [], 'rules' => $this->rules->defaults()];
    }

    public function scope(int $networkId, ?int $campaignId): string
    {
        return $campaignId ? 'campaign:'.$campaignId : 'network:'.$networkId;
    }

    public function effective(int $networkId, ?int $campaignId = null, ?array $proposal = null, bool $networkProposal = false): array
    {
        $network = FraudPolicy::with('activeVersion')->where('scope_key', $this->scope($networkId, null))->first();
        $campaign = $campaignId ? FraudPolicy::with('activeVersion')->where('network_id', $networkId)->where('campaign_id', $campaignId)->first() : null;
        $base = $this->merge($this->defaults(), $proposal !== null && (! $campaignId || $networkProposal) ? $proposal : ($network?->activeVersion?->configuration ?? []));
        $config = $this->merge($base, $campaignId ? ((! $networkProposal ? $proposal : null) ?? $campaign?->activeVersion?->configuration ?? []) : []);
        // Campaigns cannot bypass the network-wide stop or shadow mode.
        if ($base['mode'] === 'disabled' || ($base['mode'] === 'shadow' && $config['mode'] === 'automatic')) {
            $config['mode'] = $base['mode'];
        }
        $snapshot = ['engine_version' => 1, 'network_version_id' => $network?->active_version_id,
            'campaign_version_id' => $campaign?->active_version_id, 'configuration' => $config,
            'network_limits' => $base['limits']];

        return [...$snapshot, 'fingerprint' => hash('sha256', json_encode($snapshot, JSON_THROW_ON_ERROR))];
    }

    private function merge(array $base, array $override): array
    {
        // Replace lists and individual rule settings; never merge list indexes.
        $rules = array_replace($base['rules'], $override['rules'] ?? []);

        return [...array_replace($base, $override), 'rules' => $rules];
    }

    public function validate(array $configuration, int $networkId, ?int $campaignId): array
    {
        $definitions = $this->rules->definitions();
        $validation = [
            'configuration' => 'array:mode,max_score,wait_minutes,event_types,assignment_ids,limits,rules',
            'configuration.mode' => 'sometimes|required|in:disabled,shadow,automatic',
            'configuration.max_score' => 'sometimes|required|integer|min:0|max:900',
            'configuration.wait_minutes' => 'sometimes|required|array:submission,purchase,action',
            'configuration.event_types' => 'sometimes|required|array|min:1|max:3',
            'configuration.event_types.*' => 'required|distinct|in:submission,purchase,action',
            'configuration.assignment_ids' => 'sometimes|array|max:1000',
            'configuration.assignment_ids.*' => ['integer', 'distinct', Rule::exists('publisher_campaigns', 'id')->where(fn ($q) => $q->where('network_id', $networkId)->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId)))],
            'configuration.limits' => 'sometimes|array:'.implode(',', config('finance.currencies')),
            'configuration.limits.*' => 'required|array:max_commission_minor,daily_limit_minor',
            'configuration.limits.*.max_commission_minor' => 'required|integer|min:1|max:1000000000',
            'configuration.limits.*.daily_limit_minor' => 'required|integer|min:1|max:100000000000',
            'configuration.rules' => 'sometimes|array:'.implode(',', array_keys($definitions)),
        ];
        foreach (['submission', 'purchase', 'action'] as $type) {
            $validation['configuration.wait_minutes.'.$type] = 'required_with:configuration.wait_minutes|integer|min:0|max:525600';
        }
        foreach ($definitions as $id => $definition) {
            $path = 'configuration.rules.'.$id;
            $validation[$path] = 'sometimes|required|array:mode,weight,event_types,settings';
            $validation[$path.'.mode'] = 'required_with:'.$path.'|in:off,monitor,enforce';
            $validation[$path.'.weight'] = 'required_with:'.$path.'|integer|min:1|max:100';
            $validation[$path.'.event_types'] = 'required_with:'.$path.'|array|min:1|max:3';
            $validation[$path.'.event_types.*'] = ['required', 'distinct', Rule::in($definition['events'])];
            $validation[$path.'.settings'] = 'present_with:'.$path.'|array'.($definition['settings'] ? ':'.implode(',', array_keys($definition['settings'])) : '|size:0');
            foreach ($definition['settings'] as $key => [$default, $min, $max]) {
                $validation[$path.'.settings.'.$key] = 'required_with:'.$path.'|integer|min:'.$min.'|max:'.$max;
            }
        }

        $config = Validator::make(['configuration' => $configuration], $validation)->validate()['configuration'];
        if (isset($config['max_score'])) {
            $config['max_score'] = (int) $config['max_score'];
        }
        foreach (['wait_minutes', 'assignment_ids'] as $key) {
            if (isset($config[$key])) {
                $config[$key] = array_map('intval', $config[$key]);
            }
        }
        foreach ($config['limits'] ?? [] as $currency => $limits) {
            $config['limits'][$currency] = array_map('intval', $limits);
        }
        foreach ($config['rules'] ?? [] as $id => $rule) {
            $config['rules'][$id]['weight'] = (int) $rule['weight'];
            $config['rules'][$id]['settings'] = array_map('intval', $rule['settings']);
        }

        return $config;
    }

    public function save(int $networkId, ?int $campaignId, array $configuration, int $actorId, string $reason, ?int $expectedVersion): FraudPolicyVersion
    {
        $configuration = $this->validate($configuration, $networkId, $campaignId);
        Validator::make(['reason' => $reason], ['reason' => 'required|string|max:500'])->validate();

        return DB::transaction(function () use ($networkId, $campaignId, $configuration, $actorId, $reason, $expectedVersion) {
            app(LedgerService::class)->lock($networkId);
            if ($campaignId) {
                Campaign::where('network_id', $networkId)->findOrFail($campaignId);
            }
            $policy = FraudPolicy::firstOrCreate(['scope_key' => $this->scope($networkId, $campaignId)], ['network_id' => $networkId, 'campaign_id' => $campaignId]);
            abort_unless($policy->active_version_id === $expectedVersion, 409, 'The policy changed. Reload before saving.');
            $version = FraudPolicyVersion::create(['fraud_policy_id' => $policy->id,
                'version' => FraudPolicyVersion::where('fraud_policy_id', $policy->id)->count() + 1,
                'configuration' => $configuration, 'actor_id' => $actorId, 'reason' => trim($reason), 'created_at' => now()]);
            $policy->update(['active_version_id' => $version->id]);

            return $version;
        }, 3);
    }
}
