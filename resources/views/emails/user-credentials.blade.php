<x-mail::message>
# Welcome to {{ config('app.name') }}

Hello {{ $user->first_name }},

Your account has been created successfully @if($networkName) for **{{ $networkName }}** @endif.

Choose your password using the secure setup link below.

**Email:** {{ $user->email }}


<x-mail::button :url="$setupUrl">
Set Up Password
</x-mail::button>

This link expires in {{ $expiresInMinutes }} minutes and can be used once. After signing in, verify your email to access your workspace.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
