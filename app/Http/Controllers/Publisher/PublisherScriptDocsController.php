<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Support\ScriptIntegrationGuide;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PublisherScriptDocsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        // Get all active publisher campaigns with script tokens
        $campaigns = PublisherCampaigns::where('publisher_id', $publisher->id)
            ->where('status', 'A')
            ->with(['campaign', 'offer'])
            ->get()
            ->map(function ($pc) {
                return [
                    'id' => $pc->id,
                    'campaign_name' => $pc->campaign?->name ?? 'N/A',
                    'offer_name' => $pc->offer?->name ?? 'N/A',
                    'script_token' => $pc->script_token,
                    'script_url' => $pc->getScriptUrl(),
                    'embed_tag' => $pc->getEmbedScriptTag(),
                    'tracking_link' => $pc->tracking_link,
                ];
            });

        return Inertia::render('publisher/scripts/index', [
            'campaigns' => $campaigns,
            'baseUrl' => url('/'),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
            ->where('id', $id)
            ->with(['campaign', 'offer'])
            ->first();

        if (! $publisherCampaign) {
            return redirect()->route('publisher.scripts')->with('error', 'Campaign not found');
        }

        $scriptData = [
            'id' => $publisherCampaign->id,
            'campaign_name' => $publisherCampaign->campaign?->name ?? 'N/A',
            'offer_name' => $publisherCampaign->offer?->name ?? 'N/A',
            'script_token' => $publisherCampaign->script_token,
            'script_url' => $publisherCampaign->getScriptUrl(),
            'embed_tag' => $publisherCampaign->getEmbedScriptTag(),
            'tracking_link' => $publisherCampaign->tracking_link,
            'sdk_config' => $publisherCampaign->getSdkConfig(),
        ];

        return Inertia::render('publisher/scripts/show', [
            'script' => $scriptData,
            'baseUrl' => url('/'),
        ]);
    }

    public function documentation(Request $request, int $id)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            return redirect()->route('dashboard')->with('error', 'Publisher account not found');
        }

        $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
            ->where('id', $id)
            ->with(['campaign', 'offer'])
            ->first();

        if (! $publisherCampaign) {
            return redirect()->route('publisher.scripts')->with('error', 'Campaign not found');
        }

        $documentation = $this->generateDocumentation($publisherCampaign);

        return Inertia::render('publisher/scripts/documentation', [
            'campaign' => [
                'id' => $publisherCampaign->id,
                'name' => $publisherCampaign->campaign?->name ?? 'N/A',
                'offer' => $publisherCampaign->offer?->name ?? 'N/A',
            ],
            'documentation' => $documentation,
            'scriptToken' => $publisherCampaign->script_token,
            'baseUrl' => url('/'),
        ]);
    }

    public function downloadDocumentation(Request $request, int $id)
    {
        $user = $request->user();
        $publisher = Publisher::where('user_id', $user->id)->first();

        if (! $publisher) {
            abort(404);
        }

        $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
            ->where('id', $id)
            ->with(['campaign', 'offer'])
            ->first();

        if (! $publisherCampaign) {
            abort(404);
        }

        $markdown = $this->generateMarkdownDocumentation($publisherCampaign);

        $filename = sprintf(
            'integration-guide-%s-%s.md',
            Str::slug($publisherCampaign->campaign?->name ?? 'campaign'),
            date('Y-m-d')
        );

        return response($markdown)
            ->header('Content-Type', 'text/markdown')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    protected function generateDocumentation(PublisherCampaigns $pc): array
    {
        return ScriptIntegrationGuide::sections($pc);
    }

    protected function generateMarkdownDocumentation(PublisherCampaigns $pc): string
    {
        return ScriptIntegrationGuide::markdown($pc);
    }
}
