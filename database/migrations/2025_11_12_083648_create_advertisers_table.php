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
        Schema::create('advertisers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('network_id')
            ->nullable()
            ->constrained('networks')
            ->onDelete('cascade');
            $table->string('business_name', 200);
            $table->string('website_name', 100);
            $table->string('industry', 200);
            $table->decimal('total_budget', 20, 8)->default(0);
            $table->decimal('available_budget', 20, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->boolean('auto_approve_publishers')->default(false);
            $table->boolean('require_publisher_approval')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->string('status', 1)->default('A');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('id', 'advertisers_advertiser_id_index');
            $table->index('user_id', 'advertisers_user_id_index');
            $table->index('network_id', 'advertisers_network_id_index');
            $table->index('is_verified', 'advertisers_is_verified_index');

            $table->unique(['id', 'network_id'], 'advertisers_advertiser_network_unique');
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advertisers');
    }
};
