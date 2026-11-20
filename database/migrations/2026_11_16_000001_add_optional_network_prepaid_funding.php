<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('networks', function (Blueprint $table) {
            $table->boolean('requires_prepaid_funding')->default(false);
        });
        Schema::table('advertisers', function (Blueprint $table) {
            $table->decimal('credit_limit', 11, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('advertisers', function (Blueprint $table) {
            $table->dropColumn('credit_limit');
        });
        Schema::table('networks', function (Blueprint $table) {
            $table->dropColumn('requires_prepaid_funding');
        });
    }
};
