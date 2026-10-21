<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('network_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_id')->constrained()->onDelete('cascade');
            
            // Set these to nullable() immediately during creation 
            // instead of calling ->change() later in the same block.
            $table->foreignId('advertiser_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('campaign_id')->nullable()->constrained()->onDelete('cascade');
            
            $table->decimal('amount_debited', 20, 4)->default(0);
            $table->decimal('amount_credited', 20, 4)->default(0);
            $table->decimal('total_amount', 20, 4)->default(0);
            $table->string('status');
            $table->string('currency', 3)->default('USD');
            $table->timestamps();

            $table->index(['network_id', 'created_at']);
        });

        // Use DB::unprepared for the PostgreSQL Function
        DB::unprepared("
            CREATE OR REPLACE FUNCTION calculate_network_balance(net_id BIGINT)
            RETURNS DECIMAL(20,4) AS $$
            BEGIN
                -- Logic: Credited usually means 'added' to balance, Debited 'removed'
                -- Adjusted the math below to reflect standard accounting (In - Out)
                RETURN (SELECT COALESCE(SUM(amount_credited), 0) - COALESCE(SUM(amount_debited), 0)
                        FROM network_earnings
                        WHERE network_id = net_id);
            END;
            $$ LANGUAGE plpgsql;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP FUNCTION IF EXISTS calculate_network_balance(BIGINT);");
        Schema::dropIfExists('network_earnings');
    }
};