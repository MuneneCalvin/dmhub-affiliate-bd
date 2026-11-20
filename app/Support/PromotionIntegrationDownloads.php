<?php

namespace App\Support;

use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;
use ZipArchive;

class PromotionIntegrationDownloads
{
    // Explicitly list distributable files so local credentials and app configuration
    // can never be included in these public downloads.
    private const PACKAGES = [
        'woocommerce' => [
            'filename' => 'dmhub-promotions.zip',
            'files' => [
                'dmhub-promotions/dmhub-promotions.php',
                'dmhub-promotions/readme.txt',
                'dmhub-promotions/assets/offer.js',
                'dmhub-promotions/assets/offer.css',
            ],
        ],
        'shopify' => [
            'filename' => 'dmhub-shopify-promotions.zip',
            'files' => [
                'shopify.app.toml.example',
                'extensions/dmhub-offer/shopify.extension.toml',
                'extensions/dmhub-offer/blocks/offer.liquid',
                'extensions/dmhub-offer/assets/dmhub-offer.js',
                'extensions/dmhub-offer/assets/dmhub-offer.css',
                'extensions/dmhub-offer/locales/en.default.json',
            ],
        ],
    ];

    public static function download(string $integration): BinaryFileResponse
    {
        abort_unless(isset(self::PACKAGES[$integration]), 404);
        $package = self::PACKAGES[$integration];
        $path = tempnam(sys_get_temp_dir(), 'dmhub-integration-');
        if ($path === false) {
            throw new RuntimeException('Cannot create integration archive.');
        }

        try {
            $zip = new ZipArchive;
            if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Cannot open integration archive.');
            }

            try {
                foreach ($package['files'] as $file) {
                    $source = base_path('integrations/'.$integration.'/'.$file);
                    if (! is_file($source) || ! $zip->addFile($source, $file)) {
                        throw new RuntimeException('Cannot package integration file: '.$file);
                    }
                }
            } finally {
                $closed = $zip->close();
            }

            if (! $closed) {
                throw new RuntimeException('Cannot save integration archive.');
            }

            clearstatcache(true, $path);

            return response()->download($path, $package['filename'], [
                'Content-Type' => 'application/zip',
                'X-Content-Type-Options' => 'nosniff',
            ])->deleteFileAfterSend(true);
        } catch (Throwable $exception) {
            if (is_file($path)) {
                unlink($path);
            }

            throw $exception;
        }
    }
}
