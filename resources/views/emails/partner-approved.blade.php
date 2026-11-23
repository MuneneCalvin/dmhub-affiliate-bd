<x-mail::message>
# {{ __('emails.approved.subject', ['app' => config('app.name')]) }}

{{ __('emails.approved.greeting', ['name' => $user->first_name]) }}

{{ __('emails.approved.body') }}

<x-mail::button :url="$loginUrl">
{{ __('emails.approved.button') }}
</x-mail::button>

{{ __('emails.approved.thanks') }}<br>
{{ config('app.name') }}
</x-mail::message>
