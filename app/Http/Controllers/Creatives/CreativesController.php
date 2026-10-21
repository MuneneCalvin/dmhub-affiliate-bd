<?php

namespace App\Http\Controllers\Creatives;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Creative;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class CreativesController extends Controller
{
    /**
     * The chosen campaign must be accessible to the user and the offer must belong to it.
     */
    private function assertOfferInVisibleCampaign($user, $campaignId, $offerId): void
    {
        $campaign = Campaign::visibleTo($user)->findOrFail($campaignId);
        abort_unless($campaign->offers()->whereKey($offerId)->exists(), 422, 'Offer does not belong to the campaign.');
    }

    public function index(Request $request)
    {
        $query = Creative::visibleTo($request->user())->with(['offer', 'campaign'])->where('status', 'A');

        return inertia('creatives/index', [
            'creatives' => $query->paginate(25),
        ]);
    }

    public function create(Request $request)
    {
        $query = Campaign::visibleTo($request->user())->with('offers');

        $campaigns = $query->get();
        $offers = $campaigns->flatMap->offers->unique('id')->values();

        return inertia('creatives/create', [
            'campaigns' => $campaigns,
            'offers' => $offers,
        ]);
    }

    public function show(Request $request, $id)
    {
        $creative = Creative::visibleTo($request->user())->with(['offer', 'campaign'])->findOrFail($id);

        $creative->lead_form_embed_code = $creative->getLeadFormEmbedCode();

        return inertia('creatives/show', [
            'creative' => $creative,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'offer_id' => ['required', 'integer', 'exists:offers,id'],
                'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'string', 'in:image,video,html'],
                'width' => ['required'],
                'height' => ['required'],
                'file_url' => ['nullable'],
                'preview_url' => ['nullable'],
                'html_code' => ['nullable'],
                'alt_text' => ['nullable', 'string', 'max:255'],
            ]);
            $this->assertOfferInVisibleCampaign($request->user(), $validated['campaign_id'], $validated['offer_id']);
            Creative::create([
                'offer_id' => $validated['offer_id'],
                'campaign_id' => $validated['campaign_id'],
                'name' => $validated['name'],
                'type' => $validated['type'],
                'width' => $validated['width'] ?? null,
                'height' => $validated['height'] ?? null,
                'file_url' => $validated['file_url'] ?? null,
                'preview_url' => $validated['preview_url'] ?? null,
                'html_code' => $validated['html_code'] ?? null,
                'alt_text' => $validated['alt_text'] ?? null,
                'status' => 'A',
            ]);

            return redirect()->route('advertiser.creatives.create')->with('success', 'Created successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.creatives.create')->with('error', 'An error occurred while saving the creative.');
        }
    }

    public function edit(Request $request, $id)
    {
        $user = $request->user();

        $creative = Creative::visibleTo($user)->with(['offer', 'campaign'])->findOrFail($id);

        $query = Campaign::visibleTo($user)->with('offers');

        $campaigns = $query->get();
        $offers = $campaigns->flatMap->offers->unique('id')->values();

        return inertia('creatives/edit', [
            'creative' => $creative,
            'campaigns' => $campaigns,
            'offers' => $offers,
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            $creative = Creative::visibleTo($user)->findOrFail($id);
            $validated = $request->validate([
                'offer_id' => ['required', 'integer', 'exists:offers,id'],
                'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'string', 'in:image,video,html'],
                'width' => ['required'],
                'height' => ['required'],
                'file_url' => ['nullable'],
                'preview_url' => ['nullable'],
                'html_code' => ['nullable'],
                'alt_text' => ['nullable', 'string', 'max:255'],
            ]);
            $this->assertOfferInVisibleCampaign($user, $validated['campaign_id'], $validated['offer_id']);
            $creative->update([
                'offer_id' => $validated['offer_id'],
                'campaign_id' => $validated['campaign_id'],
                'name' => $validated['name'],
                'type' => $validated['type'],
                'width' => $validated['width'] ?? null,
                'height' => $validated['height'] ?? null,
                'file_url' => $validated['file_url'] ?? null,
                'preview_url' => $validated['preview_url'] ?? null,
                'html_code' => $validated['html_code'] ?? null,
                'alt_text' => $validated['alt_text'] ?? null,
            ]);

            // Regenerate embed codes after update
            $creative->generateEmbedCodes();

            return redirect()->route('advertiser.creatives.index')->with('success', 'Updated successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.creatives.edit', $id)->with('error', 'An error occurred while updating the creative.');
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $creative = Creative::visibleTo($request->user())->findOrFail($id);
            $creative->delete();

            return redirect()->route('advertiser.creatives.index')->with('success', 'Deleted successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertiser.creatives.index')->with('error', 'An error occurred while deleting the creative.');
        }
    }
}
