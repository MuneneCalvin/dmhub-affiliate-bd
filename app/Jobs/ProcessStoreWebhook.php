<?php

namespace App\Jobs;

use App\Models\StoreWebhookDelivery;
use App\Services\Promotions\PromotionOrderService;
use App\Services\Promotions\ShopifyDiscountService;
use App\Services\Promotions\ShopifyWebhookService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class ProcessStoreWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 8;

    public int $timeout = 60;

    public function __construct(public int $deliveryId) {}

    public function backoff(): array
    {
        return [30, 60, 120, 300, 600, 1800, 3600];
    }

    public function handle(ShopifyWebhookService $service, ShopifyDiscountService $api, PromotionOrderService $orders): void
    {
        Cache::lock('store-webhook:'.$this->deliveryId, 90)->block(5, function () use ($service, $api, $orders) {
            $delivery = StoreWebhookDelivery::findOrFail($this->deliveryId);
            if ($delivery->status === 'processed') {
                return;
            }
            abort_unless($delivery->store->status === 'connected', 503);
            $service->process($delivery->store, $delivery->topic, $delivery->payload, $api, $orders);
            $delivery->update(['status' => 'processed', 'processed_at' => now()]);
        });
    }

    public function failed(?\Throwable $error): void
    {
        StoreWebhookDelivery::whereKey($this->deliveryId)->where('status', 'pending')->update(['status' => 'failed']);
    }
}
