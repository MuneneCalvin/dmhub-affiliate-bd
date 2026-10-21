<?php

namespace App\Actions\Fortify;

use App\Jobs\SendUserCredentialsJob;
use App\Models\User;
use App\Models\Advertiser;
use App\Models\Publisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    public function create(array $input): User
    {
        Validator::make($input, [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'role_name' => ['required', 'string', 'in:advertiser,publisher'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'coc_number' => ['required', 'string']
        ])->validate();
        $this->validateBusinessFields($input);

        $password = Str::password(8);

        return DB::transaction(function () use ($input, $password) {
            $user = new User([
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'title' => $input['role_name'],
                'email' => $input['email'],
                'password' => Hash::make($password),
                'is_publisher' => $input['role_name'] === 'publisher',
                'is_advertiser' => $input['role_name'] === 'advertiser',
                'status' => 'P',
            ]);
            $user->user_name = $user->generateUsername();
            $user->save();
            $role = Role::where('name', $input['role_name'])->first();
            $user->assignRoleById($role->id);

            if ($input['role_name'] === 'advertiser') {
                Advertiser::create([
                    'user_id' => $user->id,
                    'business_name' => $input['business_name'],
                    'website_name' => $input['website_name'] ?? null,
                    'industry' => $input['industry'],
                    'coc_number' => $input['coc_number'],
                ]);
            }

            if ($input['role_name'] === 'publisher') {
                Publisher::create([
                    'user_id' => $user->id,
                    'business_name' => $input['business_name'],
                    'website_url' => $input['website_name'] ?? null,
                    'industry' => $input['industry'],
                    'coc_number' => $input['coc_number'],
                ]);
            }

            SendUserCredentialsJob::dispatch($user, $password);

            return $user;
        });
    }

    protected function validateBusinessFields(array $input): void
    {
        $rules = [
            'business_name' => ['required', 'string', 'max:255'],
            'website_name' => ['nullable', 'string', 'url'],
            'industry' => ['required', 'string'],
            'coc_number' => ['required', 'string'],
        ];
        Validator::make($input, $rules)->validate();
    }
}