<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Models\Network;
use App\Models\NetworkInvoice;
use App\Services\Finance\NetworkSettlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NetworkInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user->is_super_admin && ! $user->is_network) {
            abort(403, 'You do not have permission to access network invoices.');
        }
        $query = NetworkInvoice::query()->with('network:id,network_name');
        if (! $user->is_super_admin) {
            $networkId = DB::table('user_networks')->where('user_id', $user->id)->value('network_id');
            // Without a network there is nothing to show; keep the page usable.
            $query->where('network_id', $networkId ?? 0);
        }

        $status = in_array($request->query('status'), ['pending', 'approved', 'paid', 'rejected'], true) ? $request->query('status') : 'all';
        $counts = (clone $query)->toBase()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')->map(fn ($n) => (int) $n);
        // Open (unpaid) and paid totals per currency; never summed across currencies.
        $totals = (clone $query)->toBase()->selectRaw('currency, status, SUM(amount) as amount, COUNT(*) as count')
            ->groupBy('currency', 'status')->get()->groupBy('currency')->map(fn ($rows) => $rows->keyBy('status'));

        $invoices = $query->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderBy('created_at', 'desc')->paginate(15)->withQueryString();
        $permissions = $user->permissionNames();

        return inertia('network_invoices/index', [
            'invoices' => $invoices,
            'is_super_admin' => $user->is_super_admin,
            'is_network' => $user->is_network,
            'currencies' => config('finance.currencies'),
            'status' => $status,
            'statusCounts' => ['all' => (int) $counts->sum()] + $counts->all(),
            'totals' => $totals,
            // Settling network invoices is a platform-level action (super admin routes).
            'can' => [
                'generate' => (bool) $user->is_network && ($user->is_super_admin || $permissions->contains('request_payouts')),
                'approve' => (bool) $user->is_super_admin,
                'reject' => (bool) $user->is_super_admin,
                'pay' => (bool) $user->is_super_admin,
            ],
        ]);
    }

    public function store(Request $request, NetworkSettlementService $settlements)
    {
        $data = $request->validate(['currency' => 'required|string|size:3']);
        $networkId = $request->user()->networkId();
        abort_unless($networkId, 403, 'No network assigned.');
        $invoice = $settlements->create(Network::findOrFail($networkId), $data['currency'], $request->user()->id);

        return back()->with('success', 'Invoice #'.$invoice->invoice_number.' reserved for review.');
    }

    public function approve(Request $request, int $id, NetworkSettlementService $settlements)
    {
        $settlements->transition(NetworkInvoice::findOrFail($id), 'approve', $request->user()->id);

        return back()->with('success', 'Network invoice approved.');
    }

    public function reject(Request $request, int $id, NetworkSettlementService $settlements)
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        $settlements->transition(NetworkInvoice::findOrFail($id), 'reject', $request->user()->id, $data);

        return back()->with('success', 'Network invoice cancelled and funds released.');
    }

    public function markAsPaid(Request $request, int $id, NetworkSettlementService $settlements)
    {
        $data = $request->validate(['payment_reference' => 'required|string|max:120',
            'payment_evidence' => 'required|string|max:1000', 'payment_method' => 'nullable|string|max:100']);
        $settlements->transition(NetworkInvoice::findOrFail($id), 'pay', $request->user()->id,
            ['reference' => $data['payment_reference'], 'evidence' => $data['payment_evidence'], 'method' => $data['payment_method'] ?? 'bank']);

        return back()->with('success', 'Network payment recorded.');
    }
}
