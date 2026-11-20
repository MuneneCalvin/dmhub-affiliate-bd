<?php

namespace App\Services\Fraud;

use App\Models\FraudAssessment;
use App\Models\FraudFeedback;
use Illuminate\Support\Facades\DB;

class FraudReportingService
{
    public function sample(int $networkId, ?int $campaignId, int $limit = 500)
    {
        return FraudAssessment::where('network_id', $networkId)->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
            ->whereNotNull('results')->where('created_at', '>=', now()->subDays(30))
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('fraud_assessments as newer')
                ->whereColumn('newer.earning_id', 'fraud_assessments.earning_id')->whereColumn('newer.id', '>', 'fraud_assessments.id'))
            ->latest('id')->limit($limit)->get();
    }

    public function statistics(int $networkId, ?int $campaignId): array
    {
        $sample = $this->sample($networkId, $campaignId);
        $ids = $sample->pluck('earning_id');
        $feedback = FraudFeedback::whereIn('earning_id', $ids)->orderBy('id')->get()->keyBy('earning_id');
        $approvals = DB::table('financial_transactions')->whereIn('earning_id', $ids)->where('kind', 'approval')->whereNotNull('actor_id')->get()->keyBy('earning_id');
        $stats = [];
        foreach (app(FraudRuleRegistry::class)->definitions() as $id => $definition) {
            $stats[$id] = ['id' => $id, 'label' => $definition['label'], 'evaluated' => 0, 'flagged' => 0,
                'sole_enforced_trigger' => 0, 'reviewer_disagreements' => 0, 'confirmed_legitimate' => 0, 'confirmed_fraud' => 0];
        }
        foreach ($sample as $assessment) {
            $enforcedFlags = collect($assessment->results)->where('mode', 'enforce')->where('outcome', 'flagged')->count();
            foreach ($assessment->results as $result) {
                $id = $result['id'];
                if (! isset($stats[$id])) {
                    continue;
                }
                if (in_array($result['outcome'], ['passed', 'flagged'], true)) {
                    $stats[$id]['evaluated']++;
                }
                if ($result['outcome'] !== 'flagged') {
                    continue;
                }
                $stats[$id]['flagged']++;
                $blocking = $result['mode'] === 'enforce' && $assessment->score > $assessment->policy_snapshot['configuration']['max_score'];
                if ($blocking && $enforcedFlags === 1) {
                    $stats[$id]['sole_enforced_trigger']++;
                }
                $approval = $approvals[$assessment->earning_id] ?? null;
                if ($blocking && $approval && $approval->created_at >= $assessment->created_at->format('Y-m-d H:i:s')) {
                    $stats[$id]['reviewer_disagreements']++;
                }
                $outcome = $feedback[$assessment->earning_id]->outcome ?? null;
                if ($outcome === 'legitimate') {
                    $stats[$id]['confirmed_legitimate']++;
                } elseif ($outcome === 'fraud') {
                    $stats[$id]['confirmed_fraud']++;
                }
            }
        }

        return ['sample_size' => $sample->count(), 'sample_limit' => 500, 'days' => 30, 'rules' => array_values($stats)];
    }

    public function preview(int $networkId, ?int $campaignId, array $configuration): array
    {
        $policies = app(FraudPolicyService::class);
        $rows = [];
        $configs = [];
        foreach ($this->sample($networkId, $campaignId, 200) as $assessment) {
            $scopeId = $assessment->campaign_id;
            $configs[$scopeId] ??= [
                $policies->effective($networkId, $scopeId)['configuration'],
                $policies->effective($networkId, $scopeId, $configuration, $campaignId === null)['configuration'],
            ];
            [$current, $proposed] = $configs[$scopeId];
            $rules = app(FraudRuleRegistry::class);
            $before = $rules->evaluate($current['rules'], $assessment->evidence, $current['max_score']);
            $after = $rules->evaluate($proposed['rules'], $assessment->evidence, $proposed['max_score']);
            $rows[] = ['assessment_id' => $assessment->id, 'earning_id' => $assessment->earning_id,
                'current' => $before['recommendation'], 'proposed' => $after['recommendation'], 'score' => $after['score'],
                'missing_evidence' => collect($after['results'])->where('outcome', 'unavailable')->pluck('label')->all()];
        }

        return ['sample_size' => count($rows), 'sample_limit' => 200, 'rows' => $rows,
            'current_eligible' => collect($rows)->where('current', 'approve')->count(),
            'proposed_eligible' => collect($rows)->where('proposed', 'approve')->count(),
            'changed' => collect($rows)->filter(fn ($r) => $r['current'] !== $r['proposed'])->count(),
            'note' => 'Rule-only comparison using stored evidence from the last 30 days. Exposure limits, holds and policy activation are not simulated. Different observation windows or previously disabled rules may lack evidence. No decisions are applied.'];
    }
}
