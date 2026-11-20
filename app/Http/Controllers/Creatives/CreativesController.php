<?php

namespace App\Http\Controllers\Creatives;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Creative;
use App\Models\Offer;
use App\Support\MediaStorage;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
        return redirect()->route('advertiser.campaign.index');
    }

    public function create(Request $request)
    {
        if (! $request->filled('offer_id')) {
            return redirect()->route('advertiser.campaign.index')->with('info', 'Choose an offer to add promotional materials.');
        }
        $request->validate(['offer_id' => 'required|integer']);
        $offer = Offer::visibleTo($request->user())->with('campaign')->findOrFail($request->integer('offer_id'));

        return inertia('creatives/create', [
            'campaigns' => [$offer->campaign],
            'offers' => [$offer],
            'offer' => $offer,
        ]);
    }

    public function show(Request $request, $id)
    {
        $creative = Creative::visibleTo($request->user())->with(['offer', 'campaign'])->findOrFail($id);

        return inertia('creatives/show', [
            'creative' => $creative,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $creative = $this->saveCreative($request);

            return ($request->boolean('workspace')
                ? redirect()->route('advertiser.campaign.show', ['id' => $creative->campaign_id, 'tab' => 'offers', 'offer' => $creative->offer_id])
                : redirect()->route('advertiser.offers.show', ['offer' => $creative->offer_id, 'tab' => 'materials']))->with('success', 'Created successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'An error occurred while saving the creative.');
        }
    }

    public function edit(Request $request, $id)
    {
        $user = $request->user();

        $creative = Creative::visibleTo($user)->with(['offer', 'campaign'])->findOrFail($id);

        return inertia('creatives/edit', [
            'creative' => $creative,
            'campaigns' => [$creative->campaign],
            'offers' => [$creative->offer],
            'offer' => $creative->offer,
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            $creative = Creative::visibleTo($user)->findOrFail($id);
            $this->saveCreative($request, $creative);

            return ($request->boolean('workspace')
                ? redirect()->route('advertiser.campaign.show', ['id' => $creative->campaign_id, 'tab' => 'offers', 'offer' => $creative->offer_id])
                : redirect()->route('advertiser.offers.show', ['offer' => $creative->offer_id, 'tab' => 'materials']))->with('success', 'Updated successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'An error occurred while updating the creative.');
        }
    }

    private function saveCreative(Request $request, ?Creative $creative = null): Creative
    {
        $type = $request->input('type');
        $imageTypes = ['image', 'banner', 'email'];
        $isImage = in_array($type, $imageTypes, true);
        $sameAssetType = $creative && ($creative->type === $type || ($isImage && in_array($creative->type, $imageTypes, true)));
        $needsAsset = ($isImage || $type === 'video') && ! ($sameAssetType && $creative->file_url);
        $data = $request->validate([
            'offer_id' => ['required', 'integer', 'exists:offers,id'],
            'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['image', 'banner', 'email', 'video', 'html', 'text'])],
            'asset' => [Rule::requiredIf($needsAsset), 'nullable', $type === 'video' ? 'file' : 'image',
                $type === 'video' ? 'mimes:mp4,webm' : 'mimes:jpg,jpeg,png,gif,webp',
                $type === 'video' ? 'max:51200' : 'max:10240'],
            'preview_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240'],
            'width' => [Rule::requiredIf($type === 'video' && $request->hasFile('asset')), 'nullable', 'integer', 'between:1,100000'],
            'height' => [Rule::requiredIf($type === 'video' && $request->hasFile('asset')), 'nullable', 'integer', 'between:1,100000'],
            'html_code' => ['required_if:type,html', 'nullable', 'string', 'max:200000'],
            'alt_text' => ['required_if:type,text', 'nullable', 'string', 'max:255'],
        ]);
        $this->assertOfferInVisibleCampaign($request->user(), $data['campaign_id'], $data['offer_id']);
        abort_if($creative && ((int) $data['offer_id'] !== (int) $creative->offer_id
            || (int) $data['campaign_id'] !== (int) $creative->campaign_id), 422, 'Promotional materials cannot be moved to another offer.');
        $data['file_url'] = $sameAssetType ? $creative->file_url : '';
        $data['preview_url'] = $sameAssetType ? $creative->preview_url : null;
        $data['width'] = $sameAssetType ? $creative->width : null;
        $data['height'] = $sameAssetType ? $creative->height : null;
        $data['html_code'] = $type === 'html' ? $data['html_code'] : null;
        $paths = [];

        try {
            if ($request->hasFile('asset') && $type !== 'text') {
                $asset = $request->file('asset');
                $path = MediaStorage::store($asset, 'creatives');
                throw_unless($path, \RuntimeException::class, 'Could not store the creative asset.');
                $paths[] = $path;
                $data['file_url'] = MediaStorage::url($path);
                if ($type === 'video') {
                    $data['width'] = $request->integer('width');
                    $data['height'] = $request->integer('height');
                } else {
                    [$data['width'], $data['height']] = getimagesize($asset->getRealPath());
                }
            }
            if ($isImage) {
                $data['preview_url'] = $data['file_url'];
            } elseif ($type !== 'text' && $request->hasFile('preview_image')) {
                $path = MediaStorage::store($request->file('preview_image'), 'creatives/previews');
                throw_unless($path, \RuntimeException::class, 'Could not store the preview image.');
                $paths[] = $path;
                $data['preview_url'] = MediaStorage::url($path);
            }
            if ($type === 'text') {
                $data['file_url'] = '';
                $data['preview_url'] = $data['width'] = $data['height'] = null;
            }
            unset($data['asset'], $data['preview_image']);

            return DB::transaction(function () use ($creative, $data) {
                if (! $creative) {
                    return Creative::create([...$data, 'status' => 'A']);
                }
                $creative->update($data);
                $creative->generateEmbedCodes();

                return $creative;
            });
        } catch (\Throwable $e) {
            MediaStorage::delete($paths);
            throw $e;
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $creative = Creative::visibleTo($request->user())->findOrFail($id);
            $offerId = $creative->offer_id;
            $creative->delete();

            return redirect()->route('advertiser.offers.show', ['offer' => $offerId, 'tab' => 'materials'])->with('success', 'Deleted successfully');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return back()->with('error', 'An error occurred while deleting the creative.');
        }
    }
}
