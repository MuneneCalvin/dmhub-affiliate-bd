<?php

use App\Support\PublicDocumentation;

it('serves the public guide library and exact markdown downloads without authentication', function () {
    $this->get('/docs')->assertOk()->assertSee('Campaigns, connected');

    foreach (PublicDocumentation::guides() as $slug => $guide) {
        $this->get('/docs/'.$slug)
            ->assertOk()
            ->assertSee($guide['title'].' · DM Hub guides')
            ->assertSee('Download Markdown')
            ->assertSee('aria-current="page"', false);

        $this->get('/docs/'.$slug.'/download')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="'.$slug.'.md"')
            ->assertContent(file_get_contents(base_path('docs/'.$slug.'.md')));
    }
});

it('exposes only catalogued guides and preserves script documentation access checks', function () {
    foreach (['unknown', 'README', 'DEPLOYMENT', '..%2FREADME'] as $slug) {
        $this->get('/docs/'.$slug)->assertNotFound();
        $this->get('/docs/'.$slug.'/download')->assertNotFound();
    }

    $this->get('/docs/script/unknown-token')->assertNotFound();
    $this->get('/docs/script/unknown-token/download')->assertNotFound();
});

it('renders usable guide links and code while stripping executable markdown', function () {
    $html = PublicDocumentation::html(<<<'MD'
[Forms](form-campaigns.md)
[WooCommerce](customer-promotions.md#woocommerce)

## WooCommerce

```html
<script src="https://example.com/embed.js"></script>
```

<script>alert('unsafe')</script>

[Unsafe](javascript:alert%281%29)
MD);

    expect($html)
        ->toContain('href="'.route('public.docs.show', 'form-campaigns').'"')
        ->toContain('href="'.route('public.docs.show', 'customer-promotions').'#woocommerce"')
        ->toContain('id="woocommerce"')
        ->toContain('&lt;script')
        ->not->toContain('<script', 'href="javascript:');
});

it('renders the discount integrations and their public download links', function () {
    $this->get('/docs/customer-promotions')
        ->assertOk()
        ->assertSee('Customer discounts & plugins')
        ->assertSee('id="woocommerce"', false)
        ->assertSee('id="shopify"', false)
        ->assertSee('href="/docs/integrations/woocommerce/download"', false)
        ->assertDontSee('href="/docs/integrations/shopify/download"', false);

    foreach (['woocommerce', 'shopify'] as $platform) {
        $this->get('/docs/'.$platform)
            ->assertOk()
            ->assertSee('href="'.route('public.docs.show', 'customer-promotions').'#'.$platform.'"', false);
        if ($platform === 'woocommerce') {
            $this->get('/docs/'.$platform)->assertSee('href="/docs/integrations/woocommerce/download"', false);
        }
    }
});

it('downloads complete integration archives without authentication', function (string $platform, string $filename, array $files) {
    $response = $this->get('/docs/integrations/'.$platform.'/download')
        ->assertOk()
        ->assertDownload($filename)
        ->assertHeader('Content-Type', 'application/zip')
        ->assertHeader('X-Content-Type-Options', 'nosniff');

    $path = $response->baseResponse->getFile()->getPathname();
    $zip = new ZipArchive;
    try {
        expect($zip->open($path))->toBeTrue();
        expect($zip->numFiles)->toBe(count($files));
        foreach ($files as $file) {
            expect($zip->getFromName($file))->toBe(file_get_contents(base_path('integrations/'.$platform.'/'.$file)));
        }
    } finally {
        $zip->close();
        unlink($path);
    }
})->with([
    'WooCommerce plugin' => ['woocommerce', 'dmhub-promotions.zip', [
        'dmhub-promotions/dmhub-promotions.php',
        'dmhub-promotions/readme.txt',
        'dmhub-promotions/assets/offer.js',
        'dmhub-promotions/assets/offer.css',
    ]],
    'Shopify deployment files' => ['shopify', 'dmhub-shopify-promotions.zip', [
        'shopify.app.toml.example',
        'extensions/dmhub-offer/shopify.extension.toml',
        'extensions/dmhub-offer/blocks/offer.liquid',
        'extensions/dmhub-offer/assets/dmhub-offer.js',
        'extensions/dmhub-offer/assets/dmhub-offer.css',
        'extensions/dmhub-offer/locales/en.default.json',
    ]],
]);

it('rejects downloads outside the integration catalogue', function () {
    foreach (['unknown', 'wordpress', 'shopify.app.toml', '..%2F.env'] as $integration) {
        $this->get('/docs/integrations/'.$integration.'/download')->assertNotFound();
    }
});

it('keeps DM Hub deployment instructions out of the public merchant guides', function () {
    foreach (array_keys(PublicDocumentation::guides()) as $guide) {
        foreach (['CUSTOMER_PROMOTIONS_ENABLED', 'php artisan', 'SHOPIFY_CLIENT_SECRET', 'shopify.app.toml', 'npm run', 'Shopify CLI', 'TRACKING_MINIMUM_FORM_DURATION_MS'] as $instruction) {
            expect(PublicDocumentation::markdown($guide))->not->toContain($instruction);
        }
    }
    expect(file_get_contents(base_path('DEPLOYMENT.md')))
        ->toContain('SHOPIFY_CLIENT_SECRET', 'php artisan promotions:reconcile', 'php artisan postback:credentials');
});
