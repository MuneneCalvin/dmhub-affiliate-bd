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
        Schema::table('advertisers', function (Blueprint $table) {
             $table->string('coc_number', 10)->unique()->nullable();
        });
          Schema::table('publishers', function (Blueprint $table) {
              $table->string('coc_number', 10)->unique()->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisers', function (Blueprint $table) {
             $table->dropColumn('coc_number');
        });
         Schema::table('publishers', function (Blueprint $table) {
             $table->dropColumn('coc_number');
        });
    }
};
