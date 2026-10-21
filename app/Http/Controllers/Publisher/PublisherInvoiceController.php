<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Services\CommissionService;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublisherInvoiceController extends Controller
{
    protected InvoiceService $invoiceService;
    protected CommissionService $commissionService;

    public function __construct(InvoiceService $invoiceService, CommissionService $commissionService)
    {
        $this->invoiceService = $invoiceService;
        $this->commissionService = $commissionService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();
        if (!$publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }
        $invoices = PublisherInvoice::where('publisher_id', $publisher->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $summary = $this->invoiceService->getPublisherInvoiceSummary($publisher->id);
        $canRequest = $this->invoiceService->canRequestInvoice($publisher);
        $earningsSummary = $this->commissionService->getPublisherEarningsSummary($publisher->id);

        return Inertia::render('publisher/invoices/index', [
            'invoices' => $invoices,
            'summary' => $summary,
            'canRequest' => $canRequest,
            'earningsSummary' => $earningsSummary,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (!$publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $invoice = PublisherInvoice::where('publisher_id', $publisher->id)
            ->with(['earnings.publisherCampaign.campaign', 'earnings.lead', 'approvedByUser'])
            ->findOrFail($id);

        return Inertia::render('publisher/invoices/show', [
            'invoice' => $invoice,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (!$publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $canRequest = $this->invoiceService->canRequestInvoice($publisher);

        $earnings = PublisherEarning::where('publisher_id', $publisher->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('invoice_id')
            ->with(['publisherCampaign.campaign', 'publisherCampaign.offer', 'lead'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('publisher/invoices/create', [
            'canRequest' => $canRequest,
            'earnings' => $earnings,
            'payoutMethod' => $publisher->payout_method,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (!$publisher) {
            return response()->json(['error' => 'Publisher account not found'], 404);
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $canRequest = $this->invoiceService->canRequestInvoice($publisher);

        if (!$canRequest['can_request']) {
            return back()->with('error', sprintf(
                'Minimum payout threshold not met. You need $%.2f more to request a payout.',
                $canRequest['remaining']
            ));
        }

        $invoice = $this->invoiceService->createInvoice(
            $publisher,
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null
        );

        if (!$invoice) {
            return back()->with('error', 'No earnings available for invoice');
        }

        return redirect()
            ->route('publisher.invoices.show', $invoice->id)
            ->with('success', sprintf('Invoice #%s created successfully for $%.2f', $invoice->invoice_number, $invoice->amount));
    }

    public function earnings(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (!$publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $earnings = PublisherEarning::where('publisher_id', $publisher->id)
            ->with(['publisherCampaign.campaign', 'publisherCampaign.offer', 'lead', 'conversion', 'invoice'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        $summary = $this->commissionService->getPublisherEarningsSummary($publisher->id);

        return Inertia::render('publisher/earnings/index', [
            'earnings' => $earnings,
            'summary' => $summary,
        ]);
    }
}
