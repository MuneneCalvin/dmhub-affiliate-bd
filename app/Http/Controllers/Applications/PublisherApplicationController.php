<?php

namespace App\Http\Controllers\Applications;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Services\PartnerEnrollmentService;
use App\Support\Tenancy;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PublisherApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        $status = $request->input('status', 'P');

        $applications = $this->scoped($user)
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
            ->select([
                'publisher_campaigns.id',
                'publisher_campaigns.status',
                'publisher_campaigns.publisher_id',
                'publisher_campaigns.campaign_id',
                'publisher_campaigns.offer_id',
                'publisher_campaigns.requested_offer_id',
                'publisher_campaigns.applied_notes',
                'publisher_campaigns.applied_at',
                'publisher_campaigns.terms_accepted_at',
                'publisher_campaigns.rejection_reason',
                'publisher_campaigns.created_at',
                'publishers.website_url',
                'publishers.business_name',
                'publishers.traffic_sources',
                'publishers.monthly_visitors',
                'users.first_name',
                'users.last_name',
                'users.email',
                'campaigns.name as campaign_name',
                'offers.name as offer_name',
                'requested_offers.name as requested_offer_name',
            ])
            ->when($status !== 'all', function ($q) use ($status) {
                $q->where('publisher_campaigns.status', $status);
            })
            ->orderByDesc('publisher_campaigns.created_at')
            ->paginate(10)
            ->withQueryString();

        // Partner summary for the review drawer: track record of each publisher on this page,
        // limited to the campaigns the reviewer can see.
        $publisherIds = $applications->getCollection()->pluck('publisher_id')->unique()->values();
        $history = $this->scoped($user)
            ->whereIn('publisher_campaigns.publisher_id', $publisherIds)
            ->select('publisher_campaigns.publisher_id', 'publisher_campaigns.status', DB::raw('count(*) as total'))
            ->groupBy('publisher_campaigns.publisher_id', 'publisher_campaigns.status')
            ->get()
            ->groupBy('publisher_id');
        $applications->getCollection()->each(function ($application) use ($history) {
            $rows = ($history->get($application->publisher_id) ?? collect())->pluck('total', 'status');
            $approved = (int) ($rows['A'] ?? 0) + (int) ($rows['I'] ?? 0);
            $rejected = (int) ($rows['R'] ?? 0);
            if (is_string($application->traffic_sources)) {
                $application->traffic_sources = json_decode($application->traffic_sources, true);
            }
            $application->partner_summary = [
                'campaigns' => $approved,
                'pending' => (int) ($rows['P'] ?? 0),
                'approval_rate' => $approved + $rejected > 0 ? round($approved / ($approved + $rejected) * 100) : null,
            ];
        });

        $counts = $this->scoped($user)
            ->select('publisher_campaigns.status', DB::raw('count(*) as total'))
            ->groupBy('publisher_campaigns.status')
            ->pluck('total', 'status');

        return inertia('applications/index', [
            'applications' => $applications,
            'currentStatus' => $status,
            'statusCounts' => [
                'P' => (int) ($counts['P'] ?? 0),
                'A' => (int) ($counts['A'] ?? 0),
                'R' => (int) ($counts['R'] ?? 0),
            ],
            'can' => [
                'approve' => $this->allowed($user, 'approve_applications'),
                'reject' => $this->allowed($user, 'reject_applications'),
            ],
        ]);
    }

    /**
     * Approve or reject several pending applications at once. Approval always assigns the
     * offer the publisher requested (the terms they accepted); applications that cannot be
     * approved are skipped and reported, the rest are still reviewed.
     */
    public function bulkReview(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:50',
            'ids.*' => 'required|integer|distinct',
            'decision' => 'required|in:approve,reject',
            'rejection_reason' => 'required_if:decision,reject|nullable|string|max:500',
        ]);
        $approve = $validated['decision'] === 'approve';
        abort_unless($this->allowed($user, $approve ? 'approve_applications' : 'reject_applications'), 403);

        $applications = $this->scoped($user)->whereIn('publisher_campaigns.id', $validated['ids'])->get();
        abort_if($applications->count() !== count($validated['ids']), 404);

        $service = app(PartnerEnrollmentService::class);
        $done = 0;
        $failed = [];
        foreach ($applications as $application) {
            try {
                if ($approve && ! $application->requested_offer_id) {
                    throw ValidationException::withMessages(['offer_id' => 'No offer was requested.']);
                }
                $service->review($application, $user, $approve ? (int) $application->requested_offer_id : null, $approve ? null : $validated['rejection_reason']);
                $done++;
            } catch (ValidationException|ModelNotFoundException $e) {
                $failed[] = $application->id;
            }
        }

        $parts = [];
        if ($done > 0) {
            $parts[] = trans_choice($approve ? 'messages.applications.approved' : 'messages.applications.rejected', $done, ['count' => $done]);
        }
        if ($failed) {
            $parts[] = trans_choice('messages.applications.skipped', count($failed), ['count' => count($failed)]);
        }

        return redirect()->route('applications.index', ['status' => 'P'])
            ->with($done === 0 ? 'error' : 'success', implode(' ', $parts));
    }

    /** Applications the user may review: campaigns they can see, in their own network. */
    private function scoped($user)
    {
        return PublisherCampaigns::query()
            ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user))
            ->when(! $user->is_super_admin, fn ($q) => $q->where('publisher_campaigns.network_id', $user->networkId()));
    }

    private function allowed($user, string $permission): bool
    {
        return $user->is_super_admin || $user->permissionNames()->contains($permission);
    }

    public function show($id)
    {
        $user = Auth::user();

        $application = PublisherCampaigns::query()
            ->where('publisher_campaigns.id', $id)
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
            ->join('networks', 'networks.id', '=', 'publisher_campaigns.network_id')
            ->select([
                'publisher_campaigns.*',
                'publishers.website_url',
                'publishers.traffic_sources',
                'users.first_name',
                'users.last_name',
                'users.email',
                'campaigns.id as campaign_id',
                'campaigns.name as campaign_name',
                'campaigns.description as campaign_description',
                'campaigns.currency',
                'offers.name as offer_name',
                'requested_offers.name as requested_offer_name',
                'publisher_campaigns.commission_value as commission_value_1',
                'publisher_campaigns.commission_type as commission_type_1',
                'networks.network_name',
            ])
            ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user))
            ->when(! $user->is_super_admin, fn ($q) => $q->where('publisher_campaigns.network_id', $user->networkId()))
            ->first();
        abort_if($application === null, 404);
        $campaignOffers = Offer::where('campaign_id', $application->campaign_id)
            ->where('offer_status', 'A')
            ->with('commissions.commissionType')
            ->get();

        return inertia('applications/show', [
            'application' => $application,
            'campaignOffers' => $campaignOffers,
        ]);
    }

    public function approve(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'offer_id' => 'required|exists:offers,id',
            ]);

            $user = Auth::user();

            $application = PublisherCampaigns::whereIn('campaign_id', Tenancy::campaignIds($user))
                ->when(! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()))
                ->findOrFail($id);
            $application = app(PartnerEnrollmentService::class)->review($application, $user, (int) $validated['offer_id']);
            $offer = $application->offer;

            return $this->afterReview($request)->with('success', "Application approved and assigned to offer: {$offer->name}");
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            return redirect()->back()->with('error', "Failed to approve application: {$e->getMessage()}");
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'rejection_reason' => 'required|string|max:500',
            ]);
            $application = PublisherCampaigns::whereIn('campaign_id', Tenancy::campaignIds($user))
                ->when(! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()))
                ->findOrFail($id);
            app(PartnerEnrollmentService::class)->review($application, $user, null, $validated['rejection_reason']);

            return $this->afterReview($request)->with('success', 'Application rejected');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Failed to reject application: '.$e->getMessage());
        }
    }

    /** Reviews started from the dashboard return there; everything else goes to the list. */
    private function afterReview(Request $request)
    {
        return redirect()->route($request->input('return_to') === 'dashboard' ? 'dashboard' : 'applications.index');
    }

    private function generateTrackingId(PublisherCampaigns $application, int $offerId): string
    {
        $shortUuid = Str::lower(Str::random(8));

        return "{$shortUuid}_{$application->publisher_id}_{$offerId}";
    }
}
