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
        Schema::table('clicks', function (Blueprint $table) {
            $table->foreignId('publisher_campaign_id')
                ->nullable()
                ->after('offer_id')
                ->constrained('publisher_campaigns')
                ->onDelete('cascade');
            $table->index('publisher_campaign_id', 'idx_clicks_publisher_campaign_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clicks', function (Blueprint $table) {
            $table->dropForeign(['publisher_campaign_id']);
            $table->dropIndex('idx_clicks_publisher_campaign_id');
            $table->dropColumn('publisher_campaign_id');
        });
    }
};
