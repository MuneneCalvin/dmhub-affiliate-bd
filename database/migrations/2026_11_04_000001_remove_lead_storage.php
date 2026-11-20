<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite rebuilds altered tables; retain all financial protection triggers.
        $triggers = DB::getDriverName() === 'sqlite'
            ? DB::select("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'") : [];
        foreach ($triggers as $trigger) {
            DB::unprepared('DROP TRIGGER "'.str_replace('"', '""', $trigger->name).'"');
        }
        // Preserve conversion/ledger history while permanently removing client contacts.
        foreach (['conversion_events', 'publisher_earnings'] as $name) {
            Schema::table($name, function (Blueprint $table) use ($name) {
                $table->dropForeign(['lead_id']);
                if ($name === 'conversion_events') {
                    $table->dropUnique(['lead_id']);
                } else {
                    $table->dropIndex('idx_earnings_lead');
                }
                $table->dropColumn('lead_id');
            });
        }
        Schema::dropIfExists('leads');
        Schema::table('publisher_campaigns', function (Blueprint $table) {
            $table->dropColumn(['form_settings', 'form_title', 'form_button_text', 'form_success_message',
                'form_redirect_url', 'form_trigger', 'form_delay_seconds', 'form_scroll_percent']);
        });
        DB::table('commission_types')->where('name', 'CPL')->update(['nice_name' => 'Cost Per Submission']);
        foreach ($triggers as $trigger) {
            DB::unprepared($trigger->sql);
        }
        $ids = DB::table('permissions')->where('name', 'manage_leads')->pluck('id');
        DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException('Client contact deletion is irreversible. Restore a pre-migration backup to roll back this release.');
    }
};
