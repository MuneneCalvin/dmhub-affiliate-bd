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
        Schema::table('creatives', function (Blueprint $table) {
            $table->string('tracking_code', 32)->unique()->nullable()->after('impressions');
            $table->text('embed_code')->nullable()->after('tracking_code');
            $table->text('tracking_pixel')->nullable()->after('embed_code');

            $table->index('tracking_code', 'idx_creatives_tracking_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('creatives', function (Blueprint $table) {
            $table->dropIndex('idx_creatives_tracking_code');
            $table->dropColumn(['tracking_code', 'embed_code', 'tracking_pixel']);
        });
    }
};
