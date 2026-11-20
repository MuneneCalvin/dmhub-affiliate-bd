<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Support\ScriptIntegrationGuide;
use App\Support\TrackingUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        // Active assignments, oldest first, so the first card stays stable.
        $assignments = PublisherCampaigns::where('publisher_id', $publisher->id)
            ->where('status', 'A')
            ->with(['campaign', 'offer'])
            ->orderBy('id')
            ->get();
        $clickStats = $this->clickStats($assignments->pluck('id')->all());
        $campaigns = $assignments->map(fn ($pc) => $this->scriptRow($pc, $clickStats[$pc->id] ?? null))->values();

        return Inertia::render('publisher/scripts/index', [
            'campaigns' => $campaigns,
            'baseUrl' => TrackingUrl::to('/'),
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
            ...$this->scriptRow($publisherCampaign, $this->clickStats([$publisherCampaign->id])[$publisherCampaign->id] ?? null),
            'sdk_config' => $publisherCampaign->getSdkConfig(),
        ];

        return Inertia::render('publisher/scripts/show', [
            'script' => $scriptData,
            'baseUrl' => TrackingUrl::to('/'),
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
            'baseUrl' => TrackingUrl::to('/'),
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

    /**
     * Script card data. `script_loads` counts SDK loads and impression pings
     * (`script_impressions`); a script that has never loaded is "not seen".
     * Clicks come from the clicks table so the count and last click agree.
     */
    private function scriptRow(PublisherCampaigns $pc, ?array $clicks): array
    {
        $loads = (int) $pc->script_impressions;

        return [
            'id' => $pc->id,
            'campaign_name' => $pc->campaign?->name ?? 'N/A',
            'offer_name' => $pc->offer?->name ?? 'N/A',
            'script_token' => $pc->script_token,
            'script_url' => $pc->getScriptUrl(),
            'embed_tag' => $pc->getEmbedScriptTag(),
            'tracking_link' => $pc->tracking_link,
            'install_status' => $loads > 0 ? 'installed' : 'not_seen',
            'script_loads' => $loads,
            'clicks' => $clicks['count'] ?? 0,
            'last_click_at' => $clicks['last_click_at'] ?? null,
        ];
    }

    /** Recorded clicks per assignment id: `count` and the latest `last_click_at`. */
    private function clickStats(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return Clicks::whereIn('publisher_campaign_id', $ids)
            ->groupBy('publisher_campaign_id')
            ->selectRaw('publisher_campaign_id, count(*) as aggregate, max(clicked_at) as last_click_at')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->publisher_campaign_id => [
                'count' => (int) $row->aggregate,
                'last_click_at' => $row->last_click_at ? Carbon::parse($row->last_click_at)->toIso8601String() : null,
            ]])
            ->all();
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
