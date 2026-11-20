<?php

namespace App\Support\Pdf;

/**
 * A minimal PDF 1.4 writer for text documents (invoices). It draws text in the
 * standard Helvetica fonts (WinAnsi encoding), filled rectangles and lines on
 * A4 pages. No external dependency, no embedded fonts or images.
 *
 * Coordinates are in points from the top-left corner of the page.
 */
class SimplePdf
{
    public const WIDTH = 595.28;

    public const HEIGHT = 841.89;

    /** Helvetica glyph widths (1/1000 em) for ASCII 32–126. */
    private const WIDTHS = [
        278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
        556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
        1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
        667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
        333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
        556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
    ];

    /** @var list<string> content stream of each page */
    private array $pages = [];

    private string $title = '';

    private int $current = -1;

    public function setTitle(string $title): self
    {
        $this->title = $title;

        return $this;
    }

    public function addPage(): self
    {
        $this->pages[] = '';
        $this->current = array_key_last($this->pages);

        return $this;
    }

    /** Moves drawing to an earlier page (1-based), e.g. to add page numbers. */
    public function setPage(int $page): self
    {
        abort_unless(isset($this->pages[$page - 1]), 500, 'No such PDF page.');
        $this->current = $page - 1;

        return $this;
    }

    public function pageCount(): int
    {
        return count($this->pages);
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $rgb  0–1 per channel
     * @param  'left'|'right'|'center'  $align  x is the left edge, right edge or centre
     */
    public function text(float $x, float $y, string $text, float $size = 10, bool $bold = false, array $rgb = [0.09, 0.07, 0.23], string $align = 'left'): self
    {
        $encoded = self::encode($text);
        $width = $this->width($text, $size, $bold);
        $left = match ($align) {
            'right' => $x - $width,
            'center' => $x - $width / 2,
            default => $x,
        };
        $font = $bold ? 'F2' : 'F1';
        $this->append(sprintf(
            "BT %s rg /%s %s Tf %s %s Td (%s) Tj ET\n",
            self::color($rgb), $font, self::num($size), self::num($left), self::num(self::HEIGHT - $y), $encoded,
        ));

        return $this;
    }

    /** @param  array{0: float, 1: float, 2: float}  $rgb */
    public function rect(float $x, float $y, float $width, float $height, array $rgb): self
    {
        $this->append(sprintf(
            "%s rg %s %s %s %s re f\n",
            self::color($rgb), self::num($x), self::num(self::HEIGHT - $y - $height), self::num($width), self::num($height),
        ));

        return $this;
    }

    /** @param  array{0: float, 1: float, 2: float}  $rgb */
    public function line(float $x1, float $y1, float $x2, float $y2, array $rgb, float $width = 0.75): self
    {
        $this->append(sprintf(
            "%s RG %s w %s %s m %s %s l S\n",
            self::color($rgb), self::num($width), self::num($x1), self::num(self::HEIGHT - $y1), self::num($x2), self::num(self::HEIGHT - $y2),
        ));

        return $this;
    }

    /** Approximate rendered width of a string in points. */
    public function width(string $text, float $size, bool $bold = false): float
    {
        $units = 0;
        foreach (mb_str_split($text) as $char) {
            $code = mb_ord($char);
            $units += ($code >= 32 && $code <= 126) ? self::WIDTHS[$code - 32] : 556;
        }

        return $units / 1000 * $size * ($bold ? 1.05 : 1);
    }

    /** Shortens text with an ellipsis so it fits in the given width. */
    public function fit(string $text, float $maxWidth, float $size, bool $bold = false): string
    {
        if ($this->width($text, $size, $bold) <= $maxWidth) {
            return $text;
        }
        while ($text !== '' && $this->width($text.'…', $size, $bold) > $maxWidth) {
            $text = mb_substr($text, 0, -1);
        }

        return rtrim($text).'…';
    }

    public function output(): string
    {
        if ($this->pages === []) {
            $this->addPage();
        }

        $objects = [];
        $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
        $objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
        $objects[5] = '<< /Title ('.self::encode($this->title).') /Producer (Brand New Day) >>';

        $kids = [];
        $next = 6;
        foreach ($this->pages as $content) {
            $pageId = $next++;
            $contentId = $next++;
            $kids[] = $pageId.' 0 R';
            $objects[$pageId] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>',
                self::num(self::WIDTH), self::num(self::HEIGHT), $contentId,
            );
            $objects[$contentId] = sprintf("<< /Length %d >>\nstream\n%sendstream", strlen($content), $content);
        }
        $objects[2] = sprintf('<< /Type /Pages /Kids [%s] /Count %d >>', implode(' ', $kids), count($kids));
        ksort($objects);

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];
        foreach ($objects as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= $id." 0 obj\n".$body."\nendobj\n";
        }
        $xref = strlen($pdf);
        $count = max(array_keys($objects)) + 1;
        $pdf .= "xref\n0 {$count}\n0000000000 65535 f \n";
        for ($id = 1; $id < $count; $id++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$id]);
        }
        $pdf .= "trailer\n<< /Size {$count} /Root 1 0 R /Info 5 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        return $pdf;
    }

    private function append(string $operator): void
    {
        if ($this->pages === []) {
            $this->addPage();
        }
        $this->pages[$this->current] .= $operator;
    }

    /** UTF-8 → WinAnsi with PDF string escaping. */
    public static function encode(string $text): string
    {
        $text = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $text) ?? '';
        $converted = @iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $text);
        if ($converted === false) {
            $converted = preg_replace('/[^\x20-\x7E]/', '?', $text) ?? '';
        }

        return strtr($converted, ['\\' => '\\\\', '(' => '\\(', ')' => '\\)']);
    }

    private static function num(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
    }

    /** @param  array{0: float, 1: float, 2: float}  $rgb */
    private static function color(array $rgb): string
    {
        return implode(' ', array_map(fn ($c) => self::num(max(0, min(1, $c))), $rgb));
    }
}
