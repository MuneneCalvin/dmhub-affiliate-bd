<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitLeadRequest;
use App\Services\ConversionEventService;
use App\Services\LeadIntakeService;

class LeadSubmissionController extends Controller
{
    /**
     * A merchant reports a successful form submission together with the contact it collected.
     * The submission goes through the normal event pipeline (fraud checks, ledger, idempotency);
     * the contact is stored beside it and never influences the commission.
     */
    public function store(SubmitLeadRequest $request, ConversionEventService $pipeline, LeadIntakeService $intake)
    {
        $data = $request->eventData();
        $click = $pipeline->resolveClick($data, (int) $request->attributes->get('postback_advertiser_id'));
        $result = $intake->submit($click, $data, $request->contactData(), fn (array $d) => $pipeline->confirm($d, $request));
        $event = $result['event'];

        return response()->json([
            'success' => true, 'lead_id' => $result['lead']->id, 'event_id' => $event->id, 'duplicate' => $result['duplicate'],
            'commission_status' => $event->earning->status,
            'commission_amount' => $event->earning->amount, 'currency' => $event->currency,
        ], $result['duplicate'] ? 200 : 201);
    }
}
