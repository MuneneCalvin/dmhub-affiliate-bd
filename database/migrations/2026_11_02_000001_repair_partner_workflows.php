<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite rebuilds changed tables. Preserve every existing protection trigger
        // in this transactional migration, including triggers referencing those tables.
        $triggers = DB::getDriverName() === 'sqlite'
            ? DB::select("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'") : [];
        foreach ($triggers as $trigger) {
            DB::unprepared('DROP TRIGGER "'.str_replace('"', '""', $trigger->name).'"');
        }
        Schema::table('publishers', function (Blueprint $table) {
            $table->string('website_url')->nullable()->change();
            $table->string('business_name')->nullable();
            $table->string('industry')->nullable();
        });
        Schema::table('advertisers', fn (Blueprint $table) => $table->string('website_name')->nullable()->change());
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->foreignId('requested_offer_id')->nullable()->constrained('offers')->restrictOnDelete();
            $table->string('terms_version', 64)->nullable();
            $table->json('terms_snapshot')->nullable();
            $table->timestamp('terms_accepted_at')->nullable();
        });
        Schema::create('partner_enrollment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publisher_campaign_id')->constrained('publisher_campaigns')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action');
            $table->json('details');
            $table->timestamp('created_at');
        });
        foreach ($triggers as $trigger) {
            DB::unprepared($trigger->sql);
        }
        if (DB::getDriverName() === 'sqlite') {
            foreach (['UPDATE', 'DELETE'] as $operation) {
                DB::unprepared("CREATE TRIGGER enrollment_no_{$operation} BEFORE {$operation} ON partner_enrollment_events BEGIN SELECT RAISE(ABORT, 'Enrollment history is append-only'); END");
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::unprepared('CREATE TRIGGER enrollment_immutable BEFORE UPDATE OR DELETE ON partner_enrollment_events FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation()');
        }

    }

    public function down(): void
    {
        throw new RuntimeException('Enrollment evidence must be retained; use a corrective forward migration.');
    }
};
