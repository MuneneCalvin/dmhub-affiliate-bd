<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->string('currency', 3);
            $table->string('reference', 191)->unique();
            $table->string('kind', 40);
            $table->string('subject_type', 40);
            $table->unsignedBigInteger('subject_id');
            $table->foreignId('advertiser_id')->nullable()->constrained('advertisers')->restrictOnDelete();
            $table->foreignId('earning_id')->nullable()->constrained('publisher_earnings')->restrictOnDelete();
            $table->foreignId('publisher_invoice_id')->nullable()->constrained('publisher_invoices')->restrictOnDelete();
            $table->foreignId('network_invoice_id')->nullable()->constrained('network_invoices')->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('payload_hash', 64);
            $table->json('details');
            $table->timestamp('created_at');
            $table->index(['subject_type', 'subject_id']);
        });
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('financial_transactions')->restrictOnDelete();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->string('currency', 3);
            $table->string('account', 40);
            $table->unsignedBigInteger('owner_id');
            $table->bigInteger('amount_minor');
            $table->index(['network_id', 'currency', 'account', 'owner_id'], 'ledger_balance_index');
        });
        Schema::table('clicks', fn (Blueprint $t) => $t->json('commission_snapshot')->nullable());
        Schema::table('publisher_earnings', function (Blueprint $t) {
            $t->string('currency', 3)->nullable();
            $t->json('commission_snapshot')->nullable();
            $t->unsignedBigInteger('reversed_minor')->default(0);
            $t->unsignedBigInteger('refunded_basis_minor')->default(0);
            $t->foreignId('ledger_transaction_id')->nullable()->unique()->constrained('financial_transactions')->restrictOnDelete();
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->text('review_reason')->nullable();
        });
        // Replace the old enum/check constraint with the complete lifecycle.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE publisher_earnings DROP CONSTRAINT IF EXISTS publisher_earnings_status_check');
        }
        Schema::table('publisher_earnings', fn (Blueprint $t) => $t->string('status', 20)->default('pending')->change());
        foreach (['publisher_invoices', 'network_invoices'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->foreignId('paid_by')->nullable()->constrained('users')->restrictOnDelete();
                $t->string('payment_evidence', 1000)->nullable();
                $t->boolean('ledger_backed')->default(false);
            });
        }
        Schema::table('network_invoices', function (Blueprint $t) {
            $t->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->timestamp('approved_at')->nullable();
        });
        // Retained legacy projection: debited accrual minus credited payout.
        // New callers use currency-scoped ledger balances exclusively.
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION calculate_network_balance(net_id BIGINT)
RETURNS DECIMAL(20,4) AS $$
BEGIN
    IF (SELECT COUNT(DISTINCT currency) FROM network_earnings WHERE network_id = net_id) > 1 THEN
        RAISE EXCEPTION 'Currency is required for a multi-currency network';
    END IF;
    RETURN (SELECT COALESCE(SUM(amount_debited - amount_credited), 0)
            FROM network_earnings WHERE network_id = net_id AND status = 'approved');
