<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class ConfirmConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->attributes->get('postback_advertiser_id');
    }

    protected function prepareForValidation(): void
    {
        // Reject unknown fields rather than silently accepting contact/form payloads.
        // Use a fixed error key so rejected field names are not echoed to clients.
        if (array_diff(array_keys($this->all()), array_keys($this->rules()))) {
            throw ValidationException::withMessages(['payload' => 'Only documented conversion metadata is accepted. Do not send form contents or contact details.']);
        }
    }

    public function rules(): array
    {
        return [
            'event_type' => 'required|in:submission,purchase,action',
            'external_id' => 'required|string|max:100|regex:/^[A-Za-z0-9][A-Za-z0-9_.:\/-]*$/D',
            'occurred_at' => ['required', 'date', 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/D'],
            'amount' => ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D', 'numeric', 'min:0'],
            'currency' => 'required|string|size:3|regex:/^[A-Z]{3}$/D',
            'click_id' => 'nullable|integer|min:1',
            'referral_id' => 'nullable|uuid',
            'script_token' => 'nullable|string|max:64',
            'publisher_campaign_id' => 'nullable|integer|min:1',
            'tracking_code' => 'nullable|string|max:100',
            'successful' => $this->input('event_type') === 'submission' ? 'required|accepted' : 'sometimes|accepted',
            'spam_checks' => 'required_if:event_type,submission|array:honeypot_filled,form_duration_ms,is_spam',
            'spam_checks.honeypot_filled' => 'required_with:spam_checks|boolean',
            'spam_checks.form_duration_ms' => 'required_with:spam_checks|integer|min:0|max:86400000',
            'spam_checks.is_spam' => 'required_with:spam_checks|boolean',
        ];
    }
}
