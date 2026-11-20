<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use ZipArchive;

class PackagePromotions extends Command
{
    protected $signature = 'promotions:package';

    protected $description = 'Build the downloadable WooCommerce integration';

    public function handle(): int
    {
        $root = base_path('integrations/woocommerce');
        $path = storage_path('app/dmhub-promotions.zip');
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            $this->error('Cannot create plugin archive.');

            return self::FAILURE;
        }
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isFile() && in_array($file->getExtension(), ['php', 'js', 'css', 'txt'])) {
                $zip->addFile($file->getPathname(), substr($file->getPathname(), strlen($root) + 1));
            }
        }
        $zip->close();
        $this->info($path);

        return self::SUCCESS;
    }
}
