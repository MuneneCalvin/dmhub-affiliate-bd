<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50', Rule::unique(User::class, 'user_name')->ignore($this->user()->id)],
            'first_name' => ['sometimes', 'required', 'string', 'max:30'],
            'last_name' => ['sometimes', 'required', 'string', 'max:30'],
            'title' => ['sometimes', 'nullable', 'string', 'max:50'],
            'country_iso' => ['sometimes', 'nullable', 'string', 'size:3'],
            'timezone' => ['sometimes', 'nullable', 'timezone', 'max:50'],
            'language' => ['sometimes', 'nullable', Rule::in(['en', 'nl'])],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }
}
