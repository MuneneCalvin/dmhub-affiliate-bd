<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin
        {email : Email address (login) of the new super admin}
        {--first-name= : First name}
        {--last-name= : Last name}';

    protected $description = 'Create a super admin user (use this instead of seeding demo users in production)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $first = $this->option('first-name') ?: $this->ask('First name');
        $last = $this->option('last-name') ?: $this->ask('Last name');

        // The password is only ever read interactively, so it never lands in shell history.
        $password = $this->secret('Password (min. 12 characters)');
        if ($password !== $this->secret('Confirm password')) {
            $this->error('Passwords do not match.');

            return self::FAILURE;
        }

        $validator = Validator::make(
            ['email' => $email, 'first_name' => $first, 'last_name' => $last, 'password' => $password],
            [
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'password' => ['required', 'string', 'min:12'],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $role = Role::where('name', 'super_admin')->first();
        if (! $role) {
            $this->error('The super_admin role does not exist. Run `php artisan db:seed` first.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $first, $last, $password, $role) {
            $user = new User([
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'title' => 'Super Admin',
                'password' => $password,
                'is_super_admin' => true,
                'status' => 'A',
                'email_verified_at' => now(),
            ]);
            $user->user_name = $user->generateUsername();
            $user->save();
            $user->assignRoleById($role->id);
        });

        $this->info("Super admin {$email} created.");

        return self::SUCCESS;
    }
}
