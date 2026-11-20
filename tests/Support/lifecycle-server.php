<?php

use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;

// Test-only front controller: production assets even when the developer's Vite
// server is running. Never change public/hot or the normal application entrypoint.
if (getenv('APP_ENV') !== 'testing' || ! getenv('LIFECYCLE_RUN_DIR')) {
    http_response_code(500);
    exit('Start this server through npm run test:lifecycle.');
}
$public = realpath(__DIR__.'/../../public');
$path = realpath($public.'/'.rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)));
if ($path && str_starts_with($path, $public.DIRECTORY_SEPARATOR) && is_file($path)) {
    return false;
}
// Many php.ini files set variables_order to GPCS, which leaves $_ENV empty. Laravel reads the
// storage override from $_ENV, so without this the run's mail and logs land in the repo's storage.
if (($storage = getenv('LARAVEL_STORAGE_PATH')) !== false) {
    $_ENV['LARAVEL_STORAGE_PATH'] = $storage;
}
define('LARAVEL_START', microtime(true));
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->booted(fn () => $app->make(Vite::class)->useHotFile(getenv('LIFECYCLE_RUN_DIR').'/unused-hot'));
$app->handleRequest(Request::capture());
