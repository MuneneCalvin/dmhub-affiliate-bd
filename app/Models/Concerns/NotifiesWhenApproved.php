<?php

namespace App\Models\Concerns;

use App\Mail\PartnerApprovedMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * A partner is approved the first time it becomes verified: the pool, or an administrator switching a pending
 * partner on. Deactivating keeps a partner verified, so reactivating later never counts as an approval, and
 * partners created already verified are never emailed.
 */
trait NotifiesWhenApproved
{
    protected static function bootNotifiesWhenApproved(): void
    {
        static::updated(function ($partner) {
            if (! $partner->wasChanged('is_verified') || ! $partner->is_verified) {
                return;
            }
            $user = $partner->user;
            if (! $user || $user->closed_at !== null || $user->status === 'C') {
                return;
            }
            // Wait for the approval itself to commit; the user's own status is updated in the same transaction.
            DB::afterCommit(function () use ($user) {
                try {
                    Mail::to($user->email)->locale($user->locale ?: config('app.locale'))->send(new PartnerApprovedMail($user->fresh()));
                } catch (Throwable $e) {
                    // The approval is done; a mail outage must not undo it or break the approver's page.
                    report($e);
                }
            });
        });
    }
}
