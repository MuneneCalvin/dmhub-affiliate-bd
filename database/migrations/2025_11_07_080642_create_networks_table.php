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
        Schema::create('networks', function (Blueprint $table) {
            $table->id();
            $table->string('network_name', 100);
            $table->string('status', 1)->default('P');
            $table->string('owner_email')->unique();
            $table->string('default_currency', 3);
            $table->string('default_commission_model', 20)->default(0);
            $table->decimal('default_commission_value', 20, 2)->default(0);
            $table->decimal('min_payment_threshold', 20, 2)->default(0);
            $table->string('payment_frequency')->nullable();
            $table->integer('pay_day_of_month')->default(1);
            $table->integer('pay_day_of_week');
            $table->jsonb('settings')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('support_email')->unique()->nullable();
            $table->string('support_phone', 15)->unique()->nullable();

            $table->string('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();

            $table->string('country_iso', 3)->nullable();
            $table->timestamps();

            // status P for pending A for Approved N for InActive
            
            $table->index('status', 'networks_status_index');
            $table->index('country_iso', 'networks_country_iso_index');
            $table->index('approved_at', 'networks_approved_at_index');
            $table->index(['status', 'country_iso'], 'networks_status_country_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('networks');
    }
};
