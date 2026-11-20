<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmConversionRequest;
use App\Services\ConversionEventService;

class ConversionEventController extends Controller
{
    public function store(ConfirmConversionRequest $request, ConversionEventService $pipeline)
    {
        $result = $pipeline->confirm($request->validated(), $request);
        $event = $result['event'];

        return response()->json([
            'success' => true, 'event_id' => $event->id, 'duplicate' => $result['duplicate'],
            'conversion_id' => $event->conversion->id,
            'commission_status' => $event->earning->status,
            'commission_amount' => $event->earning->amount, 'currency' => $event->currency,
        ], $result['duplicate'] ? 200 : 201);
    }
}
