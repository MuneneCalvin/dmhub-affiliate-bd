<?php

namespace App\Support;

use Illuminate\Support\Str;
use League\CommonMark\Extension\HeadingPermalink\HeadingPermalinkExtension;

class PublicDocumentation
{
    public static function guides(): array
    {
        return [
            'overview' => ['title' => 'Documentation', 'group' => 'Start here', 'description' => 'Set up campaigns and connect your website to Brand New Day.'],
            'campaign-setup' => ['title' => 'Campaign setup', 'group' => 'Start here', 'description' => 'Configure offers, compensation, publishers and tracking.'],
            'form-campaigns' => ['title' => 'Form submission campaigns', 'group' => 'Campaigns', 'description' => 'Track successful submissions without storing customer data.'],
            'lead-submissions' => ['title' => 'Lead submissions', 'group' => 'Campaigns', 'description' => 'Embed a form you built elsewhere, or report submissions with the contact details you collected.'],
            'checkout-campaigns' => ['title' => 'Checkout campaigns', 'group' => 'Campaigns', 'description' => 'Attribute paid orders and confirm purchase conversions.'],
            'click-campaigns' => ['title' => 'Clicks & action campaigns', 'group' => 'Campaigns', 'description' => 'Track referral traffic and confirm qualifying actions.'],
            'customer-promotions' => ['title' => 'Customer discounts & plugins', 'group' => 'Integrations', 'description' => 'Connect your store and configure customer discounts.'],
            'shopify' => ['title' => 'Shopify', 'group' => 'Integrations', 'description' => 'Enter your store details and authorize Shopify.'],
            'woocommerce' => ['title' => 'WooCommerce', 'group' => 'Integrations', 'description' => 'Add your store and activate the WooCommerce plugin connection.'],
            'wordpress' => ['title' => 'WordPress', 'group' => 'Integrations', 'description' => 'Connect accepted form submissions and affiliate links.'],
            'custom-website' => ['title' => 'Custom website', 'group' => 'Integrations', 'description' => 'Persist referrals and send events from your own backend.'],
            'api-reference' => ['title' => 'API & troubleshooting', 'group' => 'Reference', 'description' => 'Authentication, payloads, retries and launch checks.'],
        ];
    }

    public static function markdown(string $guide): string
    {
        // Never resolve a request-supplied filesystem path.
        abort_unless(array_key_exists($guide, self::guides()), 404);

        return file_get_contents(base_path('docs/'.$guide.'.md'));
    }

    public static function html(string $markdown): string
    {
        foreach (array_keys(self::guides()) as $guide) {
            $markdown = preg_replace_callback(
                '/\]\('.preg_quote($guide, '/').'\.md(#[^\s)]*)?\)/',
                fn (array $match) => ']('.route('public.docs.show', $guide).($match[1] ?? '').')',
                $markdown,
            );
        }

        return Str::markdown($markdown, [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'heading_permalink' => ['id_prefix' => '', 'apply_id_to_heading' => true, 'insert' => 'none'],
        ], [new HeadingPermalinkExtension]);
    }
}
