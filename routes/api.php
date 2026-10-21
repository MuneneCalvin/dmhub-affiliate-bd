<?php

use App\Http\Controllers\Leads\LeadPostbackController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Lead postback API routes (public - for external systems)
Route::prefix('postback')->middleware(['postback.secret', 'throttle:120,1'])->group(function () {
    Route::post('/lead', [LeadPostbackController::class, 'receive'])->name('api.postback.lead');
    Route::get('/lead', [LeadPostbackController::class, 'receive'])->name('api.postback.lead.get');
    Route::post('/lead/status', [LeadPostbackController::class, 'updateStatus'])->name('api.postback.lead.status');
    Route::get('/lead/info', [LeadPostbackController::class, 'getInfo'])->name('api.postback.lead.info');
});

// Public Lead Form API
Route::prefix('v1')->group(function () {
    Route::post('/leads/submit', [\App\Http\Controllers\API\PublicLeadController::class, 'submit'])->middleware('throttle:10,1')->name('api.leads.submit');

    // Publisher Assets API (public - for retrieving embed codes)
    Route::get('/assets/token/{token}', [\App\Http\Controllers\API\PublisherAssetsController::class, 'getAssetsByToken'])->middleware('throttle:60,1')->name('api.assets.token');
});

// Protected Publisher Assets API (requires auth)
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // By-id lookup exposes the script token, so it is limited to the owning publisher
    Route::get('/assets/campaign/{publisherCampaignId}', [\App\Http\Controllers\API\PublisherAssetsController::class, 'getAssets'])->name('api.assets.campaign');
    Route::put('/assets/campaign/{publisherCampaignId}/settings', [\App\Http\Controllers\API\PublisherAssetsController::class, 'updateFormSettings'])->name('api.assets.settings');
    Route::post('/assets/campaign/{publisherCampaignId}/regenerate-token', [\App\Http\Controllers\API\PublisherAssetsController::class, 'regenerateToken'])->name('api.assets.regenerate');
});
