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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->foreignId('advertiser_id')->constrained('advertisers')->onDelete('cascade');
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->jsonb('terms')->nullable();
            $table->timestamp('start_date');
            $table->timestamp('end_date');
            $table->string('campaign_status', 1)->default('A');
            $table->decimal('total_budget', 20, 2)->default(0);
            $table->decimal('daily_budget', 20, 2)->default(0);
            $table->decimal('spent_amount', 20, 2)->default(0);
            $table->string('currency', 3);
            $table->json('geo_targeting')->nullable();
            $table->json('device_targeting')->nullable();
            $table->integer('max_publishers')->nullable();
            $table->integer('target_conversions')->nullable();
            $table->decimal('target_roi', 20, 2)->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('network_id', 'campaigns_network_id_index');
            $table->index('advertiser_id', 'campaigns_advertiser_id_index');
            $table->index('campaign_status', 'campaigns_status_index');

            $table->unique(['network_id', 'advertiser_id', 'name'], 'campaigns_network_advertiser_name_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
