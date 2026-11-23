<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadFormSubmissionRequest;
use App\Services\ConversionEventService;
use App\Services\LeadIntakeService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

class LeadFormSubmissionController extends Controller
{
    /**
     * A visitor submitted the merchant's form. The submission goes through the normal event pipeline
     * (fraud checks, ledger, idempotency); the contact is stored beside it and never influences the commission.
     * The answer carries no contact details.
     */
    public function store(LeadFormSubmissionRequest $request, ConversionEventService $pipeline, LeadIntakeService $intake)
    {
        $offer = $request->offer();
        $advertiserId = $offer->campaign->advertiser_id;
        $input = $request->validated();

        try {
            $click = $pipeline->resolveClick(array_intersect_key($input, array_flip(['click_id', 'referral_id'])), $advertiserId);
        } catch (ModelNotFoundException) {
            throw ValidationException::withMessages(['click_id' => 'The referral is unknown.']);
        }
        if ((int) $click->offer_id !== $offer->id) {
            throw ValidationException::withMessages(['click_id' => 'The referral belongs to another offer.']);
        }

        $eventData = [
            'event_type' => 'submission', 'external_id' => 'form:'.$click->id, 'click_id' => $click->id,
            'occurred_at' => now()->utc()->format('Y-m-d\TH:i:s.u\Z'), 'amount' => '0.00',
            'currency' => $offer->campaign->currency, 'successful' => true,
            'spam_checks' => [
                'honeypot_filled' => ($input['hp'] ?? '') !== '',
                'form_duration_ms' => (int) ($input['duration_ms'] ?? 0),
                'is_spam' => false,
            ],
        ];

        $result = $intake->submit($click, $eventData, $request->contactData(),
            fn (array $data) => $pipeline->confirmFromLeadForm($advertiserId, $data, $request), now()->toImmutable());

        return response()->json(['success' => true, 'duplicate' => $result['duplicate']], $result['duplicate'] ? 200 : 201)
            ->header('Access-Control-Allow-Origin', $request->allowedOrigin())
            ->header('Vary', 'Origin');
    }
}
