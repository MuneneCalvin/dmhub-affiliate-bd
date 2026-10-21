<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->dropForeign(['offer_id']);
            $table->unsignedBigInteger('offer_id')->nullable()->change();
            $table->foreign('offer_id')
                ->references('id')
                ->on('offers')
                ->onDelete('set null');
        });
    }
    public function down(): void
    {
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->dropForeign(['offer_id']);
            $table->unsignedBigInteger('offer_id')->nullable(false)->change();
            $table->foreign('offer_id')
                ->references('id')
                ->on('offers')
                ->onDelete('cascade');
        });
    }
};
