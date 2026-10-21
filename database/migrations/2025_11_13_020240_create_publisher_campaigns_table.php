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
        Schema::create('publisher_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->foreignId('offer_id')->constrained('offers')->onDelete('cascade');
           $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');

            $table->string('status', 1)->default('A');
            $table->string('commission_type', 100)->nullable();
            $table->decimal('commission_value', 20, 2)->nullable();
            $table->text('applied_notes')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->string('approved_by', 50)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->integer('total_clicks')->default(0);
            $table->integer('total_conversions')->default(0);
            $table->decimal('total_revenue', 20, 2)->default(0);
            $table->decimal('total_commission', 20, 2)->default(0);
            $table->string('tracking_link')->nullable();
            $table->string('sub')->nullable(); // publisher tracking
            $table->timestamp('terminated_at')->nullable();

            $table->timestamps();

            $table->unique(['publisher_id', 'campaign_id', 'network_id'], 'publisher_campaigns_unique');
            
            $table->index('publisher_id', 'idx_publisher_id');
            $table->index('network_id', 'idx_network_id');
            $table->index('status', 'idx_status');
            $table->index('offer_id', 'idx_offer_id');
            $table->index(['campaign_id', 'status'], 'idx_campaign_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publisher_campaigns');
    }
};
