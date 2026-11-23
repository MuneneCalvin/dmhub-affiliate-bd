<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Services\Finance\LedgerService;
use App\Support\ConversionMoney as Money;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CampaignFinanceService
{
    public function query(Campaign $campaign, ?PublisherCampaigns $assignment = null): Builder
    {
        return PublisherEarning::query()->where('network_id', $campaign->network_id)->where('currency', $campaign->currency)
            ->whereIn('publisher_campaign_id', $campaign->applications()->select('id'))
            ->when($assignment, fn ($q) => $q->where('publisher_campaign_id', $assignment->id)->where('publisher_id', $assignment->publisher_id));
    }

    public function filters(Request $request): array
    {
        $data = $request->validate(['status' => 'nullable|in:all,pending,approved,invoiced,paid', 'search' => 'nullable|string|max:100',
            'page' => 'nullable|integer|min:1', 'earning' => 'nullable|integer|min:1']);

        return ['status' => $data['status'] ?? 'all', 'search' => trim($data['search'] ?? '')];
    }

    public function filtered(Builder $query, array $filters): Builder
    {
        return $query->when($filters['status'] !== 'all', fn ($q) => $q->whereIn('status', match ($filters['status']) {
            'invoiced' => ['locked', 'payable'], default => [$filters['status']],
        }))->when($filters['search'] !== '', fn ($q) => $q->whereHas('conversion', fn ($c) => $c->where('order_code', 'like', '%'.$filters['search'].'%')));
    }

    public function can(User $user, string $permission): bool
    {
        return $user->is_super_admin || $user->permissionNames()->contains($permission);
    }

    public function canOperate(User $user, string $permission): bool
    {
        return ($user->is_super_admin || $user->is_network) && $this->can($user, $permission);
    }

    public function build(Campaign $campaign, Request $request, ?PublisherCampaigns $assignment = null): array
    {
        $filters = $this->filters($request);
        $query = $this->query($campaign, $assignment);
        $totals = (clone $query)->whereNotNull('ledger_transaction_id')->selectRaw("COALESCE(SUM(CASE WHEN status = 'pending' THEN amount * 100 - reversed_minor ELSE 0 END), 0) as pending, COALESCE(SUM(CASE WHEN status IN ('approved', 'locked', 'payable', 'paid') THEN amount * 100 - reversed_minor ELSE 0 END), 0) as approved")->first();
        $rows = $this->filtered(clone $query, $filters)->with(['conversion.offer', 'publisher.user'])->orderByDesc('id')->paginate(20);
        $selected = $request->filled('earning') ? $this->detail((clone $query)->findOrFail($request->integer('earning')), $campaign, $request->user(), $assignment) : null;
        $ledger = app(LedgerService::class);
        $balance = $assignment
            ? $ledger->balance($campaign->network_id, $campaign->currency, 'publisher_available', $assignment->publisher_id)
            : min(Money::signedCents($campaign->advertiser->available_budget), $ledger->balance($campaign->network_id, $campaign->currency, 'advertiser', $campaign->advertiser_id));
        $threshold = $assignment ? Money::cents($assignment->publisher->payout_threshold ?? '0') : null;

        return ['currency' => $campaign->currency, 'publisher_view' => $assignment !== null, 'filters' => $filters,
            'summary' => ['pending_minor' => (int) round($totals->pending), 'approved_minor' => (int) round($totals->approved),
                'pending_count' => (clone $query)->where('status', 'pending')->count()],
            'rows' => $rows->getCollection()->map(fn ($e) => $this->row($e))->all(),
            'pagination' => ['page' => $rows->currentPage(), 'last_page' => $rows->lastPage(), 'total' => $rows->total(), 'from' => $rows->firstItem(), 'to' => $rows->lastItem()],
            'selected' => $selected, 'balance_minor' => $balance, 'threshold_minor' => $threshold,
            'payout_url' => $assignment && $balance > 0 && $balance >= $threshold && $this->can($request->user(), 'request_payouts') ? route('publisher.invoices.create') : null,
            'export_url' => $assignment ? route('publisher.finance.export', $assignment) : route('campaign.finance.export', $campaign)];
    }

    public function row(PublisherEarning $earning): array
    {
        return ['id' => $earning->id, 'order' => $earning->conversion?->order_code ?: 'Earning #'.$earning->id,
            'publisher' => $earning->publisher?->business_name ?: trim(($earning->publisher?->user?->first_name ?? '').' '.($earning->publisher?->user?->last_name ?? '')) ?: 'Unknown publisher', 'offer' => $earning->conversion?->offer?->name ?? 'Unavailable offer',
            'currency' => $earning->currency, 'commission_minor' => Money::cents($earning->amount) - $earning->reversed_minor,
            'original_minor' => Money::cents($earning->amount), 'reversed_minor' => $earning->reversed_minor,
            'status' => $earning->status, 'status_label' => match ($earning->status) {
                'pending' => 'Compensation pending review', 'approved' => 'Approved', 'locked' => 'Invoice awaiting approval',
                'payable' => 'Invoice awaiting payment', 'paid' => 'Paid', 'rejected' => 'Rejected', 'reversed' => 'Reversed', default => 'Unknown',
            }, 'ledger_backed' => (bool) $earning->ledger_transaction_id];
    }

    public function detail(PublisherEarning $earning, Campaign $campaign, User $user, ?PublisherCampaigns $assignment): array
    {
        $earning->load(['conversion.offer', 'publisher.user', 'invoice']);
        $invoice = $earning->invoice;
        // An advertiser can see this campaign's lines, but not another advertiser's invoice data.
        $fullInvoice = $assignment ? $this->can($user, 'view_invoices') : $this->canOperate($user, 'view_network_invoices');
        $invoiceData = null;
        if ($invoice && $invoice->network_id === $earning->network_id && $invoice->publisher_id === $earning->publisher_id && $invoice->currency === $earning->currency) {
            $lines = collect($invoice->invoice_details['lines'] ?? [])->keyBy('earning_id');
            $campaignLines = $this->query($campaign, $assignment)->where('invoice_id', $invoice->id)->get();
            $subtotal = $campaignLines->sum(fn ($e) => $lines->get($e->id)['amount_minor'] ?? Money::cents($e->amount));
            $invoiceData = ['number' => $invoice->invoice_number, 'campaign_minor' => $subtotal,
                'total_minor' => $fullInvoice ? Money::cents($invoice->amount) : null,
                'recovery_minor' => $fullInvoice ? ($invoice->invoice_details['recovery_minor'] ?? 0) : null,
                'other_campaigns' => $fullInvoice && $invoice->earnings()->count() > $campaignLines->count(),
                'url' => $fullInvoice ? route($assignment ? 'publisher.invoices.show' : 'admin.invoices.show', $invoice->id) : null,
                'payment_reference' => $fullInvoice ? $invoice->payment_reference : null, 'evidence' => $fullInvoice ? $invoice->payment_evidence : null];
        }
        $history = [];
        $event = $earning->conversion_event_id ? DB::table('conversion_events')->find($earning->conversion_event_id) : null;
        if ($event) {
            $history[] = ['label' => 'Outcome confirmed', 'at' => $this->iso($event->occurred_at), 'note' => null];
        }
        $transactions = DB::table('financial_transactions')->where('network_id', $campaign->network_id)->where('currency', $campaign->currency)
            ->where(function ($q) use ($earning, $invoiceData, $invoice) {
                $q->where('earning_id', $earning->id);
                if ($invoiceData) {
                    $q->orWhere('publisher_invoice_id', $invoice->id);
                }
            })->orderBy('created_at')->orderBy('id')->get();
        foreach ($transactions as $transaction) {
            $label = match ($transaction->kind) {
                'approval' => 'Compensation approved', 'rejection' => 'Compensation rejected', 'refund' => 'Partial refund recorded',
                'reversal' => 'Compensation reversed', 'chargeback' => 'Chargeback recorded', 'invoice_lock' => 'Invoice requested',
                'invoice_approve' => 'Invoice approved', 'invoice_pay' => 'Payment recorded', 'invoice_reject' => 'Invoice cancelled', default => null,
            };
            if ($label) {
                $details = json_decode($transaction->details, true);
                $history[] = ['label' => $label, 'at' => $this->iso($transaction->created_at), 'note' => $transaction->earning_id ? ($details['reason'] ?? null) : null];
            }
        }
        $mutable = $earning->ledger_transaction_id && in_array($earning->status, ['pending', 'approved', 'paid'], true);

        return [...$this->row($earning), 'sale_minor' => Money::cents($earning->base_value ?? '0'),
            'fraud_url' => ! $assignment && $this->canOperate($user, 'review_commissions') ? route('fraud.show', $earning) : null,
            'refunded_basis_minor' => $earning->refunded_basis_minor, 'rate' => (float) $earning->commission_rate,
            'commission_type' => $earning->commission_type, 'confirmed_at' => $event ? $this->iso($event->occurred_at) : null,
            'history' => $history, 'invoice' => $invoiceData,
            'review_url' => ! $assignment && $earning->status === 'pending' && $mutable && $this->canOperate($user, 'review_commissions') ? route('campaign.finance.review', [$campaign, $earning]) : null,
            'preview_url' => ! $assignment && $mutable && Money::cents($earning->base_value ?? '0') > 0 ? route('campaign.finance.preview', [$campaign, $earning]) : null,
            'adjust_url' => ! $assignment && $mutable && $this->canOperate($user, 'adjust_commissions') ? route('campaign.finance.adjust', [$campaign, $earning]) : null];
    }

    public function version(PublisherEarning $earning): string
    {
        return hash('sha256', json_encode([$earning->id, $earning->status, $earning->amount, $earning->base_value, $earning->reversed_minor, $earning->refunded_basis_minor, $earning->invoice_id]));
    }

    public function preview(PublisherEarning $earning, string $amount): array
    {
        abort_unless($earning->ledger_transaction_id && in_array($earning->status, ['pending', 'approved', 'paid'], true), 409, 'This earning cannot be adjusted. Refresh its financial status.');
        $basis = Money::cents($earning->base_value ?? '0');
        $delta = Money::cents($amount);
        abort_unless($basis > 0 && $delta > 0 && $earning->refunded_basis_minor + $delta <= $basis, 422, 'Refund exceeds the unrefunded sale basis.');
        $original = Money::cents($earning->amount);
        $target = Money::proportion($original, $earning->refunded_basis_minor + $delta, $basis);

        return ['reversal_minor' => $target - $earning->reversed_minor, 'remaining_minor' => $original - $target,
            'recovery' => $earning->status === 'paid', 'version' => $this->version($earning)];
    }

    private function iso(string $date): string
    {
        return CarbonImmutable::parse($date, 'UTC')->toISOString();
    }
}
