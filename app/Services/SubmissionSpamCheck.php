<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;

class SubmissionSpamCheck
{
    /** Signals are computed by the authenticated website backend; no form values are accepted. */
    public static function validate(array $data): void
    {
        if (($data['event_type'] ?? null) !== 'submission') {
            return;
        }

        Validator::make($data, [
            'successful' => 'required|accepted',
            'spam_checks' => 'required|array:honeypot_filled,form_duration_ms,is_spam',
            'spam_checks.honeypot_filled' => 'required|boolean',
            'spam_checks.form_duration_ms' => 'required|integer|min:0|max:86400000',
            'spam_checks.is_spam' => 'required|boolean',
        ])->validate();

        // Heuristic verdicts are evaluated by configurable fraud rules after acceptance.
        // Successful persistence and the typed, bounded signal contract remain mandatory.
    }
}
