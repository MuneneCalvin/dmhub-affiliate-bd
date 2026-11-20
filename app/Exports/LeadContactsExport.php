<?php

namespace App\Exports;

use App\Models\LeadContact;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class LeadContactsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    public function __construct(private User $user, private ?string $status = null) {}

    public function collection(): Collection
    {
        return LeadContact::visibleTo($this->user)->with(['campaign:id,name', 'offer:id,name'])
            ->when($this->status, fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('id')->get();
    }

    public function headings(): array
    {
        return ['First name', 'Last name', 'Email', 'Phone', 'Company', 'Job title', 'City', 'Country', 'Status', 'Campaign', 'Offer', 'Notes', 'Received'];
    }

    public function map($lead): array
    {
        // A leading formula character would be executed by spreadsheet software. A "+" or "-" followed only
        // by digits, spaces and phone punctuation (e.g. "+31 20 123 4567") is a phone number, not a formula.
        $safe = fn ($value) => is_string($value) && preg_match('/^[=@\t\r]|^[+\-](?![\d\s().\-]*$)/', $value) ? "'".$value : $value;

        return array_map($safe, [
            $lead->first_name, $lead->last_name, $lead->email, $lead->phone, $lead->company, $lead->job_title,
            $lead->city, $lead->country, $lead->status, $lead->campaign?->name, $lead->offer?->name, $lead->notes,
            $lead->created_at?->toDateTimeString(),
        ]);
    }
}
