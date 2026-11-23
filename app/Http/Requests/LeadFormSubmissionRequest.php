<?php

namespace App\Http\Requests;

use App\Models\Offer;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * A browser on the merchant's form page reports a submit. The body is JSON sent as text/plain
 * (no CORS preflight), and the offer's public key plus the Origin header stand in for credentials.
 */
class LeadFormSubmissionRequest extends FormRequest
{
    private ?Offer $offer = null;

    public function offer(): Offer
    {
        return $this->offer ??= Offer::with('campaign.advertiser')->where('lead_form_key', (string) $this->route('key'))->firstOrFail();
    }

    /** The origin of the page that sent the request, when it may report for this offer. */
    public function allowedOrigin(): ?string
    {
        $origin = rtrim((string) $this->headers->get('Origin'), '/');
        if ($origin === '') {
            return null;
        }
        $offer = $this->offer();
        $own = parse_url((string) $offer->preview_url);
        $allowed = array_map(fn ($o) => rtrim((string) $o, '/'), $offer->lead_form_allowed_origins ?? []);
        if (isset($own['scheme'], $own['host'])) {
            $allowed[] = $own['scheme'].'://'.$own['host'].(isset($own['port']) ? ':'.$own['port'] : '');
        }

        return in_array($origin, $allowed, true) ? $origin : null;
    }

    /** A refusal the allowed page can read; the answer holds field names and messages, never submitted values. */
    public function rejection(array $errors): ValidationException
    {
        $exception = ValidationException::withMessages($errors);
        $exception->response = response()->json([
            'message' => 'The submission was not accepted.', 'errors' => $errors,
        ], 422)->withHeaders(['Access-Control-Allow-Origin' => $this->allowedOrigin(), 'Vary' => 'Origin']);

        return $exception;
    }

    protected function failedValidation(Validator $validator): void
    {
        throw $this->rejection($validator->errors()->toArray());
    }

    public function authorize(): bool
    {
        $this->offer();

        return $this->allowedOrigin() !== null;
    }

    protected function prepareForValidation(): void
    {
        $decoded = json_decode($this->getContent(), true);
        if (is_array($decoded) && ! $this->isJson()) {
            $this->merge($decoded);
        }
    }

    public function rules(): array
    {
        return [
            'click_id' => 'required_without:referral_id|nullable|integer|min:1',
            'referral_id' => 'required_without:click_id|nullable|uuid',
            'email' => 'required|email|max:255',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'job_title' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'custom_fields' => 'nullable|array|max:20',
            'custom_fields.*' => 'nullable|string|max:1000',
            'consent' => 'required|accepted',
            'hp' => 'nullable|string|max:255',
            'duration_ms' => 'nullable|integer|min:0|max:86400000',
        ];
    }

    public function contactData(): array
    {
        return collect($this->validated())->only(SubmitLeadRequest::CONTACT_FIELDS)->all();
    }
}
