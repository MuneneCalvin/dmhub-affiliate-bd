<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversion_events', function (Blueprint $table) {
            $table->json('fraud_signals')->nullable();
        });
        Schema::create('fraud_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('scope_key')->unique();
            $table->unsignedBigInteger('active_version_id')->nullable();
            $table->timestamps();
        });
        Schema::create('fraud_policy_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fraud_policy_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->json('configuration');
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 500);
            $table->timestamp('created_at');
            $table->unique(['fraud_policy_id', 'version']);
        });
        Schema::create('fraud_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('earning_id')->constrained('publisher_earnings')->restrictOnDelete();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->foreignId('campaign_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('queued');
            $table->string('policy_fingerprint', 64)->nullable();
            $table->json('policy_snapshot')->nullable();
            $table->json('evidence')->nullable();
            $table->json('results')->nullable();
            $table->unsignedInteger('score')->nullable();
            $table->string('recommendation', 30)->nullable();
            $table->json('reasons')->nullable();
            $table->string('earning_version', 64)->nullable();
            $table->timestamp('eligible_at')->nullable();
            $table->timestamp('next_attempt_at')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->string('last_error')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->unsignedBigInteger('approved_minor')->nullable();
            $table->string('currency', 3);
            $table->timestamps();
            $table->index(['earning_id', 'id']);
            $table->index(['status', 'next_attempt_at']);
            $table->index(['network_id', 'currency', 'applied_at'], 'fraud_daily_exposure');
        });
        Schema::create('fraud_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('earning_id')->constrained('publisher_earnings')->restrictOnDelete();
            $table->foreignId('network_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('outcome', 30);
            $table->string('reason', 500);
            $table->timestamp('created_at');
            $table->index(['earning_id', 'id']);
        });
        Schema::table('clicks', function (Blueprint $table) {
            $table->index(['network_id', 'ip_address', 'id'], 'fraud_click_ip');
        });
        Schema::table('publisher_earnings', function (Blueprint $table) {
            $table->index(['network_id', 'publisher_id', 'created_at'], 'fraud_publisher_history');
        });
        $permission = Permission::findOrCreate('manage_fraud_rules', 'web');
        foreach (['super_admin', 'network_owner'] as $role) {
            Role::where('name', $role)->where('guard_name', 'web')->first()?->givePermissionTo($permission);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::table('publisher_earnings', fn (Blueprint $table) => $table->dropIndex('fraud_publisher_history'));
        Schema::table('clicks', fn (Blueprint $table) => $table->dropIndex('fraud_click_ip'));
        Schema::dropIfExists('fraud_feedback');
        Schema::dropIfExists('fraud_assessments');
        Schema::dropIfExists('fraud_policy_versions');
        Schema::dropIfExists('fraud_policies');
        Schema::table('conversion_events', fn (Blueprint $table) => $table->dropColumn('fraud_signals'));
    }
};
