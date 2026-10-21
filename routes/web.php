<?php

use App\Http\Controllers\Dashboard\AdminDashboardController;
use App\Http\Controllers\Dashboard\AdvertiserDashboardController;
use App\Http\Controllers\Dashboard\NetworkDashboardController;
use App\Http\Controllers\Dashboard\PublisherDashBoardController;
use App\Http\Controllers\Leads\LeadCaptureController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Public\PublicScriptDocsController;
use App\Http\Controllers\Tracking\PublisherScriptController;
use App\Http\Controllers\Tracking\TrackingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

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
Route::middleware('throttle:120,1')->group(function () {
    Route::get('/t/{trackingId}', [TrackingController::class, 'track'])->name('tracking.click');
    Route::get('/t/{trackingId}/c/{creativeId}', [TrackingController::class, 'trackCreative'])->name('tracking.creative');
    Route::get('/c/{trackingCode}', [TrackingController::class, 'trackCreativeByCode'])->name('tracking.creative.direct');
    Route::get('/i/{trackingCode}', [TrackingController::class, 'impression'])->name('tracking.impression');

    // Publisher embed script routes
    Route::get('/s/{token}', [PublisherScriptController::class, 'serve'])->name('publisher.script');
    Route::get('/sp/{token}', [PublisherScriptController::class, 'impression'])->name('publisher.script.impression');
});

Route::get('/lead/capture/{clickId}', [LeadCaptureController::class, 'showForm'])->name('lead.capture');
Route::post('/lead/submit', [LeadCaptureController::class, 'submitForm'])->middleware('throttle:10,1')->name('lead.submit');
Route::get('/lead/thank-you', [LeadCaptureController::class, 'thankYou'])->name('lead.thank-you');

// Public script documentation (shareable with website owners)
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
        ->middleware(['ensure.publisher'])
        ->name('publisher.dashboard');

    Route::get('advertiser/dashboard', [AdvertiserDashboardController::class, 'index'])
        ->middleware(['ensure.advertiser'])
        ->name('advertiser.dashboard');

    Route::get('network/dashboard', [NetworkDashboardController::class, 'index'])
        ->middleware(['ensure.network'])
        ->name('network.dashboard');

    Route::get('admin/dashboard', [AdminDashboardController::class, 'index'])
        ->middleware(['ensure.admin'])
        ->name('admin.dashboard');

    require __DIR__.'/notifications.php';
    require __DIR__.'/system.php';
    require __DIR__.'/networks.php';
    require __DIR__.'/advertisers.php';
    require __DIR__.'/publisher.php';

});

require __DIR__.'/settings.php';
