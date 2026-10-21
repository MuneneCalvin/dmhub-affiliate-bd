<?php

use App\Http\Controllers\Settings\SystemUsersController;
use App\Http\Controllers\System\SettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'ensure.admin'])->group(function () {
    // Roles CRUD
    Route::get('system/settings/role', [SettingsController::class, 'index'])->name('system.settings.roles');
    Route::post('system/settings/role', [SettingsController::class, 'store'])->name('system.settings.roles.store');
    Route::get('system/settings/role/{role}', [SettingsController::class, 'show'])->name('system.settings.roles.show');
    Route::put('system/settings/role/{role}', [SettingsController::class, 'update'])->name('system.settings.roles.update');
    Route::delete('system/settings/role/{role}', [SettingsController::class, 'destroy'])->name('system.settings.roles.destroy');

    // Role Permissions Management
    Route::get('system/settings/role/{role}/permissions', [SettingsController::class, 'rolePermissions'])->name('system.settings.roles.permissions');
    Route::post('system/settings/role/{role}/permissions', [SettingsController::class, 'syncPermissions'])->name('system.settings.roles.permissions.sync');

    // Permissions
    Route::get('system/settings/permissions', [SettingsController::class, 'permissionIndex'])->name('system.settings.Permissions');

    // system users
    Route::get('system/settings/users', [SystemUsersController::class, 'index'])->name('system.settings.users');
    Route::patch('system/settings/users/{user}/activate', [SystemUsersController::class, 'activate'])->name('system.settings.users.activate');
    Route::patch('system/settings/users/{user}/deactivate', [SystemUsersController::class, 'deactivate'])->name('system.settings.users.deactivate');
    Route::post('system/settings/users/{user}/assign-roles', [SystemUsersController::class, 'AssignRolesToUsers'])->name('system.settings.users.assign.roles');
});
