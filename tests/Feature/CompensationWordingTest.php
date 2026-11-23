<?php

use App\Support\PublicDocumentation;
use Symfony\Component\Finder\Finder;

/**
 * What advertisers pay publishers is "compensation" (Dutch "vergoeding") in everything people read.
 * Identifiers, database columns, API fields, permission names and URLs keep their names; they are not prose.
 */
function prosePhpFiles(): array
{
    return collect(iterator_to_array(
        (new Finder)->files()->in([app_path('Http/Controllers'), app_path('Services'), app_path('Support'), app_path('Mail'), app_path('Exports')])->name('*.php'),
        false
    ))->map(fn ($file) => $file->getRealPath())->all();
}

/** Quoted strings a person could read: they mention commission and contain a space or start with a capital. */
function commissionProse(string $php): array
{
    preg_match_all('/(?<![\w\\\\])([\'"])((?:\\\\.|(?!\1).)*)\1/s', $php, $matches);

    return collect($matches[2])
        // SQL such as "SUM(commission_amount) as commission" and column names are identifiers, not prose.
        ->map(fn ($text) => preg_replace('/\b[\w.]*(?:_commission|commission_)[\w.]*/i', '', $text))
        ->reject(fn ($text) => preg_match('/\b(SUM|COUNT|COALESCE|SELECT)\s*\(/i', $text))
        ->filter(fn ($text) => preg_match('/commission/i', $text) && (str_contains($text, ' ') || preg_match('/^Commission/', $text)))
        ->values()->all();
}

it('has no "commission" in the strings people read in the application code', function () {
    $found = [];
    foreach (prosePhpFiles() as $path) {
        foreach (commissionProse((string) file_get_contents($path)) as $text) {
            $found[] = str_replace(base_path().'/', '', $path).': '.mb_substr($text, 0, 100);
        }
    }

    expect($found)->toBe([]);
});

it('has no "commission" in language files or email templates', function () {
    $found = [];
    foreach ((new Finder)->files()->in([base_path('lang'), resource_path('views/emails')]) as $file) {
        if (preg_match('/commissi(e|on)/i', $file->getContents())) {
            $found[] = $file->getRelativePathname();
        }
    }

    expect($found)->toBe([]);
});

it('has no "commission" in the prose of the public docs', function () {
    $found = [];
    $public = collect(array_keys(PublicDocumentation::guides()))->map(fn ($guide) => $guide.'.md')->all();
    foreach ((new Finder)->files()->in(base_path('docs'))->depth(0)->name($public) as $file) {
        // Code fences and inline code keep API field names such as `commission_amount`.
        $prose = preg_replace(['/```.*?```/s', '/`[^`]*`/'], '', $file->getContents());
        foreach (preg_split('/\R/', (string) $prose) as $i => $line) {
            if (preg_match('/commissi(e|on)/i', $line)) {
                $found[] = $file->getFilename().':'.($i + 1).' '.mb_substr(trim($line), 0, 90);
            }
        }
    }

    expect($found)->toBe([]);
});

it('titles the invoice commission column "Compensation" and "Vergoeding"', function (string $locale, string $expected) {
    expect(__('messages.invoices.pdf.compensation', [], $locale))->toBe($expected);
})->with([['en', 'Compensation'], ['nl', 'Vergoeding']]);
