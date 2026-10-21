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
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
           $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->json('terms')->nullable();
            $table->string('offer_status', 1)->default('A');
            $table->bigInteger('commission_type_1')->nullable();
            $table->decimal('commission_value_1', 20, 2)->default(0);
            $table->bigInteger('commission_type_2')->nullable();
            $table->decimal('commission_value_2', 20, 2)->default(0);
            $table->json('bonus')->nullable();
            $table->integer('conversion_window_hours')->nullable();
            $table->integer('click_cookie_lifetime_hours')->nullable();
            $table->decimal('minimum_payout', 20, 2)->default(0);
            $table->json('allowed_traffic_sources')->nullable();
            $table->json('prohibited_traffic_sources')->nullable();
            $table->string('preview_url')->nullable();
            $table->string('tracking_url_template')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->integer('total_clicks')->default(0);
            $table->decimal('total_conversions', 20, 2)->default(0);
            $table->decimal('conversion_rate', 20, 2)->default(0);
            $table->decimal('avg_order_value', 20, 2)->default(0);
            $table->decimal('earnings_per_click', 20, 2)->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('campaign_id', 'offers_campaign_id_index');
            $table->index('network_id', 'offers_network_id_index');
            $table->index('offer_status', 'offers_status_index');

            $table->unique(['network_id', 'campaign_id', 'name'], 'offers_network_campaign_name_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
