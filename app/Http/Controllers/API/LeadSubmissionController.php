<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitLeadRequest;
use App\Models\LeadContact;
use App\Services\ConversionEventService;
use Illuminate\Database\UniqueConstraintViolationException;

class LeadSubmissionController extends Controller
{
    /**
     * A merchant reports a successful form submission together with the contact it collected.
     * The submission goes through the normal event pipeline (fraud checks, ledger, idempotency);
     * the contact is stored beside it and never influences the commission.
     */
    public function store(SubmitLeadRequest $request, ConversionEventService $pipeline)
    {
        $result = $pipeline->confirm($request->eventData(), $request);
        $event = $result['event'];
        $attribution = $event->attribution;

        $attributes = [
            'advertiser_id' => $event->advertiser_id, 'network_id' => $attribution['network_id'],
            'campaign_id' => $attribution['campaign_id'], 'offer_id' => $attribution['offer_id'],
            'publisher_campaign_id' => $attribution['publisher_campaign_id'],
        ] + $request->contactData();

        try {
            $lead = LeadContact::firstOrCreate(['conversion_event_id' => $event->id], $attributes);
        } catch (UniqueConstraintViolationException) {
            $lead = LeadContact::where('conversion_event_id', $event->id)->firstOrFail();
        }

        return response()->json([
            'success' => true, 'lead_id' => $lead->id, 'event_id' => $event->id, 'duplicate' => $result['duplicate'],
            'commission_status' => $event->earning->status,
            'commission_amount' => $event->earning->amount, 'currency' => $event->currency,
        ], $result['duplicate'] ? 200 : 201);
    }
}
