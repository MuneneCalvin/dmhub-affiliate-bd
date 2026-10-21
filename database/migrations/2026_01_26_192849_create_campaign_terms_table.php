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
        Schema::create('campaign_terms', function (Blueprint $table) {
            $table->id();
            $table->string('description', 100);
            $table->foreignId('advertiser_id')
                  ->nullable()
                  ->constrained('advertisers')
                  ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_terms');
    }
};
