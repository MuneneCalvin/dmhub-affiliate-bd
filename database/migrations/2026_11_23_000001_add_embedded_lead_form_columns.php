<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Embedded lead forms: a public key per offer, one contact per campaign and email,
     * recorded consent, and events the platform itself attests (no merchant credential).
     */
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->string('lead_form_key', 40)->nullable()->after('tracking_url_template');
            $table->json('lead_form_allowed_origins')->nullable()->after('lead_form_key');
        });
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->char('email_hash', 64)->default('')->after('email');
            $table->timestamp('consented_at')->nullable()->after('notes');
        });
        Schema::table('conversion_events', function (Blueprint $table) {
            $table->unsignedBigInteger('credential_id')->nullable()->change();
        });

        $this->backfill();

        Schema::table('offers', function (Blueprint $table) {
            $table->unique('lead_form_key');
        });
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->unique(['campaign_id', 'email_hash']);
        });
    }

    /** Fills keys and hashes for rows that predate the columns. Safe to run again. */
    public function backfill(): void
    {
        // chunkById pages by key, so rows leaving the filter while they are updated are never skipped.
        DB::table('offers')->whereNull('lead_form_key')->chunkById(500, fn ($offers) => $offers->each(
            fn ($offer) => DB::table('offers')->where('id', $offer->id)->update(['lead_form_key' => Str::random(32)])
        ));

        $seen = [];
        DB::table('lead_contacts')->where('email_hash', '')->chunkById(500, fn ($leads) => $leads->each(function ($lead) use (&$seen) {
            $hash = hash('sha256', mb_strtolower(trim($lead->email)));
            $scope = $lead->campaign_id.':'.$hash;
            // Contacts stored before the one-per-email rule keep their row; only the later copies get a distinct hash.
            $unique = isset($seen[$scope]) || DB::table('lead_contacts')->where('campaign_id', $lead->campaign_id)->where('email_hash', $hash)->exists()
                ? hash('sha256', $hash.':'.$lead->id) : $hash;
            $seen[$scope] = true;
            DB::table('lead_contacts')->where('id', $lead->id)->update(['email_hash' => $unique]);
        }));
    }

    public function down(): void
    {
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->dropUnique(['campaign_id', 'email_hash']);
            $table->dropColumn(['email_hash', 'consented_at']);
        });
        Schema::table('offers', function (Blueprint $table) {
            $table->dropUnique(['lead_form_key']);
            $table->dropColumn(['lead_form_key', 'lead_form_allowed_origins']);
        });
    }
};
