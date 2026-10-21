<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PublisherInvoice;
use App\Services\InvoiceService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminInvoiceController extends Controller
{
    protected InvoiceService $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * Invoices visible to the caller: everything for super admins,
     * otherwise only invoices of the caller's own network.
     */
    private function invoiceQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = PublisherInvoice::query();

        if ($user->is_super_admin) {
            return $query;
        }

        $networkId = $user->networkId();
        abort_if($networkId === null, 403, 'No network assigned to this user.');

        return $query->where('network_id', $networkId);
    }

    public function index(Request $request)
    {
        $query = $this->invoiceQuery($request)->with(['publisher.user', 'network', 'approvedByUser']);

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by network
        if ($request->user()->is_super_admin && $request->filled('network_id')) {
            $query->where('network_id', $request->network_id);
        }

        // Search by invoice number or publisher
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('publisher.user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $invoices = $query->orderBy('requested_at', 'desc')->paginate(20);

        // Get summary stats
        $stats = [
            'pending' => $this->invoiceQuery($request)->where('status', 'pending')->count(),
            'pending_amount' => $this->invoiceQuery($request)->where('status', 'pending')->sum('amount'),
            'approved' => $this->invoiceQuery($request)->where('status', 'approved')->count(),
            'approved_amount' => $this->invoiceQuery($request)->where('status', 'approved')->sum('amount'),
            'paid_this_month' => $this->invoiceQuery($request)->where('status', 'paid')
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount'),
        ];

        return Inertia::render('admin/invoices/index', [
            'invoices' => $invoices,
            'stats' => $stats,
            'filters' => $request->only(['status', 'network_id', 'search']),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $invoice = $this->invoiceQuery($request)->with([
            'publisher.user',
            'network',
            'approvedByUser',
            'earnings.publisherCampaign.campaign',
            'earnings.publisherCampaign.offer',
            'earnings.lead',
            'earnings.conversion',
        ])->findOrFail($id);

        return Inertia::render('admin/invoices/show', [
            'invoice' => $invoice,
        ]);
    }

    public function approve(Request $request, int $id)
    {
        $invoice = $this->invoiceQuery($request)->findOrFail($id);

        if ($invoice->status !== 'pending') {
            return back()->with('error', 'Invoice is not pending and cannot be approved');
        }

        $this->invoiceService->approveInvoice($invoice, $request->user()->id);

        return back()->with('success', sprintf('Invoice #%s approved successfully', $invoice->invoice_number));
    }

    public function reject(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $invoice = $this->invoiceQuery($request)->findOrFail($id);

        if ($invoice->status !== 'pending') {
            return back()->with('error', 'Invoice is not pending and cannot be rejected');
        }

        $this->invoiceService->rejectInvoice($invoice, $validated['reason'], $request->user()->id);

        return back()->with('success', sprintf('Invoice #%s rejected', $invoice->invoice_number));
    }

    public function markPaid(Request $request, int $id)
    {
        $validated = $request->validate([
            'payment_reference' => 'nullable|string|max:255',
        ]);

        $invoice = $this->invoiceQuery($request)->findOrFail($id);

        if (! in_array($invoice->status, ['approved', 'processing'])) {
            return back()->with('error', 'Invoice must be approved before marking as paid');
        }

        $this->invoiceService->markAsPaid($invoice, $validated['payment_reference'] ?? null);

        return back()->with('success', sprintf('Invoice #%s marked as paid', $invoice->invoice_number));
    }

    public function bulkApprove(Request $request)
    {
        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:publisher_invoices,id',
        ]);

        $approved = DB::transaction(function () use ($request, $validated) {
            $approved = 0;
            $invoices = $this->invoiceQuery($request)->whereIn('id', $validated['invoice_ids'])->lockForUpdate()->get();
            foreach ($invoices as $invoice) {
                if ($invoice->status === 'pending') {
                    $this->invoiceService->approveInvoice($invoice, $request->user()->id);
                    $approved++;
                }
            }

            return $approved;
        });

        return back()->with('success', sprintf('%d invoices approved', $approved));
    }

    public function export(Request $request)
    {
        $query = $this->invoiceQuery($request)->with(['publisher.user', 'network']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date')) {
            $query->where('requested_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('requested_at', '<=', $request->end_date.' 23:59:59');
        }

        $invoices = $query->orderBy('requested_at', 'desc')->get();

        $csv = "Invoice Number,Publisher,Email,Amount,Currency,Status,Requested At,Approved At,Paid At\n";

        $safe = fn ($v) => preg_match('/^[=+\-@\t\r]/', (string) $v) ? "'".$v : $v;

        foreach ($invoices as $invoice) {
            $csv .= sprintf(
                "%s,%s,%s,%.2f,%s,%s,%s,%s,%s\n",
                $safe($invoice->invoice_number),
                $safe(str_replace([',', "\n", "\r"], ' ', trim(($invoice->publisher?->user?->first_name ?? '').' '.($invoice->publisher?->user?->last_name ?? '')) ?: 'N/A')),
                $safe(str_replace(',', ' ', $invoice->publisher?->user?->email ?? 'N/A')),
                $invoice->amount,
                $invoice->currency,
                $invoice->status,
                $invoice->requested_at?->format('Y-m-d H:i:s') ?? '',
                $invoice->approved_at?->format('Y-m-d H:i:s') ?? '',
                $invoice->paid_at?->format('Y-m-d H:i:s') ?? ''
            );
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="invoices-'.date('Y-m-d').'.csv"');
    }
}
