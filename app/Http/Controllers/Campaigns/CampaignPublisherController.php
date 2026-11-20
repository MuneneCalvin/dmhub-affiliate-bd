<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use App\Services\CampaignPublishersService;
use App\Services\PartnerEnrollmentService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CampaignPublisherController extends Controller
{
    public function review(Request $request, int $campaign, int $application)
    {
        $campaign = Campaign::visibleTo($request->user())->findOrFail($campaign);
        $application = PublisherCampaigns::where('campaign_id', $campaign->id)->where('network_id', $campaign->network_id)->findOrFail($application);
        $input = $request->validate(['decision' => 'required|in:approve,reject', 'rejection_reason' => 'required_if:decision,reject|nullable|string|max:500']);
        abort_unless(app(CampaignPublishersService::class)->canReview($request->user(), $input['decision']), 403);
        if ($input['decision'] === 'reject' && trim($input['rejection_reason']) === '') {
            throw ValidationException::withMessages(['rejection_reason' => 'A rejection reason is required.']);
        }
        if ($input['decision'] === 'approve' && ! $application->requested_offer_id) {
            throw ValidationException::withMessages(['offer_id' => 'The publisher must select an offer and accept its terms before approval.']);
        }
        app(PartnerEnrollmentService::class)->review($application, $request->user(),
            $input['decision'] === 'approve' ? $application->requested_offer_id : null,
            $input['decision'] === 'reject' ? trim($input['rejection_reason']) : null);

        return to_route('advertiser.campaign.show', ['id' => $campaign->id, 'tab' => 'publishers',
            'group' => $input['decision'] === 'approve' ? 'assignments' : 'rejected', 'publisher' => $application->id])
            ->with('success', $input['decision'] === 'approve' ? 'Application approved.' : 'Application rejected.');
    }
}
