<?php

use App\Http\Controllers\Advertisers\AdvertiserController;
use App\Http\Controllers\Campaigns\AdvertiserCampaignController;
use App\Http\Controllers\Campaigns\CampaignAnalyticsController;
use App\Http\Controllers\Campaigns\CampaignFinanceController;
use App\Http\Controllers\Campaigns\CampaignPublisherController;
use App\Http\Controllers\Campaigns\CampaignSettingsController;
use App\Http\Controllers\Campaigns\CampaignTrackingController;
use App\Http\Controllers\Creatives\CreativesController;
use App\Http\Controllers\Integrations\ShopifyPromotionController;
use App\Http\Controllers\Offers\OffersController;
use App\Http\Controllers\Partners\PartnerCardController;
use App\Http\Controllers\Promotions\CustomerPromotionController;
use App\Http\Controllers\Promotions\StoreConnectionController;
use App\Http\Middleware\HandleFinanceErrors;
use Illuminate\Support\Facades\Route;

// Advertiser account management: network owners (own network) and super admins
Route::middleware(['auth', 'ensure.network'])->group(function () {
    Route::get('advertisers/index', [AdvertiserController::class, 'index'])->middleware('business.permission:view_advertisers')->name('advertisers.index');
    Route::post('advertisers/store', [AdvertiserController::class, 'store'])->middleware('business.permission:manage_advertisers')->name('advertisers.store');
    Route::post('advertisers/change/status/{id}', [AdvertiserController::class, 'changeStatus'])->middleware('business.permission:approve_advertisers')->name('advertisers.change.status');

    Route::post('advertisers/change/network/{id}', [AdvertiserController::class, 'changeNetwork'])
        ->middleware('ensure.admin')
        ->middleware('business.permission:manage_advertisers')->name('advertisers.change.network');

    Route::post('advertisers/update/{id}', [AdvertiserController::class, 'updateAdvertiser'])->middleware('business.permission:manage_advertisers')->name('advertisers.update');
    Route::post('advertisers/deactivate/{id}', [AdvertiserController::class, 'deactivate'])->middleware('business.permission:manage_advertisers')->name('advertisers.deactivate');
    Route::post('advertisers/activate/{id}', [AdvertiserController::class, 'activate'])->middleware('business.permission:approve_advertisers')->name('advertisers.activate');
});

