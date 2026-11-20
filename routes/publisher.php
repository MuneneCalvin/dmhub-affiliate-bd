<?php

use App\Http\Controllers\Campaigns\CampaignAnalyticsController;
use App\Http\Controllers\Campaigns\CampaignFinanceController;
use App\Http\Controllers\Campaigns\CampaignTrackingController;
use App\Http\Controllers\Campaigns\PublisherCampaignController;
use App\Http\Controllers\Dashboard\PublisherDashBoardController;
use App\Http\Controllers\Partners\PartnerCardController;
use App\Http\Controllers\Publisher\PublisherInvoiceController;
use App\Http\Controllers\Publisher\PublisherScriptDocsController;
use App\Http\Controllers\Publishers\PublisherController;
use App\Http\Middleware\HandleFinanceErrors;
use Illuminate\Support\Facades\Route;

// Publisher account management: network owners (own network) and super admins
Route::middleware(['auth', 'ensure.network'])->group(function () {
    Route::get('publishers/index', [PublisherController::class, 'index'])->middleware('business.permission:view_publishers')->name('publishers.index');
    Route::post('publishers/store', [PublisherController::class, 'store'])->middleware('business.permission:manage_publishers')->name('publishers.store');
    Route::post('publishers/update/{id}', [PublisherController::class, 'update'])->middleware('business.permission:manage_publishers')->name('publishers.update');
    Route::post('publishers/change/status/{id}', [PublisherController::class, 'changeStatus'])->middleware('business.permission:approve_publishers')->name('publishers.change.status');

    Route::post('publishers/change/network/{id}', [PublisherController::class, 'changeNetwork'])
        ->middleware('ensure.admin')
        ->middleware('business.permission:manage_publishers')->name('publishers.change.network');

    Route::post('publishers/deactivate/{id}', [PublisherController::class, 'deactivate'])->middleware('business.permission:manage_publishers')->name('publishers.deactivate');
    Route::post('publishers/activate/{id}', [PublisherController::class, 'activate'])->middleware('business.permission:approve_publishers')->name('publishers.activate');
});

Route::middleware('auth')->group(function () {
    // The workspace authorizes account category, ownership and per-tab grants in the service.
    Route::get('publishers/show/{id}', [PublisherController::class, 'show'])->name('publishers.show');
    Route::patch('publishers/show/{id}/cards/{card}', [PartnerCardController::class, 'publisher'])->name('publishers.cards.update');
    Route::get('publisher/account', [PublisherController::class, 'myAccount'])->middleware('business.permission:access_publisher_dashboard')->name('publisher.account');

    // campaign applications
    Route::get('publishers/{id}/campaign/application', [PublisherDashBoardController::class, 'publisherApplication'])->middleware('business.permission:apply_to_campaigns')->name('publishers.campaign.application');
    Route::post('publishers/{campaignId}/campaign/submit/application', [PublisherDashBoardController::class, 'sendCampaignApplication'])->middleware('business.permission:apply_to_campaigns')->name('publishers.campaign.submit.application');

    // my campaigns
    Route::get('publishers/my/campaigns', [PublisherCampaignController::class, 'index'])->middleware('business.permission:view_my_campaigns')->name('publishers.my.campaign');
    Route::get('publishers/my/campaigns/{id}/offers/{offerId}/tracking', [PublisherCampaignController::class, 'show'])->whereNumber('offerId')->middleware('business.permission:view_my_campaigns')->name('publisher.tracking.offer');
    Route::get('publishers/my/campaigns/show/{id}', [PublisherCampaignController::class, 'show'])->middleware('business.permission:view_my_campaigns')->name('publishers.my.campaign.show');
    Route::get('publishers/my/campaigns/{assignment}/finance/export', [CampaignFinanceController::class, 'publisherExport'])->middleware('business.permission:view_my_campaigns')->name('publisher.finance.export');
    Route::get('publishers/my/campaigns/{assignment}/analytics/export', [CampaignAnalyticsController::class, 'publisherExport'])->middleware('business.permission:view_my_campaigns')->name('publisher.analytics.export');
    Route::get('publishers/my/campaigns/{assignment}/tracking-qr', [CampaignTrackingController::class, 'publisherQr'])->middleware('business.permission:view_my_campaigns')->name('publisher.tracking.qr');
    Route::get('publishers/my/campaigns/{id}/qr-code', [PublisherCampaignController::class, 'getQrCode'])->middleware('business.permission:generate_tracking_links')->name('publishers.my.campaign.qrcode');

    // Publisher Earnings & Invoices
    Route::get('publisher/earnings', [PublisherInvoiceController::class, 'earnings'])->middleware('business.permission:view_earnings')->name('publisher.earnings');
    Route::get('publisher/invoices', [PublisherInvoiceController::class, 'index'])->middleware('business.permission:view_invoices')->name('publisher.invoices');
    Route::get('publisher/invoices/create', [PublisherInvoiceController::class, 'create'])->middleware('business.permission:request_payouts')->name('publisher.invoices.create');
    Route::post('publisher/invoices', [PublisherInvoiceController::class, 'store'])->middleware('business.permission:request_payouts')->middleware(HandleFinanceErrors::class)->name('publisher.invoices.store');
    Route::get('publisher/invoices/{id}', [PublisherInvoiceController::class, 'show'])->middleware('business.permission:view_invoices')->name('publisher.invoices.show');
    Route::get('publisher/invoices/{id}/pdf', [PublisherInvoiceController::class, 'pdf'])->middleware('business.permission:view_invoices')->name('publisher.invoices.pdf');

    // Publisher Scripts & Integration Documentation
    Route::get('publisher/scripts', [PublisherScriptDocsController::class, 'index'])->middleware('business.permission:view_embeded_scripts')->name('publisher.scripts');
    Route::get('publisher/scripts/{id}', [PublisherScriptDocsController::class, 'show'])->middleware('business.permission:view_embeded_scripts')->name('publisher.scripts.show');
    Route::get('publisher/scripts/{id}/docs', [PublisherScriptDocsController::class, 'documentation'])->middleware('business.permission:view_embeded_scripts')->name('publisher.scripts.docs');
    Route::get('publisher/scripts/{id}/download', [PublisherScriptDocsController::class, 'downloadDocumentation'])->middleware('business.permission:view_embeded_scripts')->name('publisher.scripts.download');
});
