<x-mail::message>
# Welcome to {{ config('app.name') }}

Hello {{ $user->first_name }},

Your account has been created successfully @if($networkName) for **{{ $networkName }}** @endif.

Here are your login credentials:

**Email:** {{ $user->email }}
**Password:** {{ $password }}

<x-mail::button :url="$loginUrl">
Login Now
</x-mail::button>

For security reasons, we recommend changing your password after your first login.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
