<?php

namespace App\Support;

use App\Models\User;
use App\Services\AdvertiserWorkspaceService;
use App\Services\PublisherWorkspaceService;

/**
 * Which optional account settings sections a user has. Profile, password,
 * two-factor and appearance always exist; company details only for
 * advertiser and publisher accounts that may edit their company profile.
 */
class SettingsSections
{
    /**
     * Company profiles the user may edit from account settings.
     *
     * @return list<array<string, mixed>>
     */
    public static function companies(User $user): array
    {
        $companies = [];
        $permissions = $user->permissionNames();
        if ($user->is_advertiser && $user->advertiser && $permissions->contains('access_advertiser_dashboard')) {
            $account = $user->advertiser;
            $can = app(AdvertiserWorkspaceService::class)->permissions($user, $account);
            if ($can['editProfile']) {
                $companies[] = [
                    'kind' => 'advertiser',
                    ...$account->only(['business_name', 'industry', 'coc_number']),
                    'website' => $account->website_name,
                    'canEditWebsite' => true,
                    'updateUrl' => route('advertisers.cards.update', ['id' => $user->id, 'card' => 'business']),
                ];
            }
        }
        if ($user->is_publisher && $user->publisher && $permissions->contains('access_publisher_dashboard')) {
            $account = $user->publisher;
            $can = app(PublisherWorkspaceService::class)->permissions($user);
            if ($can['editProfile']) {
                $companies[] = [
                    'kind' => 'publisher',
                    ...$account->only(['business_name', 'industry', 'coc_number']),
                    'website' => $account->website_url,
                    'canEditWebsite' => $can['editSites'],
                    'updateUrl' => route('publishers.cards.update', ['id' => $account->id, 'card' => 'business']),
                ];
            }
        }

        return $companies;
    }

    /**
     * @return array{company: bool}
     */
    public static function for(User $user): array
    {
        return ['company' => self::companies($user) !== []];
    }
}
