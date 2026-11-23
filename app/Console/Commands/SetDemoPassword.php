<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Facades\Hash;

/**
 * The demo accounts are created with a password nobody knows. Whoever hands them out chooses the real one here,
 * typed at a hidden prompt so it is never in a command line, a log or a chat.
 */
class SetDemoPassword extends Command
{
    use ConfirmableTrait;

    protected $signature = 'demo:set-password {email : A @demo.dmhub.cloud account} {--force : Run in production without asking}';

    protected $description = 'Choose the password of a demo account (hidden prompt)';

    public function handle(): int
    {
        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }
        $email = (string) $this->argument('email');
        if (! str_ends_with(strtolower($email), '@demo.dmhub.cloud')) {
            $this->error('Only @demo.dmhub.cloud demo accounts can be changed here.');

            return self::FAILURE;
        }
        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("No account {$email}. Run demo:bnd first.");

            return self::FAILURE;
        }

        $password = (string) $this->secret('New password (not shown)');
        if (mb_strlen($password) < 12) {
            $this->error('Use at least 12 characters.');

            return self::FAILURE;
        }
        if ($password !== (string) $this->secret('Repeat the password')) {
            $this->error('The two passwords differ; nothing was changed.');

            return self::FAILURE;
        }

        $user->forceFill(['password' => Hash::make($password)])->save();
        $this->info("Password set for {$email}.");

        return self::SUCCESS;
    }
}
