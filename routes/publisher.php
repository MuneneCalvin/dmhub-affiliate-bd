<?php

use App\Http\Controllers\Campaigns\PublisherCampaignController;
use App\Http\Controllers\Dashboard\PublisherDashBoardController;
use App\Http\Controllers\Publisher\PublisherInvoiceController;
use App\Http\Controllers\Publisher\PublisherScriptDocsController;
use App\Http\Controllers\Publishers\PublisherController;
use Illuminate\Support\Facades\Route;

// Publisher account management: network owners (own network) and super admins
Route::middleware(['auth', 'ensure.network'])->group(function () {
    Route::get('publishers/index', [PublisherController::class, 'index'])->name('publishers.index');
    Route::post('publishers/store', [PublisherController::class, 'store'])->name('publishers.store');
    Route::get('publishers/show/{id}', [PublisherController::class, 'show'])->name('publishers.show');
    Route::post('publishers/update/{id}', [PublisherController::class, 'update'])->name('publishers.update');
    Route::post('publishers/change/status/{id}', [PublisherController::class, 'changeStatus'])->name('publishers.change.status');

    Route::post('publishers/change/network/{id}', [PublisherController::class, 'changeNetwork'])
        ->middleware('ensure.admin')
        ->name('publishers.change.network');

    Route::post('publishers/deactivate/{id}', [PublisherController::class, 'deactivate'])->name('publishers.deactivate');
    Route::post('publishers/activate/{id}', [PublisherController::class, 'activate'])->name('publishers.activate');
});

Route::middleware('auth')->group(function () {
    // campaign applications
    Route::get('publishers/{id}/campaign/application', [PublisherDashBoardController::class, 'publisherApplication'])->name('publishers.campaign.application');
    Route::post('publishers/{campaignId}/campaign/submit/application', [PublisherDashBoardController::class, 'sendCampaignApplication'])->name('publishers.campaign.submit.application');

    // my campaigns
    Route::get('publishers/my/campaigns', [PublisherCampaignController::class, 'index'])->name('publishers.my.campaign');
    Route::get('publishers/my/campaigns/show/{id}', [PublisherCampaignController::class, 'show'])->name('publishers.my.campaign.show');
    Route::get('publishers/my/campaigns/{id}/qr-code', [PublisherCampaignController::class, 'getQrCode'])->name('publishers.my.campaign.qrcode');

    // Publisher Earnings & Invoices
    Route::get('publisher/earnings', [PublisherInvoiceController::class, 'earnings'])->name('publisher.earnings');
    Route::get('publisher/invoices', [PublisherInvoiceController::class, 'index'])->name('publisher.invoices');
    Route::get('publisher/invoices/create', [PublisherInvoiceController::class, 'create'])->name('publisher.invoices.create');
    Route::post('publisher/invoices', [PublisherInvoiceController::class, 'store'])->name('publisher.invoices.store');
    Route::get('publisher/invoices/{id}', [PublisherInvoiceController::class, 'show'])->name('publisher.invoices.show');

    // Publisher Scripts & Integration Documentation
    Route::get('publisher/scripts', [PublisherScriptDocsController::class, 'index'])->name('publisher.scripts');
    Route::get('publisher/scripts/{id}', [PublisherScriptDocsController::class, 'show'])->name('publisher.scripts.show');
    Route::get('publisher/scripts/{id}/docs', [PublisherScriptDocsController::class, 'documentation'])->name('publisher.scripts.docs');
    Route::get('publisher/scripts/{id}/download', [PublisherScriptDocsController::class, 'downloadDocumentation'])->name('publisher.scripts.download');
});
