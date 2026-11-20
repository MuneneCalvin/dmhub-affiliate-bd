<?php

use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;

// Test-only front controller for npm run test:e2e: serves built assets even when
// a developer's Vite server is running, and keeps logs/mail in the run directory.
if (getenv('APP_ENV') !== 'testing' || ! getenv('E2E_RUN_DIR')) {
    http_response_code(500);
    exit('Start this server through npm run test:e2e.');
}
$public = realpath(__DIR__.'/../../public');
$path = realpath($public.'/'.rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)));
if ($path && str_starts_with($path, $public.DIRECTORY_SEPARATOR) && is_file($path)) {
    return false;
}
if (($storage = getenv('LARAVEL_STORAGE_PATH')) !== false) {
    $_ENV['LARAVEL_STORAGE_PATH'] = $storage;
    // Uploads land in the run's own storage, which public/storage does not link to.
    $uri = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    $root = realpath($storage.'/app/public');
    $file = $root && str_starts_with($uri, '/storage/') ? realpath($root.'/'.substr($uri, 9)) : false;
    if ($file && str_starts_with($file, $root.DIRECTORY_SEPARATOR) && is_file($file)) {
        header('Content-Type: '.(mime_content_type($file) ?: 'application/octet-stream'));
        header('Content-Length: '.filesize($file));
        readfile($file);

        return true;
    }
}
define('LARAVEL_START', microtime(true));
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->booted(fn () => $app->make(Vite::class)->useHotFile(getenv('E2E_RUN_DIR').'/unused-hot'));
$app->handleRequest(Request::capture());
