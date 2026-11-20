<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use App\Support\PublisherAttribution;
use Illuminate\Http\Request;

class PublisherAssetsController extends Controller
{
    /**
     * Only the owning publisher (or a super admin) may modify a publisher campaign.
     */
    private function findOwned(Request $request, int $publisherCampaignId): ?PublisherCampaigns
    {
        $user = $request->user();
        $publisherCampaign = PublisherCampaigns::with('publisher')->find($publisherCampaignId);

        if (! $publisherCampaign) {
            return null;
        }

        if (! $user->is_super_admin && $publisherCampaign->publisher?->user_id !== $user->id) {
            return null;
        }

        return $publisherCampaign;
    }

    public function getAssets(Request $request, int $publisherCampaignId)
    {
        $publisherCampaign = $this->findOwned($request, $publisherCampaignId);

        if ($publisherCampaign && $publisherCampaign->status !== 'A') {
            $publisherCampaign = null;
        }

        if (! $publisherCampaign) {
            return response()->json([
                'success' => false,
                'error' => 'Publisher campaign not found or inactive',
            ], 404);
        }

        PublisherAttribution::assertActive($publisherCampaign);

        return response()->json([
            'success' => true,
            'data' => $publisherCampaign->getAllAssets(),
        ]);
    }

    public function getAssetsByToken(Request $request, string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->with(['campaign', 'offer', 'publisher'])
            ->first();

        if (! $publisherCampaign) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid script token or inactive campaign',
            ], 404);
        }

        PublisherAttribution::assertActive($publisherCampaign);

        return response()->json([
            'success' => true,
            'data' => $publisherCampaign->getAllAssets(),
        ]);
    }

    public function regenerateToken(Request $request, int $publisherCampaignId)
    {
        $publisherCampaign = $this->findOwned($request, $publisherCampaignId);

        if (! $publisherCampaign) {
            return response()->json([
                'success' => false,
                'error' => 'Publisher campaign not found',
            ], 404);
        }

        $publisherCampaign->script_token = PublisherCampaigns::generateUniqueScriptToken();
        $publisherCampaign->save();

        return response()->json([
            'success' => true,
            'message' => 'Script token regenerated successfully',
            'data' => [
                'script_token' => $publisherCampaign->script_token,
                'script_url' => $publisherCampaign->getScriptUrl(),
                'embed_tag' => $publisherCampaign->getEmbedScriptTag(),
            ],
        ]);
    }
}
