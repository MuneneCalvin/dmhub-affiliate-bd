<?php
use Illuminate\Support\Facades\Route;

Route::post('/notifications/{id}/mark-as-read', function ($id) {
    auth()->user()->notifications()->findOrFail($id)->markAsRead();
    return back();
})->name('notifications.markAsRead');

Route::post('/notifications/mark-all-as-read', function () {
    auth()->user()->unreadNotifications->markAsRead();
    return back();
})->name('notifications.markAllAsRead');