<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PublisherCampaigns extends Model
{
    use HasFactory;

    protected $table = 'publisher_campaigns';

    protected $fillable = [
        'requested_offer_id', 'terms_version', 'terms_snapshot', 'terms_accepted_at',
        'publisher_id',
        'campaign_id',
        'offer_id',
        'network_id',
        'status',
        'commission_type',
        'commission_value',
        'applied_notes',
        'applied_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'total_clicks',
        'total_conversions',
        'total_revenue',
        'total_commission',
        'tracking_link',
        'script_token',
        'script_impressions',
        'sub',
        'terminated_at',
    ];

    protected $casts = [
        'terms_snapshot' => 'array', 'terms_accepted_at' => 'datetime', 'requested_offer_id' => 'integer',
        'commission_value' => 'decimal:2',
        'total_revenue' => 'decimal:2',
        'total_commission' => 'decimal:2',
        'applied_at' => 'datetime',
        'approved_at' => 'datetime',
        'terminated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($publisherCampaign) {
            if (empty($publisherCampaign->script_token)) {
                $publisherCampaign->script_token = self::generateUniqueScriptToken();
            }
        });
    }

    public static function generateUniqueScriptToken(): string
    {
        do {
            $token = Str::lower(Str::random(32));
        } while (self::where('script_token', $token)->exists());

        return $token;
    }

    public function generateScriptToken(): string
    {
        if (empty($this->script_token)) {
            $this->script_token = self::generateUniqueScriptToken();
            $this->save();
        }

        return $this->script_token;
    }

    /**
     * Relationships
     */
    public function publisher()
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function clicks()
    {
        return $this->hasMany(Clicks::class, 'publisher_campaign_id');
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class, 'publisher_campaign_id');
    }

    public function creatives()
    {
        return Creative::where('campaign_id', $this->campaign_id)
            ->where('offer_id', $this->offer_id)
            ->where('status', 'A')
            ->get();
    }

    public function getScriptUrl(): string
    {
        return url("/s/{$this->generateScriptToken()}.js");
    }

    public function getImpressionPixelUrl(): string
    {
        return url("/sp/{$this->generateScriptToken()}");
    }

    public function getEmbedScriptTag(): string
    {
        $scriptUrl = $this->getScriptUrl();

        return "<script src=\"{$scriptUrl}\" async></script>";
    }

    public function getCreativeTrackingUrl(Creative $creative): string
    {
        $trackingId = $this->extractTrackingId();
        if ($trackingId) {
            return url("/t/{$trackingId}/c/{$creative->id}");
        }

        return url("/t/{$this->tracking_link}?creative_id={$creative->id}");
    }

    public function getCreativeImpressionUrl(Creative $creative): string
    {
        return url("/i/{$creative->tracking_code}?pc={$this->script_token}");
    }

    public function extractTrackingId(): ?string
    {
        if (preg_match('/\/t\/([^\/\?]+)/', $this->tracking_link, $matches)) {
            return $matches[1];
        }
        if (preg_match('/^[a-zA-Z0-9]+$/', $this->tracking_link)) {
            return $this->tracking_link;
        }

        return null;
    }

    public function getSdkConfig(): array
    {
        return ['sdk_version' => 2, 'popup_supported' => false, 'methods' => ['getReferral']];
    }

    public function getAllAssets(): array
    {
        $this->generateScriptToken();

        $creatives = $this->creatives();
        $creativeAssets = [];

        foreach ($creatives as $creative) {
            $creativeAssets[] = [
                'id' => $creative->id,
                'name' => $creative->name,
                'type' => $creative->type,
                'tracking_url' => $this->getCreativeTrackingUrl($creative),
                'impression_url' => $this->getCreativeImpressionUrl($creative),
                'file_url' => $creative->file_url,
                'embed_code' => $this->buildCreativeEmbedCode($creative),
                'dimensions' => [
                    'width' => $creative->width,
                    'height' => $creative->height,
                ],
            ];
        }

        return [
            'publisher_campaign_id' => $this->id,
            'script_token' => $this->script_token,
            'main_tracking_link' => url("/t/{$this->extractTrackingId()}"),
            'embed_script' => [
                'tag' => $this->getEmbedScriptTag(),
                'url' => $this->getScriptUrl(),
            ],
            'impression_pixel' => [
                'url' => $this->getImpressionPixelUrl(),
                'html' => "<img src=\"{$this->getImpressionPixelUrl()}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />",
            ],
            'creatives' => $creativeAssets,
            'sdk_config' => $this->getSdkConfig(),
        ];
    }

    protected function buildCreativeEmbedCode(Creative $creative): string
    {
        $trackingUrl = e($this->getCreativeTrackingUrl($creative));
        $impressionUrl = e($this->getCreativeImpressionUrl($creative));
        $altText = e($creative->alt_text ?? $creative->name);
        $fileUrl = e($creative->file_url);
        $width = $creative->width ? (int) $creative->width : '';
        $height = $creative->height ? (int) $creative->height : '';

        switch ($creative->type) {
            case 'banner':
            case 'image':
                $widthAttr = $width ? " width=\"{$width}\"" : '';
                $heightAttr = $height ? " height=\"{$height}\"" : '';

                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$fileUrl}\" alt=\"{$altText}\"{$widthAttr}{$heightAttr} />\n</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";

            case 'text':
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">{$altText}</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";

            default:
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$fileUrl}\" alt=\"{$altText}\" />\n</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";
        }
    }
}
