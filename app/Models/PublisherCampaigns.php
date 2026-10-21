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
        'form_settings',
        'form_title',
        'form_button_text',
        'form_success_message',
        'form_redirect_url',
        'form_trigger',
        'form_delay_seconds',
        'form_scroll_percent',
        'script_impressions',
        'sub',
        'terminated_at',
    ];

    protected $casts = [
        'commission_value' => 'decimal:2',
        'total_revenue' => 'decimal:2',
        'total_commission' => 'decimal:2',
        'applied_at' => 'datetime',
        'approved_at' => 'datetime',
        'terminated_at' => 'datetime',
        'form_settings' => 'array',
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
            ->orWhere('offer_id', $this->offer_id)
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

    public function getFormConfig(): array
    {
        return [
            'title' => $this->form_title ?? 'Get Started Today',
            'button_text' => $this->form_button_text ?? 'Submit',
            'success_message' => $this->form_success_message ?? 'Thank you! We\'ll be in touch soon.',
            'redirect_url' => $this->form_redirect_url,
            'trigger' => $this->form_trigger ?? 'auto',
            'delay_seconds' => $this->form_delay_seconds ?? 0,
            'scroll_percent' => $this->form_scroll_percent ?? 50,
            'fields' => $this->form_settings['fields'] ?? [
                ['name' => 'first_name', 'label' => 'First Name', 'type' => 'text', 'required' => true],
                ['name' => 'last_name', 'label' => 'Last Name', 'type' => 'text', 'required' => true],
                ['name' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                ['name' => 'phone', 'label' => 'Phone', 'type' => 'tel', 'required' => false],
            ],
            'colors' => $this->form_settings['colors'] ?? [
                'primary' => '#2563eb',
                'primary_hover' => '#1d4ed8',
                'background' => '#ffffff',
                'text' => '#111827',
                'label' => '#374151',
                'border' => '#d1d5db',
            ],
        ];
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
            'form_config' => $this->getFormConfig(),
        ];
    }

    protected function buildCreativeEmbedCode(Creative $creative): string
    {
        $trackingUrl = $this->getCreativeTrackingUrl($creative);
        $impressionUrl = $this->getCreativeImpressionUrl($creative);
        $altText = $creative->alt_text ?? $creative->name;
        $width = $creative->width ? (int) $creative->width : '';
        $height = $creative->height ? (int) $creative->height : '';

        switch ($creative->type) {
            case 'banner':
            case 'image':
                $widthAttr = $width ? " width=\"{$width}\"" : '';
                $heightAttr = $height ? " height=\"{$height}\"" : '';
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$creative->file_url}\" alt=\"{$altText}\"{$widthAttr}{$heightAttr} />\n</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";

            case 'text':
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">{$altText}</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";

            default:
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$creative->file_url}\" alt=\"{$altText}\" />\n</a>\n<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";
        }
    }
}
