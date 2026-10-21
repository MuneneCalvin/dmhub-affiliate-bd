<?php

namespace App\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Models\Lead;
use App\Models\Offer;
use Illuminate\Http\Request;

class LeadPostbackController extends Controller
{
    public function receive(Request $request)
    {
        $request->validate([
            'email' => 'nullable|email|max:255',
            'lead_value' => 'nullable|numeric|min:0',
            'value' => 'nullable|numeric|min:0',
            'custom_fields' => 'nullable|array',
            'extra' => 'nullable|array',
        ]);

        $clickId = $request->input('click_id') ?? $request->input('clickid') ?? $request->input('cid');
        $transactionId = $request->input('transaction_id') ?? $request->input('txn_id') ?? $request->input('order_id');

        if (! $clickId && ! $transactionId) {
            return response()->json([
                'success' => false,
                'error' => 'Missing click_id or transaction_id',
            ], 400);
        }

        $click = null;

        if ($clickId) {
            $click = Clicks::with(['publisherCampaign'])->find($clickId);
        }

        if (! $click) {
            return response()->json([
                'success' => false,
                'error' => 'Click not found',
            ], 404);
        }
        $existingLead = Lead::where('click_id', $click->id)->first();
        if ($existingLead) {
            return response()->json([
                'success' => true,
                'message' => 'Lead already exists',
                'lead_id' => $existingLead->id,
                'lead_token' => $existingLead->lead_token,
            ]);
        }
        $lead = Lead::create([
            'click_id' => $click->id,
            'publisher_id' => $click->publisher_id,
            'network_id' => $click->network_id,
            'campaign_id' => $click->campaign_id,
            'offer_id' => $click->offer_id,
            'publisher_campaign_id' => $click->publisher_campaign_id,
            'creative_id' => $click->creative_id,
            'first_name' => $request->input('first_name') ?? $request->input('fname'),
            'last_name' => $request->input('last_name') ?? $request->input('lname'),
            'email' => $request->input('email'),
            'phone' => $request->input('phone') ?? $request->input('telephone'),
            'company' => $request->input('company') ?? $request->input('business_name'),
            'job_title' => $request->input('job_title') ?? $request->input('position'),
            'address' => $request->input('address') ?? $request->input('street'),
            'city' => $request->input('city'),
            'state' => $request->input('state') ?? $request->input('region'),
            'postal_code' => $request->input('postal_code') ?? $request->input('zip'),
            'country' => $request->input('country'),
            'source' => 'postback',
            'ip_address' => $request->input('ip') ?? $click->ip_address,
            'user_agent' => $click->user_agent,
            'device_type' => $click->device_type,
            'browser' => $click->browser,
            'operating_system' => $click->operating_system,
            'country_iso' => $request->input('country_iso') ?? $click->country_iso,
            'region' => $click->region,
            'city_town' => $click->city_town,
            'lead_value' => $request->input('lead_value') ?? $request->input('value'),
            'custom_fields' => $request->input('custom_fields') ?? $request->input('extra'),
            'status' => 'new',
            'priority' => 'medium',
        ]);
        $click->update([
            'is_converted' => true,
            'converted_at' => now(),
        ]);
        if ($click->publisherCampaign) {
            $click->publisherCampaign->increment('total_conversions');
        }
        $offer = Offer::find($click->offer_id);
        if ($offer) {
            $offer->increment('total_conversions');
        }

        return response()->json([
            'success' => true,
            'message' => 'Lead created successfully',
            'lead_id' => $lead->id,
            'lead_token' => $lead->lead_token,
        ]);
    }

    public function updateStatus(Request $request)
    {
        // Lookup by unguessable token only; sequential lead_id would let callers enumerate leads.
        $leadToken = $request->input('lead_token') ?? $request->input('token');

        $lead = $leadToken ? Lead::where('lead_token', $leadToken)->first() : null;

        if (! $lead) {
            return response()->json([
                'success' => false,
                'error' => 'Lead not found',
            ], 404);
        }

        $request->validate([
            'conversion_value' => 'nullable|numeric|min:0',
            'value' => 'nullable|numeric|min:0',
        ]);

        $status = $request->input('status');
        $validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost', 'unresponsive'];

        if (! in_array($status, $validStatuses)) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid status. Must be one of: '.implode(', ', $validStatuses),
            ], 400);
        }

        $updateData = ['status' => $status];

        if ($status === 'converted') {
            $updateData['is_converted'] = true;
            $updateData['converted_at'] = now();
            $updateData['conversion_value'] = $request->input('conversion_value') ?? $request->input('value');
        }

        $lead->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Lead status updated',
            'lead_id' => $lead->id,
            'status' => $status,
        ]);
    }

    public function getInfo(Request $request)
    {
        // Lookup by unguessable token only; sequential lead_id would let callers enumerate leads.
        $leadToken = $request->input('lead_token') ?? $request->input('token');

        $lead = $leadToken ? Lead::where('lead_token', $leadToken)->first() : null;

        if (! $lead) {
            return response()->json([
                'success' => false,
                'error' => 'Lead not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'lead' => [
                'id' => $lead->id,
                'lead_token' => $lead->lead_token,
                'email' => $lead->email,
                'status' => $lead->status,
                'is_converted' => $lead->is_converted,
                'created_at' => $lead->created_at->toISOString(),
            ],
        ]);
    }
}
