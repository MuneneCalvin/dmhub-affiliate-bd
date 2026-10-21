<?php

namespace App\Exports;

use App\Models\Lead;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LeadsExport implements FromCollection, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithMapping, WithStyles
{
    protected User $user;

    protected $status;

    protected $campaignId;

    public function __construct(User $user, $status = null, $campaignId = null)
    {
        $this->user = $user;
        $this->status = $status;
        $this->campaignId = $campaignId;
    }

    public function collection()
    {
        $query = Lead::visibleTo($this->user)->with(['campaign', 'publisher', 'offer']);
        if ($this->status) {
            $query->where('status', $this->status);
        }

        if ($this->campaignId) {
            $query->where('campaign_id', $this->campaignId);
        }

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'First Name',
            'Last Name',
            'Email',
            'Phone',
            'Company',
            'Status',
            'Priority',
            'Campaign',
            'Offer',
            'Source',
            'Created At',
            'Lead Value',
            'Is Converted',
        ];
    }

    public function map($lead): array
    {
        return [
            $lead->first_name,
            $lead->last_name,
            $lead->email,
            (string) $lead->phone,
            $lead->company,
            ucfirst($lead->status),
            ucfirst($lead->priority),
            $lead->campaign?->name ?? '-',
            $lead->offer?->name ?? '-',
            $lead->source ?? '-',
            $lead->created_at->format('Y-m-d H:i'),
            $lead->lead_value ?? 0,
            $lead->is_converted ? 'Yes' : 'No',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E2E8F0'],
                ],
            ],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'D' => NumberFormat::FORMAT_TEXT,
        ];
    }
}
