<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
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

        return response()->json([
            'success' => true,
            'data' => $publisherCampaign->getAllAssets(),
        ]);
    }

    public function updateFormSettings(Request $request, int $publisherCampaignId)
    {
        $publisherCampaign = $this->findOwned($request, $publisherCampaignId);

        if (! $publisherCampaign) {
            return response()->json([
                'success' => false,
                'error' => 'Publisher campaign not found',
            ], 404);
        }

        $validated = $request->validate([
            'form_title' => 'nullable|string|max:255',
            'form_button_text' => 'nullable|string|max:100',
            'form_success_message' => 'nullable|string|max:255',
            'form_redirect_url' => 'nullable|url:http,https|max:500',
            'form_trigger' => 'nullable|in:auto,click,delay,exit_intent,scroll',
            'form_delay_seconds' => 'nullable|integer|min:0|max:300',
            'form_scroll_percent' => 'nullable|integer|min:0|max:100',
            'form_settings' => 'nullable|array',
            'form_settings.fields' => 'nullable|array',
            'form_settings.colors' => 'nullable|array',
        ]);

        $publisherCampaign->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Form settings updated successfully',
            'data' => $publisherCampaign->getFormConfig(),
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
