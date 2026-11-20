<?php

namespace App\Support;

use App\Models\PublisherCampaigns;

class ScriptIntegrationGuide
{
    public static function sections(PublisherCampaigns $assignment): array
    {
        $token = $assignment->script_token;
        $example = "const sdk = window.DMHub.instances['{$token}'];\nconst referral = await sdk.getReferral();\n// Include referral in your existing form request to your own backend.";
        $payload = json_encode([
            'event_type' => 'submission', 'external_id' => 'submission:opaque-record-123',
            'referral_id' => '<saved-referral-uuid>', 'occurred_at' => '2026-11-04T09:00:00Z',
            'amount' => '0.00', 'currency' => $assignment->campaign->currency,
            'successful' => true,
            'spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return [
            'sdk' => ['title' => 'SDK v2 and multiple offers', 'description' => 'Load each publisher script once. Use window.DMHub.instances[scriptToken].getReferral() for multiple offers. DMHub.getReferral() is an alias for the first script. The SDK only preserves referral attribution.'],
            'quick_start' => ['title' => 'Submission tracking', 'description' => 'Keep forms and customer data on your website. After a successful save, your backend reports a submission event. Accepted events create conversions and pending commission for configurable fraud assessment.', 'code' => $assignment->getEmbedScriptTag()],
            'platforms' => [['name' => 'Attach referral attribution', 'icon' => 'html', 'instructions' => 'Wait for the SDK to load. Include the referral in your request to your own backend.', 'code' => $example]],
            'exclude_forms' => ['title' => 'Choose the successful event', 'description' => 'The script does not intercept forms. Report only a successful save of the intended form, never a button click or validation failure.', 'methods' => []],
            'manual_trigger' => ['title' => 'Read the referral', 'description' => 'getReferral() revalidates referral expiry. Without browser storage, preserve the referral in your website session.', 'code' => $example],
            'api_direct' => ['title' => 'Report a successful submission', 'description' => 'Send from the backend using the advertiser credential. Compute spam signals on your server: honeypot result, elapsed form time and your spam-filter verdict. Do not send field values. Use an opaque external_id and reuse the identical event on retries. Use one stable event ID per submission across publishers and retries.', 'code' => 'POST '.url('/api/v1/events')."\nAuthorization: Bearer <advertiser-credential>\nContent-Type: application/json\n\n".$payload],
            'testing' => ['title' => 'Verify the integration', 'description' => 'Use test events without personal data.', 'steps' => ['A successful attributed submission creates one conversion and pending commission.', 'Retry the same event: no second commission is created.', 'Failed submissions and malformed signals create no conversion. Valid spam signals are evaluated using the configured fraud rules; flagged conversions may remain pending for review.', 'Unknown fields, including contact details and form contents, are rejected.']],
            'troubleshooting' => ['title' => 'Attribution and spam checks', 'issues' => [['problem' => 'Submission rejected', 'solutions' => ['Use a valid referral for an active publisher assignment and matching campaign currency. Check required signal fields and available budget. Configurable fraud rules evaluate valid spam signals after acceptance. Keep credentials server-side.']], ['problem' => 'No referral', 'solutions' => ['The visitor must arrive through a publisher link. Preserve the referral across pages. A script token alone cannot attribute a conversion.']]]],
        ];
    }

    public static function markdown(PublisherCampaigns $assignment): string
    {
        $text = "# Submission tracking guide\n\n";
        foreach (self::sections($assignment) as $section) {
            if (isset($section['title'])) {
                $text .= '## '.$section['title']."\n\n".($section['description'] ?? '')."\n\n";
                if (isset($section['code'])) {
                    $text .= "```\n".$section['code']."\n```\n\n";
                }
                foreach ($section['steps'] ?? [] as $step) {
                    $text .= '- '.$step."\n";
                }
                foreach ($section['issues'] ?? [] as $issue) {
                    $text .= $issue['problem'].': '.implode(' ', $issue['solutions'])."\n\n";
                }
            }
        }

        return $text;
    }
}
