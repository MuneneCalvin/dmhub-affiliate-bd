<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_tracking_handoffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_campaign_id')->constrained('publisher_campaigns')->cascadeOnDelete();
            $table->foreignId('offer_id')->constrained('offers')->cascadeOnDelete();
            $table->foreignId('copied_by')->constrained('users')->cascadeOnDelete();
            $table->string('platform', 30);
            $table->timestamp('copied_at');
            $table->unique(['publisher_campaign_id', 'offer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_tracking_handoffs');
    }
};
