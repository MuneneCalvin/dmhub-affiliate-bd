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
        Schema::create('disputes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversion_id')->constrained('conversions')->onDelete('cascade');
           $table->foreignId('publisher_id')->constrained('publishers')->onDelete('cascade');
            $table->foreignId('network_id')->constrained('networks')->onDelete('cascade');
            $table->integer('dispute_number');
            $table->string('status', 1)->default('O');
            $table->decimal('disputed_amount', 20, 2);
            $table->decimal('resolved_amount', 20, 2)->nullable();
            $table->string('resolved_by', 100)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            // ---- Indexing Section ----
            $table->unique(['dispute_number', 'publisher_id'], 'uniq_disputes_number_publisher');
            $table->index('conversion_id', 'idx_disputes_conversion_id');
            $table->index('publisher_id', 'idx_disputes_publisher_id');
            $table->index('network_id', 'idx_disputes_network_id');
            $table->index('status', 'idx_disputes_status');
            $table->index('resolved_at', 'idx_disputes_resolved_at');
            $table->index('last_message_at', 'idx_disputes_last_message_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};
