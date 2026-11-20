<?php

// A separate PHP process and database connection exercise real PostgreSQL locks.
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
fwrite(STDOUT, "ready\n");
$deadline = microtime(true) + 15;
while (! is_file($input['barrier'])) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Concurrency test barrier timed out.');
    }
    usleep(1000);
}
$request = Request::create('/api/v1/events', 'POST', server: [
    'HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json',
    'HTTP_AUTHORIZATION' => 'Bearer '.$input['token'],
], content: json_encode($input['payload'], JSON_THROW_ON_ERROR));
$kernel = $app->make(Kernel::class);
$response = $kernel->handle($request);
fwrite(STDOUT, json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true)])."\n");
$kernel->terminate($request, $response);
