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
        $fileUrl = $this->file_url;
        $altText = $this->alt_text ?? $this->name;
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
                $widthAttr = $width ?: 640;
                $heightAttr = $height ?: 360;

                return "<a href=\"{$trackingUrl}\" target=\"_blank\" rel=\"noopener\">\n  <video width=\"{$widthAttr}\" height=\"{$heightAttr}\" controls>\n    <source src=\"{$fileUrl}\" type=\"video/mp4\">\n    Your browser does not support the video tag.\n  </video>\n</a>";

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

    public function getLeadFormEmbedCode(): string
    {
        $submitUrl = route('api.leads.submit');
        $formId = 'dmhub-lead-form-'.$this->tracking_code;

        $jsCode = <<<EOT
<div id="{$formId}"></div>
<script>
(function() {
    // Helper to get URL parameter
    function getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    const trackingCode = '{$this->tracking_code}';
    const submitUrl = '{$submitUrl}';
    const formId = '{$formId}';
    
    // Auto-Popup Trigger check
    const triggerCode = getUrlParam('_dlf_code');
    const isPopupMode = (triggerCode === trackingCode);

    let container = document.getElementById(formId);
    
    // If popup mode, create container if it doesn't exist
    if (isPopupMode && !container) {
        container = document.createElement('div');
        container.id = formId;
        document.body.appendChild(container);
    }

    if (!container) return; // Exit if manual embed not found and not popup mode

    const styles = `
        <style>
            .dmhub-overlay { 
                display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0, 0, 0, 0.5); z-index: 9999; justify-content: center; align-items: center; 
            }
            .dmhub-overlay.active { display: flex; animation: fadeIn 0.3s; }
            
            .dmhub-form-box {
                background: #fff; width: 90%; max-width: 450px; border-radius: 12px; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; overflow: hidden;
            }
            
            .dmhub-close {
                position: absolute; top: 15px; right: 15px; cursor: pointer; font-size: 24px; 
                line-height: 1; color: #6b7280; background: none; border: none; padding: 0; z-index: 10;
            }
            .dmhub-close:hover { color: #111; }

            .dmhub-form { font-family: system-ui, -apple-system, sans-serif; padding: 30px; }
            .dmhub-title { margin: 0 0 20px; font-size: 1.25rem; font-weight: 600; color: #111; text-align: center; }
            .dmhub-group { margin-bottom: 15px; }
            .dmhub-label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; color: #374151; }
            .dmhub-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; transition: border-color 0.2s; }
            .dmhub-input:focus { outline: none; border-color: #2563eb; ring: 2px solid rgba(37,99,235,0.2); }
            .dmhub-btn { width: 100%; background-color: #2563eb; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-size: 1rem; margin-top: 10px; }
            .dmhub-btn:hover { background-color: #1d4ed8; }
            .dmhub-btn:disabled { opacity: 0.7; cursor: not-allowed; }
            .dmhub-message { margin-top: 15px; padding: 12px; border-radius: 8px; text-align: center; font-size: 0.9rem; display: none; }
            .dmhub-success { color: #065f46; background: #d1fae5; border: 1px solid #a7f3d0; }
            .dmhub-error { color: #991b1b; background: #fee2e2; border: 1px solid #fecaca; }

            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>
    `;

    const formFieldsHtml = `
        <div class="dmhub-group">
            <label class="dmhub-label">Full Name</label>
            <div style="display: flex; gap: 10px;">
                <input type="text" name="first_name" placeholder="First Name" class="dmhub-input" required>
                <input type="text" name="last_name" placeholder="Last Name" class="dmhub-input" required>
            </div>
        </div>
        <div class="dmhub-group">
            <label class="dmhub-label">Email Address</label>
            <input type="email" name="email" placeholder="you@example.com" class="dmhub-input" required>
        </div>
        <div class="dmhub-group">
            <label class="dmhub-label">Phone Number</label>
            <input type="tel" name="phone" placeholder="+1 (555) 000-0000" class="dmhub-input">
        </div>
        <button type="submit" class="dmhub-btn">Get Started Now</button>
        <div class="dmhub-message"></div>
    `;

    let html = '';
    
    if (isPopupMode) {
        html = `
            \${styles}
            <div class="dmhub-overlay active" id="dmhub-popup-overlay">
                <div class="dmhub-form-box">
                    <button type="button" class="dmhub-close" onclick="document.getElementById('dmhub-popup-overlay').style.display='none'">&times;</button>
                    <form class="dmhub-form" onsubmit="submitDmHubForm(event)">
                        <h2 class="dmhub-title">Complete Your Request</h2>
                        \${formFieldsHtml}
                    </form>
                </div>
            </div>
        `;
    } else {
        html = `
            \${styles}
            <form class="dmhub-form" style="border: 1px solid #e5e7eb; border-radius: 12px; max-width: 400px; background: #fff;" onsubmit="submitDmHubForm(event)">
                <h2 class="dmhub-title">Get In Touch</h2>
                \${formFieldsHtml}
            </form>
        `;
    }

    container.innerHTML = html;

    window.submitDmHubForm = async function(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const msgDiv = form.querySelector('.dmhub-message');
        const originalBtnText = btn.innerText;

        btn.disabled = true;
        btn.innerText = 'Submitting...';
        msgDiv.className = 'dmhub-message';
        msgDiv.style.display = 'none';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.tracking_code = trackingCode;

        try {
            const response = await fetch(submitUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                msgDiv.innerText = 'Success! Redirecting...';
                msgDiv.className = 'dmhub-message dmhub-success';
                msgDiv.style.display = 'block';
                form.reset();
                
                setTimeout(() => {
                    if(result.redirect_url) {
                         window.location.href = result.redirect_url;
                    } else if (isPopupMode) {
                        document.getElementById('dmhub-popup-overlay').style.display='none';
                    }
                }, 1500);
                
            } else {
                msgDiv.innerText = result.error || 'Something went wrong.';
                msgDiv.className = 'dmhub-message dmhub-error';
                msgDiv.style.display = 'block';
            }
        } catch (error) {
            msgDiv.innerText = 'Connection error.';
            msgDiv.className = 'dmhub-message dmhub-error';
            msgDiv.style.display = 'block';
        } finally {
            if(!msgDiv.classList.contains('dmhub-success')) {
                btn.disabled = false;
                btn.innerText = originalBtnText;
            }
        }
    };
})();
</script>
EOT;

        return $jsCode;
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
        return $this->hasMany(Conversion::class, 'creative_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'creative_id');
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
        $conversions = $this->leads()->where('is_converted', true)->count();

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
