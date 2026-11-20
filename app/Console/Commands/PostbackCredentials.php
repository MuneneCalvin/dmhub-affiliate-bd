<?php

namespace App\Console\Commands;

use App\Models\Advertiser;
use App\Models\PostbackCredential;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class PostbackCredentials extends Command
{
    protected $signature = 'postback:credentials {advertiser : Advertiser ID} {--name=integration} {--days=90} {--revoke= : Credential ID to revoke}';

    protected $description = 'Issue or revoke an advertiser-scoped postback credential';

    public function handle(): int
    {
        $advertiser = Advertiser::findOrFail($this->argument('advertiser'));
        if ($id = $this->option('revoke')) {
            $credential = PostbackCredential::where('advertiser_id', $advertiser->id)->findOrFail($id);
            $credential->update(['revoked_at' => now()]);
            $this->info("Revoked credential {$credential->id}.");

            return self::SUCCESS;
        }
        $days = filter_var($this->option('days'), FILTER_VALIDATE_INT);
        if (! $days || $days < 1 || $days > 365) {
            $this->error('--days must be between 1 and 365.');

            return self::FAILURE;
        }
        $token = Str::random(64);
        $credential = PostbackCredential::create([
            'advertiser_id' => $advertiser->id,
            'name' => $this->option('name'),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays($days),
        ]);
        $this->info("Credential {$credential->id}; expires {$credential->expires_at->toIso8601String()}. Store this token securely; it is shown once:");
        $this->line($token);

        return self::SUCCESS;
    }
}
