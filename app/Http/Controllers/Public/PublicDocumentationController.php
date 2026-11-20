<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Support\PromotionIntegrationDownloads;
use App\Support\PublicDocumentation;

class PublicDocumentationController extends Controller
{
    public function show(string $guide = 'overview')
    {
        $markdown = PublicDocumentation::markdown($guide);
        $guides = PublicDocumentation::guides();

        return view('docs.show', [
            'guides' => $guides,
            'activeGuide' => $guide,
            'title' => $guides[$guide]['title'],
            'description' => $guides[$guide]['description'],
            'html' => PublicDocumentation::html($markdown),
            'downloadUrl' => route('public.docs.download', $guide),
        ]);
    }

    public function download(string $guide)
    {
        return response(PublicDocumentation::markdown($guide))
            ->header('Content-Type', 'text/markdown; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="'.$guide.'.md"')
            ->header('X-Content-Type-Options', 'nosniff');
    }

    public function downloadIntegration(string $integration)
    {
        return PromotionIntegrationDownloads::download($integration);
    }
}
