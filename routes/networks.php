<?php

use App\Http\Controllers\Admin\AdminInvoiceController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\FraudController;
use App\Http\Controllers\Applications\PublisherApplicationController;
use App\Http\Controllers\Network\NetworkController;
use App\Http\Controllers\Network\NetworkInvoiceController;
use App\Http\Controllers\Network\NetworkSettingsController;
use App\Http\Controllers\Pool\PoolController;
use App\Http\Middleware\HandleFinanceErrors;
use Illuminate\Support\Facades\Route;

// Super admin only: network CRUD and network user management
Route::middleware(['auth', 'ensure.admin'])->group(function () {
    Route::get('networks/index', [NetworkController::class, 'index'])->middleware('business.permission:view_networks')->name('networks.index');
    Route::post('networks/store', [NetworkController::class, 'store'])->middleware('business.permission:create_network')->name('networks.store');
    Route::post('networks/update/{id}', [NetworkController::class, 'updateNetwork'])->middleware('business.permission:manage_networks')->name('networks.update');
    Route::post('networks/deactivate/{id}', [NetworkController::class, 'deactivateNetwork'])->middleware('business.permission:manage_networks')->name('networks.deactivate');
    Route::post('networks/activate/{id}', [NetworkController::class, 'activateNetwork'])->middleware('business.permission:manage_networks')->name('networks.activate');

    Route::get('networks/show/{id}', [NetworkController::class, 'show'])->middleware('business.permission:view_networks')->name('networks.show');
    Route::post('networks/createusers', [NetworkController::class, 'createNetworkUsers'])->middleware('business.permission:manage_networks')->name('networks.createusers');

    // Network Users Management
    Route::post('networks/users/{id}/update', [NetworkController::class, 'updateNetworkUser'])->middleware('business.permission:manage_networks')->name('networks.users.update');
    Route::post('networks/users/{id}/deactivate', [NetworkController::class, 'deactivateNetworkUser'])->middleware('business.permission:manage_networks')->name('networks.users.deactivate');
    Route::post('networks/users/{id}/activate', [NetworkController::class, 'activateNetworkUser'])->middleware('business.permission:manage_networks')->name('networks.users.activate');
    Route::post('networks/users/{id}/remove', [NetworkController::class, 'removeNetworkUser'])->middleware('business.permission:manage_networks')->name('networks.users.remove');

    Route::post('finance/advertisers/{advertiser}/funding', [FinanceController::class, 'funding'])->middleware('business.permission:manage_funding')->middleware(HandleFinanceErrors::class)->name('finance.funding');
    Route::post('networks/invoices/{id}/approve', [NetworkInvoiceController::class, 'approve'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('networks.invoices.approve');
    Route::post('networks/invoices/{id}/reject', [NetworkInvoiceController::class, 'reject'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('networks.invoices.reject');

    // Settling network invoices is a platform-level action
    Route::post('networks/invoices/{id}/mark-paid', [NetworkInvoiceController::class, 'markAsPaid'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('networks.invoices.mark-paid');
});

// Network owners (and super admin)
Route::middleware(['auth', 'ensure.network'])->group(function () {
    // Publisher Applications Management
    Route::get('applications/index', [PublisherApplicationController::class, 'index'])->middleware('business.permission:review_applications')->name('applications.index');
    Route::get('applications/show/{id}', [PublisherApplicationController::class, 'show'])->middleware('business.permission:review_applications')->name('applications.show');
    Route::post('applications/approve/{id}', [PublisherApplicationController::class, 'approve'])->middleware('business.permission:approve_applications')->name('applications.approve');
    Route::post('applications/reject/{id}', [PublisherApplicationController::class, 'reject'])->middleware('business.permission:reject_applications')->name('applications.reject');

    // pool
    Route::get('networks/pool/advertisers', [PoolController::class, 'advertisers'])->middleware('business.permission:access_pool')->name('networks.pool.advertisers');
    Route::get('networks/pool/publishers', [PoolController::class, 'publishers'])->middleware('business.permission:access_pool')->name('networks.pool.publishers');
    Route::get('networks/pool/advertisers/{id}', [PoolController::class, 'showAdvertiser'])->middleware('business.permission:access_pool')->name('networks.pool.advertisers.show');
    Route::get('networks/pool/publishers/{id}', [PoolController::class, 'showPublisher'])->middleware('business.permission:access_pool')->name('networks.pool.publishers.show');
    Route::post('networks/pool/advertisers/{id}/approve', [PoolController::class, 'approveAdvertiser'])->middleware('business.permission:approve_advertisers')->name('networks.pool.advertisers.approve');
    Route::post('networks/pool/advertisers/{id}/reject', [PoolController::class, 'rejectAdvertiser'])->middleware('business.permission:approve_advertisers')->name('networks.pool.advertisers.reject');
    Route::post('networks/pool/publishers/{id}/approve', [PoolController::class, 'approvePublisher'])->middleware('business.permission:approve_publishers')->name('networks.pool.publishers.approve');
    Route::post('networks/pool/publishers/{id}/reject', [PoolController::class, 'rejectPublisher'])->middleware('business.permission:approve_publishers')->name('networks.pool.publishers.reject');

    Route::get('finance', [FinanceController::class, 'index'])->middleware('business.permission:review_commissions')->name('finance.index');
    Route::get('finance/fraud', [FraudController::class, 'index'])->middleware('business.permission:manage_fraud_rules')->name('fraud.index');
    Route::post('finance/fraud/policy', [FraudController::class, 'save'])->middleware(['business.permission:manage_fraud_rules', HandleFinanceErrors::class])->name('fraud.save');
    Route::post('finance/fraud/restore', [FraudController::class, 'restore'])->middleware(['business.permission:manage_fraud_rules', HandleFinanceErrors::class])->name('fraud.restore');
    Route::post('finance/fraud/preview', [FraudController::class, 'preview'])->middleware('business.permission:manage_fraud_rules')->name('fraud.preview');
    Route::post('finance/fraud/reassess', [FraudController::class, 'reassessScope'])->middleware(['business.permission:manage_fraud_rules', HandleFinanceErrors::class])->name('fraud.reassess-scope');
    Route::get('finance/earnings/{earning}/fraud', [FraudController::class, 'show'])->middleware('business.permission:review_commissions')->name('fraud.show');
    Route::post('finance/earnings/{earning}/fraud/reassess', [FraudController::class, 'reassess'])->middleware(['business.permission:manage_fraud_rules', HandleFinanceErrors::class])->name('fraud.reassess');
    Route::post('finance/earnings/{earning}/fraud/feedback', [FraudController::class, 'feedback'])->middleware('business.permission:review_commissions')->name('fraud.feedback');
    Route::get('finance/earnings', [FinanceController::class, 'earnings'])->middleware('business.permission:review_commissions')->name('finance.earnings');
    Route::post('finance/earnings/{earning}/review', [FinanceController::class, 'review'])->middleware('business.permission:review_commissions')->middleware(HandleFinanceErrors::class)->name('finance.review');
    Route::post('finance/earnings/{earning}/adjust', [FinanceController::class, 'adjust'])->middleware('business.permission:adjust_commissions')->middleware(HandleFinanceErrors::class)->name('finance.adjust');
    Route::get('finance/networks/{networkId}/ledger', [FinanceController::class, 'ledger'])->middleware('business.permission:view_financial_ledger')->name('finance.ledger');

    // Publisher Invoice Management (scoped to the caller's network in the controller)
    Route::get('admin/invoices', [AdminInvoiceController::class, 'index'])->middleware('business.permission:view_network_invoices')->name('admin.invoices.index');
    Route::get('admin/invoices/export', [AdminInvoiceController::class, 'export'])->middleware('business.permission:view_network_invoices')->name('admin.invoices.export');
    Route::get('admin/invoices/{id}', [AdminInvoiceController::class, 'show'])->middleware('business.permission:view_network_invoices')->name('admin.invoices.show');
    Route::post('admin/invoices/{id}/approve', [AdminInvoiceController::class, 'approve'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('admin.invoices.approve');
    Route::post('admin/invoices/{id}/reject', [AdminInvoiceController::class, 'reject'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('admin.invoices.reject');
    Route::post('admin/invoices/{id}/mark-paid', [AdminInvoiceController::class, 'markPaid'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('admin.invoices.mark-paid');
    Route::post('admin/invoices/bulk-approve', [AdminInvoiceController::class, 'bulkApprove'])->middleware('business.permission:approve_network_invoices')->middleware(HandleFinanceErrors::class)->name('admin.invoices.bulk-approve');

    // Network Settings
    Route::get('networks/settings', [NetworkSettingsController::class, 'index'])->middleware('business.permission:configure_network')->name('networks.settings.index');
    Route::post('networks/settings/update', [NetworkSettingsController::class, 'update'])->middleware('business.permission:configure_network')->name('networks.settings.update');

    // Network Invoices
    Route::get('networks/invoices', [NetworkInvoiceController::class, 'index'])->middleware('business.permission:view_network_invoices')->name('networks.invoices.index');
    Route::post('networks/invoices/store', [NetworkInvoiceController::class, 'store'])->middleware('business.permission:request_payouts')->middleware(HandleFinanceErrors::class)->name('networks.invoices.store');
});
