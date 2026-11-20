<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->text('preview_url')->nullable()->change();
            $table->text('tracking_url_template')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Preserve potentially long destinations when rolling back application code.
    }
};
