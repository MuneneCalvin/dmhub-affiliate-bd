<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\FraudAssessment;
use App\Models\FraudFeedback;
use App\Models\FraudPolicy;
use App\Models\FraudPolicyVersion;
use App\Models\Network;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Services\Finance\LedgerService;
use App\Services\Fraud\FraudAssessmentService;
use App\Services\Fraud\FraudPolicyService;
use App\Services\Fraud\FraudReportingService;
use App\Services\Fraud\FraudRuleRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FraudController extends Controller
{
    private function authorizeNetwork(Request $request, int $networkId): void
    {
        abort_unless($request->user()->is_super_admin || $request->user()->networkId() === $networkId, 403);
    }

    private function scope(Request $request): array
    {
        $data = $request->validate(['network_id' => 'required|integer|exists:networks,id', 'campaign_id' => 'nullable|integer']);
        $networkId = (int) $data['network_id'];
        $campaignId = empty($data['campaign_id']) ? null : (int) $data['campaign_id'];
        $this->authorizeNetwork($request, $networkId);
        if ($campaignId) {
            Campaign::where('network_id', $networkId)->findOrFail($campaignId);
        }

        return [$networkId, $campaignId];
    }

    /**
     * Add `actor_name` (first + last name) to records that carry an `actor_id`.
     */
    private function withActors(Collection $records): Collection
    {
        $names = User::whereIn('id', $records->pluck('actor_id')->filter()->unique())->get(['id', 'first_name', 'last_name', 'user_name'])
            ->mapWithKeys(fn (User $user) => [$user->id => trim($user->first_name.' '.$user->last_name) ?: $user->user_name]);

        return $records->map(fn ($record) => [...$record->toArray(), 'actor_name' => $names[$record->actor_id] ?? null]);
    }

    public function index(Request $request, FraudPolicyService $policies, FraudReportingService $reports)
    {
        $networks = Network::query()->when(! $request->user()->is_super_admin, fn ($q) => $q->whereKey($request->user()->networkId() ?? 0))
            ->orderBy('network_name')->get(['id', 'network_name']);
        if (! $request->filled('network_id')) {
            $request->merge(['network_id' => $networks->first()?->id]);
        }
        if ($networks->isEmpty()) {
            return inertia('admin/fraud/index', ['networks' => [], 'networkId' => null]);
        }
        [$networkId, $campaignId] = $this->scope($request);
        $policy = FraudPolicy::with('activeVersion')->where('scope_key', $policies->scope($networkId, $campaignId))->first();
        $health = FraudAssessment::where('network_id', $networkId)->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId));

        return inertia('admin/fraud/index', ['networks' => $networks, 'networkId' => $networkId, 'campaignId' => $campaignId,
            'campaigns' => Campaign::where('network_id', $networkId)->orderBy('name')->get(['id', 'name']),
            'assignments' => PublisherCampaigns::where('network_id', $networkId)->when($campaignId, fn ($q) => $q->where('campaign_id', $campaignId))
                ->with(['publisher.user', 'campaign', 'offer'])->orderBy('id')->get()->map(fn ($assignment) => [
                    'id' => $assignment->id, 'label' => ($assignment->publisher?->business_name ?: $assignment->publisher?->user?->first_name ?: 'Publisher')
                        .' · '.$assignment->campaign?->name.' · '.$assignment->offer?->name,
                ]),
            'definitions' => app(FraudRuleRegistry::class)->definitions(), 'currencies' => config('finance.currencies'),
            'effective' => $policies->effective($networkId, $campaignId), 'inherited' => $policies->effective($networkId)['configuration'],
            'configuration' => $policy?->activeVersion?->configuration ?? [], 'activeVersionId' => $policy?->active_version_id,
            'history' => $policy ? $this->withActors(FraudPolicyVersion::where('fraud_policy_id', $policy->id)->latest('id')->limit(50)
                ->get(['id', 'version', 'reason', 'actor_id', 'created_at'])) : [],
            'statistics' => $reports->statistics($networkId, $campaignId),
            'health' => ['queued' => (clone $health)->whereIn('status', ['queued', 'running'])->count(),
                'waiting' => (clone $health)->where('status', 'waiting')->count(), 'errors' => (clone $health)->where('status', 'error')->count()],
        ]);
    }

    public function save(Request $request, FraudPolicyService $policies)
    {
        [$networkId, $campaignId] = $this->scope($request);
        $data = $request->validate(['configuration' => 'present|array', 'reason' => 'required|string|max:500', 'expected_version' => 'present|nullable|integer']);
        $policies->save($networkId, $campaignId, $data['configuration'], $request->user()->id, $data['reason'], $data['expected_version']);

        return back()->with('success', 'Fraud policy saved as a new version. Existing completed decisions are unchanged.');
    }

    public function restore(Request $request, FraudPolicyService $policies)
    {
        [$networkId, $campaignId] = $this->scope($request);
        $data = $request->validate(['version_id' => 'required|integer', 'expected_version' => 'present|nullable|integer', 'reason' => 'required|string|max:500']);
        $policy = FraudPolicy::where('scope_key', $policies->scope($networkId, $campaignId))->firstOrFail();
        $version = FraudPolicyVersion::where('fraud_policy_id', $policy->id)->findOrFail($data['version_id']);
        $policies->save($networkId, $campaignId, $version->configuration, $request->user()->id, $data['reason'], $data['expected_version']);

        return back()->with('success', 'Previous configuration restored as a new policy version.');
    }

    public function preview(Request $request, FraudPolicyService $policies, FraudReportingService $reports)
    {
        [$networkId, $campaignId] = $this->scope($request);
        $data = $request->validate(['configuration' => 'present|array']);
        $configuration = $policies->validate($data['configuration'], $networkId, $campaignId);

        return response()->json($reports->preview($networkId, $campaignId, $configuration))->header('Cache-Control', 'private, no-store');
    }

    public function show(Request $request, PublisherEarning $earning)
    {
        $this->authorizeNetwork($request, $earning->network_id);

        return inertia('admin/fraud/show', ['earning' => $earning->only(['id', 'status', 'currency', 'amount', 'network_id']),
            'order' => $earning->conversion?->order_code,
            'assessments' => $earning->fraudAssessments()->latest('id')->paginate(20),
            'feedback' => $this->withActors(FraudFeedback::where('earning_id', $earning->id)->latest('id')->limit(50)->get()),
            'canManage' => $request->user()->is_super_admin || $request->user()->permissionNames()->contains('manage_fraud_rules'),
        ]);
    }

    public function reassess(Request $request, PublisherEarning $earning, FraudAssessmentService $service)
    {
        $this->authorizeNetwork($request, $earning->network_id);
        abort_unless($earning->status === 'pending', 409, 'Only pending commissions may be reassessed.');
        $service->request($earning, true);

        return back()->with('success', 'A new fraud assessment was requested.');
    }

    public function reassessScope(Request $request, FraudPolicyService $policies, FraudAssessmentService $service)
    {
        [$networkId, $campaignId] = $this->scope($request);
        // Bounded batches can be repeated; skip rows already requested or evaluated under the current policy.
        $count = 0;
        PublisherEarning::where('network_id', $networkId)->where('status', 'pending')->whereNotNull('conversion_event_id')
            ->whereNotNull('ledger_transaction_id')->when($campaignId, fn ($q) => $q->whereHas('publisherCampaign', fn ($q) => $q->where('campaign_id', $campaignId)))
            ->with('latestFraudAssessment')->orderBy('id')->chunkById(100, function ($earnings) use (&$count, $policies, $service) {
                foreach ($earnings as $earning) {
                    $latest = $earning->latestFraudAssessment;
                    if ($latest && in_array($latest->status, ['queued', 'running'], true)) {
                        continue;
                    }
                    $effective = $policies->effective($earning->network_id, $earning->commission_snapshot['campaign_id']);
                    if ($latest && $latest->policy_fingerprint === $effective['fingerprint'] && $latest->status !== 'error') {
                        continue;
                    }
                    $service->request($earning, true);
                    if (++$count >= 100) {
                        return false;
                    }
                }
            });

        return back()->with('success', $count.' pending commissions queued with the current rules. Repeat to process the next batch.');
    }

    public function feedback(Request $request, PublisherEarning $earning)
    {
        $this->authorizeNetwork($request, $earning->network_id);
        $data = $request->validate(['outcome' => 'required|in:legitimate,fraud,ordinary_return,unknown', 'reason' => 'required|string|max:500']);
        DB::transaction(function () use ($request, $earning, $data) {
            app(LedgerService::class)->lock($earning->network_id);
            FraudFeedback::create([...$data, 'earning_id' => $earning->id, 'network_id' => $earning->network_id,
                'actor_id' => $request->user()->id, 'created_at' => now()]);
        });

        return back()->with('success', 'Outcome recorded. Financial status and ledger balances are unchanged.');
    }
}
