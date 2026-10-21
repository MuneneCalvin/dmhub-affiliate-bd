<?php

namespace App\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Models\Lead;
use App\Models\Offer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeadCaptureController extends Controller
{
    public function showForm(Request $request, $clickId)
    {
        $click = Clicks::with(['campaign', 'offer', 'publisher', 'creative'])
            ->find($clickId);
        if (! $click) {
            abort(404, 'Invalid tracking session');
        }

        $offer = $click->offer;
        $campaign = $click->campaign;

        return Inertia::render('leads/capture', [
            'click_id' => $clickId,
            'campaign' => [
                'id' => $campaign?->id,
                'name' => $campaign?->name,
            ],
            'offer' => [
                'id' => $offer?->id,
                'name' => $offer?->name,
                'preview_url' => $offer?->preview_url,
            ],
        ]);
    }

    public function submitForm(Request $request)
    {
        $validated = $request->validate([
            'click_id' => 'required|exists:clicks,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'job_title' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'custom_fields' => 'nullable|array',
        ]);

        $click = Clicks::with(['publisherCampaign'])->find($validated['click_id']);

        if (! $click) {
            return back()->withErrors(['click_id' => 'Invalid tracking session']);
        }

        // One lead per click: a repeated submit just shows the thank-you page again.
        $existing = Lead::where('click_id', $click->id)->first();
        if ($existing) {
            return Inertia::render('leads/thank-you', [
                'lead_token' => $existing->lead_token,
                'redirect_url' => Offer::find($click->offer_id)?->preview_url ?? '/lead/thank-you',
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
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'] ?? null,
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'company' => $validated['company'] ?? null,
            'job_title' => $validated['job_title'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'postal_code' => $validated['postal_code'] ?? null,
            'country' => $validated['country'] ?? null,
            'custom_fields' => $validated['custom_fields'] ?? null,
            'source' => 'form',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'device_type' => $click->device_type,
            'browser' => $click->browser,
            'operating_system' => $click->operating_system,
            'country_iso' => $click->country_iso,
            'region' => $click->region,
            'city_town' => $click->city_town,
            'utm_source' => $request->input('utm_source'),
            'utm_medium' => $request->input('utm_medium'),
            'utm_campaign' => $request->input('utm_campaign'),
            'utm_term' => $request->input('utm_term'),
            'utm_content' => $request->input('utm_content'),
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
        $redirectUrl = $offer?->preview_url ?? '/lead/thank-you';

        return Inertia::render('leads/thank-you', [
            'lead_token' => $lead->lead_token,
            'redirect_url' => $redirectUrl,
        ]);
    }

    public function thankYou()
    {
        return Inertia::render('leads/thank-you');
    }
}
