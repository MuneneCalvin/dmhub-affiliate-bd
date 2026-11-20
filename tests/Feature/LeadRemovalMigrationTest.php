<?php

use App\Models\ConversionEvent;
use App\Models\PublisherEarning;
use App\Services\ConversionEventService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('deletes existing contacts while preserving earned commission and financial protections', function () {
    $original = DB::getDefaultConnection();
    config(['database.connections.lead_removal_test' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('lead_removal_test');
    try {
        $migration = database_path('migrations/2026_11_04_000001_remove_lead_storage.php');
        $historical = array_values(array_diff(glob(database_path('migrations/*.php')), [$migration]));
        expect(Artisan::call('migrate', ['--database' => 'lead_removal_test', '--path' => $historical, '--realpath' => true, '--force' => true]))->toBe(0);
        $f = conversionFixture();
        $click = conversionClick($f);
        $leadId = DB::table('leads')->insertGetId(['click_id' => $click->id, 'email' => 'erase@example.test', 'notes' => 'private contact notes', 'custom_fields' => json_encode(['message' => 'private'])]);
        $request = Request::create('/api/v1/events', 'POST');
        $request->attributes->set('postback_advertiser_id', $f['advertiser']->id);
        $request->attributes->set('postback_credential_id', $f['credential']->id);
        $event = app(ConversionEventService::class)->confirm(conversionPayload($click), $request)['event'];
        DB::table('conversion_events')->where('id', $event->id)->update(['lead_id' => $leadId]);
        DB::table('publisher_earnings')->where('conversion_event_id', $event->id)->update(['lead_id' => $leadId]);
        $ledger = DB::table('financial_transactions')->orderBy('id')->get()->toJson();
        $triggers = DB::select("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name");

        expect(Artisan::call('migrate', ['--database' => 'lead_removal_test', '--path' => [$migration], '--realpath' => true, '--force' => true]))->toBe(0);
        expect(Schema::hasTable('leads'))->toBeFalse()
            ->and(Schema::hasColumn('publisher_campaigns', 'form_settings'))->toBeFalse()
            ->and(ConversionEvent::count())->toBe(1)
            ->and(PublisherEarning::sole()->amount)->toBe('10.00')
            ->and(DB::table('financial_transactions')->orderBy('id')->get()->toJson())->toBe($ledger)
            ->and(DB::select("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name"))->toEqual($triggers)
            ->and(DB::table('permissions')->where('name', 'manage_leads')->exists())->toBeFalse();
        expect(fn () => DB::table('financial_transactions')->delete())->toThrow(QueryException::class);
    } finally {
        DB::setDefaultConnection($original);
        DB::purge('lead_removal_test');
    }
});
