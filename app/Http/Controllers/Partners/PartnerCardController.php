<?php

namespace App\Http\Controllers\Partners;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\User;
use App\Services\AdvertiserWorkspaceService;
use App\Services\Finance\LedgerService;
use App\Services\PublisherWorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PartnerCardController extends Controller
{
    public function advertiser(Request $request, int $id, string $card, AdvertiserWorkspaceService $workspace)
    {
        // Advertiser detail routes use user IDs; publisher detail routes use publisher IDs.
        $account = $workspace->find($request->user(), $id);
        $can = $workspace->permissions($request->user(), $account);
        if ($card === 'business') {
            abort_unless($can['editProfile'], 403);
            $account->update($request->validate([
                'business_name' => 'required|string|max:200',
                'website_name' => 'nullable|url:http,https|max:100',
                'industry' => 'required|string|max:200',
                'coc_number' => ['nullable', 'string', 'max:10', Rule::unique('advertisers', 'coc_number')->ignore($account->id)],
            ]));
        } elseif ($card === 'credit') {
            abort_unless($can['edit'], 403);
            $data = $request->validate(['credit_limit' => 'required|numeric|min:0|max:999999999.99|decimal:0,2']);
            DB::transaction(function () use ($account, $data) {
                if ($account->network_id !== null) {
                    app(LedgerService::class)->lock($account->network_id);
                }
                Advertiser::whereKey($account->id)->lockForUpdate()->firstOrFail()->update($data);
            });
        } elseif ($card === 'profile') {
            abort_unless($can['editProfile'], 403);
            $this->profile($request, $account->user);
        } elseif ($card === 'readiness') {
            $this->readiness($request, $account, $can);
        } else {
            abort(404);
        }

        return back()->with('success', 'Details updated successfully.');
    }

    public function publisher(Request $request, int $id, string $card, PublisherWorkspaceService $workspace)
    {
        $account = $workspace->find($request->user(), $id);
        $can = $workspace->permissions($request->user());
        if (in_array($card, ['business', 'details', 'site'])) {
            abort_unless($card === 'site' ? ($can['editSites'] || $can['editProfile']) : $can['editProfile'], 403);
            $rules = [];
            if ($can['editSites']) {
                $rules['website_url'] = 'nullable|url:http,https|max:255';
            }
            if ($can['editProfile']) {
                $rules += ['business_name' => 'nullable|string|max:255', 'industry' => 'nullable|string|max:255',
                    'coc_number' => ['nullable', 'string', 'max:10', Rule::unique('publishers', 'coc_number')->ignore($account->id)]];
            }
            if ($card === 'details') {
                $rules += ['first_name' => 'required|string|max:30', 'last_name' => 'required|string|max:30'];
            }
            $data = $request->validate($rules);
            DB::transaction(function () use ($account, $data, $card) {
                if ($card === 'details') {
                    $account->user()->update(collect($data)->only(['first_name', 'last_name'])->all());
                }
                $account->update(collect($data)->except(['first_name', 'last_name'])->all());
            });
        } elseif ($card === 'traffic') {
            abort_unless($can['editSites'], 403);
            $data = $request->validate([
                'traffic_sources' => 'nullable|string|max:2000',
                'monthly_visitors' => 'nullable|integer|min:0|max:2147483647',
                'primary_verticals' => 'nullable|string|max:255',
                'secondary_verticals' => 'nullable|string|max:255',
            ]);
            $data['traffic_sources'] = collect(explode("\n", str_replace(["\r\n", "\r"], "\n", $data['traffic_sources'] ?? '')))
                ->map(fn ($value) => trim($value))->filter()->unique()->values()->all();
            $account->update($data);
        } elseif ($card === 'payout') {
            abort_unless($can['editPayout'], 403);
            $account->update($request->validate([
                'payout_method' => 'nullable|string|max:100',
                'payout_threshold' => 'required|numeric|min:0|max:999999999|decimal:0,2',
            ]));
        } elseif ($card === 'profile') {
            abort_unless($can['editProfile'], 403);
            $this->profile($request, $account->user);
        } elseif ($card === 'readiness') {
            $this->readiness($request, $account, $can);
        } else {
            abort(404);
        }

        return back()->with('success', 'Details updated successfully.');
    }

    private function profile(Request $request, User $user): void
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:30', 'last_name' => 'required|string|max:30',
            'user_name' => ['required', 'string', 'max:50', Rule::unique('users', 'user_name')->ignore($user->id)],
            'email' => ['required', 'email', 'lowercase', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'title' => 'nullable|string|max:50', 'country_iso' => 'nullable|string|size:3',
            'timezone' => 'nullable|timezone|max:50', 'language' => ['nullable', Rule::in(['en', 'nl'])],
        ]);
        $user->fill($data);
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }
        $user->save();
    }

    private function readiness(Request $request, Advertiser|Publisher $account, array $can): void
    {
        abort_unless($can['edit'] || $can['activate'] || $can['deactivate'], 403);
        $current = $account instanceof Advertiser ? $account->status : $account->user->status;
        $rules = ['status' => ['required', Rule::in(array_unique(['A', 'P', $current]))]];
        if ($account instanceof Advertiser && $can['edit']) {
            $rules += ['auto_approve_publishers' => 'sometimes|boolean', 'require_publisher_approval' => 'sometimes|boolean'];
        }
        $data = $request->validate($rules);
        $statusChanged = $data['status'] !== $current;
        if ($statusChanged) {
            abort_unless($data['status'] === 'A' ? $can['activate'] : $can['deactivate'], 403);
        }
        DB::transaction(function () use ($account, $data, $statusChanged) {
            $attributes = array_diff_key($data, ['status' => true]);
            if ($statusChanged) {
                $account->user()->update(['status' => $data['status']]);
                if ($account instanceof Advertiser) {
                    // Stay verified when deactivated so the advertiser remains listed and can be reactivated.
                    $attributes['status'] = $data['status'];
                } elseif ($data['status'] === 'A') {
                    // Deactivating keeps the publisher verified so it stays listed and can be reactivated.
                    $attributes['is_verified'] = true;
                    $attributes['verified_at'] = now();
                }
            }
            $account->update($attributes);
        });
    }
}
