<?php

use App\Http\Controllers\API\LeadFormSubmissionController;
use App\Http\Controllers\Tracking\LeadFormScriptController;
use Illuminate\Support\Facades\Route;

// Public: the offer key and the Origin header stand in for credentials; throttled per address and per key.
Route::post('/lf/{key}', [LeadFormSubmissionController::class, 'store'])
    ->middleware(['throttle:30,1,lead-forms', 'throttle:lead-form-key'])->name('lead-forms.store');

// The script is fetched on every view of a form page, so it gets a far larger allowance than a submit.
Route::get('/lf/{key}.js', [LeadFormScriptController::class, 'serve'])->where('key', '[A-Za-z0-9]+')
    ->middleware('throttle:600,1,lead-form-script')->name('lead-forms.script');
