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
        Schema::create('publishers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');
            $table->foreignId('network_id')
                ->nullable()
                ->constrained('networks')
                ->onDelete('cascade');
            $table->string('website_url');
            $table->json('traffic_sources')->nullable();
            $table->integer('monthly_visitors')->nullable();
            $table->string('primary_verticals')->nullable();
            $table->string('secondary_verticals')->nullable();
            $table->string('payout_method')->nullable();
            $table->decimal('payout_threshold', 20, 2)->default(0);
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->integer('total_clicks')->default(0);
            $table->integer('total_conversions')->default(0);
            $table->decimal('total_earnings', 20, 2)->default(0);
            $table->decimal('conversion_rate', 20, 2)->default(0);
            $table->decimal('account_health_score', 20, 2)->default(0);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('user_id', 'publishers_user_id_index');
            $table->index('network_id', 'publishers_network_id_index');
            $table->index('is_verified', 'publishers_is_verified_index');
            $table->index('last_active_at', 'publishers_last_active_at_index');
            $table->index(['user_id', 'network_id'], 'publishers_user_network_index');

            $table->unique(['user_id', 'network_id'], 'publishers_user_network_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publishers');
    }
};
