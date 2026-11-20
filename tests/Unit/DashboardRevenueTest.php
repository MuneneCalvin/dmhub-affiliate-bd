<?php

use App\Services\DashboardRevenueService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('dashboard_revenue_facts');
    $this->travelTo(now()->setDate(2026, 10, 29)->startOfDay());
    // Isolated fact table exercises the reporting query without unrelated domain fixtures.
    Schema::create('dashboard_revenue_facts', function (Blueprint $table) {
        $table->date('conversion_date');
        $table->string('currency');
        $table->string('status');
        $table->integer('network_id');
        $table->integer('campaign_id');
        $table->decimal('sale_amount', 20, 2);
        $table->decimal('commission_amount', 20, 2);
    });
});

it('returns exactly thirty chronological days including today and fills missing days', function () {
    $result = app(DashboardRevenueService::class)->lastThirtyDays(DB::table('dashboard_revenue_facts'));
    expect($result)->toHaveCount(1)
        ->and($result[0]['days'])->toHaveCount(30)
        ->and($result[0]['days'][0])->toBe(['date' => '2026-09-30', 'revenue' => 0.0, 'commission' => 0.0, 'conversions' => 0])
        ->and($result[0]['days'][29]['date'])->toBe('2026-10-29');
});

it('sums only approved sales within the date window and keeps tenant and currency boundaries', function () {
    $base = ['conversion_date' => '2026-10-29', 'currency' => 'USD', 'status' => 'A', 'network_id' => 1, 'campaign_id' => 10, 'sale_amount' => 12.25, 'commission_amount' => 1.5];
    DB::table('dashboard_revenue_facts')->insert([
        $base, $base,
        array_replace($base, ['currency' => 'EUR', 'sale_amount' => 30]),
        array_replace($base, ['status' => 'P']),
        array_replace($base, ['status' => 'R']),
        array_replace($base, ['network_id' => 2]),
        array_replace($base, ['campaign_id' => 20]),
        array_replace($base, ['conversion_date' => '2026-09-29']),
        array_replace($base, ['conversion_date' => '2026-10-30']),
        array_replace($base, ['conversion_date' => '2026-09-30']),
    ]);
    $query = DB::table('dashboard_revenue_facts')->where('network_id', 1)->whereIn('campaign_id', [10]);
    $result = collect(app(DashboardRevenueService::class)->lastThirtyDays($query))->keyBy('currency');
    expect($result['USD']['days'][29])->toBe(['date' => '2026-10-29', 'revenue' => 24.5, 'commission' => 3.0, 'conversions' => 2])
        ->and($result['EUR']['days'][29]['revenue'])->toBe(30.0)
        ->and($result['USD']['days'][0]['revenue'])->toBe(12.25)
        ->and($result['USD']['days'][1]['revenue'])->toBe(0.0);
});
