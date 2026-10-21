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
        Schema::table('clicks', function (Blueprint $table) {
            $table->foreignId('creative_id')->nullable()->after('publisher_campaign_id')->constrained('creatives')->onDelete('set null');
            $table->index('creative_id', 'idx_clicks_creative');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clicks', function (Blueprint $table) {
            $table->dropForeign(['creative_id']);
            $table->dropIndex('idx_clicks_creative');
            $table->dropColumn('creative_id');
        });
    }
};
