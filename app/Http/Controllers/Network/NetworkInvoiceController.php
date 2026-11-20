<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Models\Network;
use App\Models\NetworkInvoice;
use App\Services\Finance\NetworkSettlementService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class NetworkInvoiceController extends Controller
{
    public function index()
    {
        try {
            $user = Auth::user();
            if (! $user->is_super_admin && ! $user->is_network) {
                abort(403, 'You do not have permission to access network invoices.');
            }
            $query = NetworkInvoice::query();
            if (! $user->is_super_admin) {
                $userNetwork = DB::table('user_networks')
                    ->where('user_id', $user->id)
                    ->first();
                if (! $userNetwork) {
                    return inertia('network_invoices/index', [
                        'invoices' => [],
                        'is_super_admin' => $user->is_super_admin,
                        'is_network' => $user->is_network,
                        'currencies' => config('finance.currencies'),
                    ]);
                }
                $query->where('network_id', $userNetwork->network_id);
            }
            $invoices = $query->orderBy('created_at', 'desc')
                ->paginate(15);

            return inertia('network_invoices/index', [
                'invoices' => $invoices,
                'is_super_admin' => $user->is_super_admin,
                'is_network' => $user->is_network,
                'currencies' => config('finance.currencies'),
            ]);

        } catch (Exception $e) {
            return back()->withErrors([
                'error' => 'An unexpected error occurred. Please try again later.',
            ]);
        }
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
