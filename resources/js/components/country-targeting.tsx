import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TCountry } from '@/types';
import {
    getCountryRegions,
    toggleRegionCountries,
} from '@/utils/country-regions';
import { ChevronDown, Globe2, Minus, Search, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function CountryTargeting({
    countries,
    value = [],
    onChange,
    error,
}: {
    countries: TCountry[];
    value?: string[];
    onChange: (value: string[]) => void;
    error?: string;
}) {
    const { t } = useTranslation();
    const id = useId();
    const [regionOpen, setRegionOpen] = useState(false);
    const [countryOpen, setCountryOpen] = useState(false);
    const [regionSearch, setRegionSearch] = useState('');
    const [countrySearch, setCountrySearch] = useState('');
    const regions = useMemo(
        () =>
            getCountryRegions(countries.map((country) => country.country_iso)),
        [countries],
    );
    const selected = new Set(value);
    const complete = new Set(
        regions
            .filter((region) =>
                region.countries.every((code) => selected.has(code)),
            )
            .map((region) => region.id),
    );
    const selectedRegions = regions.filter(
        (region) =>
            complete.has(region.id) &&
            (!region.parentId || !complete.has(region.parentId)),
    );
    const selectedCountries = countries.filter((country) =>
        selected.has(country.country_iso),
    );
    const matchingRegions = regions.filter((region) =>
        t(region.name)
            .toLocaleLowerCase()
            .includes(regionSearch.toLocaleLowerCase().trim()),
    );
    const matchingCountries = countries.filter((country) =>
        `${country.country_name} ${country.country_iso}`
            .toLocaleLowerCase()
            .includes(countrySearch.toLocaleLowerCase().trim()),
    );

    return (
        <div className="space-y-4">
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor={`${id}-regions`}>{t('Regions')}</Label>
                    <Popover
                        open={regionOpen}
                        onOpenChange={(open) => {
                            setRegionOpen(open);
                            if (!open) setRegionSearch('');
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                id={`${id}-regions`}
                                type="button"
                                variant="outline"
                                className="h-10 w-full justify-between font-normal"
                            >
                                <span className="truncate">
                                    {selectedRegions.length
                                        ? selectedRegions
                                              .map((region) => t(region.name))
                                              .join(', ')
                                        : t('Select regions...')}
                                </span>
                                <ChevronDown
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="start"
                            className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
                            aria-label={t('Regions')}
                        >
                            <div className="flex items-center gap-2 border-b p-3">
                                <Search
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    aria-label={t('Search regions')}
                                    placeholder={t('Search regions')}
                                    value={regionSearch}
                                    onChange={(event) =>
                                        setRegionSearch(event.target.value)
                                    }
                                    className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <div className="max-h-72 overflow-y-auto p-2">
                                {matchingRegions.map((region) => {
                                    const count = region.countries.filter(
                                        (code) => selected.has(code),
                                    ).length;
                                    const partial =
                                        count > 0 &&
                                        count < region.countries.length;
                                    return (
                                        <div
                                            key={region.id}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted',
                                                region.depth === 0 &&
                                                    'bg-muted/40 font-semibold',
                                            )}
                                            style={{
                                                paddingLeft: `${12 + region.depth * 16}px`,
                                            }}
                                        >
                                            <span className="relative flex size-4 shrink-0 items-center justify-center">
                                                <Checkbox
                                                    id={`${id}-region-${region.id}`}
                                                    className={
                                                        partial
                                                            ? '[&_svg]:invisible'
                                                            : undefined
                                                    }
                                                    checked={
                                                        count ===
                                                        region.countries.length
                                                            ? true
                                                            : count > 0
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        onChange(
                                                            toggleRegionCountries(
                                                                value,
                                                                region.countries,
                                                                checked ===
                                                                    true,
                                                            ),
                                                        )
                                                    }
                                                />
                                                {partial && (
                                                    <Minus
                                                        className="pointer-events-none absolute size-3 text-primary"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <Label
                                                htmlFor={`${id}-region-${region.id}`}
                                                className="mb-0! flex-1 cursor-pointer justify-between gap-3 leading-snug"
                                            >
                                                <span>{t(region.name)}</span>
                                                <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                                                    {count} /{' '}
                                                    {region.countries.length}
                                                </span>
                                            </Label>
                                        </div>
                                    );
                                })}
                                {!matchingRegions.length && (
                                    <p className="p-3 text-sm text-muted-foreground">
                                        {t('No results found.')}
                                    </p>
                                )}
                            </div>
                            <p className="border-t px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                                {t(
                                    'Selecting a region selects all its available countries. You can adjust individual countries below.',
                                )}
                            </p>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="geo_targeting">{t('Countries')}</Label>
                    <Popover
                        open={countryOpen}
                        onOpenChange={(open) => {
                            setCountryOpen(open);
                            if (!open) setCountrySearch('');
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                id="geo_targeting"
                                type="button"
                                variant="outline"
                                aria-invalid={!!error}
                                aria-describedby={
                                    error ? `${id}-error` : `${id}-hint`
                                }
                                className="h-10 w-full justify-between font-normal"
                            >
                                <span>
                                    {value.length
                                        ? t('{{count}} countries selected', {
                                              count: value.length,
                                          })
                                        : t('All countries')}
                                </span>
                                <ChevronDown
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="start"
                            className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
                            aria-label={t('Countries')}
                        >
                            <div className="flex items-center gap-2 border-b p-3">
                                <Search
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    aria-label={t('Search countries')}
                                    placeholder={t('Search countries')}
                                    value={countrySearch}
                                    onChange={(event) =>
                                        setCountrySearch(event.target.value)
                                    }
                                    className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <div className="max-h-72 overflow-y-auto p-2">
                                {matchingCountries.map((country) => (
                                    <div
                                        key={country.country_iso}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
                                    >
                                        <Checkbox
                                            id={`${id}-country-${country.country_iso}`}
                                            checked={selected.has(
                                                country.country_iso,
                                            )}
                                            onCheckedChange={(checked) =>
                                                onChange(
                                                    toggleRegionCountries(
                                                        value,
                                                        [country.country_iso],
                                                        checked === true,
                                                    ),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor={`${id}-country-${country.country_iso}`}
                                            className="mb-0! flex-1 cursor-pointer leading-snug"
                                        >
                                            {country.country_name}
                                        </Label>
                                    </div>
                                ))}
                                {!matchingCountries.length && (
                                    <p className="p-3 text-sm text-muted-foreground">
                                        {t('No results found.')}
                                    </p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <p
                id={`${id}-hint`}
                className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
            >
                <Globe2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t(
                    'Select one or more regions to add their countries, then customize the country list. Leave the selection empty to allow all countries.',
                )}
            </p>
            {value.length > 0 && (
                <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium" aria-live="polite">
                            {t('{{count}} countries selected', {
                                count: value.length,
                            })}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onChange([])}
                        >
                            {t('Clear selection')}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCountries.slice(0, 6).map((country) => (
                            <span
                                key={country.country_iso}
                                className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs"
                            >
                                {country.country_name}
                                <button
                                    type="button"
                                    aria-label={t('Remove {{country}}', {
                                        country: country.country_name,
                                    })}
                                    onClick={() =>
                                        onChange(
                                            value.filter(
                                                (code) =>
                                                    code !==
                                                    country.country_iso,
                                            ),
                                        )
                                    }
                                    className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <X className="size-3" aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                        {selectedCountries.length > 6 && (
                            <span className="self-center px-1 text-xs text-muted-foreground">
                                {t('+{{count}} more', {
                                    count: selectedCountries.length - 6,
                                })}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
