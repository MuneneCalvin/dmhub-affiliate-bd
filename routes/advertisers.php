<?php

use App\Http\Controllers\Advertisers\AdvertiserController;
use App\Http\Controllers\Campaigns\AdvertiserCampaignController;
use App\Http\Controllers\Creatives\CreativesController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Offers\OffersController;
use Illuminate\Support\Facades\Route;

// Advertiser account management: network owners (own network) and super admins
Route::middleware(['auth', 'ensure.network'])->group(function () {
    Route::get('advertisers/index', [AdvertiserController::class, 'index'])->name('advertisers.index');
    Route::post('advertisers/store', [AdvertiserController::class, 'store'])->name('advertisers.store');
    Route::post('advertisers/change/status/{id}', [AdvertiserController::class, 'changeStatus'])->name('advertisers.change.status');

    Route::post('advertisers/change/network/{id}', [AdvertiserController::class, 'changeNetwork'])
        ->middleware('ensure.admin')
        ->name('advertisers.change.network');

    Route::get('advertisers/show/{id}', [AdvertiserController::class, 'show'])->name('advertisers.show');
    Route::post('advertisers/update/{id}', [AdvertiserController::class, 'updateAdvertiser'])->name('advertisers.update');
    Route::post('advertisers/deactivate/{id}', [AdvertiserController::class, 'deactivate'])->name('advertisers.deactivate');
    Route::post('advertisers/activate/{id}', [AdvertiserController::class, 'activate'])->name('advertisers.activate');
});

// Campaigns, offers, creatives, terms: advertisers, network owners, super admins
Route::middleware(['auth', 'ensure.campaign.manager'])->group(function () {
    // campaigns
    Route::get('advertiser/campaigns/index', [AdvertiserCampaignController::class, 'index'])->name('advertiser.campaign.index');
    Route::get('advertiser/campaigns/create', [AdvertiserCampaignController::class, 'createPage'])->name('advertiser.campaign.create');
    Route::post('advertiser/campaigns/store', [AdvertiserCampaignController::class, 'store'])->name('advertiser.campaign.store');
    Route::get('advertiser/campaigns/show/{id}', [AdvertiserCampaignController::class, 'show'])->name('advertiser.campaign.show');
    Route::get('advertiser/campaigns/edit/{id}', [AdvertiserCampaignController::class, 'edit'])->name('advertiser.campaign.edit');
    Route::post('advertiser/campaigns/update/{id}', [AdvertiserCampaignController::class, 'update'])->name('advertiser.campaign.update');

    // offers
    Route::get('advertiser/offers/{id}/index', [OffersController::class, 'index'])->name('advertiser.offers.index');
    Route::post('advertiser/offers/{id}/create', [OffersController::class, 'create'])->name('advertiser.offers.create');
    Route::get('advertiser/offers/{offer}/show', [OffersController::class, 'show'])->name('advertiser.offers.show');
    Route::get('advertiser/offers/{offer}/edit', [OffersController::class, 'edit'])->name('advertiser.offers.edit');
    Route::post('advertiser/offers/{offer}/update', [OffersController::class, 'update'])->name('advertiser.offers.update');
    Route::delete('advertiser/offers/{offer}/delete', [OffersController::class, 'destroy'])->name('advertiser.offers.delete');
    Route::patch('advertiser/offers/{offer}/activate', [OffersController::class, 'activate'])->name('advertiser.offers.activate');
    Route::patch('advertiser/offers/{offer}/deactivate', [OffersController::class, 'deactivate'])->name('advertiser.offers.deactivate');

    // commission
    Route::post('advertiser/commissions/create', [OffersController::class, 'createCommission'])->name('advertiser.commissions.create');

    // creatives
    Route::get('advertiser/creatives/index', [CreativesController::class, 'index'])->name('advertiser.creatives.index');
    Route::get('advertiser/creatives/create', [CreativesController::class, 'create'])->name('advertiser.creatives.create');
    Route::post('advertiser/creatives/store', [CreativesController::class, 'store'])->name('advertiser.creatives.store');
    Route::get('advertiser/creatives/show/{id}', [CreativesController::class, 'show'])->name('advertiser.creatives.show');
    Route::get('advertiser/creatives/edit/{id}', [CreativesController::class, 'edit'])->name('advertiser.creatives.edit');
    Route::post('advertiser/creatives/update/{id}', [CreativesController::class, 'update'])->name('advertiser.creatives.update');
    Route::delete('advertiser/creatives/delete/{id}', [CreativesController::class, 'destroy'])->name('advertiser.creatives.delete');

    // campaigns terms
    Route::get('advertiser/terms', [AdvertiserController::class, 'terms'])->name('advertiser.terms');
    Route::post('advertiser/terms/create', [AdvertiserController::class, 'createTerms'])->name('advertiser.terms.create');
    Route::delete('advertiser/terms/delete/{terms}', [AdvertiserController::class, 'deleteTerms'])->name('advertiser.terms.delete');
});

// Leads CRM: every role, rows are scoped per user in the controller
Route::middleware('auth')->group(function () {
    Route::get('leads/index', [LeadController::class, 'index'])->name('advertiser.leads.index');
    Route::get('leads/show/{id}', [LeadController::class, 'show'])->name('advertiser.leads.show');
    Route::post('leads/update/{id}', [LeadController::class, 'update'])->name('advertiser.leads.update');
    Route::post('leads/status/{id}', [LeadController::class, 'updateStatus'])->name('advertiser.leads.status');
    Route::post('leads/assign/{id}', [LeadController::class, 'assign'])->name('advertiser.leads.assign');
    Route::post('leads/note/{id}', [LeadController::class, 'addNote'])->name('advertiser.leads.note');
    Route::delete('leads/delete/{id}', [LeadController::class, 'destroy'])->name('advertiser.leads.delete');
    Route::get('leads/export', [LeadController::class, 'export'])->name('advertiser.leads.export');
});
