<?php

namespace App\Support\Pdf;

use App\Models\PublisherInvoice;
use App\Support\ConversionMoney;
use Carbon\CarbonInterface;
use NumberFormatter;

/**
 * Renders a publisher invoice as a PDF document. Amounts come from the
 * invoice's reserved evidence (`invoice_details`) and line amounts, exactly
 * as the invoice page shows them; nothing is recalculated here.
 */
class PublisherInvoicePdf
{
    private const INK = [0.086, 0.075, 0.227];

    private const MUTED = [0.416, 0.4, 0.565];

    private const BORDER = [0.91, 0.898, 0.969];

    private const SOFT = [0.965, 0.961, 1.0];

    private const BRAND = [0.271, 0.153, 0.851];

    /** Domain colours for the strip at the top of the document. */
    private const STRIP = [[0.357, 0.239, 0.961], [0.055, 0.647, 0.592], [0.949, 0.443, 0.11], [0.886, 0.239, 0.518]];

    private const MARGIN = 48.0;

    private SimplePdf $pdf;

    private float $y = 0;

    public function __construct(private readonly PublisherInvoice $invoice) {}

    public static function filename(PublisherInvoice $invoice): string
    {
        return preg_replace('/[^A-Za-z0-9._-]/', '-', $invoice->invoice_number).'.pdf';
    }

    public function render(): string
    {
        $invoice = $this->invoice->loadMissing(['publisher.user', 'network', 'earnings.publisherCampaign.campaign']);
        $invoice->attachLineAmounts();

        $this->pdf = (new SimplePdf)->setTitle(__('messages.invoices.pdf.invoice').' '.$invoice->invoice_number);
        $this->newPage();

        $right = SimplePdf::WIDTH - self::MARGIN;
        $this->pdf->text(self::MARGIN, $this->y, __('messages.invoices.pdf.invoice'), 24, true, self::INK);
        $this->pdf->text($right, $this->y, $this->status(), 11, true, self::BRAND, 'right');
        $this->y += 20;
        $this->pdf->text(self::MARGIN, $this->y, $invoice->invoice_number, 10, false, self::MUTED);
        $this->y += 30;

        // Parties and dates.
        $publisher = $invoice->publisher;
        $publisherName = $publisher?->business_name
            ?: trim(($publisher?->user?->first_name ?? '').' '.($publisher?->user?->last_name ?? ''))
            ?: '—';
        $columnWidth = (SimplePdf::WIDTH - 2 * self::MARGIN) / 3;
        $this->party(self::MARGIN, __('messages.invoices.pdf.bill_from'), [$publisherName, $publisher?->user?->email, $publisher?->website_url]);
        $this->party(self::MARGIN + $columnWidth, __('messages.invoices.pdf.bill_to'), [$invoice->network?->network_name ?? '—', $invoice->network?->support_email]);
        $this->party(self::MARGIN + 2 * $columnWidth, __('messages.invoices.pdf.issued'), [
            $this->date($invoice->requested_at ?? $invoice->created_at),
            __('messages.invoices.pdf.period').': '.$this->period(),
        ]);
        $this->y += 70;

        // Line items.
        $this->tableHeader();
        $lines = $invoice->earnings->sortBy('id')->values();
        if ($lines->isEmpty()) {
            $this->pdf->text(self::MARGIN, $this->y + 16, __('messages.invoices.pdf.no_lines'), 10, false, self::MUTED);
            $this->y += 28;
        }
        foreach ($lines as $earning) {
            if ($this->y > SimplePdf::HEIGHT - 160) {
                $this->newPage();
                $this->tableHeader();
            }
            $this->y += 18;
            $campaign = $earning->publisherCampaign?->campaign?->name ?? '—';
            $this->pdf->text(self::MARGIN, $this->y, $this->pdf->fit($campaign, 240, 10), 10, false, self::INK);
            $this->pdf->text(self::MARGIN + 250, $this->y, (string) ($earning->commission_type ?? '—'), 10, false, self::MUTED);
            $this->pdf->text(self::MARGIN + 320, $this->y, $this->date($earning->created_at), 10, false, self::MUTED);
            $this->pdf->text($right, $this->y, $this->money($earning->invoice_amount), 10, true, self::INK, 'right');
            $this->y += 8;
            $this->pdf->line(self::MARGIN, $this->y, $right, $this->y, self::BORDER);
        }

        // Totals as reserved when the invoice was created.
        $details = $invoice->invoice_details ?? [];
        $this->y += 26;
        $labelX = $right - 220;
        if (isset($details['gross_minor'])) {
            $this->pdf->text($labelX, $this->y, __('messages.invoices.pdf.subtotal'), 10, false, self::MUTED);
            $this->pdf->text($right, $this->y, $this->money(ConversionMoney::decimal((int) $details['gross_minor'])), 10, false, self::INK, 'right');
            $this->y += 18;
        }
        if (! empty($details['recovery_minor'])) {
            $this->pdf->text($labelX, $this->y, $this->pdf->fit(__('messages.invoices.pdf.recovery'), 150, 10), 10, false, self::MUTED);
            $this->pdf->text($right, $this->y, '−'.$this->money(ConversionMoney::decimal((int) $details['recovery_minor'])), 10, false, self::INK, 'right');
            $this->y += 18;
        }
        $this->pdf->line($labelX, $this->y - 4, $right, $this->y - 4, self::BORDER);
        $this->y += 14;
        $this->pdf->text($labelX, $this->y, __('messages.invoices.pdf.total'), 12, true, self::INK);
        $this->pdf->text($right, $this->y, $this->money($invoice->amount), 16, true, self::BRAND, 'right');
        $this->y += 34;

        // Payment details.
        if ($invoice->paid_at) {
            $this->pdf->text(self::MARGIN, $this->y, __('messages.invoices.pdf.paid_on', ['date' => $this->date($invoice->paid_at)]), 10, true, self::INK);
            $this->y += 16;
        }
        if ($invoice->payment_reference) {
            $this->pdf->text(self::MARGIN, $this->y, __('messages.invoices.pdf.reference').': '.$invoice->payment_reference, 10, false, self::MUTED);
            $this->y += 16;
        }
        if ($invoice->payment_method) {
            $this->pdf->text(self::MARGIN, $this->y, __('messages.invoices.pdf.payout_method').': '.$invoice->payment_method, 10, false, self::MUTED);
        }

        $pages = $this->pdf->pageCount();
        for ($page = 1; $page <= $pages; $page++) {
            $this->pdf->setPage($page)->text(SimplePdf::WIDTH / 2, SimplePdf::HEIGHT - 28,
                $invoice->invoice_number.' · '.__('messages.invoices.pdf.page', ['page' => $page, 'pages' => $pages]),
                8, false, self::MUTED, 'center');
        }

        return $this->pdf->output();
    }

