<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use App\Support\PublicDocumentation;
use App\Support\PublisherAttribution;
use App\Support\ScriptIntegrationGuide;

class PublicScriptDocsController extends Controller
{
    public function show(string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->with(['campaign', 'offer', 'publisher.user'])
            ->first();

        if (! $publisherCampaign) {
            abort(404, 'Script not found or inactive');
        }

        PublisherAttribution::assertActive($publisherCampaign);
        $scriptUrl = $publisherCampaign->getScriptUrl();
        $embedTag = $publisherCampaign->getEmbedScriptTag();

        $html = $this->generateHtmlDocumentation($publisherCampaign, $scriptUrl, $embedTag);

        return response($html)->header('Content-Type', 'text/html');
    }

    public function downloadMarkdown(string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->with(['campaign', 'offer'])
            ->first();

        if (! $publisherCampaign) {
            abort(404, 'Script not found or inactive');
        }

        PublisherAttribution::assertActive($publisherCampaign);
        $markdown = $this->generateMarkdown($publisherCampaign);
        $filename = 'integration-guide-'.date('Y-m-d').'.md';

        return response($markdown)
            ->header('Content-Type', 'text/markdown')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    protected function generateHtmlDocumentation(PublisherCampaigns $pc, string $scriptUrl, string $embedTag): string
    {
        return view('docs.show', [
            'guides' => PublicDocumentation::guides(),
            'activeGuide' => null,
            'title' => 'Submission tracking guide',
            'description' => 'Publisher-specific script and submission tracking instructions.',
            'html' => PublicDocumentation::html(ScriptIntegrationGuide::markdown($pc)),
            'downloadUrl' => route('public.script.docs.download', $pc->script_token),
        ])->render();
    }

    protected function generateMarkdown(PublisherCampaigns $pc): string
    {
        return ScriptIntegrationGuide::markdown($pc);
    }
}
