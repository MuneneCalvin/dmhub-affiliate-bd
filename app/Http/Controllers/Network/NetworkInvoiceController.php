<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Models\NetworkInvoice;
use App\Services\NetworkEarningsService;
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
            ]);

        } catch (Exception $e) {
            return back()->withErrors([
                'error' => 'An unexpected error occurred. Please try again later.',
            ]);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = Auth::user();
            $userNetwork = DB::table('user_networks')
                ->where('user_id', $user->id)
                ->first();
            if (! $userNetwork) {
                return back()->with('error', 'Network not found.');
            }
            $networkId = $userNetwork->network_id;
            $balance = DB::scalar('SELECT calculate_network_balance(?)', [$networkId]);
            if ($balance <= 0) {
                return back()->with('error', 'No balance available to generate invoice.');
            }
            $hasPending = NetworkInvoice::where('network_id', $networkId)
                ->whereIn('status', ['pending', 'approved'])
                ->exists();

            if ($hasPending) {
                return back()->with('error', 'There is already a pending or approved invoice.');
            }
            $lastInvoice = NetworkInvoice::where('network_id', $networkId)
                ->orderBy('period_end', 'desc')
                ->first();

            $periodStart = $lastInvoice ? $lastInvoice->period_end->clone()->addDay() : now()->subMonth();
            $periodEnd = now();
            $invoice = NetworkInvoice::create([
                'network_id' => $networkId,
                'invoice_number' => NetworkInvoice::generateInvoiceNumber(),
                'amount' => $balance,
                'currency' => $user->currency ?? 'USD',
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'status' => 'pending',
                'notes' => 'Automated generation from current balance.',
            ]);

            return back()->with('success', 'Invoice #'.$invoice->invoice_number.' generated successfully.');
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'Failed to generate invoice.');
        }
    }

    public function markAsPaid(Request $request, $id)
    {
        $validated = $request->validate([
            'payment_reference' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string|max:100',
        ]);

        try {
            DB::beginTransaction();
            $invoice = NetworkInvoice::lockForUpdate()->findOrFail($id);
            if ($invoice->status === 'paid') {
                DB::rollBack();

                return back()->with('error', 'Invoice is already paid.');
            }
            $invoice->update([
                'status' => 'paid',
                'paid_at' => now(),
                'payment_reference' => $validated['payment_reference'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
            ]);
            $earningService = new NetworkEarningsService;
            $earningService->recordEarning([
                'network_id' => $invoice->network_id,
                'advertiser_id' => null,
                'campaign_id' => null,
                'amount_debited' => 0,
                'amount_credited' => $invoice->amount,
                'currency' => $invoice->currency,
                'notes' => "Payout for Invoice #{$invoice->invoice_number}",
            ]);
            DB::commit();

            return back()->with('success', 'Invoice marked as paid and ledger updated.');
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return back()->with('error', 'Failed to update invoice.');
        }
    }
}
