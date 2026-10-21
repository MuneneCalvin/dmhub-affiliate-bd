<?php

use App\Http\Controllers\Admin\AdminInvoiceController;
use App\Http\Controllers\Applications\PublisherApplicationController;
use App\Http\Controllers\Network\NetworkController;
use App\Http\Controllers\Network\NetworkInvoiceController;
use App\Http\Controllers\Network\NetworkSettingsController;
use App\Http\Controllers\Pool\PoolController;
use Illuminate\Support\Facades\Route;

// Super admin only: network CRUD and network user management
Route::middleware(['auth', 'ensure.admin'])->group(function () {
    Route::get('networks/index', [NetworkController::class, 'index'])->name('networks.index');
    Route::post('networks/store', [NetworkController::class, 'store'])->name('networks.store');
    Route::post('networks/update/{id}', [NetworkController::class, 'updateNetwork'])->name('networks.update');
    Route::post('networks/deactivate/{id}', [NetworkController::class, 'deactivateNetwork'])->name('networks.deactivate');
    Route::post('networks/activate/{id}', [NetworkController::class, 'activateNetwork'])->name('networks.activate');

    Route::get('networks/show/{id}', [NetworkController::class, 'show'])->name('networks.show');
    Route::post('networks/createusers', [NetworkController::class, 'createNetworkUsers'])->name('networks.createusers');

    // Network Users Management
    Route::post('networks/users/{id}/update', [NetworkController::class, 'updateNetworkUser'])->name('networks.users.update');
    Route::post('networks/users/{id}/deactivate', [NetworkController::class, 'deactivateNetworkUser'])->name('networks.users.deactivate');
    Route::post('networks/users/{id}/activate', [NetworkController::class, 'activateNetworkUser'])->name('networks.users.activate');
    Route::post('networks/users/{id}/remove', [NetworkController::class, 'removeNetworkUser'])->name('networks.users.remove');

    // Settling network invoices is a platform-level action
    Route::post('networks/invoices/{id}/mark-paid', [NetworkInvoiceController::class, 'markAsPaid'])->name('networks.invoices.mark-paid');
});

// Network owners (and super admin)
Route::middleware(['auth', 'ensure.network'])->group(function () {
    // Publisher Applications Management
    Route::get('applications/index', [PublisherApplicationController::class, 'index'])->name('applications.index');
    Route::get('applications/show/{id}', [PublisherApplicationController::class, 'show'])->name('applications.show');
    Route::post('applications/approve/{id}', [PublisherApplicationController::class, 'approve'])->name('applications.approve');
    Route::post('applications/reject/{id}', [PublisherApplicationController::class, 'reject'])->name('applications.reject');

    // pool
    Route::get('networks/pool/advertisers', [PoolController::class, 'advertisers'])->name('networks.pool.advertisers');
    Route::get('networks/pool/publishers', [PoolController::class, 'publishers'])->name('networks.pool.publishers');
    Route::get('networks/pool/advertisers/{id}', [PoolController::class, 'showAdvertiser'])->name('networks.pool.advertisers.show');
    Route::get('networks/pool/publishers/{id}', [PoolController::class, 'showPublisher'])->name('networks.pool.publishers.show');
    Route::post('networks/pool/advertisers/{id}/approve', [PoolController::class, 'approveAdvertiser'])->name('networks.pool.advertisers.approve');
    Route::post('networks/pool/advertisers/{id}/reject', [PoolController::class, 'rejectAdvertiser'])->name('networks.pool.advertisers.reject');
    Route::post('networks/pool/publishers/{id}/approve', [PoolController::class, 'approvePublisher'])->name('networks.pool.publishers.approve');
    Route::post('networks/pool/publishers/{id}/reject', [PoolController::class, 'rejectPublisher'])->name('networks.pool.publishers.reject');

    // Publisher Invoice Management (scoped to the caller's network in the controller)
    Route::get('admin/invoices', [AdminInvoiceController::class, 'index'])->name('admin.invoices.index');
    Route::get('admin/invoices/export', [AdminInvoiceController::class, 'export'])->name('admin.invoices.export');
    Route::get('admin/invoices/{id}', [AdminInvoiceController::class, 'show'])->name('admin.invoices.show');
    Route::post('admin/invoices/{id}/approve', [AdminInvoiceController::class, 'approve'])->name('admin.invoices.approve');
    Route::post('admin/invoices/{id}/reject', [AdminInvoiceController::class, 'reject'])->name('admin.invoices.reject');
    Route::post('admin/invoices/{id}/mark-paid', [AdminInvoiceController::class, 'markPaid'])->name('admin.invoices.mark-paid');
    Route::post('admin/invoices/bulk-approve', [AdminInvoiceController::class, 'bulkApprove'])->name('admin.invoices.bulk-approve');

    // Network Settings
    Route::get('networks/settings', [NetworkSettingsController::class, 'index'])->name('networks.settings.index');
    Route::post('networks/settings/update', [NetworkSettingsController::class, 'update'])->name('networks.settings.update');

    // Network Invoices
    Route::get('networks/invoices', [NetworkInvoiceController::class, 'index'])->name('networks.invoices.index');
    Route::post('networks/invoices/store', [NetworkInvoiceController::class, 'store'])->name('networks.invoices.store');
});
