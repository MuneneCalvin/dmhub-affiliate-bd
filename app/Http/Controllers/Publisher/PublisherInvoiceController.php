<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Services\CommissionService;
use App\Services\InvoiceService;
use App\Support\Pdf\PublisherInvoicePdf;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }
        $status = in_array($request->query('status'), self::INVOICE_FILTERS, true) ? $request->query('status') : 'all';
        $base = PublisherInvoice::where('publisher_id', $publisher->id);
        $counts = (clone $base)->toBase()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')->map(fn ($n) => (int) $n);

        $invoices = (clone $base)
            ->when($status !== 'all', fn ($query) => $query->whereIn('status', self::INVOICE_STATUSES[$status]))
            ->with('network:id,network_name')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        $summary = $this->invoiceService->getPublisherInvoiceSummary($publisher->id);
        $canRequest = $this->withNetworkNames($this->invoiceService->canRequestInvoice($publisher));
        $earningsSummary = $this->commissionService->getPublisherEarningsSummary($publisher->id);

        return Inertia::render('publisher/invoices/index', [
            'invoices' => $invoices,
            'summary' => $summary,
            'canRequest' => $canRequest,
            'earningsSummary' => $earningsSummary,
            'status' => $status,
            'statusCounts' => $this->filterCounts($counts),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $invoice = PublisherInvoice::where('publisher_id', $publisher->id)
            ->with(['earnings.publisherCampaign.campaign', 'earnings.publisherCampaign.offer', 'approvedByUser', 'network', 'publisher.user'])
            ->findOrFail($id);

        return Inertia::render('publisher/invoices/show', [
            'invoice' => $invoice->attachLineAmounts(),
        ]);
    }

    public function pdf(Request $request, int $id)
    {
        $publisher = Publisher::where('user_id', $request->user()->id)->firstOrFail();
        $invoice = PublisherInvoice::where('publisher_id', $publisher->id)->findOrFail($id);

        return response((new PublisherInvoicePdf($invoice))->render(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.PublisherInvoicePdf::filename($invoice).'"',
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $canRequest = $this->withNetworkNames($this->invoiceService->canRequestInvoice($publisher));

        $earnings = PublisherEarning::where('publisher_id', $publisher->id)
            ->where('status', 'approved')->whereNotNull('ledger_transaction_id')
            ->whereNull('invoice_id')
            ->with(['publisherCampaign.campaign', 'publisherCampaign.offer'])
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

        if (! $publisher) {
            return response()->json(['error' => 'Publisher account not found'], 404);
        }

        $validated = $request->validate([
            'currency' => 'required|string|size:3',
            'network_id' => 'required|integer',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $canRequest = $this->invoiceService->canRequestInvoice($publisher);

        $invoice = $this->invoiceService->createInvoice(
            $publisher,
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null,
            $validated['currency'],
            $validated['network_id']
        );

        if (! $invoice) {
            return back()->with('error', 'No earnings available for invoice');
        }

        return redirect()
            ->route('publisher.invoices.show', $invoice->id)
            ->with('success', 'Invoice #'.$invoice->invoice_number.' created for '.$invoice->currency.' '.$invoice->amount);
    }

    public function earnings(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $summary = $this->commissionService->getPublisherEarningsSummary($publisher->id);
        $canRequest = $this->withNetworkNames($this->invoiceService->canRequestInvoice($publisher));

        // Every currency the publisher has money in; each one is shown on its own.
        $currencies = collect(array_keys($summary))
            ->merge(PublisherInvoice::where('publisher_id', $publisher->id)->distinct()->pluck('currency'))
            ->merge(PublisherEarning::where('publisher_id', $publisher->id)->whereNotNull('currency')->distinct()->pluck('currency'))
            ->filter()->unique()->sort()->values();
        $requested = strtoupper((string) $request->query('currency', ''));
        $currency = $currencies->contains($requested) ? $requested : $currencies->first();

        $earnings = PublisherEarning::where('publisher_id', $publisher->id)
            ->when($currency, fn ($query) => $query->where('currency', $currency))
            ->with(['publisherCampaign.campaign', 'publisherCampaign.offer', 'conversion', 'invoice'])
            ->orderBy('created_at', 'desc')
            ->paginate(50)
            ->withQueryString();

        $invoices = PublisherInvoice::where('publisher_id', $publisher->id)
            ->when($currency, fn ($query) => $query->where('currency', $currency))
            ->with('network:id,network_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('publisher/earnings/index', [
            'earnings' => $earnings,
            'summary' => $summary,
            'currencies' => $currencies,
            'currency' => $currency,
            'canRequest' => $canRequest,
            'invoices' => $invoices,
            'payoutMethod' => $publisher->payout_method,
            'payoutThreshold' => $publisher->payout_threshold,
        ]);
    }

    /** Invoice list filters → invoice statuses. */
    private const INVOICE_STATUSES = [
        'open' => ['pending', 'approved'],
        'paid' => ['paid'],
        'rejected' => ['rejected'],
    ];

    private const INVOICE_FILTERS = ['all', 'open', 'paid', 'rejected'];

    /**
     * @param  Collection<string, int>  $counts  invoice status → count
     * @return array<string, int>
     */
    private function filterCounts($counts): array
    {
        $result = ['all' => (int) $counts->sum()];
        foreach (self::INVOICE_STATUSES as $filter => $statuses) {
            $result[$filter] = (int) collect($statuses)->sum(fn ($status) => $counts->get($status, 0));
        }

        return $result;
    }

    /**
     * Adds the liable network's name to each payout group so the UI can show
     * "EUR · DMHub" instead of a network id.
     *
     * @param  array{can_request: bool, groups: array<int, array<string, mixed>>}  $canRequest
     * @return array{can_request: bool, groups: array<int, array<string, mixed>>}
     */
    private function withNetworkNames(array $canRequest): array
    {
        $names = Network::whereIn('id', collect($canRequest['groups'])->pluck('network_id'))->pluck('network_name', 'id');
        $canRequest['groups'] = collect($canRequest['groups'])
            ->map(fn ($group) => $group + ['network_name' => $names->get($group['network_id'])])
            ->values()->all();

        return $canRequest;
    }
}
