<?php

namespace App\Support;

use App\Models\Campaign;
use App\Models\User;

/**
 * Central place for "which rows may this user see" rules, so controllers
 * never have to re-derive them (and never fail open).
 */
class Tenancy
{
    /**
     * Restrict a campaigns query (Eloquent or query builder) to what $user may access.
     *
     * - super admin: everything
     * - network owner: campaigns of their network
     * - advertiser: their own campaigns
     * - anyone else: nothing
     *
     * @template T of \Illuminate\Contracts\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder
     *
     * @param  T  $query
     * @return T
     */
    public static function campaigns($query, User $user, string $table = 'campaigns')
    {
        if ($user->is_super_admin) {
            return $query;
        }

        if ($user->is_network) {
            $networkId = $user->networkId();

            return $networkId === null
                ? $query->whereRaw('1 = 0')
                : $query->where("{$table}.network_id", $networkId);
        }

        if ($user->is_advertiser) {
            $advertiserId = $user->advertiser?->id;

            return $advertiserId === null
                ? $query->whereRaw('1 = 0')
                : $query->where("{$table}.advertiser_id", $advertiserId);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Subquery of campaign ids visible to the user.
     */
    public static function campaignIds(User $user)
    {
        return self::campaigns(Campaign::query(), $user)->select('campaigns.id');
    }
}