// Campaigns, offers, creatives, terms: advertisers, network owners, super admins
Route::middleware(['auth', 'ensure.campaign.manager'])->group(function () {
    Route::get('advertisers/show/{id}', [AdvertiserController::class, 'show'])->name('advertisers.show');
    Route::patch('advertisers/show/{id}/cards/{card}', [PartnerCardController::class, 'advertiser'])->name('advertisers.cards.update');

    // campaigns
    Route::get('advertiser/campaigns/index', [AdvertiserCampaignController::class, 'index'])->middleware('business.permission:view_campaigns')->name('advertiser.campaign.index');
    Route::get('advertiser/campaigns/create', [AdvertiserCampaignController::class, 'createPage'])->middleware('business.permission:create_campaigns')->name('advertiser.campaign.create');
    Route::post('advertiser/campaigns/store', [AdvertiserCampaignController::class, 'store'])->middleware('business.permission:create_campaigns')->name('advertiser.campaign.store');
    Route::get('advertiser/campaigns/show/{id}', [AdvertiserCampaignController::class, 'show'])->middleware('business.permission:view_campaigns')->name('advertiser.campaign.show');
    Route::get('advertiser/campaigns/edit/{id}', [AdvertiserCampaignController::class, 'edit'])->middleware('business.permission:manage_campaigns')->name('advertiser.campaign.edit');
    Route::post('advertiser/campaigns/update/{id}', [AdvertiserCampaignController::class, 'update'])->middleware('business.permission:manage_campaigns')->name('advertiser.campaign.update');

    Route::put('advertiser/campaigns/{campaign}/settings', [CampaignSettingsController::class, 'update'])->middleware('business.permission:manage_campaigns')->name('campaign.settings.update');
    Route::post('advertiser/campaigns/{campaign}/settings/terms', [CampaignSettingsController::class, 'storeTerms'])->middleware('business.permission:manage_campaigns')->name('campaign.settings.terms');

    Route::get('advertiser/campaigns/{campaign}/finance/export', [CampaignFinanceController::class, 'export'])->middleware('business.permission:view_campaigns')->name('campaign.finance.export');
    Route::post('advertiser/campaigns/{campaign}/finance/{earning}/preview', [CampaignFinanceController::class, 'preview'])->middleware('business.permission:view_campaigns')->name('campaign.finance.preview');
    Route::post('advertiser/campaigns/{campaign}/finance/{earning}/adjust', [CampaignFinanceController::class, 'adjust'])->middleware(['business.permission:view_campaigns', HandleFinanceErrors::class])->name('campaign.finance.adjust');
    Route::post('advertiser/campaigns/{campaign}/finance/{earning}/review', [CampaignFinanceController::class, 'review'])->middleware(['business.permission:view_campaigns', HandleFinanceErrors::class])->name('campaign.finance.review');

    Route::get('advertiser/campaigns/{campaign}/analytics/export', [CampaignAnalyticsController::class, 'export'])->middleware('business.permission:view_campaigns')->name('campaign.analytics.export');
    Route::get('advertiser/campaigns/{campaign}/tracking/{assignment}/qr', [CampaignTrackingController::class, 'qr'])->middleware('business.permission:view_campaigns')->name('campaign.tracking.qr');
    Route::post('advertiser/campaigns/{campaign}/tracking/{assignment}/handoff', [CampaignTrackingController::class, 'handoff'])->middleware('business.permission:view_campaigns')->name('campaign.tracking.handoff');

    Route::post('advertiser/campaigns/{campaign}/publishers/{application}/review', [CampaignPublisherController::class, 'review'])->middleware('business.permission:view_campaigns')->name('campaign.publishers.review');

    Route::put('advertiser/offers/{offer}/promotion', [CustomerPromotionController::class, 'update'])->middleware('business.permission:manage_offers')->name('campaign.promotion.update');
    Route::post('advertiser/campaigns/{campaign}/stores', [StoreConnectionController::class, 'store'])->middleware('business.permission:manage_offers')->name('campaign.stores.store');
    Route::put('advertiser/campaigns/{campaign}/stores/{store}', [StoreConnectionController::class, 'update'])->middleware('business.permission:manage_offers')->name('campaign.stores.update');
    Route::get('integrations/woocommerce/download', [StoreConnectionController::class, 'download'])->middleware('business.permission:manage_offers')->name('integrations.woocommerce.download');

    Route::get('integrations/shopify/install/{store}', [ShopifyPromotionController::class, 'install'])->middleware('business.permission:manage_offers')->name('integrations.shopify.install');
    Route::get('integrations/shopify/callback', [ShopifyPromotionController::class, 'callback'])->middleware('business.permission:manage_offers')->name('integrations.shopify.callback');
    // offers
    Route::get('advertiser/offers/{id}/index', [OffersController::class, 'index'])->middleware('business.permission:create_offers')->name('advertiser.offers.index');
    Route::post('advertiser/offers/{id}/create', [OffersController::class, 'create'])->middleware('business.permission:create_offers')->name('advertiser.offers.create');
    Route::get('advertiser/offers/{offer}/show', [OffersController::class, 'show'])->middleware('business.permission:view_offers')->name('advertiser.offers.show');
    Route::get('advertiser/offers/{offer}/edit', [OffersController::class, 'edit'])->middleware('business.permission:manage_offers')->name('advertiser.offers.edit');
    Route::post('advertiser/offers/{offer}/update', [OffersController::class, 'update'])->middleware('business.permission:manage_offers')->name('advertiser.offers.update');
    Route::delete('advertiser/offers/{offer}/delete', [OffersController::class, 'destroy'])->middleware('business.permission:manage_offers')->name('advertiser.offers.delete');
    Route::patch('advertiser/offers/{offer}/activate', [OffersController::class, 'activate'])->middleware('business.permission:manage_offers')->name('advertiser.offers.activate');
    Route::patch('advertiser/offers/{offer}/deactivate', [OffersController::class, 'deactivate'])->middleware('business.permission:manage_offers')->name('advertiser.offers.deactivate');

    // commission
    Route::post('advertiser/commissions/create', [OffersController::class, 'createCommission'])->middleware('business.permission:manage_offers')->name('advertiser.commissions.create');

    // creatives
    Route::get('advertiser/creatives/index', [CreativesController::class, 'index'])->middleware('business.permission:manage_creatives')->name('advertiser.creatives.index');
    Route::get('advertiser/creatives/create', [CreativesController::class, 'create'])->middleware('business.permission:upload_creatives')->name('advertiser.creatives.create');
    Route::post('advertiser/creatives/store', [CreativesController::class, 'store'])->middleware('business.permission:upload_creatives')->name('advertiser.creatives.store');
    Route::get('advertiser/creatives/show/{id}', [CreativesController::class, 'show'])->middleware('business.permission:manage_creatives')->name('advertiser.creatives.show');
    Route::get('advertiser/creatives/edit/{id}', [CreativesController::class, 'edit'])->middleware('business.permission:manage_creatives')->name('advertiser.creatives.edit');
    Route::post('advertiser/creatives/update/{id}', [CreativesController::class, 'update'])->middleware('business.permission:manage_creatives')->name('advertiser.creatives.update');
    Route::delete('advertiser/creatives/delete/{id}', [CreativesController::class, 'destroy'])->middleware('business.permission:manage_creatives')->name('advertiser.creatives.delete');

    // campaigns terms
    Route::get('advertiser/terms', [AdvertiserController::class, 'terms'])->middleware('business.permission:view_campaigns')->name('advertiser.terms');
    Route::post('advertiser/terms/create', [AdvertiserController::class, 'createTerms'])->middleware('business.permission:manage_campaigns')->name('advertiser.terms.create');
    Route::delete('advertiser/terms/delete/{terms}', [AdvertiserController::class, 'deleteTerms'])->middleware('business.permission:manage_campaigns')->name('advertiser.terms.delete');
});
