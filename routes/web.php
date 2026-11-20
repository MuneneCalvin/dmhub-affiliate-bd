<?php

use App\Http\Controllers\Campaigns\CampaignMaterialController;
use App\Http\Controllers\Dashboard\AdminDashboardController;
use App\Http\Controllers\Dashboard\AdvertiserDashboardController;
use App\Http\Controllers\Dashboard\NetworkDashboardController;
use App\Http\Controllers\Dashboard\PublisherDashBoardController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Public\PublicDocumentationController;
use App\Http\Controllers\Public\PublicScriptDocsController;
use App\Http\Controllers\Tracking\PublisherScriptController;
use App\Http\Controllers\Tracking\TrackingController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/up/revision', function () {
    DB::select('SELECT 1');

    return response()->json(['revision' => config('release.revision')])
        ->header('Cache-Control', 'no-store');
})->middleware('throttle:30,1,revision');

// Locale switching
Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

// Route::get('/', function () {
//     return Inertia::render('welcome', [
//         'canRegister' => Features::enabled(Features::registration()),
//     ]);
// })->name('home');

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware('guest')->group(function () {
    // Old per-role registration URLs; the single /register page handles both roles.
    Route::redirect('/register/publisher', '/register')->name('register.publisher');
    Route::redirect('/register/advertiser', '/register')->name('register.advertiser');
});

// Click tracking routes
Route::middleware('throttle:120,1,tracking')->group(function () {
    Route::get('/t/{trackingId}', [TrackingController::class, 'track'])->name('tracking.click');
    Route::get('/t/{trackingId}/c/{creativeId}', [TrackingController::class, 'trackCreative'])->name('tracking.creative');
    Route::get('/c/{trackingCode}', [TrackingController::class, 'trackCreativeByCode'])->name('tracking.creative.direct');
    Route::get('/i/{trackingCode}', [TrackingController::class, 'impression'])->name('tracking.impression');

    // Publisher embed script routes
    Route::get('/s/{token}', [PublisherScriptController::class, 'serve'])->name('publisher.script');
    Route::get('/sp/{token}', [PublisherScriptController::class, 'impression'])->name('publisher.script.impression');
});

// Public script documentation (shareable with website owners)
Route::get('/docs', [PublicDocumentationController::class, 'show'])->name('public.docs.index');
Route::get('/docs/integrations/{integration}/download', [PublicDocumentationController::class, 'downloadIntegration'])->where('integration', '[a-z-]+')->name('public.docs.integrations.download');
Route::get('/docs/{guide}/download', [PublicDocumentationController::class, 'download'])->where('guide', '[a-z-]+')->name('public.docs.download');
Route::get('/docs/{guide}', [PublicDocumentationController::class, 'show'])->where('guide', '[a-z-]+')->name('public.docs.show');
Route::get('/docs/script/{token}', [PublicScriptDocsController::class, 'show'])->name('public.script.docs');
Route::get('/docs/script/{token}/download', [PublicScriptDocsController::class, 'downloadMarkdown'])->name('public.script.docs.download');

Route::get('/wait-for-approval', function () {
    return Inertia::render('errorpages/wait_approval', [
        'status' => auth()->user()->status ?? 'P',
        'message' => 'Your account is pending approval.',
    ]);
})->middleware('auth')->name('waitForApproval');

Route::middleware(['auth', 'check.advertiser.status', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->middleware(['redirect.by.role'])
        ->name('dashboard');

    Route::get('publisher_dashboard/dashboard', [PublisherDashBoardController::class, 'index'])
        ->middleware(['ensure.publisher', 'business.permission:access_publisher_dashboard'])
        ->name('publisher.dashboard');

    Route::get('advertiser/dashboard', [AdvertiserDashboardController::class, 'index'])
        ->middleware(['ensure.advertiser', 'business.permission:access_advertiser_dashboard'])
        ->name('advertiser.dashboard');

    Route::get('network/dashboard', [NetworkDashboardController::class, 'index'])
        ->middleware(['ensure.network', 'business.permission:access_network_dashboard'])
        ->name('network.dashboard');

    Route::get('admin/dashboard', [AdminDashboardController::class, 'index'])
        ->middleware(['ensure.admin', 'business.permission:access_admin_dashboard'])
        ->name('admin.dashboard');

    require __DIR__.'/notifications.php';
    require __DIR__.'/system.php';
    require __DIR__.'/networks.php';
    Route::get('campaign/materials/{creative}/download', [CampaignMaterialController::class, 'download'])->name('campaign.materials.download');

    require __DIR__.'/advertisers.php';
    require __DIR__.'/publisher.php';

});

require __DIR__.'/settings.php';

// Design-system gallery for visual QA. Only registered on local machines.
if (app()->isLocal()) {
    Route::get('/dev/ui', fn () => Inertia::render('dev/ui'))->name('dev.ui');
}
