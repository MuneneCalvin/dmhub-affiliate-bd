<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Models\Creative;
use App\Models\Lead;
use App\Models\PublisherCampaigns;
use App\Services\CommissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicLeadController extends Controller
{
    protected CommissionService $commissionService;

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    public function submit(Request $request)
    {

        $validated = $request->validate([
            'click_id' => 'nullable|exists:clicks,id',
            'tracking_code' => 'nullable|string|exists:creatives,tracking_code',
            'script_token' => 'nullable|string|exists:publisher_campaigns,script_token',
            'publisher_campaign_id' => 'nullable|integer|exists:publisher_campaigns,id',
            'first_name' => 'nullable|string|max:100',
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
            'page_url' => 'nullable|string|max:500',
            'page_title' => 'nullable|string|max:255',
        ]);
        if (empty($validated['click_id']) && empty($validated['tracking_code']) && empty($validated['script_token'])) {
            return response()->json([
                'success' => false,
                'error' => 'Either click_id, tracking_code, or script_token is required',
            ], 422);
        }

        try {
            $click = null;
            $publisherCampaign = null;
            $creative = null;
            $campaignId = null;
            $offerId = null;
            $publisherId = null;
            $networkId = null;
            $publisherCampaignId = null;

            if (! empty($validated['click_id'])) {
                $click = Clicks::with(['publisherCampaign', 'offer'])->find($validated['click_id']);
                if ($click) {
                    $campaignId = $click->campaign_id;
                    $offerId = $click->offer_id;
                    $publisherId = $click->publisher_id;
                    $networkId = $click->network_id;
                    $publisherCampaignId = $click->publisher_campaign_id;
                    $creative = $click->creative_id ? Creative::find($click->creative_id) : null;

                    if ($click->publisherCampaign) {
                        $publisherCampaign = $click->publisherCampaign;
                    }
                }
            }
            if (! $click && ! empty($validated['script_token'])) {
                $publisherCampaign = PublisherCampaigns::where('script_token', $validated['script_token'])
                    ->where('status', 'A')
                    ->with(['campaign', 'offer', 'publisher', 'network'])
                    ->first();

                if (! $publisherCampaign) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Invalid or inactive script token',
                    ], 403);
                }

                $campaignId = $publisherCampaign->campaign_id;
                $offerId = $publisherCampaign->offer_id;
                $publisherId = $publisherCampaign->publisher_id;
                $networkId = $publisherCampaign->network_id;
                $publisherCampaignId = $publisherCampaign->id;
            }
            if (! $click && ! $publisherCampaign && ! empty($validated['publisher_campaign_id'])) {
                $publisherCampaign = PublisherCampaigns::where('id', $validated['publisher_campaign_id'])
                    ->where('status', 'A')
                    ->with(['campaign', 'offer', 'publisher', 'network'])
                    ->first();

                if ($publisherCampaign) {
                    $campaignId = $publisherCampaign->campaign_id;
                    $offerId = $publisherCampaign->offer_id;
                    $publisherId = $publisherCampaign->publisher_id;
                    $networkId = $publisherCampaign->network_id;
                    $publisherCampaignId = $publisherCampaign->id;
                }
            }
            if (! $click && ! empty($validated['tracking_code'])) {
                $creative = Creative::where('tracking_code', $validated['tracking_code'])
                    ->with(['campaign', 'offer'])
                    ->first();

                if ($creative) {
                    if ($creative->status !== 'A') {
                        return response()->json([
                            'success' => false,
                            'error' => 'Creative is not active',
                        ], 403);
                    }
                    if (! $campaignId) {
                        $campaignId = $creative->campaign_id;
                    }
                    if (! $offerId) {
                        $offerId = $creative->offer_id;
                    }
                }
            }

            if (! $campaignId && ! $offerId) {
                return response()->json([
                    'success' => false,
                    'error' => 'Could not determine campaign or offer',
                ], 422);
            }

            $customFields = $validated['custom_fields'] ?? [];
            if (! empty($validated['page_url'])) {
                $customFields['source_page_url'] = $validated['page_url'];
            }
            if (! empty($validated['page_title'])) {
                $customFields['source_page_title'] = $validated['page_title'];
            }

            // Same email submitting to the same campaign/offer within 24h is a duplicate:
            // acknowledge it, but never create another lead (or commission) for it.
            $duplicate = Lead::where('email', $validated['email'])
                ->where('campaign_id', $campaignId)
                ->where('offer_id', $offerId)
                ->where('publisher_campaign_id', $publisherCampaignId)
                ->where('created_at', '>=', now()->subDay())
                ->first();

            if ($duplicate) {
                return response()->json([
                    'success' => true,
                    'message' => 'Lead submitted successfully',
                    'lead_id' => $duplicate->id,
                    'redirect_url' => null,
                ], 200);
            }

            $lead = DB::transaction(function () use ($validated, $request, $click, $creative, $publisherCampaign, $campaignId, $offerId, $publisherId, $networkId, $publisherCampaignId, $customFields) {
                $lead = Lead::create([
                    'click_id' => $click?->id,
                    'network_id' => $networkId,
                    'publisher_id' => $publisherId,
                    'publisher_campaign_id' => $publisherCampaignId,
                    'campaign_id' => $campaignId,
                    'offer_id' => $offerId,
                    'creative_id' => $creative?->id,
                    'first_name' => $validated['first_name'] ?? null,
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
                    'source' => $publisherCampaign ? 'publisher_script' : 'form_embed',
                    'status' => 'new',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'referer' => $request->header('referer'),
                    'custom_fields' => ! empty($customFields) ? $customFields : null,
                ]);
                if ($click) {
                    $click->update([
                        'is_converted' => true,
                        'converted_at' => now(),
                    ]);
                }
                if ($publisherCampaign) {
                    $publisherCampaign->increment('total_conversions');
                }
                $this->commissionService->calculateLeadCommission($lead);

                return $lead;
            });
            $redirectUrl = null;
            if ($click && $click->offer) {
                $redirectUrl = $click->offer->destination_url ?? $click->offer->preview_url;
            } elseif ($publisherCampaign && $publisherCampaign->form_redirect_url) {
                $redirectUrl = $publisherCampaign->form_redirect_url;
            } elseif ($publisherCampaign && $publisherCampaign->offer) {
                $redirectUrl = $publisherCampaign->offer->destination_url ?? $publisherCampaign->offer->preview_url;
            } elseif ($creative && $creative->offer) {
                $redirectUrl = $creative->offer->destination_url ?? $creative->offer->preview_url;
            }

            return response()->json([
                'success' => true,
                'message' => 'Lead submitted successfully',
                'lead_id' => $lead->id,
                'redirect_url' => $redirectUrl,
            ], 201);

        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'error' => 'An error occurred while processing your request.',
            ], 500);
        }
    }
}
