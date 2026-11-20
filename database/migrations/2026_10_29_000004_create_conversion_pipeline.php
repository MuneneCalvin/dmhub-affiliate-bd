<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clicks', function (Blueprint $table) {
            // Timestamps are not click identities: two visitors can arrive in one second.
            $table->dropUnique('unique_click_entry');
            $table->uuid('referral_id')->nullable()->unique();
            $table->timestamp('referral_expires_at')->nullable();
            $table->timestamp('conversion_expires_at')->nullable();
            $table->string('sub_id', 200)->nullable();
            $table->string('traffic_source', 100)->nullable();
        });
        Schema::create('conversion_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advertiser_id')->constrained()->restrictOnDelete();
            $table->foreignId('credential_id')->constrained('postback_credentials')->restrictOnDelete();
            $table->foreignId('click_id')->constrained('clicks')->restrictOnDelete();
            $table->foreignId('lead_id')->nullable()->unique()->constrained('leads')->restrictOnDelete();
            $table->string('event_type', 20);
            $table->string('external_id', 100);
            $table->string('payload_hash', 64);
            $table->timestamp('occurred_at', 6);
            $table->decimal('amount', 20, 2);
            $table->string('currency', 3);
            $table->json('attribution');
            $table->timestamps();
            $table->unique(['advertiser_id', 'external_id'], 'conversion_events_identity');
        });
        Schema::table('leads', function (Blueprint $table) {
            $table->string('identity_hash', 64)->nullable()->index();
        });
        Schema::table('conversions', function (Blueprint $table) {
            $table->foreignId('conversion_event_id')->nullable()->unique()->constrained('conversion_events')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable()->change();
            $table->timestamp('rejected_at')->nullable()->change();
        });
        Schema::table('publisher_earnings', function (Blueprint $table) {
            $table->foreignId('conversion_event_id')->nullable()->unique()->constrained('conversion_events')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        foreach (['publisher_earnings', 'conversions'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropForeign(['conversion_event_id']);
                $table->dropUnique(['conversion_event_id']);
                $table->dropColumn('conversion_event_id');
            });
        }
        Schema::dropIfExists('conversion_events');
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['identity_hash']);
            $table->dropColumn('identity_hash');
        });
        Schema::table('clicks', function (Blueprint $table) {
            $table->dropUnique(['referral_id']);
            $table->dropColumn(['referral_id', 'referral_expires_at', 'conversion_expires_at', 'sub_id', 'traffic_source']);
            // Do not restore the invalid timestamp-based uniqueness constraint.
        });
    }
};
