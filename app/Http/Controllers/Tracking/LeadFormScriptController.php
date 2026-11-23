<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Support\TrackingUrl;

class LeadFormScriptController extends Controller
{
    public function serve(string $key)
    {
        $offer = Offer::where('lead_form_key', $key)->first();

        return response($offer ? $this->render($offer) : '// Unknown or retired lead form key', $offer ? 200 : 404)
            ->header('Content-Type', 'application/javascript; charset=utf-8')
            ->header('Cache-Control', 'no-store, private');
    }

    /** The embed source with this offer's key and endpoint filled in, escaped for inline JavaScript. */
    public function render(Offer $offer): string
    {
        $config = json_encode([
            'key' => $offer->lead_form_key,
            'endpoint' => TrackingUrl::to('/lf/'.$offer->lead_form_key),
        ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        return str_replace('__CONFIG__', $config, file_get_contents(resource_path('lead-form/embed.js')));
    }
}