END;
$$ LANGUAGE plpgsql;
SQL);
        }
        foreach (['advertisers', 'campaigns'] as $table) {
            $columns = $table === 'advertisers' ? ['currency', 'network_id'] : ['currency', 'network_id', 'advertiser_id'];
            $exists = $table === 'advertisers'
                ? "EXISTS (SELECT 1 FROM ledger_entries WHERE account = 'advertiser' AND owner_id = OLD.id)"
                : 'EXISTS (SELECT 1 FROM publisher_earnings e JOIN publisher_campaigns pc ON pc.id = e.publisher_campaign_id WHERE pc.campaign_id = OLD.id AND e.ledger_transaction_id IS NOT NULL)';
            if (DB::getDriverName() === 'sqlite') {
                $comparison = implode(' OR ', array_map(fn ($column) => "OLD.{$column} IS NOT NEW.{$column}", $columns));
                DB::unprepared("CREATE TRIGGER {$table}_finance_identity BEFORE UPDATE ON {$table} WHEN ({$comparison}) AND {$exists} BEGIN SELECT RAISE(ABORT, 'Funded financial ownership is immutable'); END");
            } elseif (DB::getDriverName() === 'pgsql') {
                $comparison = implode(' OR ', array_map(fn ($column) => "OLD.{$column} IS DISTINCT FROM NEW.{$column}", $columns));
                DB::unprepared("CREATE OR REPLACE FUNCTION protect_{$table}_finance_identity() RETURNS trigger AS $$ BEGIN IF ({$comparison}) AND {$exists} THEN RAISE EXCEPTION 'Funded financial ownership is immutable'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
                DB::unprepared("CREATE TRIGGER {$table}_finance_identity BEFORE UPDATE ON {$table} FOR EACH ROW EXECUTE FUNCTION protect_{$table}_finance_identity()");
            }
        }
        $immutable = [
            'clicks' => ['commission_snapshot'],
            'publisher_earnings' => ['amount', 'currency', 'commission_snapshot', 'publisher_id', 'network_id', 'publisher_campaign_id', 'base_value', 'conversion_event_id'],
            'publisher_invoices' => ['amount', 'currency', 'network_id', 'publisher_id', 'invoice_details', 'ledger_backed'],
            'network_invoices' => ['amount', 'currency', 'network_id', 'ledger_backed'],
        ];
        foreach ($immutable as $table => $columns) {
            $guard = in_array($table, ['publisher_invoices', 'network_invoices']) ? 'OLD.ledger_backed = true AND ' : '';
            if (DB::getDriverName() === 'sqlite') {
                $comparison = implode(' OR ', array_map(fn ($column) => "OLD.{$column} IS NOT NEW.{$column}", $columns));
                DB::unprepared("CREATE TRIGGER {$table}_contract BEFORE UPDATE ON {$table} WHEN {$guard}({$comparison}) BEGIN SELECT RAISE(ABORT, 'Financial contract is immutable'); END");
            } elseif (DB::getDriverName() === 'pgsql') {
                $comparison = implode(' OR ', array_map(fn ($column) => "OLD.{$column}::text IS DISTINCT FROM NEW.{$column}::text", $columns));
                DB::unprepared("CREATE OR REPLACE FUNCTION protect_{$table}_contract() RETURNS trigger AS $$ BEGIN IF {$guard}({$comparison}) THEN RAISE EXCEPTION 'Financial contract is immutable'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
                DB::unprepared("CREATE TRIGGER {$table}_contract BEFORE UPDATE ON {$table} FOR EACH ROW EXECUTE FUNCTION protect_{$table}_contract()");
            }
        }
        foreach (['financial_transactions', 'ledger_entries', 'network_earnings', 'publisher_earnings', 'publisher_invoices', 'network_invoices'] as $table) {
            if (DB::getDriverName() === 'sqlite') {
                foreach (in_array($table, ['financial_transactions', 'ledger_entries', 'network_earnings']) ? ['UPDATE', 'DELETE'] : ['DELETE'] as $operation) {
                    DB::unprepared("CREATE TRIGGER {$table}_no_{$operation} BEFORE {$operation} ON {$table} BEGIN SELECT RAISE(ABORT, 'Financial history is append-only'); END");
                }
            } elseif (DB::getDriverName() === 'pgsql') {
                DB::unprepared("CREATE OR REPLACE FUNCTION reject_financial_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Financial history is append-only'; END; $$ LANGUAGE plpgsql");
                $operations = in_array($table, ['financial_transactions', 'ledger_entries', 'network_earnings']) ? 'UPDATE OR DELETE' : 'DELETE';
                DB::unprepared("CREATE TRIGGER {$table}_immutable BEFORE {$operations} ON {$table} FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation()");
            }
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Financial history cannot be rolled back destructively. Restore a reviewed backup or ship a forward migration.');
    }
};
