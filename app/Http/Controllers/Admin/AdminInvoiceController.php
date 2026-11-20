<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PublisherInvoice;
use App\Services\InvoiceService;
use App\Support\Pdf\PublisherInvoicePdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
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

    /**
     * What the caller may do with invoices. Approving, cancelling and recording
     * payments share the `approve_network_invoices` permission (see the routes).
     *
     * @return array{approve: bool, reject: bool, pay: bool, export: bool, all_networks: bool}
     */
    private function abilities(Request $request): array
    {
        $user = $request->user();
        $canSettle = $user->is_super_admin || $user->permissionNames()->contains('approve_network_invoices');

        return ['approve' => $canSettle, 'reject' => $canSettle, 'pay' => $canSettle, 'export' => true,
            'all_networks' => (bool) $user->is_super_admin];
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
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('user_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $invoices = $query->orderBy('requested_at', 'desc')->paginate(20)->withQueryString();

        // Get summary stats
        $stats = $this->invoiceQuery($request)->selectRaw('currency, status, SUM(amount) as amount, COUNT(*) as count')
            ->groupBy('currency', 'status')->get()->groupBy('currency')->map(fn ($rows) => $rows->keyBy('status'));
        $statusCounts = $this->invoiceQuery($request)->toBase()->selectRaw('status, COUNT(*) as total')->groupBy('status')
            ->pluck('total', 'status')->map(fn ($total) => (int) $total);

        return Inertia::render('admin/invoices/index', [
            'invoices' => $invoices,
            'stats' => $stats,
            'statusCounts' => ['all' => (int) $statusCounts->sum()] + $statusCounts->all(),
            'filters' => $request->only(['status', 'network_id', 'search']),
            'can' => $this->abilities($request),
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
            'earnings.conversion',
        ])->findOrFail($id);

        return Inertia::render('admin/invoices/show', [
            'invoice' => $invoice->attachLineAmounts(),
            'can' => $this->abilities($request),
        ]);
    }

    public function pdf(Request $request, int $id)
    {
        $invoice = $this->invoiceQuery($request)->findOrFail($id);

        return response((new PublisherInvoicePdf($invoice))->render(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.PublisherInvoicePdf::filename($invoice).'"',
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

        if (! in_array($invoice->status, ['pending', 'approved'])) {
            return back()->with('error', 'Only unpaid invoices can be cancelled');
        }

        $this->invoiceService->rejectInvoice($invoice, $validated['reason'], $request->user()->id);

        return back()->with('success', sprintf('Invoice #%s rejected', $invoice->invoice_number));
    }

    public function markPaid(Request $request, int $id)
    {
        $validated = $request->validate([
            'payment_reference' => 'required|string|max:120',
            'payment_evidence' => 'required|string|max:1000',
        ]);

        $invoice = $this->invoiceQuery($request)->findOrFail($id);

        $this->invoiceService->markAsPaid($invoice, $validated['payment_reference'], $validated['payment_evidence'], $request->user()->id);

        return back()->with('success', sprintf('Invoice #%s marked as paid', $invoice->invoice_number));
    }

    public function bulkApprove(Request $request)
    {
        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:publisher_invoices,id',
        ]);

        $approved = 0;
        foreach ($this->invoiceQuery($request)->whereIn('id', $validated['invoice_ids'])->orderBy('network_id')->orderBy('id')->get() as $invoice) {
            if ($invoice->status === 'pending') {
                $this->invoiceService->approveInvoice($invoice, $request->user()->id);
                $approved++;
            }
        }

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
