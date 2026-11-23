<?php

use App\Http\Controllers\API\LeadFormSubmissionController;
use Illuminate\Support\Facades\Route;

// Public: the offer key and the Origin header stand in for credentials; throttled per address and per key.
Route::post('/lf/{key}', [LeadFormSubmissionController::class, 'store'])->name('lead-forms.store');
