<?php

namespace App\Services;

use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function createInvoice(Publisher $publisher, ?string $startDate = null, ?string $endDate = null): ?PublisherInvoice
    {
        $endDate = $endDate ?? now()->format('Y-m-d');
        $startDate = $startDate ?? now()->subMonth()->format('Y-m-d');

        return DB::transaction(function () use ($publisher, $startDate, $endDate) {
            // Lock the candidate earnings so two concurrent requests cannot invoice the same rows twice.
            $earnings = PublisherEarning::where('publisher_id', $publisher->id)
                ->whereIn('status', ['pending', 'approved'])
                ->whereNull('invoice_id')
                ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                ->lockForUpdate()
                ->get();

            if ($earnings->isEmpty()) {
                return null;
            }

            $totalAmount = $earnings->sum('amount');

            if ($totalAmount < ($publisher->payout_threshold ?? 0)) {
                return null;
            }

            $breakdown = $this->buildInvoiceBreakdown($earnings);

            $invoice = PublisherInvoice::create([
                'publisher_id' => $publisher->id,
                'network_id' => $publisher->network_id,
                'amount' => $totalAmount,
                'currency' => 'USD',
                'period_start' => $startDate,
                'period_end' => $endDate,
                'status' => 'pending',
                'payment_method' => $publisher->payout_method,
                'requested_at' => now(),
                'invoice_details' => $breakdown,
            ]);
            PublisherEarning::whereIn('id', $earnings->pluck('id'))
                ->update([
                    'status' => 'invoiced',
                    'invoice_id' => $invoice->id,
                ]);

            return $invoice;
        });
    }

    protected function buildInvoiceBreakdown($earnings): array
    {
        $breakdown = [
            'by_campaign' => [],
            'by_type' => [],
            'summary' => [
                'total_earnings' => 0,
                'total_leads' => 0,
                'total_conversions' => 0,
            ],
        ];

        foreach ($earnings as $earning) {
            $campaignId = $earning->publisherCampaign?->campaign_id ?? 0;
            $campaignName = $earning->publisherCampaign?->campaign?->name ?? 'Unknown Campaign';

            if (! isset($breakdown['by_campaign'][$campaignId])) {
                $breakdown['by_campaign'][$campaignId] = [
                    'name' => $campaignName,
                    'amount' => 0,
                    'count' => 0,
                ];
            }

            $breakdown['by_campaign'][$campaignId]['amount'] += $earning->amount;
            $breakdown['by_campaign'][$campaignId]['count']++;

            // By type
            $type = $earning->commission_type;
            if (! isset($breakdown['by_type'][$type])) {
                $breakdown['by_type'][$type] = [
                    'amount' => 0,
                    'count' => 0,
                ];
            }
            $breakdown['by_type'][$type]['amount'] += $earning->amount;
            $breakdown['by_type'][$type]['count']++;

            // Summary
            $breakdown['summary']['total_earnings'] += $earning->amount;
            if ($earning->lead_id) {
                $breakdown['summary']['total_leads']++;
            }
            if ($earning->conversion_id) {
                $breakdown['summary']['total_conversions']++;
            }
        }

        return $breakdown;
    }

    public function approveInvoice(PublisherInvoice $invoice, int $userId): bool
    {
        if ($invoice->status !== 'pending') {
            return false;
        }
        $invoice->approve($userId);

        return true;
    }

    public function rejectInvoice(PublisherInvoice $invoice, string $reason, int $userId): bool
    {
        if ($invoice->status !== 'pending') {
            return false;
        }

        DB::transaction(function () use ($invoice, $reason, $userId) {
            $invoice->reject($reason, $userId);

            // Revert earnings to approved status so they can be invoiced again
            PublisherEarning::where('invoice_id', $invoice->id)
                ->update([
                    'status' => 'approved',
                    'invoice_id' => null,
                ]);
        });

        return true;
    }

    public function markAsPaid(PublisherInvoice $invoice, ?string $paymentReference = null): bool
    {
        if (! in_array($invoice->status, ['approved', 'processing'])) {
            return false;
        }
        $invoice->markAsPaid($paymentReference);

        return true;
    }

    public function getPublisherInvoiceSummary(int $publisherId): array
    {
        $invoices = PublisherInvoice::where('publisher_id', $publisherId)
            ->selectRaw('status, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return [
            'pending' => [
                'amount' => $invoices->get('pending')?->total ?? 0,
                'count' => $invoices->get('pending')?->count ?? 0,
            ],
            'approved' => [
                'amount' => $invoices->get('approved')?->total ?? 0,
                'count' => $invoices->get('approved')?->count ?? 0,
            ],
            'paid' => [
                'amount' => $invoices->get('paid')?->total ?? 0,
                'count' => $invoices->get('paid')?->count ?? 0,
            ],
            'rejected' => [
                'amount' => $invoices->get('rejected')?->total ?? 0,
                'count' => $invoices->get('rejected')?->count ?? 0,
            ],
        ];
    }

    public function canRequestInvoice(Publisher $publisher): array
    {
        $availableAmount = PublisherEarning::where('publisher_id', $publisher->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('invoice_id')
            ->sum('amount');

        $threshold = $publisher->payout_threshold ?? 0;
        $canRequest = $availableAmount >= $threshold;

        return [
            'can_request' => $canRequest,
            'available_amount' => $availableAmount,
            'threshold' => $threshold,
            'remaining' => max(0, $threshold - $availableAmount),
        ];
    }
}
