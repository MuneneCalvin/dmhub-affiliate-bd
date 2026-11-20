<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Brand New Day stores the contact details a merchant reports with a submission.
     * Money never depends on this table: the commission comes from the conversion event.
     */
    public function up(): void
    {
        Schema::create('lead_contacts', function (Blueprint $table) {
            $table->id();
            // One contact per confirmed submission; the event is immutable and is never removed with the contact.
            $table->foreignId('conversion_event_id')->unique()->constrained('conversion_events')->restrictOnDelete();
            $table->foreignId('advertiser_id')->constrained('advertisers')->cascadeOnDelete();
            $table->foreignId('network_id')->constrained('networks')->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->foreignId('offer_id')->nullable()->constrained('offers')->nullOnDelete();
            $table->foreignId('publisher_campaign_id')->nullable()->constrained('publisher_campaigns')->nullOnDelete();
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 255);
            $table->string('phone', 50)->nullable();
            $table->string('company', 255)->nullable();
            $table->string('job_title', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->json('custom_fields')->nullable();
            $table->string('status', 20)->default('new');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['advertiser_id', 'status']);
            $table->index(['network_id', 'created_at']);
        });

        DB::table('permissions')->insertOrIgnore([
            'name' => 'manage_leads', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $permissionId = DB::table('permissions')->where('name', 'manage_leads')->where('guard_name', 'web')->value('id');
        foreach (DB::table('roles')->whereIn('name', ['advertiser', 'network_owner'])->where('guard_name', 'web')->pluck('id') as $roleId) {
            DB::table('role_has_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_contacts');
    }
};
