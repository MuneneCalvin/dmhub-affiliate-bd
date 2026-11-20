<?php

namespace App\Support;

class ReferralScript
{
    /** Referral persistence for the publisher SDK. */
    public static function forOffer(int $campaignId, int $offerId): string
    {
        $config = json_encode(['campaignId' => $campaignId, 'offerId' => $offerId,
            'url' => url('/api/v1/referrals').'/'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);

        return <<<JS
const getReferral = (function() {
    const scope = {$config};
    const key = 'dmhub:referral:' + scope.campaignId + ':' + scope.offerId;
    let memory = null;
    function read() {
        try { return JSON.parse(window.localStorage.getItem(key)) || memory; } catch (_) { return memory; }
    }
    function save(value) {
        memory = value;
        try {
            if (value) window.localStorage.setItem(key, JSON.stringify(value));
            else window.localStorage.removeItem(key);
        } catch (_) { /* Referral still works for this page when storage is unavailable. */ }
    }
    return async function() {
        const params = new URLSearchParams(window.location.search);
        const incoming = params.get('referral_id');
        let stored = read();
        if (stored && Date.parse(stored.expires_at) <= Date.now()) { save(null); stored = null; }
        const id = incoming || (stored && stored.referral_id);
        // Legacy click links work on the current page; UUID referrals persist.
        if (!id) return params.get('click_id') ? { click_id: params.get('click_id') } : {};
        const response = await fetch(scope.url + encodeURIComponent(id), { headers: { Accept: 'application/json' } });
        if (!response.ok) { if (stored && stored.referral_id === id) save(null); throw new Error('Referral is unavailable or expired'); }
        let candidate = await response.json();
        if (candidate.campaign_id !== scope.campaignId || candidate.offer_id !== scope.offerId) {
            throw new Error('Referral belongs to another offer');
        }
        // Another tab can update storage while this request is in flight.
        stored = read();
        // Reopening an older URL must not overwrite a newer eligible referral.
        if (stored && Date.parse(stored.expires_at) > Date.now()
            && (Date.parse(stored.clicked_at) > Date.parse(candidate.clicked_at)
                || (stored.clicked_at === candidate.clicked_at && stored.click_id > candidate.click_id))) {
            const latest = await fetch(scope.url + encodeURIComponent(stored.referral_id), { headers: { Accept: 'application/json' } });
            if (latest.ok) candidate = await latest.json();
        }
        if (candidate.campaign_id !== scope.campaignId || candidate.offer_id !== scope.offerId) {
            throw new Error('Referral belongs to another offer');
        }
        if (Date.parse(candidate.expires_at) <= Date.now()) { save(null); throw new Error('Referral has expired'); }
        save(candidate);
        return { referral_id: candidate.referral_id, click_id: candidate.click_id };
    };
})();
// Preserve the referral on arrival, before the visitor navigates elsewhere.
getReferral().catch(function() {});
JS;
    }
}
