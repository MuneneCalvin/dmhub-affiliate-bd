<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Creative extends Model
{
    use HasFactory;

    protected $table = 'creatives';

    protected $fillable = [
        'offer_id',
        'campaign_id',
        'name',
        'type',
        'width',
        'height',
        'file_url',
        'preview_url',
        'html_code',
        'alt_text',
        'status',
        'clicks',
        'impressions',
        'tracking_code',
        'embed_code',
        'tracking_pixel',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($creative) {
            if (empty($creative->tracking_code)) {
                $creative->tracking_code = self::generateUniqueTrackingCode();
            }
        });

        static::created(function ($creative) {
            $creative->generateEmbedCodes();
        });
    }

    public static function generateUniqueTrackingCode(): string
    {
        do {
            $code = Str::lower(Str::random(12));
        } while (self::where('tracking_code', $code)->exists());

        return $code;
    }

    public function generateEmbedCodes(): void
    {
        $trackingUrl = $this->getDirectTrackingUrl();
        $impressionUrl = $this->getImpressionPixelUrl();

        $embedCode = $this->buildEmbedCode($trackingUrl);
        $trackingPixel = $this->buildTrackingPixel($impressionUrl);

        $this->update([
            'embed_code' => $embedCode,
            'tracking_pixel' => $trackingPixel,
        ]);
    }

    public function getDirectTrackingUrl(): string
    {
        return url("/c/{$this->tracking_code}");
    }

    public function getImpressionPixelUrl(): string
    {
        return url("/i/{$this->tracking_code}");
    }

    protected function buildEmbedCode(string $trackingUrl): string
    {
        $type = $this->type;
        $fileUrl = htmlspecialchars($this->file_url ?? '', ENT_QUOTES, 'UTF-8');
        $altText = htmlspecialchars($this->alt_text ?: $this->name, ENT_QUOTES, 'UTF-8');
        $width = $this->width ? (int) $this->width : '';
        $height = $this->height ? (int) $this->height : '';

        switch ($type) {
            case 'banner':
            case 'image':
                $widthAttr = $width ? " width=\"{$width}\"" : '';
                $heightAttr = $height ? " height=\"{$height}\"" : '';

                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$fileUrl}\" alt=\"{$altText}\"{$widthAttr}{$heightAttr} />\n</a>";

            case 'text':
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">{$altText}</a>";

            case 'html':
                $htmlCode = $this->html_code ?? '';
                // Replace placeholder URLs in HTML code
                $htmlCode = str_replace(['{{tracking_url}}', '{{click_url}}', '{tracking_url}', '{click_url}'], $trackingUrl, $htmlCode);
                $htmlCode = str_replace(['{{file_url}}', '{file_url}'], $fileUrl, $htmlCode);

                return $htmlCode;

            case 'video':
                $mime = str_ends_with(strtolower(parse_url($this->file_url ?? '', PHP_URL_PATH) ?? ''), '.webm') ? 'video/webm' : 'video/mp4';
                $poster = $this->preview_url ? ' poster="'.htmlspecialchars($this->preview_url, ENT_QUOTES, 'UTF-8').'"' : '';
                $widthAttr = $width ?: 640;
                $heightAttr = $height ?: 360;

                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <video width=\"{$widthAttr}\" height=\"{$heightAttr}\"{$poster} controls>\n    <source src=\"{$fileUrl}\" type=\"{$mime}\">\n    Your browser does not support the video tag.\n  </video>\n</a>";

            case 'email':
                return "<a href=\"{$trackingUrl}\" target=\"_blank\">\n  <img src=\"{$fileUrl}\" alt=\"{$altText}\" style=\"max-width: 100%; height: auto;\" />\n</a>";

            default:
                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <img src=\"{$fileUrl}\" alt=\"{$altText}\" />\n</a>";
        }
    }

    protected function buildTrackingPixel(string $impressionUrl): string
    {
        return "<img src=\"{$impressionUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function clickRecords()
    {
        return $this->hasMany(Clicks::class, 'creative_id');
    }

    public function conversions()
    {
        return $this->hasManyThrough(Conversion::class, Clicks::class, 'creative_id', 'click_id');
    }

    public function generateTrackingLinkForPublisher(string $baseTrackingLink): string
    {
        if (preg_match('/\/t\/([^\/\?]+)/', $baseTrackingLink, $matches)) {
            $trackingId = $matches[1];

            return url("/t/{$trackingId}/c/{$this->id}");
        }
        $separator = strpos($baseTrackingLink, '?') !== false ? '&' : '?';

        return "{$baseTrackingLink}{$separator}creative_id={$this->id}";
    }

    public function getConversionRate(): float
    {
        if ($this->clicks <= 0) {
            return 0;
        }
        $conversions = $this->conversions()->count();

        return round(($conversions / $this->clicks) * 100, 2);
    }

    public function getCtr(): float
    {
        if ($this->impressions <= 0) {
            return 0;
        }

        return round(($this->clicks / $this->impressions) * 100, 2);
    }

    /**
     * Creatives belonging to campaigns the given user may access.
     */
    public function scopeVisibleTo($query, User $user)
    {
        return $query->whereIn($this->getTable().'.campaign_id', Tenancy::campaignIds($user));
    }
}
