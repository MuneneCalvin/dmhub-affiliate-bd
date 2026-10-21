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
        Schema::create('clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->foreignId('offer_id')->constrained('offers')->onDelete('cascade');

            $table->string('ip_address', 100)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('referer', 255)->nullable();
            $table->string('device_type', 100)->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('operating_system', 100)->nullable();
            $table->string('country_iso', 3)->nullable(); // ALPHA3
            $table->string('region', 200)->nullable();
            $table->string('city_town', 100)->nullable();

            $table->boolean('is_converted')->default(false);
            $table->timestamp('converted_at')->nullable();
            $table->timestamp('clicked_at')->useCurrent();
            $table->timestamps();


            $table->index(['publisher_id', 'campaign_id'], 'idx_clicks_publisher_campaign');
            $table->index('offer_id', 'idx_clicks_offer_id');
            $table->index('network_id', 'idx_clicks_network_id');
            $table->index(['is_converted', 'clicked_at'], 'idx_clicks_conversion_time');
            $table->index(['country_iso', 'region'], 'idx_clicks_geo_lookup');

            $table->unique(['publisher_id', 'campaign_id', 'offer_id', 'clicked_at'], 'unique_click_entry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clicks');
    }
};
