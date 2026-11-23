<x-mail::message>
# {{ __('emails.credentials.subject', ['app' => config('app.name')]) }}

{{ __('emails.credentials.greeting', ['name' => $user->first_name]) }}

@if($networkName)
{{ __('emails.credentials.created_network', ['app' => config('app.name'), 'network' => $networkName]) }}
@else
{{ __('emails.credentials.created', ['app' => config('app.name')]) }}
@endif

@if($user->status === 'P')
{{ __('emails.credentials.pending') }}

@endif
{{ __('emails.credentials.choose') }}

**{{ __('emails.credentials.email') }}:** {{ $user->email }}

<x-mail::button :url="$setupUrl">
{{ __('emails.credentials.button') }}
</x-mail::button>

{{ __('emails.credentials.expires', ['minutes' => $expiresInMinutes]) }}

{{ __('emails.credentials.thanks') }}<br>
{{ config('app.name') }}
</x-mail::message>
