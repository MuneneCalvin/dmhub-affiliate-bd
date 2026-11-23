<?php

namespace App\Support;

use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** Partners waiting for approval, as the partner pool lists them for one approver. */
class PendingPartners
{
    /** Super admins see every partner; network staff see unclaimed partners and their own network's. */
    public static function claimable(Builder $query, User $approver): Builder
    {
        if ($approver->is_super_admin) {
            return $query;
        }
        $networkId = $approver->networkId();

        return $query->where(function ($q) use ($networkId) {
            $q->whereNull('network_id');
            if ($networkId !== null) {
                $q->orWhere('network_id', $networkId);
            }
        });
    }

    /** What is left to do: rejected partners stay in the pool list, but nobody has to act on them. */
    public static function counts(User $approver): array
    {
        $waiting = fn (string $model) => self::claimable($model::query(), $approver)
            ->where('is_verified', false)
            ->whereHas('user', fn ($q) => $q->where('status', '!=', 'R'))
            ->count();
        $advertisers = $waiting(Advertiser::class);
        $publishers = $waiting(Publisher::class);

        return ['advertisers' => $advertisers, 'publishers' => $publishers, 'total' => $advertisers + $publishers];
    }
}
