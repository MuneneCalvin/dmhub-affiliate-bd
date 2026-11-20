<?php

namespace App\Http\Requests;

class SubmitLeadRequest extends ConfirmConversionRequest
{
    public const CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'city', 'country', 'custom_fields'];

    protected function prepareForValidation(): void
    {
        // A lead is always a submission and carries no monetary basis unless the merchant says so.
        $this->mergeIfMissing(['event_type' => 'submission', 'amount' => '0.00']);
        parent::prepareForValidation();
    }

    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'event_type' => 'required|in:submission',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'job_title' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'custom_fields' => 'nullable|array|max:20',
            'custom_fields.*' => 'nullable|string|max:1000',
        ]);
    }

    /** The validated fields that belong to the financial event, without any contact detail. */
    public function eventData(): array
    {
        return collect($this->validated())->except(self::CONTACT_FIELDS)->all();
    }

    public function contactData(): array
    {
        return collect($this->validated())->only(self::CONTACT_FIELDS)->all();
    }
}
