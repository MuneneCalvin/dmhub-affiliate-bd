<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('click_id')->constrained('clicks')->onDelete('cascade');

            $table->unsignedBigInteger('external_click_id')->nullable();

            $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->foreignId('offer_id')->constrained('offers')->onDelete('cascade');
            $table->foreignId('publisher_campaign_id')->constrained('publisher_campaigns')->onDelete('cascade');
            $table->string('conversion_type', 50);
            $table->string('order_code', 50);
            $table->string('transaction_code', 50);
            $table->decimal('sale_amount', 20, 2);
            $table->string('currency', 3);
            $table->string('commission_type', 50);
            $table->decimal('commission_rate', 20, 2);
            $table->decimal('commission_amount', 20, 2);
            $table->string('status', 1)->default('A');
            $table->string('reviewed_by', 100);
            $table->timestamp('reviewed_at');
            $table->text('review_notes');
            $table->string('ip_address', 100);
            $table->string('user_agent', 100);
            $table->jsonb('metadata');
            $table->date('conversion_date');
            $table->timestamp('approved_at');
            $table->timestamp('rejected_at');
            $table->timestamps();

            $table->index('external_click_id', 'idx_conversions_external_click_id');
            $table->index('publisher_id', 'idx_conversions_publisher_id');
            $table->index('network_id', 'idx_conversions_network_id');
            $table->index('campaign_id', 'idx_conversions_campaign_id');
            $table->index('offer_id', 'idx_conversions_offer_id');
            $table->index('publisher_campaign_id', 'idx_conversions_pub_campaign_id');
            $table->index('conversion_type', 'idx_conversions_conversion_type');
            $table->index('order_code', 'idx_conversions_order_code');
            $table->unique('transaction_code', 'uniq_conversions_transaction_code');
            $table->index('status', 'idx_conversions_status');
            $table->index('conversion_date', 'idx_conversions_conversion_date');

            $table->index(['publisher_id', 'campaign_id'], 'idx_conversions_pub_campaign');
            $table->index(['offer_id', 'conversion_date'], 'idx_conversions_offer_date');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversions');
    }
};
