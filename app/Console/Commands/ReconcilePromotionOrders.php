<?php

namespace App\Console\Commands;

use App\Jobs\ProcessStoreWebhook;
use App\Models\PromotionOrder;
use App\Models\StoreWebhookDelivery;
use App\Services\Promotions\PromotionOrderService;
use Illuminate\Console\Command;

class ReconcilePromotionOrders extends Command
{
    protected $signature = 'promotions:reconcile {--order= : Retry a specific order after resolving its review reason} {--delivery= : Retry a failed Shopify webhook delivery}';

    protected $description = 'Retry durably recorded promotion orders';

    public function handle(PromotionOrderService $service): int
    {
        if ($deliveryId = $this->option('delivery')) {
            $delivery = StoreWebhookDelivery::findOrFail($deliveryId);
            if ($delivery->status !== 'processed') {
                $delivery->update(['status' => 'pending']);
                ProcessStoreWebhook::dispatch($delivery->id);
            }

            return self::SUCCESS;
        }
        StoreWebhookDelivery::where('status', 'pending')->where('updated_at', '<', now()->subMinutes(2))
            ->eachById(fn ($delivery) => ProcessStoreWebhook::dispatch($delivery->id));
        $query = PromotionOrder::query();
        if ($id = $this->option('order')) {
            $query->whereKey($id)->whereIn('status', ['pending', 'needs_review']);
        } else {
            $query->where('status', 'pending');
        }
        $query->eachById(function ($order) use ($service, $id) {
            // Monetary/timing review cannot be bypassed with this command.
            if ($order->review_reason === 'Order totals or payment time need review.') {
                return;
            }
            if ($id) {
                $order->update(['status' => 'pending']);
            }
            $service->confirm($order);
        });

        return self::SUCCESS;
    }
}
