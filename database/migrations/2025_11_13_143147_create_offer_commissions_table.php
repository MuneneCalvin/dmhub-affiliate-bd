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
        Schema::create('offer_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->constrained('offers')->onDelete('cascade');
            $table->foreignId('commission_type_id')->constrained('commission_types')->onDelete('cascade');
            $table->decimal('commission_value', 20, 2);
            $table->timestamps();

            // Indexes
            $table->index('offer_id', 'idx_offer_commissions_offer_id');
            $table->index('commission_type_id', 'idx_offer_commissions_type_id');
            $table->index(['offer_id', 'commission_type_id'], 'idx_offer_commissions_offer_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offer_commissions');
    }
};
