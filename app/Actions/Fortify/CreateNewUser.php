<?php

namespace App\Actions\Fortify;

use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\User;
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
        ])->validate();

        $isPublisher = $input['role_name'] === 'publisher';
        if ($isPublisher) {
            $this->validatePublisher($input);
        }
        // Advertisers and companies describe their business; an individual publisher has none to describe.
        $individual = $isPublisher && $input['publisher_type'] === 'individual';
        if (! $individual) {
            $this->validateBusinessFields($input);
        }

        $password = Str::random(64);

        return DB::transaction(function () use ($input, $password, $isPublisher, $individual) {
            $user = new User([
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'title' => $input['role_name'],
                'email' => $input['email'],
                'password' => Hash::make($password),
                'is_publisher' => $input['role_name'] === 'publisher',
                'is_advertiser' => $input['role_name'] === 'advertiser',
                'status' => 'P',
                'locale' => app()->getLocale(),
            ]);
            $user->user_name = $user->generateUsername();
            $user->save();
            $role = Role::where('name', $input['role_name'])->first();
            $user->assignRoleById($role->id);

            if ($input['role_name'] === 'advertiser') {
                Advertiser::create([
                    'user_id' => $user->id,
                    'business_name' => $input['business_name'],
                    'status' => 'P',
                    'currency' => config('finance.default_currency'),
                    'website_name' => $input['website_name'] ?? null,
                    'industry' => $input['industry'],
                    'coc_number' => $input['coc_number'],
                ]);
            }

            if ($isPublisher) {
                $channels = collect($input['channels']);
                $website = $channels->firstWhere('type', 'website')['handle'] ?? ($individual ? null : ($input['website_name'] ?? null));
                $publisher = Publisher::create([
                    'user_id' => $user->id,
                    'publisher_type' => $input['publisher_type'],
                    'business_name' => $individual ? null : $input['business_name'],
                    'website_url' => $website,
                    'industry' => $individual ? null : $input['industry'],
                    'coc_number' => $individual ? null : $input['coc_number'],
                ]);
                $channels->each(fn ($channel) => $publisher->channels()->create(['type' => $channel['type'], 'handle' => trim($channel['handle'])]));
            }

            return $user;
        });
    }

    protected function validateBusinessFields(array $input): void
    {
        $rules = [
            'business_name' => ['required', 'string', 'max:255'],
            'website_name' => ['nullable', 'string', 'url'],
            'industry' => ['required', 'string'],
            'coc_number' => ['required', 'string', 'max:10',
                Rule::unique($input['role_name'] === 'advertiser' ? 'advertisers' : 'publishers', 'coc_number')],
        ];
        Validator::make($input, $rules, [], ['coc_number' => 'company number'])->validate();
    }

    /** A publisher is a company or an individual and promotes through at least one channel. */
    protected function validatePublisher(array $input): void
    {
        $types = config('publisher.channel_types');
        Validator::make($input, [
            'publisher_type' => ['required', Rule::in(config('publisher.types'))],
            'channels' => ['required', 'array', 'min:1', 'max:'.count($types)],
            'channels.*.type' => ['required', 'string', 'distinct', Rule::in($types)],
            'channels.*.handle' => ['required', 'string', 'max:255', function (string $attribute, mixed $value, \Closure $fail) use ($input) {
                $type = $input['channels'][(int) explode('.', $attribute)[1]]['type'] ?? null;
                $handle = trim((string) $value);
                $looksLikeUrl = str_contains($handle, '://') || str_starts_with(strtolower($handle), 'www.');
                $mustBeUrl = in_array($type, config('publisher.url_only_channels'), true);
                if (($mustBeUrl || $looksLikeUrl) && ! (preg_match('#^https?://[^\s/]+\.[^\s/]+#i', $handle) && filter_var($handle, FILTER_VALIDATE_URL))) {
                    $fail('Enter a web address starting with https://.');
                }
            }],
        ], [], ['channels.*.handle' => 'URL or account name', 'channels.*.type' => 'channel'])->validate();
    }
}
