<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A publisher is a company or an individual, and promotes through one or more channels, each with a URL
     * or an account name. Existing publishers are companies; their website becomes their first channel.
     */
    public function up(): void
    {
        Schema::table('publishers', fn (Blueprint $table) => $table->string('publisher_type', 12)->default('company')->after('user_id'));

        Schema::create('publisher_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_id')->constrained('publishers')->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('handle', 255);
            $table->timestamps();
            $table->unique(['publisher_id', 'type']);
        });

        $this->backfill();
    }

    /** One website channel per publisher that has a website and no website channel yet. Safe to run again. */
    public function backfill(): void
    {
        DB::table('publishers')->where('website_url', '!=', '')->whereNotNull('website_url')->orderBy('id')->chunkById(500, function ($publishers) {
            foreach ($publishers as $publisher) {
                DB::table('publisher_channels')->insertOrIgnore([
                    'publisher_id' => $publisher->id, 'type' => 'website', 'handle' => mb_substr($publisher->website_url, 0, 255),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publisher_channels');
        Schema::table('publishers', fn (Blueprint $table) => $table->dropColumn('publisher_type'));
    }
};