    private function newPage(): void
    {
        $this->pdf->addPage();
        $width = (SimplePdf::WIDTH) / count(self::STRIP);
        foreach (self::STRIP as $i => $color) {
            $this->pdf->rect($i * $width, 0, $width + 0.5, 8, $color);
        }
        $this->y = 64;
    }

    private function tableHeader(): void
    {
        $right = SimplePdf::WIDTH - self::MARGIN;
        $this->pdf->rect(self::MARGIN, $this->y, $right - self::MARGIN, 24, self::SOFT);
        $this->y += 15;
        $this->pdf->text(self::MARGIN + 8, $this->y, mb_strtoupper(__('messages.invoices.pdf.campaign')), 8, true, self::MUTED);
        $this->pdf->text(self::MARGIN + 250, $this->y, mb_strtoupper(__('messages.invoices.pdf.type')), 8, true, self::MUTED);
        $this->pdf->text(self::MARGIN + 320, $this->y, mb_strtoupper(__('messages.invoices.pdf.date')), 8, true, self::MUTED);
        $this->pdf->text($right - 8, $this->y, mb_strtoupper(__('messages.invoices.pdf.compensation')), 8, true, self::MUTED, 'right');
        $this->y += 9;
    }

    /** @param  list<string|null>  $lines */
    private function party(float $x, string $label, array $lines): void
    {
        $y = $this->y;
        $this->pdf->text($x, $y, mb_strtoupper($label), 8, true, self::MUTED);
        $y += 16;
        foreach (array_values(array_filter($lines)) as $i => $line) {
            $this->pdf->text($x, $y, $this->pdf->fit((string) $line, 160, $i === 0 ? 11 : 9, $i === 0), $i === 0 ? 11 : 9, $i === 0, $i === 0 ? self::INK : self::MUTED);
            $y += 14;
        }
    }

    private function status(): string
    {
        $key = 'messages.invoices.pdf.statuses.'.$this->invoice->status;
        $label = __($key);

        return mb_strtoupper($label === $key ? (string) $this->invoice->status : $label);
    }

    private function period(): string
    {
        $start = $this->invoice->period_start;
        $end = $this->invoice->period_end;
        if (! $start && ! $end) {
            return '—';
        }

        return $this->date($start).' – '.$this->date($end);
    }

    private function date(?CarbonInterface $date): string
    {
        return $date ? $date->locale(app()->getLocale())->translatedFormat('j M Y') : '—';
    }

    private function money(string|float|int|null $amount): string
    {
        $value = (float) ($amount ?? 0);
        $currency = $this->invoice->currency ?: 'EUR';
        if (class_exists(NumberFormatter::class)) {
            $formatter = new NumberFormatter(app()->getLocale(), NumberFormatter::CURRENCY);
            $formatted = $formatter->formatCurrency($value, $currency);
            if ($formatted !== false) {
                // Non-breaking spaces are not in every PDF font encoding.
                return str_replace(["\u{00A0}", "\u{202F}"], ' ', $formatted);
            }
        }

        return $currency.' '.number_format($value, 2);
    }
}
