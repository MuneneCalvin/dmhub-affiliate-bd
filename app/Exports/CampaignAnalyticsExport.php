<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;

class CampaignAnalyticsExport implements WithMultipleSheets
{
    public function __construct(private array $tables) {}

    public function sheets(): array
    {
        return collect($this->tables)->map(fn ($rows, $title) => new class($rows, $title) extends DefaultValueBinder implements FromArray, WithColumnWidths, WithCustomValueBinder, WithStrictNullComparison, WithTitle
        {
            public function __construct(private array $rows, private string $name) {}

            public function array(): array
            {
                return $this->rows;
            }

            public function columnWidths(): array
            {
                return ['A' => 45, 'B' => 24, 'C' => 24, 'D' => 24, 'E' => 28, 'F' => 24, 'G' => 24];
            }

            public function title(): string
            {
                return $this->name;
            }

            public function bindValue(Cell $cell, mixed $value): bool
            {
                // Names and metadata must remain literal text, never spreadsheet formulas.
                if (is_string($value)) {
                    $cell->setValueExplicit($value, DataType::TYPE_STRING);

                    return true;
                }

                return parent::bindValue($cell, $value);
            }
        })->values()->all();
    }
}
