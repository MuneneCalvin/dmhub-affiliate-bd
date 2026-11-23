<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\PublisherEarning;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    private function authorizeNetwork(Request $request, int $networkId): void
    {
        abort_unless($request->user()->is_super_admin || $request->user()->networkId() === $networkId, 403);
    }

    public function index(Request $request)
    {
        $query = PublisherEarning::query()->with(['publisher.user', 'publisherCampaign.campaign', 'conversion',
            'latestFraudAssessment' => fn ($q) => $q->select(['fraud_assessments.id', 'fraud_assessments.earning_id', 'fraud_assessments.status', 'fraud_assessments.score', 'fraud_assessments.recommendation', 'fraud_assessments.applied_at']),
        ]);
        if (! $request->user()->is_super_admin) {
            $networkId = $request->user()->networkId();
            abort_unless($networkId, 403);
            $query->where('network_id', $networkId);
        }
        $data = $request->validate(['status' => 'nullable|in:pending,approved,locked,payable,paid,rejected,reversed', 'search' => 'nullable|string|max:100',
            'fraud' => 'nullable|in:all,awaiting,manual_review,automatic,error']);
        $statusCounts = (clone $query)->toBase()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')
            ->map(fn ($total) => (int) $total);
        $query->where('status', $data['status'] ?? 'pending');
        if (! empty($data['search'])) {
            $query->whereHas('conversion', fn ($q) => $q->where('order_code', 'like', '%'.$data['search'].'%'));
        }
        if (($data['fraud'] ?? 'all') !== 'all') {
            $query->whereHas('latestFraudAssessment', fn ($q) => match ($data['fraud']) {
                'awaiting' => $q->whereIn('status', ['queued', 'running', 'waiting']),
                'manual_review' => $q->where('recommendation', 'manual_review')->where('status', 'completed'),
                'automatic' => $q->whereNotNull('applied_at'), 'error' => $q->where('status', 'error'),
            });
        }

        return inertia('admin/finance/index', [
            'earnings' => $query->orderByDesc('id')->paginate(25)->withQueryString(),
            'statusCounts' => $statusCounts,
            'filters' => ['status' => $data['status'] ?? 'pending', 'search' => $data['search'] ?? '', 'fraud' => $data['fraud'] ?? 'all'],
            'advertisers' => $request->user()->is_super_admin ? Advertiser::select('id', 'business_name', 'currency', 'network_id')->orderBy('business_name')->get() : [],
            'canFund' => (bool) $request->user()->is_super_admin,
            'canManageFraud' => $request->user()->is_super_admin || $request->user()->permissionNames()->contains('manage_fraud_rules'),
            'canAdjust' => $request->user()->is_super_admin || $request->user()->hasPermissionTo('adjust_commissions'),
        ]);
    }

    public function funding(Request $request, Advertiser $advertiser, FundingService $funding)
    {
        $this->authorizeNetwork($request, $advertiser->network_id);
        $data = $request->validate(['operation' => 'required|in:deposit,refund', 'amount' => ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'],
            'currency' => 'required|string|size:3', 'reference' => 'required|string|max:120', 'evidence' => 'required|string|max:1000']);
        $id = $funding->{$data['operation']}($advertiser, (string) $data['amount'], $data['currency'], $data['reference'], $data['evidence'], $request->user()->id);

        if (! $request->expectsJson()) {
            return back()->with('success', 'Funding recorded with evidence.');
        }

        return response()->json(['transaction_id' => $id, 'available_budget' => $advertiser->fresh()->available_budget, 'currency' => $data['currency']]);
    }

    public function earnings(Request $request)
    {
        $query = PublisherEarning::query()->whereNotNull('ledger_transaction_id');
        if (! $request->user()->is_super_admin) {
            $networkId = $request->user()->networkId();
            abort_unless($networkId, 403);
            $query->where('network_id', $networkId);
        }
        $data = $request->validate(['status' => 'nullable|in:pending,approved,locked,payable,paid,rejected,reversed']);

        return $query->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))->orderBy('id')->paginate(50);
    }

    public function review(Request $request, PublisherEarning $earning, EarningReviewService $reviews)
    {
        $this->authorizeNetwork($request, $earning->network_id);
        $data = $request->validate(['decision' => 'required|in:approve,reject', 'reason' => 'required|string|max:500']);
        $result = $data['decision'] === 'approve' ? $reviews->approve($earning, $request->user()->id, $data['reason'])
            : $reviews->adjust($earning, 'rejection', null, 'review-rejection', $data['reason'], $request->user()->id);

        return $request->expectsJson() ? response()->json($result) : back()->with('success', 'Compensation review recorded.');
    }

    public function adjust(Request $request, PublisherEarning $earning, EarningReviewService $reviews)
    {
        $this->authorizeNetwork($request, $earning->network_id);
        $data = $request->validate(['kind' => 'required|in:refund,reversal,chargeback',
            'amount' => ['required_if:kind,refund', 'nullable', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'],
            'reference' => 'required|string|max:120', 'reason' => 'required|string|max:500']);

        $result = $reviews->adjust($earning, $data['kind'], isset($data['amount']) ? (string) $data['amount'] : null,
            $data['reference'], $data['reason'], $request->user()->id);

        return $request->expectsJson() ? response()->json($result) : back()->with('success', 'Compensation adjustment recorded.');
    }

    public function ledger(Request $request, int $networkId)
    {
        $this->authorizeNetwork($request, $networkId);
        $data = $request->validate(['currency' => 'required|string|size:3']);
        $balances = DB::table('ledger_entries')->where('network_id', $networkId)->where('currency', $data['currency'])
            ->selectRaw('account, owner_id, SUM(amount_minor) as balance_minor')->groupBy('account', 'owner_id')->get();
        $transactions = DB::table('financial_transactions')->where('network_id', $networkId)->where('currency', $data['currency'])->orderByDesc('id')->paginate(50);

        $entries = DB::table('ledger_entries')->whereIn('transaction_id', $transactions->getCollection()->pluck('id'))->orderBy('id')->get()->groupBy('transaction_id');
        $transactions->getCollection()->each(function ($transaction) use ($entries) {
            $transaction->details = json_decode($transaction->details, true);
            $transaction->entries = $entries->get($transaction->id, collect());
        });

        return response()->json(['currency' => $data['currency'], 'balances' => $balances, 'transactions' => $transactions]);
    }
}
