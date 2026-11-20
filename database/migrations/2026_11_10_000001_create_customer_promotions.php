<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advertiser_id')->constrained()->restrictOnDelete();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->uuid('public_id')->unique();
            $table->string('name');
            $table->string('platform', 20);
            $table->string('domain')->unique();
            $table->string('currency', 3);
            $table->string('status', 20)->default('pending');
            $table->string('token_hash', 64)->nullable();
            $table->text('credentials')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
        Schema::create('store_webhook_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_connection_id')->constrained()->restrictOnDelete();
            $table->string('delivery_id', 100);
            $table->string('topic', 40);
            $table->string('payload_hash', 64);
            $table->json('payload');
            $table->string('status', 20)->default('pending');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['store_connection_id', 'delivery_id']);
        });
        Schema::create('customer_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->unique()->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('draft');
            $table->json('draft');
            $table->unsignedInteger('published_version')->nullable();
            $table->timestamps();
        });
        Schema::create('promotion_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_promotion_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->json('configuration');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->unique(['customer_promotion_id', 'version']);
        });
        Schema::create('promotion_store', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_promotion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_connection_id')->constrained()->restrictOnDelete();
            $table->unique(['customer_promotion_id', 'store_connection_id']);
        });
        Schema::create('promotion_grants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('promotion_version_id')->constrained()->restrictOnDelete();
            $table->foreignId('store_connection_id')->constrained()->restrictOnDelete();
            $table->foreignId('click_id')->constrained('clicks')->restrictOnDelete();
            $table->string('session_hash', 64);
            $table->string('code')->unique();
            $table->string('platform_discount_id')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();
            $table->unique(['store_connection_id', 'click_id', 'session_hash']);
        });
        Schema::create('promotion_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_connection_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('promotion_grant_id')->constrained('promotion_grants')->restrictOnDelete();
            $table->string('external_id', 100);
            $table->string('payload_hash', 64);
            $table->json('payload');
            $table->foreignId('conversion_event_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('pending');
            $table->string('review_reason')->nullable();
            $table->timestamps();
            $table->unique(['store_connection_id', 'external_id']);
        });
        Schema::create('promotion_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_connection_id')->constrained()->restrictOnDelete();
            $table->string('external_id', 100);
            $table->string('order_external_id', 100);
            $table->string('payload_hash', 64);
            $table->json('payload');
            $table->string('status')->default('needs_review');
            $table->timestamps();
            $table->unique(['store_connection_id', 'external_id']);
        });
    }

    public function down(): void
    {
        foreach (['promotion_adjustments', 'promotion_orders', 'promotion_grants', 'promotion_store', 'promotion_versions', 'customer_promotions', 'store_webhook_deliveries', 'store_connections'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
