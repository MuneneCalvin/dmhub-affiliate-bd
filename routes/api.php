<?php

use App\Http\Controllers\API\ConversionEventController;
use App\Http\Controllers\API\LeadSubmissionController;
use App\Http\Controllers\API\PublisherAssetsController;
use App\Http\Controllers\API\ReferralController;
use App\Http\Controllers\Integrations\ShopifyPromotionController;
use App\Http\Controllers\Integrations\StorePromotionController;
use App\Http\Middleware\AuthenticatePromotionStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware(['auth:sanctum', 'check.advertiser.status', 'verified']);

Route::prefix('v1')->group(function () {
    Route::post('/events', [ConversionEventController::class, 'store'])->middleware(['throttle:120,1,conversion-events', 'postback.credential'])->name('api.events.store');
    Route::post('/leads', [LeadSubmissionController::class, 'store'])->middleware(['throttle:120,1,lead-submissions', 'postback.credential'])->name('api.leads.store');
    Route::get('/referrals/{referral}', [ReferralController::class, 'show'])->whereUuid('referral')->middleware('throttle:60,1,referrals')->name('api.referrals.show');

    // Publisher Assets API (public - for retrieving embed codes)
    Route::get('/assets/token/{token}', [PublisherAssetsController::class, 'getAssetsByToken'])->middleware('throttle:60,1,publisher-assets')->name('api.assets.token');
});

// Protected Publisher Assets API (requires auth)
Route::prefix('v1')->middleware(['auth:sanctum', 'check.advertiser.status', 'verified'])->group(function () {
    // By-id lookup exposes the script token, so it is limited to the owning publisher
    Route::get('/assets/campaign/{publisherCampaignId}', [PublisherAssetsController::class, 'getAssets'])->middleware('business.permission:view_embeded_scripts')->name('api.assets.campaign');
    Route::post('/assets/campaign/{publisherCampaignId}/regenerate-token', [PublisherAssetsController::class, 'regenerateToken'])->middleware('business.permission:manage_publisher_account')->name('api.assets.regenerate');
});

Route::prefix('v1/stores')->middleware([AuthenticatePromotionStore::class, 'throttle:120,1'])->group(function () {
    Route::post('connect', [StorePromotionController::class, 'connect']);
    Route::post('grants', [StorePromotionController::class, 'grant']);
    Route::post('grants/{grant}', [StorePromotionController::class, 'show'])->whereUuid('grant');
    Route::post('orders', [StorePromotionController::class, 'order']);
    Route::post('adjustments', [StorePromotionController::class, 'adjustment']);
});

Route::get('integrations/shopify/proxy', [ShopifyPromotionController::class, 'proxy'])->middleware('throttle:60,1');
Route::post('integrations/shopify/webhooks', [ShopifyPromotionController::class, 'webhook']);
