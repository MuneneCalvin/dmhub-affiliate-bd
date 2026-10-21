<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Clicks;
use App\Models\PublisherCampaigns;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class LeadCaptureService
{
    protected CommissionService $commissionService;

    protected array $fieldMappings = [
        'email' => ['email', 'user_email', 'contact_email', 'e-mail', 'emailaddress', 'email_address'],
        'phone' => ['phone', 'tel', 'telephone', 'mobile', 'phone_number', 'phonenumber', 'cell'],
        'first_name' => ['first_name', 'fname', 'firstname', 'given_name', 'givenname', 'first'],
        'last_name' => ['last_name', 'lname', 'lastname', 'surname', 'family_name', 'familyname', 'last'],
        'company' => ['company', 'company_name', 'companyname', 'organization', 'org', 'business'],
        'job_title' => ['job_title', 'jobtitle', 'title', 'position', 'role'],
        'address' => ['address', 'street', 'street_address', 'address1', 'address_line_1'],
        'city' => ['city', 'town', 'locality'],
        'state' => ['state', 'province', 'region', 'state_province'],
        'postal_code' => ['postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'postcode'],
        'country' => ['country', 'country_name'],
    ];

    public function __construct(CommissionService $commissionService)
    {
        $this->commissionService = $commissionService;
    }

    public function captureFromScript(array $data, Request $request): array
    {
        $scriptToken = $data['script_token'] ?? null;
        if (!$scriptToken) {
            return ['success' => false, 'error' => 'Missing script token'];
        }

        $publisherCampaign = PublisherCampaigns::where('script_token', $scriptToken)
            ->where('status', 'A')
            ->first();

        if (!$publisherCampaign) {
            return ['success' => false, 'error' => 'Invalid or inactive script token'];
        }

        $campaign = $publisherCampaign->campaign;
        $offer = $publisherCampaign->offer;

        $validation = $this->validatePublisherCampaign($publisherCampaign);
        if (!$validation['valid']) {
            return ['success' => false, 'error' => $validation['error']];
        }

        return $this->createLead($publisherCampaign, $data, $request);
    }

    public function captureFromForm(array $data, Request $request): array
    {
        $trackingCode = $data['tracking_code'] ?? null;
        $scriptToken = $data['script_token'] ?? null;
        $publisherCampaign = null;

        if ($scriptToken) {
            $publisherCampaign = PublisherCampaigns::where('script_token', $scriptToken)
                ->where('status', 'A')
                ->first();
        }

        if (!$publisherCampaign && $trackingCode) {
            $publisherCampaign = $this->findPublisherCampaignByTrackingCode($trackingCode);
        }

        if (!$publisherCampaign) {
            return ['success' => false, 'error' => 'Invalid tracking information'];
        }

        $validation = $this->validatePublisherCampaign($publisherCampaign);
        if (!$validation['valid']) {
            return ['success' => false, 'error' => $validation['error']];
        }

        return $this->createLead($publisherCampaign, $data, $request);
    }

    protected function createLead(PublisherCampaigns $publisherCampaign, array $data, Request $request): array
    {
        try {
            $formData = $data['form_data'] ?? $data;
            $metadata = $data['metadata'] ?? [];
            $mappedData = $this->mapFormFields($formData);
            $utmParams = $this->extractUtmParams($metadata, $request);

            $deviceInfo = $this->getDeviceInfo($request);

            if ($this->isDuplicate($mappedData['email'] ?? null, $publisherCampaign->id)) {
                return ['success' => false, 'error' => 'Duplicate lead detected'];
            }

            $lead = DB::transaction(function () use ($publisherCampaign, $mappedData, $utmParams, $deviceInfo, $formData, $metadata) {
                $customFields = $this->getCustomFields($formData, $mappedData);

                $lead = Lead::create([
                    'publisher_id' => $publisherCampaign->publisher_id,
                    'network_id' => $publisherCampaign->network_id,
                    'campaign_id' => $publisherCampaign->campaign_id,
                    'offer_id' => $publisherCampaign->offer_id,
                    'publisher_campaign_id' => $publisherCampaign->id,
                    'first_name' => $mappedData['first_name'] ?? null,
                    'last_name' => $mappedData['last_name'] ?? null,
                    'email' => $mappedData['email'] ?? null,
                    'phone' => $mappedData['phone'] ?? null,
                    'company' => $mappedData['company'] ?? null,
                    'job_title' => $mappedData['job_title'] ?? null,
                    'address' => $mappedData['address'] ?? null,
                    'city' => $mappedData['city'] ?? null,
                    'state' => $mappedData['state'] ?? null,
                    'postal_code' => $mappedData['postal_code'] ?? null,
                    'country' => $mappedData['country'] ?? null,
                    'status' => 'new',
                    'source' => 'intercepted',
                    'utm_source' => $utmParams['utm_source'] ?? null,
                    'utm_medium' => $utmParams['utm_medium'] ?? null,
                    'utm_campaign' => $utmParams['utm_campaign'] ?? null,
                    'utm_term' => $utmParams['utm_term'] ?? null,
                    'utm_content' => $utmParams['utm_content'] ?? null,
                    'custom_fields' => !empty($customFields) ? $customFields : null,
                    'ip_address' => $deviceInfo['ip_address'],
                    'user_agent' => $deviceInfo['user_agent'],
                    'referer' => $metadata['referrer'] ?? $metadata['page_url'] ?? null,
                    'device_type' => $deviceInfo['device_type'],
                    'browser' => $deviceInfo['browser'],
                    'operating_system' => $deviceInfo['operating_system'],
                ]);
                $publisherCampaign->increment('total_conversions');

                return $lead;
            });
            $earning = $this->commissionService->calculateLeadCommission($lead);
            $response = [
                'success' => true,
                'lead_id' => $lead->id,
                'lead_token' => $lead->lead_token,
            ];
            if ($publisherCampaign->form_redirect_url) {
                $response['redirect_url'] = $publisherCampaign->form_redirect_url;
            }
            return $response;

        } catch (\Exception $e) {
            return ['success' => false, 'error' => 'Failed to capture lead'];
        }
    }

    protected function mapFormFields(array $formData): array
    {
        $mapped = [];

        foreach ($this->fieldMappings as $targetField => $sourceFields) {
            foreach ($sourceFields as $sourceField) {
                $key = $this->findFieldKey($formData, $sourceField);
                if ($key !== null && !empty($formData[$key])) {
                    $mapped[$targetField] = trim($formData[$key]);
                    break;
                }
            }
        }
        if (empty($mapped['first_name']) && empty($mapped['last_name'])) {
            $nameKey = $this->findFieldKey($formData, 'name') ?? $this->findFieldKey($formData, 'full_name') ?? $this->findFieldKey($formData, 'fullname');
            if ($nameKey !== null && !empty($formData[$nameKey])) {
                $nameParts = explode(' ', trim($formData[$nameKey]), 2);
                $mapped['first_name'] = $nameParts[0] ?? null;
                $mapped['last_name'] = $nameParts[1] ?? null;
            }
        }

        return $mapped;
    }

    protected function findFieldKey(array $data, string $fieldName): ?string
    {
        foreach ($data as $key => $value) {
            if (strtolower($key) === strtolower($fieldName)) {
                return $key;
            }
        }
        return null;
    }

    protected function getCustomFields(array $formData, array $mappedData): array
    {
        $customFields = [];
        $mappedKeys = [];
        foreach ($this->fieldMappings as $targetField => $sourceFields) {
            if (isset($mappedData[$targetField])) {
                foreach ($sourceFields as $sourceField) {
                    $key = $this->findFieldKey($formData, $sourceField);
                    if ($key !== null) {
                        $mappedKeys[] = strtolower($key);
                    }
                }
            }
        }
        $mappedKeys = array_merge($mappedKeys, ['name', 'full_name', 'fullname']);
        foreach ($formData as $key => $value) {
            if (!in_array(strtolower($key), $mappedKeys) && !empty($value) && !in_array($key, ['script_token', 'tracking_code', '_token'])) {
                $customFields[$key] = $value;
            }
        }

        return $customFields;
    }

    protected function extractUtmParams(array $metadata, Request $request): array
    {
        $params = [];
        $utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

        foreach ($utmFields as $field) {
            $params[$field] = $metadata[$field] ?? $request->input($field);
        }

        return $params;
    }

    protected function getDeviceInfo(Request $request): array
    {
        $userAgent = $request->userAgent() ?? '';

        return [
            'ip_address' => $request->ip(),
            'user_agent' => substr($userAgent, 0, 500),
            'device_type' => $this->detectDeviceType($userAgent),
            'browser' => $this->detectBrowser($userAgent),
            'operating_system' => $this->detectOS($userAgent),
        ];
    }

    protected function detectDeviceType(string $userAgent): string
    {
        $userAgent = strtolower($userAgent);

        if (preg_match('/mobile|android|iphone|ipod|blackberry|windows phone/i', $userAgent)) {
            return 'mobile';
        }
        if (preg_match('/tablet|ipad|kindle|playbook/i', $userAgent)) {
            return 'tablet';
        }

        return 'desktop';
    }

    protected function detectBrowser(string $userAgent): string
    {
        if (preg_match('/MSIE|Trident/i', $userAgent))
            return 'Internet Explorer';
        if (preg_match('/Edge/i', $userAgent))
            return 'Edge';
        if (preg_match('/Firefox/i', $userAgent))
            return 'Firefox';
        if (preg_match('/Chrome/i', $userAgent))
            return 'Chrome';
        if (preg_match('/Safari/i', $userAgent))
            return 'Safari';
        if (preg_match('/Opera|OPR/i', $userAgent))
            return 'Opera';

        return 'Unknown';
    }

    protected function detectOS(string $userAgent): string
    {
        if (preg_match('/Windows NT 10/i', $userAgent))
            return 'Windows 10';
        if (preg_match('/Windows NT 6.3/i', $userAgent))
            return 'Windows 8.1';
        if (preg_match('/Windows NT 6.2/i', $userAgent))
            return 'Windows 8';
        if (preg_match('/Windows NT 6.1/i', $userAgent))
            return 'Windows 7';
        if (preg_match('/Windows/i', $userAgent))
            return 'Windows';
        if (preg_match('/Mac OS X/i', $userAgent))
            return 'macOS';
        if (preg_match('/Linux/i', $userAgent))
            return 'Linux';
        if (preg_match('/Android/i', $userAgent))
            return 'Android';
        if (preg_match('/iPhone|iPad|iPod/i', $userAgent))
            return 'iOS';

        return 'Unknown';
    }

    protected function isDuplicate(?string $email, int $publisherCampaignId): bool
    {
        if (empty($email)) {
            return false;
        }
        return Lead::where('email', $email)
            ->where('publisher_campaign_id', $publisherCampaignId)
            ->where('created_at', '>=', now()->subHours(24))
            ->exists();
    }

    protected function findPublisherCampaignByTrackingCode(string $trackingCode): ?PublisherCampaigns
    {
        $creative = \App\Models\Creative::where('tracking_code', $trackingCode)->first();

        if ($creative) {
            return PublisherCampaigns::where('offer_id', $creative->offer_id)
                ->where('status', 'A')
                ->first();
        }

        return null;
    }

    protected function validatePublisherCampaign(PublisherCampaigns $publisherCampaign): array
    {
        $campaign = $publisherCampaign->campaign;
        $offer = $publisherCampaign->offer;

        if (!$campaign || $campaign->campaign_status !== 'A') {
            return ['valid' => false, 'error' => 'Campaign is not active'];
        }

        if (!$offer || $offer->offer_status !== 'A') {
            return ['valid' => false, 'error' => 'Offer is not active'];
        }

        if ($campaign->end_date && $campaign->end_date->isPast()) {
            return ['valid' => false, 'error' => 'Campaign has expired'];
        }

        if ($offer->expires_at && $offer->expires_at->isPast()) {
            return ['valid' => false, 'error' => 'Offer has expired'];
        }

        if ($campaign->total_budget > 0 && $campaign->spent_amount >= $campaign->total_budget) {
            return ['valid' => false, 'error' => 'Campaign budget exhausted'];
        }

        $advertiser = $campaign->advertiser;
        if ($advertiser && $advertiser->available_budget <= 0) {
            return ['valid' => false, 'error' => 'Advertiser budget exhausted'];
        }

        return ['valid' => true];
    }
}
