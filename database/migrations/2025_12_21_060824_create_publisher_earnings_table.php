<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('publisher_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->foreignId('publisher_campaign_id')->constrained('publisher_campaigns')->onDelete('cascade');
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('set null');
            $table->foreignId('conversion_id')->nullable()->constrained('conversions')->onDelete('set null');
            $table->decimal('amount', 20, 2);
            $table->string('commission_type', 50);
            $table->decimal('commission_rate', 10, 4)->nullable();
            $table->decimal('base_value', 20, 2)->nullable();
            $table->enum('status', ['pending', 'approved', 'invoiced', 'paid', 'rejected'])->default('pending');
            $table->foreignId('invoice_id')->nullable()->constrained('publisher_invoices')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('publisher_id', 'idx_earnings_publisher');
            $table->index('publisher_campaign_id', 'idx_earnings_campaign');
            $table->index('lead_id', 'idx_earnings_lead');
            $table->index('status', 'idx_earnings_status');
            $table->index('invoice_id', 'idx_earnings_invoice');
            $table->index(['publisher_id', 'status'], 'idx_earnings_publisher_status');
            $table->index('created_at', 'idx_earnings_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publisher_earnings');
    }
};
