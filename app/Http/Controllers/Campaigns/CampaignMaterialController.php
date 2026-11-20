<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Creative;
use App\Models\PublisherCampaigns;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CampaignMaterialController extends Controller
{
    public function download(Request $request, Creative $creative)
    {
        $user = $request->user();
        abort_unless($user->status === 'A' && $user->closed_at === null, 403);
        $permission = $user->is_publisher && ! $user->is_network && ! $user->is_advertiser ? 'view_my_campaigns' : 'view_campaigns';
        abort_unless($user->is_super_admin || $user->permissionNames()->contains($permission), 403);
        if ($user->is_publisher && ! $user->is_super_admin && ! $user->is_network && ! $user->is_advertiser) {
            abort_unless($creative->status === 'A' && PublisherCampaigns::whereKey($request->integer('assignment'))
                ->where('publisher_id', $user->publisher?->id ?? 0)
                ->where('campaign_id', $creative->campaign_id)->where('offer_id', $creative->offer_id)->exists(), 404);
        } else {
            abort_unless(Creative::visibleTo($user)->whereKey($creative->id)->exists(), 404);
        }
        $name = Str::slug(pathinfo($creative->name, PATHINFO_FILENAME)) ?: 'material';
        if (in_array($creative->type, ['text', 'html'], true)) {
            $content = $creative->type === 'text' ? $creative->alt_text : $creative->html_code;

            return response()->streamDownload(fn () => print ($content ?? ''), $name.($creative->type === 'text' ? '.txt' : '.html'), ['Content-Type' => 'text/plain; charset=UTF-8', 'X-Content-Type-Options' => 'nosniff']);
        }
        // Resolve only our own disks: never fetch arbitrary URLs stored in a record.
        foreach (['public', 'r2'] as $diskName) {
            if (! config("filesystems.disks.{$diskName}.url")) {
                continue;
            }
            $disk = Storage::disk($diskName);
            $base = rtrim($disk->url(''), '/').'/';
            if (! str_starts_with($creative->file_url, $base)) {
                continue;
            }
            $path = substr($creative->file_url, strlen($base));
            abort_if(str_contains($path, '..') || ! $disk->exists($path), 404, 'Material file is unavailable.');

            return $disk->download($path, $name.'.'.pathinfo($path, PATHINFO_EXTENSION));
        }
        abort(404, 'Material file is unavailable.');
    }
}
