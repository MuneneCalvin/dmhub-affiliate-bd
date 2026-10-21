<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use Illuminate\Http\Request;

class PublisherScriptController extends Controller
{
    public function serve(Request $request, string $token)
    {
        $token = str_replace('.js', '', $token);

        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->first();

        if (!$publisherCampaign) {
            return response('// Invalid or inactive campaign', 404)
                ->header('Content-Type', 'application/javascript');
        }

        $publisherCampaign->increment('script_impressions');

        $script = $this->generateScript($publisherCampaign);

        return response($script)
            ->header('Content-Type', 'application/javascript')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    public function impression(Request $request, string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->first();

        if ($publisherCampaign) {
            $publisherCampaign->increment('script_impressions');
        }

        $pixel = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        return response($pixel, 200)
            ->header('Content-Type', 'image/gif')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    protected function generateScript(PublisherCampaigns $pc): string
    {
        $submitUrl = url('/api/v1/leads/submit');
        $scriptToken = $pc->script_token;

        $configJson = json_encode([
            'token' => $scriptToken,
            'submitUrl' => $submitUrl,
            'publisherCampaignId' => $pc->id,
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

        return <<<JAVASCRIPT
(function() {
    'use strict';

    if (window.DMHub && window.DMHub.initialized) return;
    window.DMHub = { initialized: true };

    const CONFIG = {$configJson};

    // ========== FORM INTERCEPTION ==========
    const FIELD_MAPPINGS = {
        email: ['email', 'user_email', 'contact_email', 'e-mail', 'emailaddress', 'email_address', 'mail'],
        phone: ['phone', 'tel', 'telephone', 'mobile', 'phone_number', 'phonenumber', 'cell', 'contact_number'],
        first_name: ['first_name', 'fname', 'firstname', 'given_name', 'givenname', 'first', 'prenom'],
        last_name: ['last_name', 'lname', 'lastname', 'surname', 'family_name', 'familyname', 'last', 'nom'],
        name: ['name', 'full_name', 'fullname', 'your_name', 'contact_name'],
        company: ['company', 'company_name', 'companyname', 'organization', 'org', 'business', 'employer'],
        job_title: ['job_title', 'jobtitle', 'title', 'position', 'role', 'job'],
        address: ['address', 'street', 'street_address', 'address1', 'address_line_1'],
        city: ['city', 'town', 'locality'],
        state: ['state', 'province', 'region', 'state_province'],
        postal_code: ['postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'postcode'],
        country: ['country', 'country_name', 'nation']
    };

    function findFieldValue(formData, targetField) {
        const variations = FIELD_MAPPINGS[targetField] || [targetField];
        for (const variation of variations) {
            for (const [key, value] of formData.entries()) {
                if (key.toLowerCase() === variation.toLowerCase() && value) {
                    return value;
                }
            }
        }
        return null;
    }

    function mapFormData(formData) {
        const mapped = {
            script_token: CONFIG.token,
            publisher_campaign_id: CONFIG.publisherCampaignId,
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer,
            intercepted: true
        };

        // Map known fields
        for (const field of Object.keys(FIELD_MAPPINGS)) {
            const value = findFieldValue(formData, field);
            if (value) {
                if (field === 'name') {
                    // Split full name
                    const parts = value.trim().split(/\\s+/);
                    if (parts.length >= 2) {
                        mapped.first_name = parts[0];
                        mapped.last_name = parts.slice(1).join(' ');
                    } else {
                        mapped.first_name = value;
                    }
                } else {
                    mapped[field] = value;
                }
            }
        }

        // Collect all other fields as custom_fields
        const customFields = {};
        const mappedKeys = new Set();
        for (const variations of Object.values(FIELD_MAPPINGS)) {
            variations.forEach(v => mappedKeys.add(v.toLowerCase()));
        }

        for (const [key, value] of formData.entries()) {
            if (!mappedKeys.has(key.toLowerCase()) && value && !key.startsWith('_')) {
                customFields[key] = value;
            }
        }

        if (Object.keys(customFields).length > 0) {
            mapped.custom_fields = customFields;
        }

        // Extract UTM params from URL
        const urlParams = new URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
            const val = urlParams.get(param);
            if (val) mapped[param] = val;
        });

        return mapped;
    }

    async function sendInterceptedData(data) {
        try {
            const response = await fetch(CONFIG.submitUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('[DMHub] Failed to capture lead:', error);
            return null;
        }
    }

    function interceptForms() {
        document.addEventListener('submit', function(e) {
            const form = e.target;

            // Skip forms with no-track class
            if (form.classList.contains('no-dmhub') || form.classList.contains('no-track')) return;

            // Skip forms that are explicitly excluded
            if (form.dataset.dmhubIgnore === 'true') return;

            const formData = new FormData(form);

            // Check if form has email field (basic qualification)
            const hasEmail = findFieldValue(formData, 'email');
            if (!hasEmail) {
                console.log('[DMHub] Form skipped: no email field');
                return;
            }

            // Map and send the data (non-blocking)
            const mappedData = mapFormData(formData);
            mappedData.form_action = form.action || window.location.href;
            mappedData.form_method = form.method || 'GET';

            // Send data asynchronously - don't block original submission
            sendInterceptedData(mappedData);

            console.log('[DMHub] Form intercepted, data being sent');
        }, true); // Use capture phase

        console.log('[DMHub] Form interception active');
    }

    // Public API
    window.DMHub.config = CONFIG;

    // Initialize
    function init() {
        interceptForms();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
JAVASCRIPT;
    }

    protected function extractTrackingId(PublisherCampaigns $pc): ?string
    {
        if (preg_match('/\/t\/([^\/\?]+)/', $pc->tracking_link, $matches)) {
            return $matches[1];
        }
        if (preg_match('/^[a-zA-Z0-9]+$/', $pc->tracking_link)) {
            return $pc->tracking_link;
        }
        return null;
    }
}
