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
        Schema::create('publisher_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->decimal('amount', 20, 2);
            $table->string('currency', 3)->default('USD');
            $table->date('period_start');
            $table->date('period_end');
            $table->enum('status', ['pending', 'approved', 'processing', 'paid', 'rejected'])->default('pending');
            $table->string('payment_method', 100)->nullable();
            $table->string('payment_reference', 255)->nullable();
            $table->timestamp('requested_at')->useCurrent();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->text('notes')->nullable();
            $table->json('invoice_details')->nullable();
            $table->timestamps();

            $table->index('publisher_id', 'idx_invoices_publisher');
            $table->index('network_id', 'idx_invoices_network');
            $table->index('status', 'idx_invoices_status');
            $table->index('requested_at', 'idx_invoices_requested');
            $table->index(['publisher_id', 'status'], 'idx_invoices_publisher_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publisher_invoices');
    }
};
